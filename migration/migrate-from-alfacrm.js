#!/usr/bin/env node
/**
 * МИГРАЦИЯ ДАННЫХ ИЗ ALFACRM В CLASSMATE CENTRAL
 * 
 * Порядок миграции:
 * 1. Преподаватели (Teachers)
 * 2. Комнаты (Rooms)
 * 3. Типы абонементов (Tariffs/Subscription Types)
 * 4. Группы (Groups)
 * 5. Расписания групп (Group Schedules)
 * 6. Студенты + балансы (Students + Balances)
 * 7. Абонементы студентов (Student Subscriptions)
 * 8. Связи студент-группа (Student-Group Links)
 * 9. 💰 ИСТОРИЯ ПЛАТЕЖЕЙ (Payment History) - НОВОЕ!
 * 10. 📚 ИСТОРИЯ ПОСЕЩЕНИЙ УРОКОВ (Lesson Attendance History) - НОВОЕ!
 * 11. Долги (Debt Records)
 * 12. Занятия (Lessons - генерация на 2 недели)
 * 
 * 🎯 Умный расчет финансов:
 * - Общая оплата = Текущий баланс + Сумма всех списаний за посещенные уроки
 * - История посещений: мигрирует реальные посещения уроков за последний месяц
 * - Стоимость уроков: использует lesson.details.commission из AlfaCRM для точного расчета
 * - Результат: баланс в системе совпадает с балансом в AlfaCRM! 🎯
 */

require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const cliProgress = require('cli-progress');

// === КОНФИГУРАЦИЯ ===
const ALFACRM_API_URL = process.env.ALFACRM_API_URL;
const ALFACRM_EMAIL = process.env.ALFACRM_EMAIL;
const ALFACRM_API_KEY = process.env.ALFACRM_API_KEY;
const COMPANY_ID = process.env.COMPANY_ID || uuidv4();
const COMPANY_NAME = process.env.COMPANY_NAME || 'My Company';

// Support both Railway (DATABASE_URL, PG*) and standard (DB_*) env vars
let dbConfig = {
  host: process.env.DB_HOST || process.env.PGHOST,
  port: process.env.DB_PORT || process.env.PGPORT,
  database: process.env.DB_NAME || process.env.PGDATABASE,
  user: process.env.DB_USER || process.env.PGUSER,
  password: process.env.DB_PASSWORD || process.env.PGPASSWORD,
};

// If still undefined, try to parse from DATABASE_URL
if (!dbConfig.host || !dbConfig.port || !dbConfig.database || !dbConfig.user || !dbConfig.password) {
  const databaseURL = process.env.DATABASE_URL;
  if (databaseURL) {
    try {
      // Parse postgresql://user:password@host:port/database
      const url = new URL(databaseURL);
      dbConfig = {
        host: url.hostname || dbConfig.host,
        port: url.port || dbConfig.port,
        database: url.pathname.substring(1) || dbConfig.database, // Remove leading /
        user: url.username || dbConfig.user,
        password: url.password || dbConfig.password,
      };
    } catch (err) {
      console.error('⚠️  Failed to parse DATABASE_URL:', err.message);
    }
  }
}

// Debug: log DB config (hide password)
console.log('📊 Database config:', {
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  user: dbConfig.user,
  password: dbConfig.password ? '***' : 'NOT SET'
});

const pool = new Pool(dbConfig);

let alfacrmToken = null;

// === УТИЛИТЫ ===

async function getAlfaCRMToken(forceRefresh = false) {
  if (alfacrmToken && !forceRefresh) return alfacrmToken;
  
  try {
    const response = await axios.post(`${ALFACRM_API_URL}/v2api/auth/login`, {
      email: ALFACRM_EMAIL,
      api_key: ALFACRM_API_KEY,
    });
    
    if (!response.data || !response.data.token) {
      throw new Error('Токен не получен от AlfaCRM API');
    }
    
    alfacrmToken = response.data.token;
    return alfacrmToken;
  } catch (error) {
    if (error.response) {
      // Ошибка от сервера
      if (error.response.status === 401) {
        throw new Error(`Ошибка аутентификации в AlfaCRM (401): Проверьте правильность email и API ключа. Email: ${ALFACRM_EMAIL}`);
      } else if (error.response.status === 403) {
        throw new Error(`Доступ запрещен (403): Проверьте права доступа API ключа`);
      } else {
        throw new Error(`Ошибка при получении токена: ${error.response.status} - ${error.response.data?.message || error.message}`);
      }
    } else if (error.request) {
      throw new Error(`Не удалось подключиться к AlfaCRM API: ${error.message}`);
    } else {
      throw new Error(`Ошибка при запросе токена: ${error.message}`);
    }
  }
}

async function fetchAlfaCRMBranches() {
  try {
    const token = await getAlfaCRMToken();
    const response = await axios.post(
      `${ALFACRM_API_URL}/v2api/branch/index`,
      { page: 0, count: 100 },
      { headers: { 'X-ALFACRM-TOKEN': token } }
    );
    return response.data.items || [];
  } catch (error) {
    // Если ошибка 401, пытаемся обновить токен и повторить
    if (error.response && error.response.status === 401) {
      console.log('⚠️  Токен истек при получении филиалов, обновляем токен...');
      alfacrmToken = null;
      const newToken = await getAlfaCRMToken(true);
      const retryResponse = await axios.post(
        `${ALFACRM_API_URL}/v2api/branch/index`,
        { page: 0, count: 100 },
        { headers: { 'X-ALFACRM-TOKEN': newToken } }
      );
      return retryResponse.data.items || [];
    }
    throw error;
  }
}

async function fetchAllPages(endpoint, params = {}, branchId = null) {
  const token = await getAlfaCRMToken();
  let allData = [];
  let seenIds = new Set(); // Track unique IDs to avoid duplicates
  let page = 0;
  let hasMore = true;
  let consecutiveEmptyPages = 0;

  // Согласно документации AlfaCRM API, для получения данных по филиалу
  // нужно указывать филиал в URL: /v2api/{branch}/endpoint
  let actualEndpoint = endpoint;
  if (branchId !== null && branchId !== 'default') {
    // Вставляем branchId в URL перед endpoint
    // Важно: branchId должен быть числом (ID филиала из AlfaCRM)
    // Например: /v2api/teacher/index -> /v2api/4/teacher/index
    const branchIdNum = typeof branchId === 'string' && branchId !== 'default' ? parseInt(branchId) : branchId;
    if (!isNaN(branchIdNum) && branchIdNum !== 'default') {
      actualEndpoint = endpoint.replace('/v2api/', `/v2api/${branchIdNum}/`);
      console.log(`🔄 Запрос к ${actualEndpoint} для филиала (AlfaCRM ID: ${branchIdNum})...`);
    } else {
      console.log(`🔄 Запрос к ${endpoint}...`);
    }
  } else {
    console.log(`🔄 Запрос к ${endpoint}...`);
  }

  while (hasMore) {
    try {
      const requestParams = { ...params, page, count: 100 };
      
      const response = await axios.post(`${ALFACRM_API_URL}${actualEndpoint}`, requestParams, {
        headers: { 'X-ALFACRM-TOKEN': token },
      });

      const items = response.data.items || [];
      
      if (items.length === 0) {
        consecutiveEmptyPages++;
        if (consecutiveEmptyPages >= 2) {
          // Stop after 2 consecutive empty pages
          break;
        }
      } else {
        consecutiveEmptyPages = 0;
      }
      
      // Filter out duplicates based on ID
      let newItems = 0;
      for (const item of items) {
        const itemId = item.id?.toString();
        if (itemId && !seenIds.has(itemId)) {
          seenIds.add(itemId);
          allData.push(item);
          newItems++;
        }
      }
      
      console.log(`   📄 Страница ${page}: получено ${items.length} элементов (новых: ${newItems})`);
      
      // Stop if no new items found (all duplicates)
      if (newItems === 0 && items.length > 0) {
        console.log(`   ⚠️  Все элементы на странице ${page} - дубликаты. Остановка.`);
        break;
      }

      // Continue if we got new items
      hasMore = newItems > 0 || consecutiveEmptyPages < 2;
      page++;

      if (page > 100) {
        console.log(`   ⚠️  Достигнут лимит страниц (100). Остановка.`);
        break; // Reduced safety limit since we handle duplicates now
      }
    } catch (error) {
      // Если ошибка 401, пытаемся обновить токен и повторить запрос один раз
      if (error.response && error.response.status === 401) {
        console.log(`   ⚠️  Токен истек (401), обновляем токен...`);
        alfacrmToken = null; // Сбрасываем токен
        try {
          const newToken = await getAlfaCRMToken(true); // Принудительно получаем новый токен
          // Создаем requestParams заново для повторной попытки
          const retryParams = { ...params, page, count: 100 };
          if (branchId !== null) {
            retryParams.branch_id = branchId;
          }
          // Повторяем запрос с новым токеном
          const retryResponse = await axios.post(`${ALFACRM_API_URL}${endpoint}`, retryParams, {
            headers: { 'X-ALFACRM-TOKEN': newToken },
          });
          const items = retryResponse.data.items || [];
          // Обрабатываем ответ как обычно
          if (items.length === 0) {
            consecutiveEmptyPages++;
            if (consecutiveEmptyPages >= 2) break;
          } else {
            consecutiveEmptyPages = 0;
          }
          let newItems = 0;
          for (const item of items) {
            const itemId = item.id?.toString();
            if (itemId && !seenIds.has(itemId)) {
              seenIds.add(itemId);
              allData.push(item);
              newItems++;
            }
          }
          console.log(`   📄 Страница ${page}: получено ${items.length} элементов (новых: ${newItems}) [повтор после обновления токена]`);
          if (newItems === 0 && items.length > 0) {
            console.log(`   ⚠️  Все элементы на странице ${page} - дубликаты. Остановка.`);
            break;
          }
          page++;
          continue; // Продолжаем цикл
        } catch (retryError) {
          console.error(`   ❌ Ошибка после обновления токена: ${retryError.message}`);
          throw retryError; // Если повторная попытка не удалась, выбрасываем ошибку
        }
      }
      
      console.error(`   ❌ Ошибка при запросе страницы ${page}: ${error.message}`);
      if (error.response) {
        console.error(`   HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      }
      break;
    }
  }

  console.log(`   ✅ Всего получено: ${allData.length} уникальных элементов`);
  return allData;
}

function almatyToUTC(year, month, day, hour, minute) {
  // Конвертация Almaty времени в UTC (Almaty = UTC+5)
  // 18:00 Almaty = 13:00 UTC
  // PostgreSQL сохранит UTC, фронтенд добавит +5 и покажет правильно
  return new Date(Date.UTC(year, month - 1, day, hour - 5, minute, 0));
}

// === МИГРАЦИЯ ПРЕПОДАВАТЕЛЕЙ ===

async function migrateTeachers(branchMapping = null) {
  console.log('\n👨‍🏫 МИГРАЦИЯ ПРЕПОДАВАТЕЛЕЙ\n');
  
  // Если branchMapping === null, используем fallback режим
  if (!branchMapping || branchMapping.size === 0) {
    const teachers = await fetchAllPages('/v2api/teacher/index');
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progressBar.start(teachers.length, 0);
    let migrated = 0;
    
    for (const teacher of teachers) {
      try {
        await migrateTeacherToBranch(teacher, DEFAULT_BRANCH_ID || COMPANY_ID);
        migrated++;
        progressBar.update(migrated);
      } catch (error) {
        console.error(`\n   ⚠️  Ошибка для учителя ${teacher.name}: ${error.message}`);
      }
    }
    
    progressBar.stop();
    console.log(`✅ Мигрировано преподавателей: ${migrated}\n`);
    return;
  }
  
  // AlfaCRM API поддерживает фильтрацию по branch_id для учителей!
  // Для каждого филиала делаем отдельный запрос с фильтрацией
  const teachersByBranch = new Map(); // ourBranchId -> [teachers]
  const allTeacherIds = new Set(); // Для отслеживания уникальности
  
  // Получаем все филиалы из branchMapping (исключаем 'default')
  const allBranches = Array.from(branchMapping.entries()).filter(([id]) => id !== 'default'); // [alfacrmBranchId, ourBranchId]
  
  console.log(`📊 Запрашиваем учителей для каждого филиала из AlfaCRM (с фильтрацией)...`);
  console.log(`📋 Филиалы для миграции: ${allBranches.map(([id, ourId]) => `AlfaCRM ID: ${id} → наш ID: ${ourId}`).join(', ')}`);
  
  // Для каждого филиала делаем отдельный запрос с фильтрацией по branch_id
  for (const [alfacrmBranchId, ourBranchId] of allBranches) {
    try {
      console.log(`🔄 Запрос учителей для филиала: AlfaCRM ID: ${alfacrmBranchId} (тип: ${typeof alfacrmBranchId}) → наш ID: ${ourBranchId}`);
      // Используем branch_id для фильтрации (это работает для учителей!)
      const teachers = await fetchAllPages('/v2api/teacher/index', {}, alfacrmBranchId);
      
      // Добавляем только уникальных учителей (по ID)
      for (const teacher of teachers) {
        const teacherId = teacher.id?.toString();
        if (teacherId && !allTeacherIds.has(teacherId)) {
          allTeacherIds.add(teacherId);
          if (!teachersByBranch.has(ourBranchId)) {
            teachersByBranch.set(ourBranchId, []);
          }
          teachersByBranch.get(ourBranchId).push(teacher);
        }
      }
      
      console.log(`   ✅ Филиал ${alfacrmBranchId} (${ourBranchId}): ${teachers.length} учителей`);
    } catch (error) {
      console.error(`   ⚠️  Ошибка при запросе учителей для филиала ${alfacrmBranchId}: ${error.message}`);
    }
  }
  
  // Выводим статистику по филиалам
  console.log(`\n📊 Статистика распределения учителей по филиалам:`);
  for (const [ourBranchId, teachers] of teachersByBranch) {
    console.log(`   Филиал ${ourBranchId}: ${teachers.length} учителей`);
  }
  
  // Мигрируем учителей для каждого филиала
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  const totalTeachers = Array.from(teachersByBranch.values()).reduce((sum, teachers) => sum + teachers.length, 0);
  progressBar.start(totalTeachers, 0);
  
  let totalMigrated = 0;
  for (const [ourBranchId, teachers] of teachersByBranch) {
    for (const teacher of teachers) {
      try {
        await migrateTeacherToBranch(teacher, ourBranchId);
        totalMigrated++;
        progressBar.update(totalMigrated);
      } catch (error) {
        console.error(`\n   ⚠️  Ошибка для учителя ${teacher.name}: ${error.message}`);
      }
    }
  }
  
  progressBar.stop();
  console.log(`✅ Всего мигрировано преподавателей: ${totalMigrated}\n`);
}

async function migrateTeacherToBranch(teacher, branchId) {
  // Email: может быть массивом строк или объектов
  let email = '';
  if (Array.isArray(teacher.email) && teacher.email.length > 0) {
    email = typeof teacher.email[0] === 'string' ? teacher.email[0] : (teacher.email[0]?.value || '');
  } else if (typeof teacher.email === 'string') {
    email = teacher.email;
  }
  if (!email) {
    email = `teacher_${teacher.id}@temp.local`;
  }
  
  // Phone: может быть массивом строк или объектов
  let phone = '';
  if (Array.isArray(teacher.phone) && teacher.phone.length > 0) {
    phone = typeof teacher.phone[0] === 'string' ? teacher.phone[0] : (teacher.phone[0]?.value || '');
  } else if (typeof teacher.phone === 'string') {
    phone = teacher.phone;
  }
  
  const subject = teacher['teacher-to-skill']?.[0]?.name || 'Не указан';
  
  // Status: В AlfaCRM нет is_active для teachers.
  // Проверяем e_date - если это "2030-12-31" или будущая дата, то active
  let status = 'active'; // По умолчанию активный
  if (teacher.e_date && teacher.e_date !== '2030-12-31') {
    const endDate = new Date(teacher.e_date);
    const today = new Date();
    if (endDate < today) {
      status = 'inactive';
    }
  }
  
  await pool.query(`
    INSERT INTO teachers (id, name, email, phone, subject, status, company_id, branch_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      subject = EXCLUDED.subject,
      status = EXCLUDED.status,
      company_id = EXCLUDED.company_id,
      branch_id = EXCLUDED.branch_id
  `, [
    teacher.id?.toString(),
    teacher.name || 'Без имени',
    email,
    phone,
    subject,
    status,
    COMPANY_ID,
    branchId
  ]);
}

// === МИГРАЦИЯ КОМНАТ ===

async function migrateRooms(branchMapping) {
  console.log('\n🏢 МИГРАЦИЯ КОМНАТ\n');
  
  // Если branchMapping === null, используем fallback режим
  if (!branchMapping || branchMapping.size === 0) {
    const rooms = await fetchAllPages('/v2api/room/index');
    await migrateRoomsForBranch(rooms, DEFAULT_BRANCH_ID || COMPANY_ID);
    return;
  }
  
  // Мигрируем комнаты для каждого филиала (исключаем 'default')
  let totalMigrated = 0;
  const allBranches = Array.from(branchMapping.entries()).filter(([id]) => id !== 'default');
  for (const [alfacrmBranchId, ourBranchId] of allBranches) {
    const rooms = await fetchAllPages('/v2api/room/index', {}, alfacrmBranchId);
    const migrated = await migrateRoomsForBranch(rooms, ourBranchId);
    totalMigrated += migrated;
  }
  
  console.log(`✅ Всего мигрировано комнат: ${totalMigrated}\n`);
}

async function migrateRoomsForBranch(rooms, branchId) {
  if (rooms.length === 0) return 0;
  
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(rooms.length, 0);
  
  let migrated = 0;
  
  for (const room of rooms) {
    try {
      // Создаем уникальный ID для каждого филиала, чтобы избежать конфликтов
      const uniqueRoomId = `${room.id?.toString()}_${branchId}`;
      
      // Проверяем, существует ли комната с таким ID и branch_id
      const existing = await pool.query(
        'SELECT id FROM rooms WHERE id = $1 AND branch_id = $2',
        [uniqueRoomId, branchId]
      );
      
      if (existing.rows.length === 0) {
        // Комната не существует для этого филиала, создаем
        await pool.query(`
          INSERT INTO rooms (id, name, capacity, status, color, company_id, branch_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            capacity = EXCLUDED.capacity,
            status = EXCLUDED.status,
            color = EXCLUDED.color,
            company_id = EXCLUDED.company_id,
            branch_id = EXCLUDED.branch_id
        `, [
          uniqueRoomId,
          room.name || 'Unknown',
          0,
          'active',
          room.color || '#3b82f6',
          COMPANY_ID,
          branchId
        ]);
        migrated++;
      }
    } catch (error) {
      console.error(`\n   ⚠️  Ошибка для ${room.name}: ${error.message}`);
    }
    
    progressBar.update(migrated);
  }
  
  progressBar.stop();
  return migrated;
}

// === МИГРАЦИЯ ТАРИФОВ ===

async function migrateTariffs(branchMapping) {
  console.log('\n💳 МИГРАЦИЯ ТАРИФОВ\n');
  
  // Тарифы обычно общие для всех филиалов, используем первый филиал или дефолтный
  const defaultBranchId = branchMapping && branchMapping.size > 0 
    ? Array.from(branchMapping.values())[0] 
    : (DEFAULT_BRANCH_ID || COMPANY_ID);
  
  let tariffs = [];
  try {
    tariffs = await fetchAllPages('/v2api/tariff/index');
  } catch (error) {
    console.error(`\n   ⚠️  Ошибка получения тарифов: ${error.message}`);
    console.log('⚠️  Пропускаем миграцию тарифов...\n');
    return;
  }
  
  if (tariffs.length === 0) {
    console.log('⚠️  Тарифов не найдено\n');
    return;
  }
  
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(tariffs.length, 0);
  
  let migrated = 0;
  
  for (const tariff of tariffs) {
    try {
      // Маппинг полей из AlfaCRM API:
      // id: 388
      // name: "100.000тг 6 раз в неделю"
      // price: "100000.00"
      // lessons_count: 20
      // duration: 60 (минуты)
      // type: 1 (поурочный), 2 (помесячный), 3 (безлимитный)
      
      const lessonsCount = parseInt(tariff.lessons_count) || 0;
      const price = parseFloat(tariff.price) || 0;
      
      // Маппинг типа тарификации из AlfaCRM
      // 1 = Поурочный (per_lesson)
      // 2 = Помесячный (monthly)
      // 3 = Безлимитный (unlimited) - предположительно
      const tariffType = parseInt(tariff.type) || 1;
      let billingType = 'per_lesson';
      if (tariffType === 2) {
        billingType = 'monthly';
      } else if (tariffType === 3) {
        billingType = 'unlimited';
      }
      
      // Вычисляем validity_days на основе количества занятий
      // Предполагаем 2 занятия в неделю = 7 дней на 2 занятия
      const validityDays = Math.ceil((lessonsCount / 2) * 7) || 90;
      
      await pool.query(`
        INSERT INTO subscription_types (
          id, name, lessons_count, validity_days, price, 
          can_freeze, billing_type, description, company_id, branch_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          lessons_count = EXCLUDED.lessons_count,
          validity_days = EXCLUDED.validity_days,
          price = EXCLUDED.price,
          can_freeze = EXCLUDED.can_freeze,
          billing_type = EXCLUDED.billing_type,
          description = EXCLUDED.description,
          company_id = EXCLUDED.company_id,
          branch_id = EXCLUDED.branch_id
      `, [
        tariff.id?.toString(),
        tariff.name || 'Без названия',
        lessonsCount,
        validityDays,
        price,
        true, // can_freeze - по умолчанию разрешаем заморозку
        billingType, // NEW: billing type from AlfaCRM
        `Длительность занятия: ${tariff.duration || 60} мин`,
        COMPANY_ID,
        defaultBranchId
      ]);
      
      migrated++;
    } catch (error) {
      console.error(`\n   ⚠️  Ошибка для ${tariff.name}: ${error.message}`);
    }
    
    progressBar.update(migrated);
  }
  
  progressBar.stop();
  console.log(`✅ Мигрировано тарифов: ${migrated}\n`);
}

// === МИГРАЦИЯ ГРУПП ===

async function migrateGroups(branchMapping) {
  console.log('\n👥 МИГРАЦИЯ ГРУПП\n');
  
  // Если branchMapping === null, используем fallback режим
  if (!branchMapping || branchMapping.size === 0) {
    const groups = await fetchAllPages('/v2api/group/index');
    await migrateGroupsForBranch(groups, DEFAULT_BRANCH_ID || COMPANY_ID);
    return;
  }
  
  // Согласно документации AlfaCRM API, для получения данных по филиалу
  // нужно указывать филиал в URL: /v2api/{branch}/group/index
  console.log(`📊 Запрашиваем группы для каждого филиала из AlfaCRM...`);
  
  const groupsByBranch = new Map(); // ourBranchId -> [groups]
  const groupIdToBranches = new Map(); // groupId -> Set of ourBranchIds (для отслеживания, в какие филиалы уже добавлена группа)
  
  // Получаем все филиалы из branchMapping (исключаем 'default')
  const allBranches = Array.from(branchMapping.entries()).filter(([id]) => id !== 'default'); // [alfacrmBranchId, ourBranchId]
  
  // Для каждого филиала делаем отдельный запрос с филиалом в URL
  for (const [alfacrmBranchId, ourBranchId] of allBranches) {
    try {
      const groups = await fetchAllPages('/v2api/group/index', {}, alfacrmBranchId);
      
      let addedCount = 0;
      // Добавляем группы для текущего филиала
      // Если группа уже добавлена в другой филиал, все равно добавляем ее в текущий (группа может быть в нескольких филиалах)
      for (const group of groups) {
        const groupId = group.id?.toString();
        if (groupId) {
          // Проверяем, не добавлена ли уже эта группа в этот конкретный филиал
          const branchesForGroup = groupIdToBranches.get(groupId) || new Set();
          if (!branchesForGroup.has(ourBranchId)) {
            branchesForGroup.add(ourBranchId);
            groupIdToBranches.set(groupId, branchesForGroup);
            
            if (!groupsByBranch.has(ourBranchId)) {
              groupsByBranch.set(ourBranchId, []);
            }
            groupsByBranch.get(ourBranchId).push(group);
            addedCount++;
          }
        }
      }
      
      console.log(`   ✅ Филиал ${alfacrmBranchId} (${ourBranchId}): получено ${groups.length} групп, добавлено ${addedCount} (уникальных для этого филиала)`);
    } catch (error) {
      console.error(`   ⚠️  Ошибка при запросе групп для филиала ${alfacrmBranchId}: ${error.message}`);
    }
  }
  
  // Выводим статистику по филиалам
  console.log(`\n📊 Статистика распределения групп по филиалам:`);
  for (const [ourBranchId, groups] of groupsByBranch) {
    console.log(`   Филиал ${ourBranchId}: ${groups.length} групп`);
  }
  
  // Получаем всех учителей для маппинга (как в старом коде - по имени)
  // В AlfaCRM teacher_ids - это массив имен учителей, а не ID
  const teachers = await pool.query('SELECT id, name, branch_id FROM teachers');
  const teachersByName = new Map(); // teacherName -> teacherId (первый найденный)
  const teachersByNameAndBranch = new Map(); // "branchId:teacherName" -> teacherId
  
  teachers.rows.forEach(t => {
    // Создаем маппинг по имени (как в старом коде) - берем первого найденного
    if (!teachersByName.has(t.name)) {
      teachersByName.set(t.name, t.id);
    }
    // Также создаем маппинг по имени и филиалу для точного поиска
    const key = `${t.branch_id}:${t.name}`;
    teachersByNameAndBranch.set(key, t.id);
  });
  
  // Мигрируем группы для каждого филиала
  let totalMigrated = 0;
  for (const [ourBranchId, groups] of groupsByBranch) {
    const migrated = await migrateGroupsForBranch(groups, ourBranchId, teachersByName, teachersByNameAndBranch);
    totalMigrated += migrated;
  }
  
  console.log(`✅ Всего мигрировано групп: ${totalMigrated}\n`);
}

async function migrateGroupsForBranch(groups, branchId, teachersByName = null, teachersByNameAndBranch = null) {
  if (groups.length === 0) return 0;
  
  console.log(`📊 Получено групп для филиала: ${groups.length}`);
  
  // Если teachersByName не передан, получаем учителей из БД (как в старом коде)
  if (!teachersByName) {
    const teachers = await pool.query('SELECT id, name FROM teachers');
    teachersByName = new Map();
    teachers.rows.forEach(t => {
      // Берем первого найденного учителя с таким именем (как в старом коде)
      if (!teachersByName.has(t.name)) {
        teachersByName.set(t.name, t.id);
      }
    });
  }
  
  // Если teachersByNameAndBranch не передан, создаем из teachersByName
  if (!teachersByNameAndBranch) {
    const teachers = await pool.query('SELECT id, name, branch_id FROM teachers');
    teachersByNameAndBranch = new Map();
    teachers.rows.forEach(t => {
      const key = `${t.branch_id}:${t.name}`;
      teachersByNameAndBranch.set(key, t.id);
    });
  }
  
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(groups.length, 0);
  
  let migrated = 0;
  
  for (const group of groups) {
    try {
      let teacherId = null;
      if (group.teacher_ids && Array.isArray(group.teacher_ids) && group.teacher_ids.length > 0) {
        // В AlfaCRM teacher_ids - это массив имен учителей (как в старом коде)
        const teacherName = group.teacher_ids[0];
        
        // Сначала ищем учителя в текущем филиале
        const key = `${branchId}:${teacherName}`;
        teacherId = teachersByNameAndBranch.get(key);
        
        // Если не нашли в текущем филиале, ищем по имени во всех филиалах (как в старом коде)
        if (!teacherId) {
          teacherId = teachersByName.get(teacherName) || null;
        }
      }
      
      // Создаем уникальный ID для каждого филиала, чтобы избежать конфликтов
      const uniqueGroupId = `${group.id?.toString()}_${branchId}`;
      
      // Проверяем, существует ли группа с таким ID и branch_id
      const existing = await pool.query(
        'SELECT id FROM groups WHERE id = $1 AND branch_id = $2',
        [uniqueGroupId, branchId]
      );
      
      if (existing.rows.length === 0) {
        // Группа не существует для этого филиала, создаем
        await pool.query(`
          INSERT INTO groups (id, name, subject, teacher_id, description, status, color, company_id, branch_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            subject = EXCLUDED.subject,
            teacher_id = EXCLUDED.teacher_id,
            description = EXCLUDED.description,
            status = EXCLUDED.status,
            color = EXCLUDED.color,
            company_id = EXCLUDED.company_id,
            branch_id = EXCLUDED.branch_id
        `, [
          uniqueGroupId,
          group.name || 'Unknown',
          'Английский язык', // Default subject (AlfaCRM не возвращает subject для групп)
          teacherId,
          group.note || '', // note в AlfaCRM это description
          'active',
          group.color || '#3b82f6',
          COMPANY_ID,
          branchId
        ]);
        migrated++;
      }
      
      migrated++;
    } catch (error) {
      console.error(`\n   ⚠️  Ошибка для ${group.name}: ${error.message}`);
    }
    
    progressBar.update(migrated);
  }
  
  progressBar.stop();
  return migrated;
}

// === МИГРАЦИЯ РАСПИСАНИЙ ГРУПП ===

async function migrateGroupSchedules(branchMapping) {
  console.log('\n📅 МИГРАЦИЯ РАСПИСАНИЙ ГРУПП\n');
  
  // УПРОЩЕННАЯ ЛОГИКА: получаем все расписания без фильтрации (как в старом скрипте)
  // и распределяем их по филиалам на основе branch_id в самом расписании
  const regularLessons = await fetchAllPages('/v2api/regular-lesson/index');
  console.log(`📊 Получено расписаний из AlfaCRM: ${regularLessons.length}`);
  
  // Получаем ВСЕ группы из БД (как в старом скрипте) - для проверки FK
  const allGroups = await pool.query('SELECT id FROM groups WHERE company_id = $1', [COMPANY_ID]);
  const allGroupIds = new Set(allGroups.rows.map(g => g.id));
  console.log(`📊 Найдено групп в БД: ${allGroupIds.size}`);
  
  // Получаем ВСЕ комнаты из БД
  const allRooms = await pool.query('SELECT id FROM rooms WHERE company_id = $1', [COMPANY_ID]);
  const allRoomIds = new Set(allRooms.rows.map(r => r.id));
  
  // Маппинг AlfaCRM branch_id -> наш branch_id
  const branchIdMap = new Map();
  if (branchMapping) {
    for (const [alfacrmBranchId, ourBranchId] of branchMapping.entries()) {
      if (alfacrmBranchId !== 'default') {
        branchIdMap.set(parseInt(alfacrmBranchId), ourBranchId);
      }
    }
  }
  
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(regularLessons.length, 0);
  
  let migrated = 0;
  let skipped = 0;
  
  for (const lesson of regularLessons) {
    try {
      // related_id - это ID группы из AlfaCRM
      const alfacrmGroupId = lesson.related_id?.toString() || null;
      
      // Пропускаем расписания без группы
      if (!alfacrmGroupId) {
        skipped++;
        progressBar.update(migrated + skipped);
        continue;
      }
      
      // Ищем группу: сначала по уникальному ID для каждого филиала, потом по оригинальному
      let groupIdToUse = null;
      let ourBranchId = null;
      
      // Сначала пытаемся найти группу по branch_id из расписания
      if (lesson.branch_id && branchIdMap.has(parseInt(lesson.branch_id))) {
        const branchIdFromLesson = branchIdMap.get(parseInt(lesson.branch_id));
        const uniqueGroupId = `${alfacrmGroupId}_${branchIdFromLesson}`;
        if (allGroupIds.has(uniqueGroupId)) {
          groupIdToUse = uniqueGroupId;
          ourBranchId = branchIdFromLesson;
        }
      }
      
      // Если не нашли, ищем группу в любом филиале
      if (!groupIdToUse) {
        const foundGroup = Array.from(allGroupIds).find(id => id.startsWith(`${alfacrmGroupId}_`));
        if (foundGroup) {
          groupIdToUse = foundGroup;
          // Извлекаем branch_id из ID группы
          const match = foundGroup.match(/^(\d+)_(.+)$/);
          if (match) {
            ourBranchId = match[2];
          }
        } else if (allGroupIds.has(alfacrmGroupId)) {
          // Fallback: группа без суффикса
          groupIdToUse = alfacrmGroupId;
          // Пытаемся определить филиал по branch_id из расписания или берем первый
          if (lesson.branch_id && branchIdMap.has(parseInt(lesson.branch_id))) {
            ourBranchId = branchIdMap.get(parseInt(lesson.branch_id));
          }
          if (!ourBranchId && branchIdMap.size > 0) {
            ourBranchId = Array.from(branchIdMap.values())[0];
          }
        }
      }
      
      // Если группа не найдена - пропускаем
      if (!groupIdToUse) {
        skipped++;
        progressBar.update(migrated + skipped);
        continue;
      }
      
      // Если филиал все еще не определен, используем первый доступный
      if (!ourBranchId && branchIdMap.size > 0) {
        ourBranchId = Array.from(branchIdMap.values())[0];
      }
      
      // teacher_ids в AlfaCRM - это массив числовых ID
      let teacherId = null;
      if (lesson.teacher_ids && Array.isArray(lesson.teacher_ids) && lesson.teacher_ids.length > 0) {
        teacherId = lesson.teacher_ids[0]?.toString();
      }
      
      // room_id - число, не массив из AlfaCRM
      const alfacrmRoomId = lesson.room_id?.toString() || null;
      let roomId = null;
      if (alfacrmRoomId) {
        if (ourBranchId) {
          const uniqueRoomId = `${alfacrmRoomId}_${ourBranchId}`;
          if (allRoomIds.has(uniqueRoomId)) {
            roomId = uniqueRoomId;
          }
        }
        if (!roomId) {
          // Ищем комнату в любом филиале
          const foundRoom = Array.from(allRoomIds).find(id => id.startsWith(`${alfacrmRoomId}_`));
          if (foundRoom) {
            roomId = foundRoom;
          } else if (allRoomIds.has(alfacrmRoomId)) {
            roomId = alfacrmRoomId;
          }
        }
      }
      
      // day - день недели
      const dayOfWeek = parseInt(lesson.day) || 1;
      
      // time_from_v и time_to_v - строки времени
      const timeFrom = lesson.time_from_v || '10:00';
      const timeTo = lesson.time_to_v || '11:00';
      
      // b_date и e_date - даты начала и окончания
      let startDate = new Date();
      let endDate = new Date();
      
      if (lesson.b_date) {
        startDate = new Date(lesson.b_date);
      }
      if (lesson.e_date) {
        endDate = new Date(lesson.e_date);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }
      
      // Create group schedule entry (как в старом скрипте)
      await pool.query(`
        INSERT INTO group_schedule (
          id, group_id, day_of_week, time_from, time_to,
          teacher_id, room_id, start_date, end_date, is_active, company_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          day_of_week = EXCLUDED.day_of_week,
          time_from = EXCLUDED.time_from,
          time_to = EXCLUDED.time_to,
          teacher_id = EXCLUDED.teacher_id,
          room_id = EXCLUDED.room_id,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          company_id = EXCLUDED.company_id
      `, [
        lesson.id?.toString(),
        groupIdToUse,
        dayOfWeek,
        timeFrom,
        timeTo,
        teacherId,
        roomId,
        startDate,
        endDate,
        true,
        COMPANY_ID
      ]);
      
      migrated++;
    } catch (error) {
      console.error(`\n   ⚠️  Ошибка: ${error.message}`);
      skipped++;
    }
    
    progressBar.update(migrated + skipped);
  }
  
  progressBar.stop();
  console.log(`✅ Мигрировано расписаний: ${migrated}`);
  if (skipped > 0) {
    console.log(`⚠️  Пропущено расписаний: ${skipped} (группы не найдены в БД)\n`);
  } else {
    console.log();
  }
}

// УДАЛЕНА: migrateGroupSchedulesForBranch - теперь используется упрощенная логика в migrateGroupSchedules
async function migrateGroupSchedulesForBranch_DEPRECATED(regularLessons, branchId) {
  // Получаем список всех групп из БД для проверки FK (в данном филиале)
  const existingGroups = await pool.query('SELECT id FROM groups WHERE company_id = $1 AND branch_id = $2', [COMPANY_ID, branchId]);
  const existingGroupIds = new Set(existingGroups.rows.map(g => g.id));
  
  // Получаем список всех комнат из БД для проверки FK (в данном филиале)
  const existingRooms = await pool.query('SELECT id FROM rooms WHERE company_id = $1 AND branch_id = $2', [COMPANY_ID, branchId]);
  const existingRoomIds = new Set(existingRooms.rows.map(r => r.id));
  
  console.log(`   📊 Для филиала ${branchId}: получено ${regularLessons.length} расписаний, найдено ${existingGroupIds.size} групп, ${existingRoomIds.size} комнат`);
  
  // Отладочное логирование: выводим первые несколько ID групп для проверки
  if (existingGroupIds.size > 0) {
    const sampleGroupIds = Array.from(existingGroupIds).slice(0, 5);
    console.log(`   📝 Примеры ID групп в БД для филиала ${branchId}: ${sampleGroupIds.join(', ')}`);
  }
  
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(regularLessons.length, 0);
  
  let migrated = 0;
  let skipped = 0;
  let skippedNoGroup = 0;
  let skippedGroupNotFound = 0;
  let skippedNoRelatedId = 0;
  
  for (const lesson of regularLessons) {
    try {
      // related_id - это ID группы из AlfaCRM
      const alfacrmGroupId = lesson.related_id?.toString() || null;
      
      // Пропускаем расписания без группы
      if (!alfacrmGroupId) {
        skippedNoRelatedId++;
        skipped++;
        progressBar.update(migrated + skipped);
        continue;
      }
      
      // Группы созданы с уникальными ID: ${groupId}_${branchId}
      const uniqueGroupId = `${alfacrmGroupId}_${branchId}`;
      
      // Определяем, какую группу использовать
      let groupIdToUse = null;
      if (existingGroupIds.has(uniqueGroupId)) {
        groupIdToUse = uniqueGroupId;
      } else if (existingGroupIds.has(alfacrmGroupId)) {
        // Fallback: группа найдена без суффикса (для совместимости)
        groupIdToUse = alfacrmGroupId;
      } else {
        // Группа не найдена в текущем филиале, проверяем в других филиалах
        const allGroupsCheck = await pool.query(
          'SELECT id, branch_id FROM groups WHERE id LIKE $1 AND company_id = $2',
          [`${alfacrmGroupId}_%`, COMPANY_ID]
        );
        
        if (allGroupsCheck.rows.length > 0) {
          // Группа найдена в другом филиале - используем её для создания расписания
          // Это может быть нормально, если группа работает в нескольких филиалах
          groupIdToUse = allGroupsCheck.rows[0].id;
          const foundInBranch = allGroupsCheck.rows[0].branch_id;
          if (skippedGroupNotFound < 5) {
            console.log(`   💡 Группа ${alfacrmGroupId} не найдена в филиале ${branchId}, но найдена в филиале ${foundInBranch}. Используем группу из другого филиала.`);
          }
        } else {
          // Группа вообще не найдена ни в одном филиале
          // Это означает, что группа не была мигрирована - возможно, она была удалена/архивирована в AlfaCRM
          // или не возвращается API из-за фильтрации
          skippedGroupNotFound++;
          skipped++;
          if (skippedGroupNotFound <= 10) {
            console.log(`   ⚠️  Группа не найдена ни в одном филиале: alfacrmGroupId=${alfacrmGroupId}, uniqueGroupId=${uniqueGroupId}, lesson.id=${lesson.id}`);
            console.log(`      💡 Возможно, группа была удалена/архивирована в AlfaCRM, но расписание осталось.`);
          }
          progressBar.update(migrated + skipped);
          continue;
        }
      }
      
      // teacher_ids в AlfaCRM - это массив числовых ID
      let teacherId = null;
      if (lesson.teacher_ids && Array.isArray(lesson.teacher_ids) && lesson.teacher_ids.length > 0) {
        teacherId = lesson.teacher_ids[0]?.toString();
      }
      
      // room_id - число, не массив из AlfaCRM
      // Комнаты созданы с уникальными ID: ${roomId}_${branchId}
      const alfacrmRoomId = lesson.room_id?.toString() || null;
      let roomId = null;
      if (alfacrmRoomId) {
        const uniqueRoomId = `${alfacrmRoomId}_${branchId}`;
        // Проверяем, существует ли комната с таким уникальным ID
        if (existingRoomIds.has(uniqueRoomId)) {
          roomId = uniqueRoomId;
        } else {
          // Комната не найдена в текущем филиале, проверяем в других филиалах
          const allRoomsCheck = await pool.query(
            'SELECT id FROM rooms WHERE id LIKE $1 AND company_id = $2 LIMIT 1',
            [`${alfacrmRoomId}_%`, COMPANY_ID]
          );
          if (allRoomsCheck.rows.length > 0) {
            roomId = allRoomsCheck.rows[0].id;
          }
          // Если комната не найдена ни в одном филиале, оставляем roomId = null (расписание все равно создастся)
        }
      }
      
      // day - день недели
      const dayOfWeek = parseInt(lesson.day) || 1;
      
      // time_from_v и time_to_v - строки времени
      const timeFrom = lesson.time_from_v || '10:00';
      const timeTo = lesson.time_to_v || '11:00';
      
      // b_date и e_date - даты начала и окончания
      let startDate = new Date();
      let endDate = new Date();
      
      if (lesson.b_date) {
        startDate = new Date(lesson.b_date);
      }
      if (lesson.e_date) {
        endDate = new Date(lesson.e_date);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }
      
      // Create group schedule entry
      // Примечание: group_schedule не имеет branch_id, но группа уже привязана к филиалу
      await pool.query(`
        INSERT INTO group_schedule (
          id, group_id, day_of_week, time_from, time_to,
          teacher_id, room_id, start_date, end_date, is_active, company_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          day_of_week = EXCLUDED.day_of_week,
          time_from = EXCLUDED.time_from,
          time_to = EXCLUDED.time_to,
          teacher_id = EXCLUDED.teacher_id,
          room_id = EXCLUDED.room_id,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          company_id = EXCLUDED.company_id
      `, [
        lesson.id?.toString(),
        groupIdToUse,
        dayOfWeek,
        timeFrom,
        timeTo,
        teacherId,
        roomId,
        startDate,
        endDate,
        true,
        COMPANY_ID
      ]);
      
      migrated++;
    } catch (error) {
      console.error(`\n   ⚠️  Ошибка: ${error.message}`);
      skipped++;
    }
    
    progressBar.update(migrated + skipped);
  }
  
  progressBar.stop();
  if (skipped > 0) {
    console.log(`   ⚠️  Пропущено расписаний: ${skipped}`);
    if (skippedNoRelatedId > 0) {
      console.log(`      - Без related_id: ${skippedNoRelatedId}`);
    }
    if (skippedGroupNotFound > 0) {
      console.log(`      - Группы не найдены в БД: ${skippedGroupNotFound}`);
    }
  }
  console.log(`   ✅ Успешно мигрировано расписаний: ${migrated}`);
  return migrated;
}

// === МИГРАЦИЯ СТУДЕНТОВ ===

async function migrateStudents(branchMapping) {
  console.log('\n🎓 МИГРАЦИЯ СТУДЕНТОВ\n');
  
  // Если branchMapping === null, используем fallback режим
  if (!branchMapping || branchMapping.size === 0) {
    const customers = await fetchAllPages('/v2api/customer/index');
    await migrateStudentsForBranch(customers, DEFAULT_BRANCH_ID || COMPANY_ID);
    return;
  }
  
  // Согласно документации AlfaCRM API, для получения данных по филиалу
  // нужно указывать филиал в URL: /v2api/{branch}/customer/index
  console.log(`📊 Запрашиваем студентов для каждого филиала из AlfaCRM...`);
  
  const customersByBranch = new Map(); // ourBranchId -> [customers]
  const customerIdToBranches = new Map(); // customerId -> Set of ourBranchIds (для отслеживания, в какие филиалы уже добавлен студент)
  
  // Получаем все филиалы из branchMapping (исключаем 'default')
  const allBranches = Array.from(branchMapping.entries()).filter(([id]) => id !== 'default'); // [alfacrmBranchId, ourBranchId]
  
  // Для каждого филиала делаем отдельный запрос с филиалом в URL
  for (const [alfacrmBranchId, ourBranchId] of allBranches) {
    try {
      console.log(`🔄 Запрос студентов для филиала: AlfaCRM ID: ${alfacrmBranchId} (тип: ${typeof alfacrmBranchId}) → наш ID: ${ourBranchId}`);
      const customers = await fetchAllPages('/v2api/customer/index', {}, alfacrmBranchId);
      
      let addedCount = 0;
      // Добавляем студентов для текущего филиала
      // Если студент уже добавлен в другой филиал, все равно добавляем его в текущий (студент может быть в нескольких филиалах)
      for (const customer of customers) {
        const customerId = customer.id?.toString();
        if (customerId) {
          // Проверяем, не добавлен ли уже этот студент в этот конкретный филиал
          const branchesForCustomer = customerIdToBranches.get(customerId) || new Set();
          if (!branchesForCustomer.has(ourBranchId)) {
            branchesForCustomer.add(ourBranchId);
            customerIdToBranches.set(customerId, branchesForCustomer);
            
            if (!customersByBranch.has(ourBranchId)) {
              customersByBranch.set(ourBranchId, []);
            }
            customersByBranch.get(ourBranchId).push(customer);
            addedCount++;
          }
        }
      }
      
      console.log(`   ✅ Филиал ${alfacrmBranchId} (${ourBranchId}): получено ${customers.length} студентов, добавлено ${addedCount} (уникальных для этого филиала)`);
    } catch (error) {
      console.error(`   ⚠️  Ошибка при запросе студентов для филиала ${alfacrmBranchId}: ${error.message}`);
    }
  }
  
  // Выводим статистику по филиалам
  console.log(`\n📊 Статистика распределения студентов по филиалам:`);
  for (const [ourBranchId, customers] of customersByBranch) {
    console.log(`   Филиал ${ourBranchId}: ${customers.length} студентов`);
  }
  
  // Мигрируем студентов для каждого филиала
  let totalMigrated = 0;
  let totalSkipped = 0;
  for (const [ourBranchId, customers] of customersByBranch) {
    const { migrated, skipped } = await migrateStudentsForBranch(customers, ourBranchId);
    totalMigrated += migrated;
    totalSkipped += skipped;
  }
  
  console.log(`✅ Всего мигрировано студентов: ${totalMigrated}`);
  if (totalSkipped > 0) {
    console.log(`⚠️  Пропущено: ${totalSkipped}\n`);
  } else {
    console.log();
  }
}

async function migrateStudentsForBranch(customers, branchId) {
  if (customers.length === 0) return { migrated: 0, skipped: 0 };
  
  console.log(`📊 Получено клиентов для филиала: ${customers.length}`);
  
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(customers.length, 0);
  
  let migrated = 0;
  let skipped = 0;
  
  for (const customer of customers) {
    try {
      // Email: массив строк или объектов
      let email = '';
      if (Array.isArray(customer.email) && customer.email.length > 0) {
        email = typeof customer.email[0] === 'string' ? customer.email[0] : (customer.email[0]?.value || '');
      } else if (typeof customer.email === 'string') {
        email = customer.email;
      }
      if (!email || email.trim() === '') {
        email = `student_${customer.id}@temp.local`;
      }
      
      // Phone: массив строк или объектов
      let phone = '';
      if (Array.isArray(customer.phone) && customer.phone.length > 0) {
        phone = typeof customer.phone[0] === 'string' ? customer.phone[0] : (customer.phone[0]?.value || '');
      } else if (typeof customer.phone === 'string') {
        phone = customer.phone;
      }
      
      // Age: вычисляем из dob или null
      let age = null;
      if (customer.dob && customer.dob.trim() !== '') {
        const birthDate = new Date(customer.dob);
        if (!isNaN(birthDate.getTime())) {
          const today = new Date();
          age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
        }
      }
      
      const balance = parseFloat(customer.balance || 0);
      
      // Status: В AlfaCRM нет is_active для customers.
      // Проверяем is_study (1 = учится, 0 = не учится) и e_date
      let status = 'active'; // По умолчанию активный
      if (customer.is_study === 0 || customer.is_study === '0') {
        status = 'inactive';
      } else if (customer.e_date && customer.e_date !== '2030-12-31') {
        const endDate = new Date(customer.e_date);
        const today = new Date();
        if (endDate < today) {
          status = 'inactive';
        }
      }
      
      const result = await pool.query(`
        INSERT INTO students (id, name, email, phone, age, status, company_id, branch_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          age = EXCLUDED.age,
          status = EXCLUDED.status,
          company_id = EXCLUDED.company_id,
          branch_id = EXCLUDED.branch_id
        RETURNING id
      `, [
        customer.id?.toString(),
        customer.name || 'Unknown',
        email,
        phone,
        age,
        status,
        COMPANY_ID,
        branchId
      ]);
      
      const studentId = result.rows[0].id;
      
      // Создаем баланс с version для optimistic locking
      await pool.query(`
        INSERT INTO student_balance (student_id, balance, version)
        VALUES ($1, $2, 0)
        ON CONFLICT (student_id) DO UPDATE SET balance = EXCLUDED.balance, version = student_balance.version
      `, [studentId, balance]);
      
      migrated++;
    } catch (error) {
      console.error(`\n   ⚠️  Ошибка для ${customer.name}: ${error.message}`);
      skipped++;
    }
    
    progressBar.update(migrated + skipped);
  }
  
  progressBar.stop();
  return { migrated, skipped };
}

// === МИГРАЦИЯ АБОНЕМЕНТОВ СТУДЕНТОВ (SMART) ===

// Кэш цен уроков студентов из AlfaCRM
const studentPricesCache = new Map();

/**
 * Загружает цены уроков всех студентов из AlfaCRM
 * Использует ПОСЛЕДНЮЮ (актуальную) цену урока для каждого студента
 */
async function preloadStudentPrices(branchMapping = null) {
  console.log('\n💰 ПРЕДЗАГРУЗКА ЦЕН УРОКОВ ИЗ ALFACRM\n');
  
  const token = await getAlfaCRMToken();
  let page = 0;
  
  // Предзагружаем цены для всех филиалов (если есть branchMapping)
  // Или для всех уроков (если branchMapping === null)
  
  while (page < 20) {
    try {
      const requestParams = { page, count: 50 };
      
      const response = await axios.post(`${ALFACRM_API_URL}/v2api/lesson/index`, requestParams, {
        headers: { 'X-ALFACRM-TOKEN': token },
      });
      
      const lessons = response.data.items || [];
      if (lessons.length === 0) break;
      
      for (const lesson of lessons) {
        const details = lesson.details || [];
        for (const detail of details) {
          if (detail.is_attend === 1 && detail.commission && detail.customer_id) {
            const customerId = detail.customer_id.toString();
            const commission = parseFloat(detail.commission);
            
            // Сохраняем последнюю (самую свежую) цену для каждого студента
            // Т.к. уроки идут от новых к старым, первая встреченная цена = последняя (актуальная)
            if (!studentPricesCache.has(customerId)) {
              studentPricesCache.set(customerId, commission);
            }
          }
        }
      }
      
      page++;
      
      if (page % 5 === 0) {
        console.log(`   Обработано страниц: ${page}`);
      }
      
    } catch (error) {
      console.error(`   ⚠️  Ошибка на странице ${page}: ${error.message}`);
      break;
    }
  }
  
  console.log(`\n✅ Загружено цен для ${studentPricesCache.size} студентов\n`);
}

async function migrateStudentSubscriptions(branchMapping) {
  console.log('\n🎫 МИГРАЦИЯ АБОНЕМЕНТОВ СТУДЕНТОВ\n');
  
  // Если branchMapping === null, используем fallback режим
  if (!branchMapping || branchMapping.size === 0) {
    const customers = await fetchAllPages('/v2api/customer/index');
    const groups = await pool.query('SELECT id FROM groups WHERE company_id = $1', [COMPANY_ID]);
    await migrateStudentSubscriptionsForBranch(customers, groups.rows.map(g => g.id), DEFAULT_BRANCH_ID || COMPANY_ID);
    return;
  }
  
  // Мигрируем абонементы для каждого филиала (исключаем 'default')
  let totalCreated = 0;
  let totalSkipped = 0;
  
  const allBranches = Array.from(branchMapping.entries()).filter(([id]) => id !== 'default');
  for (const [alfacrmBranchId, ourBranchId] of allBranches) {
    const customers = await fetchAllPages('/v2api/customer/index', {}, alfacrmBranchId);
    const groups = await pool.query('SELECT id FROM groups WHERE company_id = $1 AND branch_id = $2', [COMPANY_ID, ourBranchId]);
    const groupIds = groups.rows.map(g => g.id);
    
    const { created, skipped } = await migrateStudentSubscriptionsForBranch(customers, groupIds, ourBranchId);
    totalCreated += created;
    totalSkipped += skipped;
  }
  
  console.log(`✅ Всего создано абонементов: ${totalCreated}`);
  if (totalSkipped > 0) {
    console.log(`⚠️  Пропущено: ${totalSkipped}\n`);
  } else {
    console.log();
  }
}

async function migrateStudentSubscriptionsForBranch(customers, groupIds, branchId) {
  
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(customers.length, 0);
  
  let created = 0;
  let skipped = 0;
  
  for (const customer of customers) {
    try {
      const studentId = customer.id?.toString();
      const paidCount = customer.paid_count || customer.paid_lesson_count || 0;
      const paidTill = customer.paid_till || null;
      const balance = parseFloat(customer.balance || 0);
      
      // Пропускаем если нет занятий и баланса (как в старом коде)
      // Но создаем абонемент если:
      // 1. Есть paid_till в будущем (активный абонемент)
      // 2. У студента есть активная группа (enrollment) - значит он учится
      const hasActiveSubscription = paidTill && new Date(paidTill) >= new Date();
      
      // Проверяем, есть ли у студента активная группа
      let hasActiveGroup = false;
      if (customer.group_ids && customer.group_ids.length > 0) {
        const alfacrmGroupId = customer.group_ids[0].toString();
        const uniqueGroupId = `${alfacrmGroupId}_${branchId}`;
        // Проверяем, существует ли группа в БД
        const groupCheck = await pool.query(
          'SELECT id FROM groups WHERE id = $1 AND branch_id = $2',
          [uniqueGroupId, branchId]
        );
        if (groupCheck.rows.length > 0) {
          // Проверяем, есть ли активная связь enrollment
          const enrollmentCheck = await pool.query(
            'SELECT id FROM enrollment WHERE student_id = $1 AND group_id = $2 AND left_at IS NULL',
            [studentId, uniqueGroupId]
          );
          hasActiveGroup = enrollmentCheck.rows.length > 0;
        }
      }
      
      if (paidCount <= 0 && balance <= 0) {
        // Если нет активного абонемента и нет активной группы, пропускаем
        if (!hasActiveSubscription && !hasActiveGroup) {
          skipped++;
          progressBar.update(created + skipped);
          continue;
        }
        // Если есть активный абонемент или активная группа, создаем абонемент даже без paidCount и balance
      }
      
      // Определяем группу студента
      // Важно: группы в БД имеют уникальные ID с суффиксом филиала: ${alfacrmGroupId}_${branchId}
      let groupId = null;
      if (customer.group_ids && customer.group_ids.length > 0) {
        const alfacrmGroupId = customer.group_ids[0].toString();
        // Ищем группу с уникальным ID: ${alfacrmGroupId}_${branchId}
        const uniqueGroupId = `${alfacrmGroupId}_${branchId}`;
        if (groupIds.includes(uniqueGroupId)) {
          groupId = uniqueGroupId;
        } else if (groupIds.includes(alfacrmGroupId)) {
          // Fallback: пробуем найти без суффикса (для совместимости)
          groupId = alfacrmGroupId;
        }
      }
      
      const totalLessons = paidCount || 8;
      const usedLessons = 0;
      // remaining_lessons - GENERATED колонка в БД, вычисляется автоматически
      const calculatedRemaining = totalLessons - usedLessons;
      
      // ИСПРАВЛЕНО: Используем реальную цену урока из AlfaCRM (последняя актуальная цена)
      // Если цены нет в кэше - вычисляем из баланса как fallback
      const realPriceFromAlfaCRM = studentPricesCache.get(studentId);
      const avgPricePerLesson = realPriceFromAlfaCRM || (balance > 0 && totalLessons > 0 ? balance / totalLessons : 3000);
      const totalPrice = avgPricePerLesson * totalLessons;
      
      const startDate = new Date();
      const endDate = paidTill ? new Date(paidTill) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      
      // Определяем статус подписки правильно
      let status = 'active';
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Обнуляем время для корректного сравнения дат
      
      if (endDate && endDate < today) {
        status = 'expired';
      } else if (paidCount <= 0 && balance <= 0 && (!paidTill || new Date(paidTill) < today)) {
        status = 'expired';
      } else if (calculatedRemaining <= 0) {
        status = 'expired';
      }
      
      // Находим subscription_type_id (как в старом коде - без фильтрации по branch_id)
      // В старом коде не было фильтрации по branch_id, поэтому ищем по всей компании
      const typeResult = await pool.query(`
        SELECT id FROM subscription_types
        WHERE lessons_count >= $1 AND company_id = $2
        ORDER BY ABS(lessons_count - $1)
        LIMIT 1
      `, [totalLessons, COMPANY_ID]);
      
      let subscriptionTypeId = null;
      if (typeResult.rows.length > 0) {
        subscriptionTypeId = typeResult.rows[0].id;
      }
      
      // Создаем уникальный ID абонемента с учетом филиала
      // Это важно, так как один студент может иметь абонементы в разных филиалах
      // Используем хеш branch_id для компактности
      const branchHash = branchId.substring(branchId.length - 8); // Последние 8 символов branch_id
      const subscriptionId = `sub_${studentId}_${branchHash}_${Date.now()}`;
      
      // Важно: subscription_type_id может быть NULL, но остальные поля обязательны
      // remaining_lessons - GENERATED колонка, вычисляется автоматически
      // teacher_id и paid_till - опциональные поля
      // Используем ON CONFLICT DO NOTHING как в старом коде
      await pool.query(`
        INSERT INTO student_subscriptions (
          id, student_id, subscription_type_id, group_id, teacher_id,
          total_lessons, used_lessons, total_price, price_per_lesson,
          start_date, end_date, paid_till, status, freeze_days_remaining, company_id, branch_id, version
        )
        VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 0)
        ON CONFLICT (id) DO NOTHING
      `, [
        subscriptionId, studentId, subscriptionTypeId, groupId,
        totalLessons, usedLessons, totalPrice, avgPricePerLesson,
        startDate, endDate, paidTill, status, 0, COMPANY_ID, branchId
      ]);
      
      // Связываем студента с группой через enrollment
      if (groupId) {
        await pool.query(`
          INSERT INTO enrollment (student_id, group_id, joined_at, company_id, branch_id)
          VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4)
          ON CONFLICT (student_id, group_id) WHERE left_at IS NULL DO NOTHING
        `, [studentId, groupId, COMPANY_ID, branchId]);
      }
      
      created++;
    } catch (error) {
      console.error(`\n   ⚠️  Ошибка: ${error.message}`);
      skipped++;
    }
    
    progressBar.update(created + skipped);
  }
  
  progressBar.stop();
  return { created, skipped };
}

// === МИГРАЦИЯ ТРАНЗАКЦИЙ ===
// Примечание: AlfaCRM API не предоставляет отдельный эндпоинт для истории платежей
// Рассчитываем общую оплату: Текущий баланс + Сумма всех списаний за посещения

async function migrateTransactions(studentDeductions = null, branchMapping = null) {
  console.log('\n💰 СОЗДАНИЕ ТРАНЗАКЦИЙ С РАСЧЕТОМ ОБЩЕЙ ОПЛАТЫ\n');
  
  if (studentDeductions && studentDeductions.size > 0) {
    console.log(`📊 Используем данные о списаниях для ${studentDeductions.size} студентов\n`);
  }
  
  // Если есть branchMapping, создаем транзакции для каждого филиала
  if (branchMapping && branchMapping.size > 0) {
    let totalCreated = 0;
    const allBranches = Array.from(branchMapping.entries()).filter(([id]) => id !== 'default');
    for (const [alfacrmBranchId, ourBranchId] of allBranches) {
      const balances = await pool.query(`
        SELECT sb.student_id, sb.balance, s.name
        FROM student_balance sb
        JOIN students s ON sb.student_id = s.id
        WHERE s.branch_id = $1
      `, [ourBranchId]);
      
      const created = await migrateTransactionsForBranch(balances.rows, studentDeductions, ourBranchId);
      totalCreated += created;
    }
    
    console.log(`✅ Всего создано транзакций: ${totalCreated}\n`);
    return;
  }
  
  // Fallback режим
  const balances = await pool.query(`
    SELECT sb.student_id, sb.balance, s.name
    FROM student_balance sb
    JOIN students s ON sb.student_id = s.id
  `);
  
  const created = await migrateTransactionsForBranch(balances.rows, studentDeductions, DEFAULT_BRANCH_ID || COMPANY_ID);
  console.log(`✅ Создано транзакций: ${created}\n`);
}

async function migrateTransactionsForBranch(balances, studentDeductions, branchId) {
  if (!balances || balances.length === 0) return 0;
  
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(balances.length, 0);
  
  let created = 0;
  const transactionDate = new Date('2025-01-01');
  
  for (const balance of balances) {
    try {
      const currentBalance = parseFloat(balance.balance) || 0;
      const deducted = studentDeductions ? (studentDeductions.get(balance.student_id) || 0) : 0;
      
      // Рассчитываем общую оплату: баланс + списания
      const totalPaid = currentBalance + deducted;
      
      // Создаем транзакцию только если есть что создавать
      if (totalPaid !== 0) {
        const amount = Math.abs(totalPaid);
        const type = totalPaid > 0 ? 'payment' : 'debt';
        
        let description = '';
        if (deducted > 0) {
          description = `Общая оплата из AlfaCRM (баланс: ${currentBalance.toFixed(2)} ₸ + списано за уроки: ${deducted.toFixed(2)} ₸)`;
        } else {
          description = `Начальный баланс из AlfaCRM (${currentBalance.toFixed(2)} ₸)`;
        }
        
        // created_by = NULL для исторических транзакций из миграции
        await pool.query(`
          INSERT INTO payment_transactions (
            student_id, amount, type, payment_method, description, created_at, created_by, company_id, branch_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, NULL, $7, $8)
        `, [
          balance.student_id,
          amount,
          type,
          'transfer',
          description,
          transactionDate,
          COMPANY_ID,
          branchId
        ]);
        
        created++;
      }
    } catch (error) {
      console.error(`\n   ⚠️  ${balance.name}: ${error.message}`);
    }
    
    progressBar.update(created);
  }
  
  progressBar.stop();
  return created;
}

// === МИГРАЦИЯ ИСТОРИИ ПОСЕЩЕНИЙ УРОКОВ ===

async function migrateLessonHistory(branchMapping = null) {
  console.log('\n📚 МИГРАЦИЯ ИСТОРИИ ПОСЕЩЕНИЙ УРОКОВ (последний месяц)\n');
  
  // Если есть branchMapping, мигрируем для каждого филиала (исключаем 'default')
  if (branchMapping && branchMapping.size > 0) {
    let totalAttendanceCreated = 0;
    let totalSkipped = 0;
    const allStudentDeductions = new Map();
    
    const allBranches = Array.from(branchMapping.entries()).filter(([id]) => id !== 'default');
    for (const [alfacrmBranchId, ourBranchId] of allBranches) {
      const { attendanceCreated, skipped, studentDeductions } = await migrateLessonHistoryForBranch(alfacrmBranchId, ourBranchId);
      totalAttendanceCreated += attendanceCreated;
      totalSkipped += skipped;
      
      // Объединяем списания
      for (const [studentId, amount] of studentDeductions) {
        const currentTotal = allStudentDeductions.get(studentId) || 0;
        allStudentDeductions.set(studentId, currentTotal + amount);
      }
    }
    
    console.log(`✅ Всего создано записей посещений: ${totalAttendanceCreated}`);
    if (totalSkipped > 0) {
      console.log(`⚠️  Пропущено уроков: ${totalSkipped}`);
    }
    console.log(`📊 Рассчитаны списания для ${allStudentDeductions.size} студентов\n`);
    
    return allStudentDeductions;
  }
  
  // Fallback режим
  return await migrateLessonHistoryForBranch(null, DEFAULT_BRANCH_ID || COMPANY_ID);
}

async function migrateLessonHistoryForBranch(alfacrmBranchId, ourBranchId) {
  // Получаем все уроки с историей посещений из AlfaCRM
  const token = await getAlfaCRMToken();
  const lessons = [];
  
  // Дата начала периода (1 месяц назад)
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  
  console.log(`🔄 Получение уроков с ${oneMonthAgo.toLocaleDateString('ru-RU')} по сегодня...`);
  
  // Получаем уроки постранично, но прекращаем когда достигнем уроков старше 1 месяца
  let page = 0;
  let shouldContinue = true;
  
  // Используем URL path filtering для получения уроков по филиалу
  let actualEndpoint = '/v2api/lesson/index';
  if (alfacrmBranchId !== null && alfacrmBranchId !== 'default') {
    const branchIdNum = typeof alfacrmBranchId === 'string' && alfacrmBranchId !== 'default' ? parseInt(alfacrmBranchId) : alfacrmBranchId;
    if (!isNaN(branchIdNum) && branchIdNum !== 'default') {
      actualEndpoint = `/v2api/${branchIdNum}/lesson/index`;
    }
  }
  
  while (shouldContinue) {
    try {
      const response = await axios.post(`${ALFACRM_API_URL}${actualEndpoint}`, {
        page,
        count: 50,
      }, {
        headers: { 'X-ALFACRM-TOKEN': token },
      });
      
      const items = response.data.items || [];
      if (items.length === 0) break;
      
      // Проверяем даты уроков на текущей странице
      for (const lesson of items) {
        const lessonDate = lesson.date ? new Date(lesson.date) : null;
        
        // Если урок старше 1 месяца, прекращаем загрузку
        if (lessonDate && lessonDate < oneMonthAgo) {
          shouldContinue = false;
          break;
        }
        
        // Если урок в пределах 1 месяца, добавляем его
        if (lessonDate && lessonDate >= oneMonthAgo) {
          lessons.push(lesson);
        }
      }
      
      console.log(`   📄 Страница ${page}: получено ${items.length} уроков (отобрано: ${lessons.length})`);
      page++;
      
      // Ограничение для безопасности (максимум 20 страниц для 1 месяца)
      if (page >= 20) {
        console.log('   ⚠️  Достигнут лимит страниц (20), прекращаем загрузку');
        break;
      }
      
    } catch (error) {
      console.error(`   ❌ Ошибка на странице ${page}: ${error.message}`);
      break;
    }
  }
  
  console.log(`\n📊 Получено уроков за последний месяц: ${lessons.length}`);
  
  if (lessons.length === 0) {
    console.log('⚠️  Нет уроков для миграции\n');
    return { attendanceCreated: 0, skipped: 0, studentDeductions: new Map() };
  }
  
  // Фильтруем только прошедшие уроки с посещениями (в пределах 1 месяца)
  const today = new Date();
  const completedLessons = lessons.filter(lesson => {
    const lessonDate = lesson.date ? new Date(lesson.date) : null;
    return lessonDate && 
           lessonDate >= oneMonthAgo && 
           lessonDate < today && 
           lesson.customer_ids && 
           lesson.customer_ids.length > 0;
  });
  
  console.log(`📊 Прошедших уроков с посещениями: ${completedLessons.length}\n`);
  
  if (completedLessons.length === 0) {
    console.log('⚠️  Нет прошедших уроков для миграции\n');
    return { attendanceCreated: 0, skipped: 0, studentDeductions: new Map() };
  }
  
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(completedLessons.length, 0);
  
  let attendanceCreated = 0;
  let skipped = 0;
  
  // Статистика списаний по студентам (для расчета общей оплаты)
  const studentDeductions = new Map(); // studentId -> total deducted amount
  
  for (const lesson of completedLessons) {
    try {
      const lessonDate = new Date(lesson.date);
      const customerIds = lesson.customer_ids || [];
      
      // Используем details для получения точной информации о посещениях и стоимости
      const details = lesson.details || [];
      
      if (details.length === 0) {
        // Если нет details, используем старую логику
        const customerIds = lesson.customer_ids || [];
        
        for (const customerId of customerIds) {
          try {
            const studentExists = await pool.query(
              'SELECT id FROM students WHERE id = $1 AND company_id = $2 AND branch_id = $3',
              [customerId.toString(), COMPANY_ID, ourBranchId]
            );
            
            if (studentExists.rows.length === 0) continue;
            
            // Получаем ЛЮБОЙ абонемент студента (для исторических данных берем любой)
            const subscription = await pool.query(`
              SELECT id FROM student_subscriptions
              WHERE student_id = $1 AND company_id = $2 AND branch_id = $3
              ORDER BY created_at DESC
              LIMIT 1
            `, [customerId.toString(), COMPANY_ID, ourBranchId]);
            
            const subscriptionId = subscription.rows.length > 0 ? subscription.rows[0].id : null;
            const lessonId = lesson.id ? lesson.id.toString() : `lesson-${uuidv4()}`;
            
            // ВАЖНО: Сначала создаем урок в таблице lessons
            // Комбинируем дату урока с временем начала/конца
            const startTime = new Date(lessonDate);
            const endTime = new Date(lessonDate);
            
            if (lesson.time_from) {
              const [hours, minutes] = lesson.time_from.split(':');
              startTime.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
            }
            if (lesson.time_to) {
              const [hours, minutes] = lesson.time_to.split(':');
              endTime.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
            }
            
            await pool.query(`
              INSERT INTO lessons (
                id, title, subject, teacher_id, group_id, start_time, end_time, 
                status, company_id, branch_id
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              ON CONFLICT (id) DO NOTHING
            `, [
              lessonId,
              lesson.subject || 'Урок',
              lesson.subject || 'Общий',
              lesson.teacher_id?.toString() || null,
              lesson.group_id?.toString() || null,
              startTime,
              endTime,
              'completed',
              COMPANY_ID,
              ourBranchId
            ]);
            
            // Теперь создаем запись посещения
            await pool.query(`
              INSERT INTO lesson_attendance (
                lesson_id, student_id, subscription_id, status, 
                marked_at, company_id, branch_id
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)
              ON CONFLICT DO NOTHING
            `, [lessonId, customerId.toString(), subscriptionId, 'attended', lessonDate, COMPANY_ID, ourBranchId]);
            
            attendanceCreated++;
          } catch (error) {
            // Логируем первые несколько ошибок для диагностики
            if (attendanceCreated === 0) {
              console.error(`\n   ⚠️  Ошибка для студента ${customerId}: ${error.message}`);
            }
            continue;
          }
        }
      } else {
        // Используем details - точная информация о посещении и стоимости
        for (const detail of details) {
          try {
            const customerId = detail.customer_id?.toString();
            if (!customerId) continue;
            
            // Проверяем что студент существует
            const studentExists = await pool.query(
              'SELECT id FROM students WHERE id = $1 AND company_id = $2 AND branch_id = $3',
              [customerId, COMPANY_ID, ourBranchId]
            );
            
            if (studentExists.rows.length === 0) continue;
            
            // Определяем статус посещения
            let status = 'attended';
            if (detail.is_attend === 0) {
              status = detail.reason_id ? 'missed' : 'cancelled';
            }
            
            // Пропускаем не посещенные уроки (мы мигрируем только посещения)
            if (status !== 'attended') continue;
            
            // Получаем ЛЮБОЙ абонемент студента (для исторических данных берем любой)
            const subscription = await pool.query(`
              SELECT id FROM student_subscriptions
              WHERE student_id = $1 AND company_id = $2 AND branch_id = $3
              ORDER BY created_at DESC
              LIMIT 1
            `, [customerId, COMPANY_ID, ourBranchId]);
            
            const subscriptionId = subscription.rows.length > 0 ? subscription.rows[0].id : null;
            const lessonId = lesson.id ? lesson.id.toString() : `lesson-${uuidv4()}`;
            
            // ВАЖНО: Сначала создаем урок в таблице lessons (для foreign key)
            // Комбинируем дату урока с временем начала/конца
            const startTime = new Date(lessonDate);
            const endTime = new Date(lessonDate);
            
            if (lesson.time_from) {
              const [hours, minutes] = lesson.time_from.split(':');
              startTime.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
            }
            if (lesson.time_to) {
              const [hours, minutes] = lesson.time_to.split(':');
              endTime.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
            }
            
            await pool.query(`
              INSERT INTO lessons (
                id, title, subject, teacher_id, group_id, start_time, end_time, 
                status, company_id, branch_id
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              ON CONFLICT (id) DO NOTHING
            `, [
              lessonId,
              lesson.subject || 'Урок',
              lesson.subject || 'Общий',
              lesson.teacher_id?.toString() || null,
              lesson.group_id?.toString() || null,
              startTime,
              endTime,
              'completed',
              COMPANY_ID,
              ourBranchId
            ]);
            
            // Теперь создаем запись посещения
            await pool.query(`
              INSERT INTO lesson_attendance (
                lesson_id, student_id, subscription_id, status, 
                marked_at, company_id, branch_id
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)
              ON CONFLICT DO NOTHING
            `, [lessonId, customerId, subscriptionId, status, lessonDate, COMPANY_ID, ourBranchId]);
            
            attendanceCreated++;
            
            // Учитываем списание для статистики
            const commission = parseFloat(detail.commission || 0);
            if (commission > 0) {
              const currentTotal = studentDeductions.get(customerId) || 0;
              studentDeductions.set(customerId, currentTotal + commission);
              
              // Создаем транзакцию списания (НО НЕ МЕНЯЕМ БАЛАНС - он уже правильный после migrateTransactions)
              // created_by = NULL для исторических транзакций из миграции
              // Важно: создаем транзакцию списания с реальной датой урока для истории платежей
              await pool.query(`
                INSERT INTO payment_transactions (
                  student_id, amount, type, payment_method, description, created_at, created_by, company_id, branch_id
                ) VALUES ($1, $2, 'deduction', 'subscription', $3, $4, NULL, $5, $6)
                ON CONFLICT DO NOTHING
              `, [
                customerId,
                commission,
                `Списание за посещенное занятие (Урок ID: ${lessonId})`,
                lessonDate,
                COMPANY_ID,
                ourBranchId
              ]);
            }
            
          } catch (error) {
            // Ошибка для конкретного студента - логируем и пропускаем
            if (attendanceCreated === 0) {
              // Логируем первые несколько ошибок для диагностики
              console.error(`\n   ⚠️  Ошибка для студента ${customerId}: ${error.message}`);
            }
            continue;
          }
        }
      }
      
    } catch (error) {
      console.error(`\n   ⚠️  Ошибка для урока ${lesson.id}: ${error.message}`);
      skipped++;
    }
    
    progressBar.update(attendanceCreated + skipped);
  }
  
  progressBar.stop();
  
  return { attendanceCreated, skipped, studentDeductions };
}

// === МИГРАЦИЯ ДОЛГОВ ===

async function migrateDebts(branchMapping = null) {
  console.log('\n📕 МИГРАЦИЯ ДОЛГОВ\n');
  
  // Если есть branchMapping, создаем долги для каждого филиала
  if (branchMapping && branchMapping.size > 0) {
    let totalCreated = 0;
    for (const [alfacrmBranchId, ourBranchId] of branchMapping) {
      const debtors = await pool.query(`
        SELECT sb.student_id, sb.balance, s.name
        FROM student_balance sb
        JOIN students s ON sb.student_id = s.id
        WHERE sb.balance < 0 AND s.branch_id = $1
      `, [ourBranchId]);
      
      const created = await migrateDebtsForBranch(debtors.rows, ourBranchId);
      totalCreated += created;
    }
    
    console.log(`✅ Всего создано долгов: ${totalCreated}\n`);
    return;
  }
  
  // Fallback режим
  const debtors = await pool.query(`
    SELECT sb.student_id, sb.balance, s.name
    FROM student_balance sb
    JOIN students s ON sb.student_id = s.id
    WHERE sb.balance < 0
  `);
  
  const created = await migrateDebtsForBranch(debtors.rows, DEFAULT_BRANCH_ID || COMPANY_ID);
  console.log(`✅ Создано долгов: ${created}\n`);
}

async function migrateDebtsForBranch(debtors, branchId) {
  if (debtors.length === 0) return 0;
  
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(debtors.length, 0);
  
  let created = 0;
  
  for (const debtor of debtors) {
    try {
      const amount = Math.abs(debtor.balance);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      
      await pool.query(`
        INSERT INTO debt_records (student_id, amount, due_date, status, company_id, branch_id)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        debtor.student_id,
        amount,
        dueDate,
        'pending',
        COMPANY_ID,
        branchId
      ]);
      
      created++;
    } catch (error) {
      console.error(`\n   ⚠️  ${debtor.name}: ${error.message}`);
    }
    
    progressBar.update(created);
  }
  
  progressBar.stop();
  return created;
}

// === ГЕНЕРАЦИЯ УРОКОВ ===

async function generateLessons(branchMapping = null) {
  console.log('\n📚 ГЕНЕРАЦИЯ УРОКОВ (1 месяц)\n');
  
  // Если есть branchMapping, генерируем уроки для каждого филиала
  if (branchMapping && branchMapping.size > 0) {
    let totalLessons = 0;
    let totalStudentLinks = 0;
    
    for (const [alfacrmBranchId, ourBranchId] of branchMapping) {
      const schedulesResult = await pool.query(`
        SELECT 
          gs.*,
          g.name as group_name,
          COALESCE(gs.teacher_id, g.teacher_id) as teacher_id,
          r.name as room_name
        FROM group_schedule gs
        JOIN groups g ON gs.group_id = g.id
        LEFT JOIN rooms r ON gs.room_id = r.id
        WHERE gs.is_active = true AND gs.company_id = $1 AND g.branch_id = $2
      `, [COMPANY_ID, ourBranchId]);
      
      const { lessons, studentLinks } = await generateLessonsForBranch(schedulesResult.rows, ourBranchId);
      totalLessons += lessons;
      totalStudentLinks += studentLinks;
    }
    
    console.log(`✅ Всего создано уроков: ${totalLessons}`);
    console.log(`✅ Связей студент-урок: ${totalStudentLinks}\n`);
    return;
  }
  
  // Fallback режим
  const schedulesResult = await pool.query(`
    SELECT 
      gs.*,
      g.name as group_name,
      COALESCE(gs.teacher_id, g.teacher_id) as teacher_id,
      r.name as room_name
    FROM group_schedule gs
    JOIN groups g ON gs.group_id = g.id
    LEFT JOIN rooms r ON gs.room_id = r.id
    WHERE gs.is_active = true AND gs.company_id = $1
  `, [COMPANY_ID]);
  
  const { lessons, studentLinks } = await generateLessonsForBranch(schedulesResult.rows, DEFAULT_BRANCH_ID || COMPANY_ID);
  console.log(`✅ Создано уроков: ${lessons}`);
  console.log(`✅ Связей студент-урок: ${studentLinks}\n`);
}

async function generateLessonsForBranch(schedules, branchId) {
  if (schedules.length === 0) return { lessons: 0, studentLinks: 0 };
  
  // Получаем активные записи enrollment (только текущие связи студент-группа) для данного филиала
  const studentGroups = await pool.query(`
    SELECT student_id, group_id 
    FROM enrollment 
    WHERE left_at IS NULL AND company_id = $1 AND branch_id = $2
  `, [COMPANY_ID, branchId]);
  const groupStudents = {};
  studentGroups.rows.forEach(sg => {
    if (!groupStudents[sg.group_id]) {
      groupStudents[sg.group_id] = [];
    }
    groupStudents[sg.group_id].push(sg.student_id);
  });
  
  // Генерируем уроки на 1 месяц вперед
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);
  
  let expectedLessons = 0;
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
    schedules.forEach(schedule => {
      if (schedule.day_of_week === dayOfWeek) {
        expectedLessons++;
      }
    });
  }
  
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(expectedLessons, 0);
  
  let totalLessons = 0;
  let totalStudentLinks = 0;
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
    
    for (const schedule of schedules) {
      if (schedule.day_of_week !== dayOfWeek) continue;
      
      // Проверяем, что дата урока попадает в диапазон расписания
      const lessonDate = new Date(d);
      const scheduleStartDate = schedule.start_date ? new Date(schedule.start_date) : null;
      const scheduleEndDate = schedule.end_date ? new Date(schedule.end_date) : null;
      
      if (scheduleStartDate && lessonDate < scheduleStartDate) continue;
      if (scheduleEndDate && lessonDate > scheduleEndDate) continue;
      
      const [startHour, startMinute] = schedule.time_from.split(':').map(Number);
      const [endHour, endMinute] = schedule.time_to.split(':').map(Number);
      
      // Конвертируем Almaty время в UTC (вычитаем 5 часов)
      // 13:00 Almaty → сохраняем как 08:00 в БД
      // Go отправит 08:00Z, браузер покажет 13:00 ✅
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      
      const startHourUTC = startHour - 5;
      const endHourUTC = endHour - 5;
      
      const startHourStr = String(startHourUTC).padStart(2, '0');
      const startMinuteStr = String(startMinute).padStart(2, '0');
      const endHourStr = String(endHourUTC).padStart(2, '0');
      const endMinuteStr = String(endMinute).padStart(2, '0');
      
      const startTimeStr = `${year}-${month}-${day} ${startHourStr}:${startMinuteStr}:00`;
      const endTimeStr = `${year}-${month}-${day} ${endHourStr}:${endMinuteStr}:00`;
      
      const lessonId = uuidv4();
      
      await pool.query(`
        INSERT INTO lessons (
          id, title, teacher_id, group_id, subject,
          start_time, end_time, room, room_id, status, company_id, branch_id
        )
        VALUES ($1, $2, $3, $4, $5, $6::timestamp, $7::timestamp, $8, $9, $10, $11, $12)
      `, [
        lessonId,
        'Занятие',
        schedule.teacher_id,
        schedule.group_id,
        'Английский язык',
        startTimeStr,
        endTimeStr,
        schedule.room_name || '', // Fill room field with room name if available
        schedule.room_id || null, // room_id уже должен быть уникальным ID из group_schedule
        'scheduled',
        COMPANY_ID,
        branchId
      ]);
      
      totalLessons++;
      
      const students = groupStudents[schedule.group_id] || [];
      for (const studentId of students) {
        await pool.query(`
          INSERT INTO lesson_students (lesson_id, student_id, company_id)
          VALUES ($1, $2, $3)
          ON CONFLICT DO NOTHING
        `, [lessonId, studentId, COMPANY_ID]);
        totalStudentLinks++;
      }
      
      progressBar.update(totalLessons);
    }
  }
  
  progressBar.stop();
  return { lessons: totalLessons, studentLinks: totalStudentLinks };
}

// === СОЗДАНИЕ КОМПАНИИ И ФИЛИАЛОВ ===

let DEFAULT_BRANCH_ID = null;

async function createCompanyAndBranches() {
  console.log('\n🏢 СОЗДАНИЕ КОМПАНИИ И ФИЛИАЛОВ\n');
  
  // Создать компанию
  await pool.query(`
    INSERT INTO companies (id, name, status)
    VALUES ($1, $2, $3)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      status = EXCLUDED.status
  `, [COMPANY_ID, COMPANY_NAME, 'active']);
  
  console.log(`✅ Компания создана: ${COMPANY_NAME} (ID: ${COMPANY_ID})`);
  
  // Проверяем, существует ли таблица branches
  let branchesTableExists = false;
  try {
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'branches'
      )
    `);
    branchesTableExists = tableCheck.rows[0].exists;
  } catch (error) {
    console.log(`⚠️  Ошибка при проверке таблицы branches: ${error.message}`);
  }
  
  if (!branchesTableExists) {
    // Если таблицы branches нет, используем company_id как branch_id (fallback режим)
    DEFAULT_BRANCH_ID = COMPANY_ID;
    console.log(`⚠️  Таблица branches не найдена, используем company_id как branch_id: ${DEFAULT_BRANCH_ID}\n`);
    return null; // Возвращаем null, чтобы указать fallback режим
  }
  
  // Получить филиалы из AlfaCRM
  let alfacrmBranches = [];
  try {
    alfacrmBranches = await fetchAlfaCRMBranches();
    console.log(`📋 Получено филиалов из AlfaCRM: ${alfacrmBranches.length}`);
  } catch (error) {
    console.log(`⚠️  Ошибка при получении филиалов из AlfaCRM: ${error.message}`);
  }
  
  // Создать маппинг AlfaCRM ID -> наш ID
  const branchMapping = new Map(); // alfacrmBranchId -> ourBranchId
  
  if (alfacrmBranches.length > 0) {
    for (const alfacrmBranch of alfacrmBranches) {
      // Преобразуем ID в число для консистентности
      const alfacrmBranchIdNum = typeof alfacrmBranch.id === 'string' ? parseInt(alfacrmBranch.id) : alfacrmBranch.id;
      const ourBranchId = `${COMPANY_ID}_branch_${alfacrmBranchIdNum}`;
      
      try {
        await pool.query(`
          INSERT INTO branches (id, name, company_id, status, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status
        `, [ourBranchId, alfacrmBranch.name, COMPANY_ID, alfacrmBranch.is_active ? 'active' : 'inactive']);
        
        // Важно: сохраняем как число, чтобы совпадало с тем, что приходит из API
        // Используем числовой ID для маппинга
        branchMapping.set(alfacrmBranchIdNum, ourBranchId);
        console.log(`  ✅ Филиал создан: ${alfacrmBranch.name} (AlfaCRM ID: ${alfacrmBranchIdNum} (тип: ${typeof alfacrmBranchIdNum}) → наш ID: ${ourBranchId})`);
      } catch (error) {
        console.error(`  ❌ Ошибка при создании филиала ${alfacrmBranch.name}: ${error.message}`);
      }
    }
  }
  
  // Создаем дефолтный филиал только если нет филиалов из AlfaCRM
  // Если есть филиалы из AlfaCRM, дефолтный филиал не нужен (данные распределяются по филиалам)
  DEFAULT_BRANCH_ID = COMPANY_ID + '_default_branch';
  
  if (alfacrmBranches.length === 0) {
    // Если нет филиалов из AlfaCRM, создаем дефолтный филиал
    try {
      const branchCheck = await pool.query(
        'SELECT id FROM branches WHERE id = $1 AND company_id = $2',
        [DEFAULT_BRANCH_ID, COMPANY_ID]
      );
      
      if (branchCheck.rows.length === 0) {
        await pool.query(`
          INSERT INTO branches (id, name, company_id, status, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          ON CONFLICT (id) DO NOTHING
        `, [DEFAULT_BRANCH_ID, 'Основной филиал', COMPANY_ID, 'active']);
        console.log(`✅ Создан дефолтный филиал: ${DEFAULT_BRANCH_ID}`);
      } else {
        console.log(`✅ Используется существующий дефолтный филиал: ${DEFAULT_BRANCH_ID}`);
      }
      // Добавляем дефолтный филиал в branchMapping только если нет филиалов из AlfaCRM
      branchMapping.set('default', DEFAULT_BRANCH_ID);
    } catch (error) {
      console.log(`⚠️  Ошибка при создании дефолтного филиала: ${error.message}`);
    }
  } else {
    // Если есть филиалы из AlfaCRM, дефолтный филиал не добавляем в branchMapping
    // Но проверяем, существует ли он (может быть создан ранее)
    try {
      const branchCheck = await pool.query(
        'SELECT id FROM branches WHERE id = $1 AND company_id = $2',
        [DEFAULT_BRANCH_ID, COMPANY_ID]
      );
      
      if (branchCheck.rows.length > 0) {
        // Если дефолтный филиал существует, но есть филиалы из AlfaCRM,
        // помечаем его как неактивный, чтобы он не отображался в UI
        const updateResult = await pool.query(`
          UPDATE branches SET status = 'inactive' WHERE id = $1 AND company_id = $2
        `, [DEFAULT_BRANCH_ID, COMPANY_ID]);
        console.log(`✅ Дефолтный филиал помечен как неактивный (есть филиалы из AlfaCRM). Обновлено строк: ${updateResult.rowCount}`);
      } else {
        console.log(`ℹ️  Дефолтный филиал не существует, пропускаем обновление статуса`);
      }
    } catch (error) {
      console.log(`⚠️  Ошибка при проверке дефолтного филиала: ${error.message}`);
    }
  }
  
  // Если филиалов из AlfaCRM нет, дефолтный филиал - единственный
  if (branchMapping.size === 0) {
    console.log(`⚠️  Филиалы из AlfaCRM не получены, используем только дефолтный филиал`);
  } else {
    // Выводим финальный маппинг для отладки
    console.log(`\n📋 Финальный маппинг филиалов:`);
    for (const [alfacrmId, ourId] of branchMapping.entries()) {
      console.log(`   AlfaCRM ID: ${alfacrmId} (тип: ${typeof alfacrmId}) → наш ID: ${ourId}`);
    }
  }
  
  // Привязываем все созданные филиалы ко всем пользователям компании
  // Это нужно, чтобы пользователи видели филиалы в UI
  try {
    // Проверяем, существует ли таблица user_branches
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_branches'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log(`⚠️  Таблица user_branches не найдена, пропускаем привязку филиалов к пользователям`);
    } else {
      const allUsers = await pool.query(`
        SELECT id FROM users WHERE company_id = $1
      `, [COMPANY_ID]);
      
      if (allUsers.rows.length > 0) {
        // Получаем ВСЕ филиалы из базы для этой компании (включая те, что были созданы ранее)
        const existingBranches = await pool.query(`
          SELECT id FROM branches WHERE company_id = $1
        `, [COMPANY_ID]);
        
        // Также добавляем филиалы из branchMapping (исключаем дефолтный)
        const allBranchIds = Array.from(branchMapping.values()).filter(id => id !== DEFAULT_BRANCH_ID);
        const allUniqueBranchIds = new Set(allBranchIds);
        
        // Добавляем все существующие филиалы, но исключаем дефолтный (он помечен как inactive)
        existingBranches.rows.forEach(b => {
          if (b.id !== DEFAULT_BRANCH_ID) {
            allUniqueBranchIds.add(b.id);
          }
        });
        
        // НЕ добавляем дефолтный филиал, если есть филиалы из AlfaCRM
        // (он уже помечен как inactive выше)
        
        let assignedCount = 0;
        let skippedCount = 0;
        
        for (const user of allUsers.rows) {
          for (const branchId of allUniqueBranchIds) {
            try {
              const result = await pool.query(`
                INSERT INTO user_branches (user_id, branch_id, company_id, assigned_at)
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (user_id, branch_id, company_id) DO NOTHING
                RETURNING user_id
              `, [user.id, branchId, COMPANY_ID]);
              
              if (result.rows.length > 0) {
                assignedCount++;
              } else {
                skippedCount++;
              }
            } catch (error) {
              console.error(`  ⚠️  Ошибка при привязке филиала ${branchId} к пользователю ${user.id}: ${error.message}`);
            }
          }
        }
        
        if (assignedCount > 0 || skippedCount > 0) {
          console.log(`✅ Обработано филиалов: ${allUniqueBranchIds.size}, пользователей: ${allUsers.rows.length}`);
          console.log(`   Новых привязок: ${assignedCount}, уже существующих: ${skippedCount}`);
        }
      } else {
        console.log(`⚠️  Пользователи компании не найдены, филиалы не привязаны к пользователям`);
        console.log(`   💡 Создайте пользователя для компании ${COMPANY_ID}, чтобы он мог видеть филиалы`);
      }
    }
  } catch (error) {
    console.log(`⚠️  Ошибка при привязке филиалов к пользователям: ${error.message}`);
    // Не прерываем миграцию из-за этой ошибки
  }
  
  // Убеждаемся, что дефолтный филиал не удаляется
  // Добавляем его в branchMapping, если его там нет
  if (DEFAULT_BRANCH_ID && !Array.from(branchMapping.values()).includes(DEFAULT_BRANCH_ID)) {
    branchMapping.set('default', DEFAULT_BRANCH_ID);
  }
  
  // Финальная проверка: убеждаемся, что дефолтный филиал существует и активен
  if (DEFAULT_BRANCH_ID) {
    try {
      await pool.query(`
        UPDATE branches 
        SET status = 'active', updated_at = NOW()
        WHERE id = $1 AND company_id = $2
      `, [DEFAULT_BRANCH_ID, COMPANY_ID]);
    } catch (error) {
      // Игнорируем ошибки
    }
  }
  
  console.log(`\n✅ Всего создано филиалов: ${branchMapping.size}\n`);
  return branchMapping;
}

// === МИГРАЦИЯ ИНДИВИДУАЛЬНЫХ ЗАНЯТИЙ ===

async function migrateIndividualLessons(branchMapping = null) {
  console.log('\n👤 МИГРАЦИЯ ИНДИВИДУАЛЬНЫХ ЗАНЯТИЙ (БЕЗ групп)\n');
  
  // Если branchMapping === null, используем fallback режим
  if (!branchMapping || branchMapping.size === 0) {
    const regularLessons = await fetchAllPages('/v2api/regular-lesson/index');
    await migrateIndividualLessonsForBranch(regularLessons, DEFAULT_BRANCH_ID || COMPANY_ID);
    return;
  }
  
  // Мигрируем индивидуальные занятия для каждого филиала
  let totalLessonsCreated = 0;
  let totalSkipped = 0;
  
  for (const [alfacrmBranchId, ourBranchId] of branchMapping) {
    const regularLessons = await fetchAllPages('/v2api/regular-lesson/index', {}, alfacrmBranchId);
    const { lessonsCreated, skipped } = await migrateIndividualLessonsForBranch(regularLessons, ourBranchId);
    totalLessonsCreated += lessonsCreated;
    totalSkipped += skipped;
  }
  
  console.log(`✅ Всего создано индивидуальных уроков: ${totalLessonsCreated}`);
  if (totalSkipped > 0) {
    console.log(`⚠️  Пропущено: ${totalSkipped}\n`);
  } else {
    console.log();
  }
}

async function migrateIndividualLessonsForBranch(regularLessons, branchId) {
  // Получаем существующие группы
  const existingGroups = await pool.query('SELECT id FROM groups WHERE company_id = $1 AND branch_id = $2', [COMPANY_ID, branchId]);
  const groupIds = new Set(existingGroups.rows.map(g => g.id));
  
  // Фильтруем индивидуальные занятия (где related_id НЕ является группой)
  const individualSchedules = [];
  for (const lesson of regularLessons) {
    const relatedId = lesson.related_id?.toString();
    if (!relatedId || groupIds.has(relatedId)) continue;
    
    // Проверяем, что это студент в данном филиале
    const student = await pool.query('SELECT id, name FROM students WHERE id = $1 AND company_id = $2 AND branch_id = $3', [relatedId, COMPANY_ID, branchId]);
    if (student.rows.length > 0) {
      individualSchedules.push({
        ...lesson,
        studentId: relatedId,
        studentName: student.rows[0].name
      });
    }
  }
  
  console.log(`📊 Найдено индивидуальных занятий для филиала: ${individualSchedules.length}`);
  
  if (individualSchedules.length === 0) {
    return { lessonsCreated: 0, skipped: 0 };
  }
  
  // Генерируем индивидуальные уроки на 1 месяц вперед
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);
  
  // Подсчитаем ожидаемое количество уроков
  let expectedLessons = 0;
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
    individualSchedules.forEach(schedule => {
      const scheduleDayOfWeek = parseInt(schedule.day) || 1;
      if (scheduleDayOfWeek === dayOfWeek) {
        expectedLessons++;
      }
    });
  }
  
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(expectedLessons, 0);
  
  let lessonsCreated = 0;
  let skipped = 0;
  
  // Генерируем индивидуальные уроки напрямую (БЕЗ создания групп)
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
    
    for (const lesson of individualSchedules) {
      const scheduleDayOfWeek = parseInt(lesson.day) || 1;
      if (scheduleDayOfWeek !== dayOfWeek) continue;
      
      try {
        const studentId = lesson.studentId;
        const studentName = lesson.studentName;
        const teacherId = Array.isArray(lesson.teacher_ids) && lesson.teacher_ids.length > 0 
          ? lesson.teacher_ids[0]?.toString() 
          : null;
        
        // room_id из AlfaCRM - нужно использовать уникальный ID
        const alfacrmRoomId = lesson.room_id?.toString() || null;
        let roomId = null;
        if (alfacrmRoomId) {
          // Комнаты созданы с уникальными ID: ${roomId}_${branchId}
          const uniqueRoomId = `${alfacrmRoomId}_${branchId}`;
          // Проверяем, существует ли комната
          const roomCheck = await pool.query('SELECT id FROM rooms WHERE id = $1 AND company_id = $2 AND branch_id = $3', [uniqueRoomId, COMPANY_ID, branchId]);
          if (roomCheck.rows.length > 0) {
            roomId = uniqueRoomId;
          }
          // Если комната не найдена, оставляем roomId = null
        }
        
        // Проверяем диапазон дат расписания
        const lessonDate = new Date(d);
        let scheduleStartDate = null;
        let scheduleEndDate = null;
        
        if (lesson.b_date) {
          scheduleStartDate = new Date(lesson.b_date);
        }
        if (lesson.e_date) {
          scheduleEndDate = new Date(lesson.e_date);
        }
        
        if (scheduleStartDate && lessonDate < scheduleStartDate) continue;
        if (scheduleEndDate && lessonDate > scheduleEndDate) continue;
        
        const timeFrom = lesson.time_from_v || '10:00';
        const timeTo = lesson.time_to_v || '11:00';
        
        const [startHour, startMinute] = timeFrom.split(':').map(Number);
        const [endHour, endMinute] = timeTo.split(':').map(Number);
        
        // Конвертируем Almaty время в UTC (вычитаем 5 часов)
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        
        const startHourUTC = startHour - 5;
        const endHourUTC = endHour - 5;
        
        const startHourStr = String(startHourUTC).padStart(2, '0');
        const startMinuteStr = String(startMinute).padStart(2, '0');
        const endHourStr = String(endHourUTC).padStart(2, '0');
        const endMinuteStr = String(endMinute).padStart(2, '0');
        
        const startTimeStr = `${year}-${month}-${day} ${startHourStr}:${startMinuteStr}:00`;
        const endTimeStr = `${year}-${month}-${day} ${endHourStr}:${endMinuteStr}:00`;
        
        const lessonId = uuidv4();
        
        // Создаем ИНДИВИДУАЛЬНЫЙ урок (БЕЗ group_id!)
        await pool.query(`
          INSERT INTO lessons (
            id, title, teacher_id, group_id, subject,
            start_time, end_time, room_id, status, company_id, branch_id
          )
          VALUES ($1, $2, $3, NULL, $4, $5::timestamp, $6::timestamp, $7, $8, $9, $10)
        `, [
          lessonId,
          `Индивидуальное: ${studentName}`,
          teacherId,
          'Английский язык',
          startTimeStr,
          endTimeStr,
          roomId,
          'scheduled',
          COMPANY_ID,
          branchId
        ]);
        
        // Связываем урок со студентом через lesson_students
        await pool.query(`
          INSERT INTO lesson_students (lesson_id, student_id, company_id)
          VALUES ($1, $2, $3)
          ON CONFLICT (lesson_id, student_id) DO NOTHING
        `, [lessonId, studentId, COMPANY_ID]);
        
        lessonsCreated++;
        progressBar.update(lessonsCreated);
        
      } catch (error) {
        console.error(`\n   ⚠️  Ошибка для студента ${lesson.studentName}: ${error.message}`);
        skipped++;
      }
    }
  }
  
  progressBar.stop();
  return { lessonsCreated, skipped };
}

// === МИГРАЦИЯ СВЯЗЕЙ СТУДЕНТ-ГРУППА ===

async function migrateStudentGroupLinks(branchMapping = null) {
  console.log('\n🔗 МИГРАЦИЯ СВЯЗЕЙ СТУДЕНТ-ГРУППА\n');
  
  // Если branchMapping === null, используем fallback режим
  if (!branchMapping || branchMapping.size === 0) {
    const token = await getAlfaCRMToken();
    const lessons = [];
    const maxPages = 10;
    
    for (let page = 0; page < maxPages; page++) {
      try {
        const response = await axios.post(`${ALFACRM_API_URL}/v2api/lesson/index`, {
          page,
          count: 50,
        }, {
          headers: { 'X-ALFACRM-TOKEN': token },
        });
        
        const items = response.data.items || [];
        if (items.length === 0) break;
        lessons.push(...items);
      } catch (error) {
        console.error(`   ❌ Ошибка на странице ${page}: ${error.message}`);
        break;
      }
    }
    
    await migrateStudentGroupLinksForBranch(lessons, DEFAULT_BRANCH_ID || COMPANY_ID);
    return;
  }
  
  // Мигрируем связи для каждого филиала (исключаем 'default')
  let totalCreated = 0;
  let totalSkipped = 0;
  
  const allBranches = Array.from(branchMapping.entries()).filter(([id]) => id !== 'default');
  for (const [alfacrmBranchId, ourBranchId] of allBranches) {
    // Получаем только последние 10 страниц уроков (500 уроков) - этого достаточно для получения связей
    // Используем прямой запрос с ограничением страниц для ускорения
    console.log(`🔄 Запрос последних уроков для филиала (макс. 10 страниц)...`);
    
    const token = await getAlfaCRMToken();
    const lessons = [];
    const maxPages = 10; // Ограничиваем 10 страницами для производительности
    
    // Используем URL path filtering для получения уроков по филиалу
    let actualEndpoint = '/v2api/lesson/index';
    if (alfacrmBranchId !== null && alfacrmBranchId !== 'default') {
      const branchIdNum = typeof alfacrmBranchId === 'string' && alfacrmBranchId !== 'default' ? parseInt(alfacrmBranchId) : alfacrmBranchId;
      if (!isNaN(branchIdNum) && branchIdNum !== 'default') {
        actualEndpoint = `/v2api/${branchIdNum}/lesson/index`;
      }
    }
    
    for (let page = 0; page < maxPages; page++) {
      try {
        const response = await axios.post(`${ALFACRM_API_URL}${actualEndpoint}`, {
          page,
          count: 50,
        }, {
          headers: { 'X-ALFACRM-TOKEN': token },
        });
        
        const items = response.data.items || [];
        if (items.length === 0) break;
        
        lessons.push(...items);
      } catch (error) {
        console.error(`   ❌ Ошибка на странице ${page}: ${error.message}`);
        break;
      }
    }
    
    const { created, skipped } = await migrateStudentGroupLinksForBranch(lessons, ourBranchId);
    totalCreated += created;
    totalSkipped += skipped;
  }
  
  console.log(`✅ Всего создано связей: ${totalCreated}`);
  if (totalSkipped > 0) {
    console.log(`⚠️  Пропущено: ${totalSkipped}\n`);
  } else {
    console.log();
  }
}

async function migrateStudentGroupLinksForBranch(lessons, branchId) {
  console.log(`\n📊 Получено уроков для филиала: ${lessons.length}`);
  
  // Используем Set для хранения уникальных связей
  const links = new Set();
  
  for (const lesson of lessons) {
    const groupIds = lesson.group_ids || [];
    const customerIds = lesson.customer_ids || [];
    
    // Создаем связи для каждого студента с каждой группой в уроке
    for (const groupId of groupIds) {
      for (const customerId of customerIds) {
        links.add(`${customerId}-${groupId}`);
      }
    }
  }
  
  console.log(`📊 Уникальных связей найдено: ${links.size}`);
  
  if (links.size === 0) {
    return { created: 0, skipped: 0 };
  }
  
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(links.size, 0);
  
  let created = 0;
  let skipped = 0;
  
  for (const link of links) {
    const [studentId, groupId] = link.split('-');
    
    try {
      // Группы используют уникальные ID с суффиксом branchId, студенты - оригинальные ID
      // Проверяем что студент существует в нашей БД (может быть в любом филиале, но для этого филиала)
      // Студенты создаются с оригинальным ID из AlfaCRM, но могут быть в разных филиалах
      const studentExists = await pool.query('SELECT id FROM students WHERE id = $1 AND company_id = $2 AND branch_id = $3', [studentId, COMPANY_ID, branchId]);
      
      // Если студент не найден в этом филиале, пропускаем (студент должен быть в том же филиале, что и группа)
      if (studentExists.rows.length === 0) {
        skipped++;
        progressBar.update(created + skipped);
        continue;
      }
      
      // Группы создаются с уникальными ID: ${groupId}_${branchId}
      const uniqueGroupId = `${groupId}_${branchId}`;
      const groupExists = await pool.query('SELECT id FROM groups WHERE id = $1 AND company_id = $2 AND branch_id = $3', [uniqueGroupId, COMPANY_ID, branchId]);
      
      if (groupExists.rows.length === 0) {
        skipped++;
        progressBar.update(created + skipped);
        continue;
      }
      
      // Вставляем связь через enrollment (ON CONFLICT игнорирует дубликаты)
      // Используем uniqueGroupId, так как группы создаются с суффиксом branchId
      await pool.query(`
        INSERT INTO enrollment (student_id, group_id, joined_at, company_id, branch_id)
        VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4)
        ON CONFLICT (student_id, group_id) WHERE left_at IS NULL DO NOTHING
      `, [studentId, uniqueGroupId, COMPANY_ID, branchId]);
      
      created++;
    } catch (error) {
      console.error(`\n   ⚠️  Ошибка для студента ${studentId} → группа ${groupId}: ${error.message}`);
      skipped++;
    }
    
    progressBar.update(created + skipped);
  }
  
  progressBar.stop();
  return { created, skipped };
}

// === ГЛАВНАЯ ФУНКЦИЯ ===

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   МИГРАЦИЯ ДАННЫХ ИЗ ALFACRM → CLASSMATE CENTRAL         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  try {
    const branchMapping = await createCompanyAndBranches();
    
    // Мигрировать базовые данные (тарифы - они общие для всех филиалов)
    await migrateTariffs(branchMapping);
    
    // Мигрировать данные по филиалам
    await migrateRooms(branchMapping);
    await migrateTeachers(branchMapping);
    await migrateGroups(branchMapping);
    await migrateGroupSchedules(branchMapping);
    await migrateStudents(branchMapping);
    await migrateIndividualLessons(branchMapping); // Индивидуальные занятия (ПОСЛЕ студентов!)
    await migrateStudentGroupLinks(branchMapping); // Связи студент-группа из уроков
    await preloadStudentPrices(branchMapping); // Предзагрузка реальных цен уроков из AlfaCRM
    await migrateStudentSubscriptions(branchMapping);
    
    // МИГРАЦИЯ ИСТОРИИ ПОСЕЩЕНИЙ: Сначала получаем данные о списаниях
    let studentDeductions = null;
    try {
      studentDeductions = await migrateLessonHistory(branchMapping); // Возвращает Map<studentId, totalDeducted>
    } catch (error) {
      console.error('\n⚠️  Не удалось загрузить историю посещений:', error.message);
      console.log('   Продолжаем без данных о списаниях...\n');
    }
    
    // МИГРАЦИЯ ТРАНЗАКЦИЙ: Рассчитываем общую оплату на основе баланса и списаний
    // Формула: Общая оплата = Текущий баланс + Сумма всех списаний за уроки
    await migrateTransactions(studentDeductions, branchMapping);
    
    await migrateDebts(branchMapping);
    await generateLessons(branchMapping); // Генерация будущих уроков
    
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║              ✅ МИГРАЦИЯ ЗАВЕРШЕНА!                       ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
  } catch (error) {
    console.error('\n❌ ОШИБКА МИГРАЦИИ:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Запуск
if (require.main === module) {
  main();
}

module.exports = { main };

