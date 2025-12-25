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
 * - История посещений: мигрирует реальные посещения уроков за последние 3 месяца
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

async function getAlfaCRMToken() {
  if (alfacrmToken) return alfacrmToken;
  
  const response = await axios.post(`${ALFACRM_API_URL}/v2api/auth/login`, {
    email: ALFACRM_EMAIL,
    api_key: ALFACRM_API_KEY,
  });
  
  alfacrmToken = response.data.token;
  return alfacrmToken;
}

async function fetchAllPages(endpoint, params = {}, branchId = null) {
  const token = await getAlfaCRMToken();
  let allData = [];
  let seenIds = new Set(); // Track unique IDs to avoid duplicates
  let page = 0;
  let hasMore = true;
  let consecutiveEmptyPages = 0;

  // Если указан branchId, добавляем его в URL (как в новом скрипте)
  let actualEndpoint = endpoint;
  if (branchId !== null && branchId !== 'default') {
    actualEndpoint = endpoint.replace('/v2api/', `/v2api/${branchId}/`);
    console.log(`🔄 Запрос к ${actualEndpoint} для филиала (AlfaCRM ID: ${branchId})...`);
  } else {
    console.log(`🔄 Запрос к ${endpoint}...`);
  }

  while (hasMore) {
    try {
      const response = await axios.post(`${ALFACRM_API_URL}${actualEndpoint}`, {
        ...params,
        page,
        count: 100,
      }, {
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

async function migrateTeachers(branchMapping) {
  console.log('\n👨‍🏫 МИГРАЦИЯ ПРЕПОДАВАТЕЛЕЙ\n');
  
  if (!branchMapping || branchMapping.size === 0) {
    // Fallback: без филиалов
    const teachers = await fetchAllPages('/v2api/teacher/index');
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progressBar.start(teachers.length, 0);
    let migrated = 0;
    
    for (const teacher of teachers) {
      try {
        await migrateTeacherToBranch(teacher, COMPANY_ID);
        migrated++;
        progressBar.update(migrated);
      } catch (error) {
        console.error(`\n   ⚠️  Ошибка для ${teacher.name}: ${error.message}`);
      }
    }
    
    progressBar.stop();
    console.log(`✅ Мигрировано преподавателей: ${migrated}\n`);
    return;
  }
  
  // Для каждого филиала делаем запрос
  const allBranches = Array.from(branchMapping.entries()).filter(([id]) => id !== 'default');
  let totalMigrated = 0;
  
  for (const [alfacrmBranchId, ourBranchId] of allBranches) {
    const teachers = await fetchAllPages('/v2api/teacher/index', {}, alfacrmBranchId);
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progressBar.start(teachers.length, 0);
    let migrated = 0;
    
    for (const teacher of teachers) {
      try {
        await migrateTeacherToBranch(teacher, ourBranchId);
        migrated++;
        progressBar.update(migrated);
      } catch (error) {
        console.error(`\n   ⚠️  Ошибка для ${teacher.name}: ${error.message}`);
      }
    }
    
    progressBar.stop();
    totalMigrated += migrated;
    console.log(`✅ Филиал ${alfacrmBranchId}: мигрировано ${migrated} преподавателей`);
  }
  
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
    teacher.name || 'Unknown',
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
  
  if (!branchMapping || branchMapping.size === 0) {
    // Fallback: без филиалов
    const rooms = await fetchAllPages('/v2api/room/index');
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progressBar.start(rooms.length, 0);
    let migrated = 0;
    
    for (const room of rooms) {
      try {
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
          room.id?.toString(),
          room.name || 'Unknown',
          0,
          'active',
          room.color || '#3b82f6',
          COMPANY_ID,
          COMPANY_ID
        ]);
        migrated++;
        progressBar.update(migrated);
      } catch (error) {
        console.error(`\n   ⚠️  Ошибка для ${room.name}: ${error.message}`);
      }
    }
    
    progressBar.stop();
    console.log(`✅ Мигрировано комнат: ${migrated}\n`);
    return;
  }
  
  // Для каждого филиала делаем запрос
  const allBranches = Array.from(branchMapping.entries()).filter(([id]) => id !== 'default');
  let totalMigrated = 0;
  
  for (const [alfacrmBranchId, ourBranchId] of allBranches) {
    const rooms = await fetchAllPages('/v2api/room/index', {}, alfacrmBranchId);
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progressBar.start(rooms.length, 0);
    let migrated = 0;
    
    for (const room of rooms) {
      try {
        // Создаем уникальный ID для комнаты: ${roomId}_${branchId}
        const uniqueRoomId = `${room.id?.toString()}_${ourBranchId}`;
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
          ourBranchId
        ]);
        migrated++;
        progressBar.update(migrated);
      } catch (error) {
        console.error(`\n   ⚠️  Ошибка для ${room.name}: ${error.message}`);
      }
    }
    
    progressBar.stop();
    totalMigrated += migrated;
    console.log(`✅ Филиал ${alfacrmBranchId}: мигрировано ${migrated} комнат`);
  }
  
  console.log(`✅ Всего мигрировано комнат: ${totalMigrated}\n`);
}

// === МИГРАЦИЯ ТАРИФОВ ===

async function migrateTariffs() {
  console.log('\n💳 МИГРАЦИЯ ТАРИФОВ\n');
  
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
          can_freeze, billing_type, description, company_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          lessons_count = EXCLUDED.lessons_count,
          validity_days = EXCLUDED.validity_days,
          price = EXCLUDED.price,
          can_freeze = EXCLUDED.can_freeze,
          billing_type = EXCLUDED.billing_type,
          description = EXCLUDED.description,
          company_id = EXCLUDED.company_id
      `, [
        tariff.id?.toString(),
        tariff.name || 'Без названия',
        lessonsCount,
        validityDays,
        price,
        true, // can_freeze - по умолчанию разрешаем заморозку
        billingType, // NEW: billing type from AlfaCRM
        `Длительность занятия: ${tariff.duration || 60} мин`,
        COMPANY_ID
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
  
  if (!branchMapping || branchMapping.size === 0) {
    // Fallback: без филиалов
    const groups = await fetchAllPages('/v2api/group/index');
    const teachers = await pool.query('SELECT id, name FROM teachers');
    const teachersByName = {};
    teachers.rows.forEach(t => {
      teachersByName[t.name] = t.id;
    });
    
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progressBar.start(groups.length, 0);
    let migrated = 0;
    
    for (const group of groups) {
      try {
        let teacherId = null;
        if (group.teacher_ids && Array.isArray(group.teacher_ids) && group.teacher_ids.length > 0) {
          const teacherName = group.teacher_ids[0];
          teacherId = teachersByName[teacherName] || null;
        }
        
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
          group.id?.toString(),
          group.name || 'Unknown',
          'Английский язык',
          teacherId,
          group.note || '',
          'active',
          group.color || '#3b82f6',
          COMPANY_ID,
          COMPANY_ID
        ]);
        migrated++;
        progressBar.update(migrated);
      } catch (error) {
        console.error(`\n   ⚠️  Ошибка для ${group.name}: ${error.message}`);
      }
    }
    
    progressBar.stop();
    console.log(`✅ Мигрировано групп: ${migrated}\n`);
    return;
  }
  
  // Для каждого филиала делаем запрос
  const allBranches = Array.from(branchMapping.entries()).filter(([id]) => id !== 'default');
  const teachers = await pool.query('SELECT id, name, branch_id FROM teachers');
  const teachersByNameAndBranch = {};
  teachers.rows.forEach(t => {
    const key = `${t.branch_id}:${t.name}`;
    teachersByNameAndBranch[key] = t.id;
  });
  
  let totalMigrated = 0;
  
  for (const [alfacrmBranchId, ourBranchId] of allBranches) {
    const groups = await fetchAllPages('/v2api/group/index', {}, alfacrmBranchId);
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progressBar.start(groups.length, 0);
    let migrated = 0;
    
    for (const group of groups) {
      try {
        let teacherId = null;
        if (group.teacher_ids && Array.isArray(group.teacher_ids) && group.teacher_ids.length > 0) {
          const teacherRef = group.teacher_ids[0];
          // Пытаемся найти учителя по ID или имени в этом филиале
          if (typeof teacherRef === 'number' || (typeof teacherRef === 'string' && /^\d+$/.test(teacherRef))) {
            const teacherResult = await pool.query('SELECT id FROM teachers WHERE id = $1 AND branch_id = $2', [teacherRef.toString(), ourBranchId]);
            if (teacherResult.rows.length > 0) {
              teacherId = teacherResult.rows[0].id;
            }
          }
          if (!teacherId) {
            const key = `${ourBranchId}:${teacherRef}`;
            teacherId = teachersByNameAndBranch[key] || null;
          }
        }
        
        // Создаем уникальный ID для группы: ${groupId}_${branchId}
        const uniqueGroupId = `${group.id?.toString()}_${ourBranchId}`;
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
          'Английский язык',
          teacherId,
          group.note || '',
          'active',
          group.color || '#3b82f6',
          COMPANY_ID,
          ourBranchId
        ]);
        migrated++;
        progressBar.update(migrated);
      } catch (error) {
        console.error(`\n   ⚠️  Ошибка для ${group.name}: ${error.message}`);
      }
    }
    
    progressBar.stop();
    totalMigrated += migrated;
    console.log(`✅ Филиал ${alfacrmBranchId}: мигрировано ${migrated} групп`);
  }
  
  console.log(`✅ Всего мигрировано групп: ${totalMigrated}\n`);
}

// === МИГРАЦИЯ РАСПИСАНИЙ ГРУПП ===

async function migrateGroupSchedules(branchMapping) {
  console.log('\n📅 МИГРАЦИЯ РАСПИСАНИЙ ГРУПП\n');
  
  if (!branchMapping || branchMapping.size === 0) {
    // Fallback: без филиалов
    const regularLessons = await fetchAllPages('/v2api/regular-lesson/index', {}, null);
    const existingGroups = await pool.query('SELECT id FROM groups WHERE company_id = $1', [COMPANY_ID]);
    const existingGroupIds = new Set(existingGroups.rows.map(g => g.id));
    
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progressBar.start(regularLessons.length, 0);
    let migrated = 0;
    let skipped = 0;
    
    for (const lesson of regularLessons) {
      try {
        const groupId = lesson.related_id?.toString() || null;
        if (!groupId || !existingGroupIds.has(groupId)) {
          skipped++;
          progressBar.update(migrated + skipped);
          continue;
        }
        
        let teacherId = null;
        if (lesson.teacher_ids && Array.isArray(lesson.teacher_ids) && lesson.teacher_ids.length > 0) {
          teacherId = lesson.teacher_ids[0]?.toString();
        }
        const roomId = lesson.room_id?.toString() || null;
        const dayOfWeek = parseInt(lesson.day) || 1;
        const timeFrom = lesson.time_from_v || '10:00';
        const timeTo = lesson.time_to_v || '11:00';
        
        let startDate = new Date();
        let endDate = new Date();
        if (lesson.b_date) startDate = new Date(lesson.b_date);
        if (lesson.e_date) endDate = new Date(lesson.e_date);
        else endDate.setFullYear(endDate.getFullYear() + 1);
        
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
          groupId,
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
    if (skipped > 0) console.log(`⚠️  Пропущено расписаний: ${skipped} (группы не найдены в БД)\n`);
    else console.log();
    return;
  }
  
  // Получаем расписания для каждого филиала отдельно
  const allRegularLessons = [];
  const allBranches = Array.from(branchMapping.entries()).filter(([id]) => id !== 'default');
  
  for (const [alfacrmBranchId, ourBranchId] of allBranches) {
    console.log(`🔄 Запрос расписаний для филиала (AlfaCRM ID: ${alfacrmBranchId})...`);
    const branchLessons = await fetchAllPages('/v2api/regular-lesson/index', {}, alfacrmBranchId);
    console.log(`   Получено ${branchLessons.length} расписаний для филиала ${alfacrmBranchId}`);
    allRegularLessons.push(...branchLessons);
  }
  
  const regularLessons = allRegularLessons;
  console.log(`📊 Всего получено расписаний из AlfaCRM: ${regularLessons.length}`);
  
  // Получаем ВСЕ группы из БД (как в старом скрипте)
  const allGroups = await pool.query('SELECT id FROM groups WHERE company_id = $1', [COMPANY_ID]);
  const allGroupIds = new Set(allGroups.rows.map(g => g.id));
  console.log(`📊 Найдено групп в БД: ${allGroupIds.size}`);
  
  // Получаем ВСЕ комнаты из БД
  const allRooms = await pool.query('SELECT id FROM rooms WHERE company_id = $1', [COMPANY_ID]);
  const allRoomIds = new Set(allRooms.rows.map(r => r.id));
  
  // Маппинг AlfaCRM branch_id -> наш branch_id
  const branchIdMap = new Map();
  for (const [alfacrmBranchId, ourBranchId] of branchMapping.entries()) {
    if (alfacrmBranchId !== 'default') {
      branchIdMap.set(parseInt(alfacrmBranchId), ourBranchId);
    }
  }
  
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(regularLessons.length, 0);
  
  let migrated = 0;
  let skipped = 0;
  
  for (const lesson of regularLessons) {
    try {
      const alfacrmGroupId = lesson.related_id?.toString() || null;
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
          const match = foundGroup.match(/^(\d+)_(.+)$/);
          if (match) ourBranchId = match[2];
        } else if (allGroupIds.has(alfacrmGroupId)) {
          groupIdToUse = alfacrmGroupId;
          if (lesson.branch_id && branchIdMap.has(parseInt(lesson.branch_id))) {
            ourBranchId = branchIdMap.get(parseInt(lesson.branch_id));
          }
          if (!ourBranchId && branchIdMap.size > 0) {
            ourBranchId = Array.from(branchIdMap.values())[0];
          }
        }
      }
      
      if (!groupIdToUse) {
        skipped++;
        progressBar.update(migrated + skipped);
        continue;
      }
      
      if (!ourBranchId && branchIdMap.size > 0) {
        ourBranchId = Array.from(branchIdMap.values())[0];
      }
      
      let teacherId = null;
      if (lesson.teacher_ids && Array.isArray(lesson.teacher_ids) && lesson.teacher_ids.length > 0) {
        teacherId = lesson.teacher_ids[0]?.toString();
      }
      
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
          const foundRoom = Array.from(allRoomIds).find(id => id.startsWith(`${alfacrmRoomId}_`));
          if (foundRoom) roomId = foundRoom;
          else if (allRoomIds.has(alfacrmRoomId)) roomId = alfacrmRoomId;
        }
      }
      
      const dayOfWeek = parseInt(lesson.day) || 1;
      const timeFrom = lesson.time_from_v || '10:00';
      const timeTo = lesson.time_to_v || '11:00';
      
      let startDate = new Date();
      let endDate = new Date();
      if (lesson.b_date) startDate = new Date(lesson.b_date);
      if (lesson.e_date) endDate = new Date(lesson.e_date);
      else endDate.setFullYear(endDate.getFullYear() + 1);
      
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

// === МИГРАЦИЯ СТУДЕНТОВ ===

async function migrateStudents(branchMapping) {
  console.log('\n🎓 МИГРАЦИЯ СТУДЕНТОВ\n');
  
  if (!branchMapping || branchMapping.size === 0) {
    // Fallback: без филиалов
    const customers = await fetchAllPages('/v2api/customer/index');
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progressBar.start(customers.length, 0);
    let migrated = 0;
    let skipped = 0;
    
    for (const customer of customers) {
      try {
        await migrateStudentToBranch(customer, COMPANY_ID);
        migrated++;
        progressBar.update(migrated + skipped);
      } catch (error) {
        console.error(`\n   ⚠️  Ошибка для ${customer.name}: ${error.message}`);
        skipped++;
      }
    }
    
    progressBar.stop();
    console.log(`✅ Мигрировано студентов: ${migrated}`);
    if (skipped > 0) console.log(`⚠️  Пропущено: ${skipped}\n`);
    else console.log();
    return;
  }
  
  // Для каждого филиала делаем запрос
  const allBranches = Array.from(branchMapping.entries()).filter(([id]) => id !== 'default');
  let totalMigrated = 0;
  let totalSkipped = 0;
  
  for (const [alfacrmBranchId, ourBranchId] of allBranches) {
    const customers = await fetchAllPages('/v2api/customer/index', {}, alfacrmBranchId);
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progressBar.start(customers.length, 0);
    let migrated = 0;
    let skipped = 0;
    
    for (const customer of customers) {
      try {
        // Создаем уникальный ID для студента: ${customerId}_${branchId}
        const uniqueStudentId = `${customer.id?.toString()}_${ourBranchId}`;
        await migrateStudentToBranch(customer, ourBranchId, uniqueStudentId);
        migrated++;
        progressBar.update(migrated + skipped);
      } catch (error) {
        console.error(`\n   ⚠️  Ошибка для ${customer.name}: ${error.message}`);
        skipped++;
      }
    }
    
    progressBar.stop();
    totalMigrated += migrated;
    totalSkipped += skipped;
    console.log(`✅ Филиал ${alfacrmBranchId}: мигрировано ${migrated} студентов`);
  }
  
  console.log(`✅ Всего мигрировано студентов: ${totalMigrated}`);
  if (totalSkipped > 0) console.log(`⚠️  Пропущено: ${totalSkipped}\n`);
  else console.log();
}

async function migrateStudentToBranch(customer, branchId, uniqueStudentId = null) {
  const studentId = uniqueStudentId || customer.id?.toString();
  
  // Email: массив строк или объектов
  let email = '';
  if (Array.isArray(customer.email) && customer.email.length > 0) {
    email = typeof customer.email[0] === 'string' ? customer.email[0] : (customer.email[0]?.value || '');
  } else if (typeof customer.email === 'string') {
    email = customer.email;
  }
  if (!email || email.trim() === '') {
    // Используем уникальный ID студента для email, чтобы избежать конфликтов
    email = `student_${studentId}@temp.local`;
  } else {
    // Если email уже есть, добавляем суффикс филиала для уникальности
    // Это нужно, потому что один студент может быть в нескольких филиалах
    const emailParts = email.split('@');
    if (emailParts.length === 2) {
      email = `${emailParts[0]}_${branchId.substring(branchId.length - 8)}@${emailParts[1]}`;
    } else {
      email = `${email}_${branchId.substring(branchId.length - 8)}@temp.local`;
    }
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
  
  // Используем try-catch для обработки дубликатов email
  let result;
  try {
    result = await pool.query(`
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
      studentId,
      customer.name || 'Unknown',
      email,
      phone,
      age,
      status,
      COMPANY_ID,
      branchId
    ]);
  } catch (error) {
    // Если ошибка из-за дубликата email, генерируем новый уникальный email
    if (error.code === '23505' && error.constraint === 'students_email_key') {
      // Генерируем новый уникальный email с суффиксом филиала
      const emailParts = email.split('@');
      const newEmail = emailParts.length === 2 
        ? `${emailParts[0]}_${branchId.substring(branchId.length - 8)}@${emailParts[1]}`
        : `${email}_${branchId.substring(branchId.length - 8)}@temp.local`;
      
      result = await pool.query(`
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
        studentId,
        customer.name || 'Unknown',
        newEmail,
        phone,
        age,
        status,
        COMPANY_ID,
        branchId
      ]);
    } else {
      throw error;
    }
  }
  
  const finalStudentId = result.rows[0].id;
  
  // Создаем баланс с version для optimistic locking
  await pool.query(`
    INSERT INTO student_balance (student_id, balance, version)
    VALUES ($1, $2, 0)
    ON CONFLICT (student_id) DO UPDATE SET balance = EXCLUDED.balance, version = student_balance.version
  `, [finalStudentId, balance]);
}

// === МИГРАЦИЯ АБОНЕМЕНТОВ СТУДЕНТОВ (SMART) ===

// Кэш цен уроков студентов из AlfaCRM
const studentPricesCache = new Map();

/**
 * Загружает цены уроков всех студентов из AlfaCRM
 * Использует ПОСЛЕДНЮЮ (актуальную) цену урока для каждого студента
 */
async function preloadStudentPrices() {
  console.log('\n💰 ПРЕДЗАГРУЗКА ЦЕН УРОКОВ ИЗ ALFACRM\n');
  
  const token = await getAlfaCRMToken();
  let page = 0;
  
  while (page < 20) {
    try {
      const response = await axios.post(`${ALFACRM_API_URL}/v2api/lesson/index`, {
        page,
        count: 50,
      }, {
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
  
  if (!branchMapping || branchMapping.size === 0) {
    // Fallback: без филиалов
    const customers = await fetchAllPages('/v2api/customer/index');
    const groups = await pool.query('SELECT id FROM groups WHERE company_id = $1', [COMPANY_ID]);
    const groupIds = groups.rows.map(g => g.id);
    
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
        
        if (paidCount <= 0 && balance <= 0) {
          skipped++;
          progressBar.update(created + skipped);
          continue;
        }
        
        let groupId = null;
        if (customer.group_ids && customer.group_ids.length > 0) {
          const customerGroupId = customer.group_ids[0].toString();
          if (groupIds.includes(customerGroupId)) {
            groupId = customerGroupId;
          }
        }
        
        const totalLessons = paidCount || 8;
        const usedLessons = 0;
        const realPriceFromAlfaCRM = studentPricesCache.get(studentId);
        const avgPricePerLesson = realPriceFromAlfaCRM || (balance > 0 && totalLessons > 0 ? balance / totalLessons : 3000);
        const totalPrice = avgPricePerLesson * totalLessons;
        
        const startDate = new Date();
        const endDate = paidTill ? new Date(paidTill) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        
        let status = 'active';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (endDate && endDate < today) {
          status = 'expired';
        } else if (paidCount <= 0 && balance <= 0 && (!paidTill || new Date(paidTill) < today)) {
          status = 'expired';
        }
        
        const typeResult = await pool.query(`
          SELECT id FROM subscription_types WHERE company_id = $1 AND lessons_count >= $2
          ORDER BY ABS(lessons_count - $2) LIMIT 1
        `, [COMPANY_ID, totalLessons]);
        
        let subscriptionTypeId = null;
        if (typeResult.rows.length > 0) {
          subscriptionTypeId = typeResult.rows[0].id;
        }
        
        const subscriptionId = `sub_${studentId}_${Date.now()}`;
        
        await pool.query(`
          INSERT INTO student_subscriptions (
            id, student_id, subscription_type_id, group_id, teacher_id,
            total_lessons, used_lessons, total_price, price_per_lesson,
            start_date, end_date, paid_till, status, freeze_days_remaining, company_id, branch_id, version
          )
          VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 0)
          ON CONFLICT (id) DO UPDATE SET
            total_lessons = EXCLUDED.total_lessons,
            used_lessons = EXCLUDED.used_lessons,
            total_price = EXCLUDED.total_price,
            price_per_lesson = EXCLUDED.price_per_lesson,
            start_date = EXCLUDED.start_date,
            end_date = EXCLUDED.end_date,
            paid_till = EXCLUDED.paid_till,
            status = EXCLUDED.status,
            company_id = EXCLUDED.company_id,
            branch_id = EXCLUDED.branch_id
        `, [
          subscriptionId, studentId, subscriptionTypeId, groupId,
          totalLessons, usedLessons, totalPrice, avgPricePerLesson,
          startDate, endDate, paidTill, status, 0, COMPANY_ID, COMPANY_ID
        ]);
        
        if (groupId) {
          await pool.query(`
            INSERT INTO enrollment (student_id, group_id, joined_at, company_id, branch_id)
            VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4)
            ON CONFLICT (student_id, group_id) WHERE left_at IS NULL DO NOTHING
          `, [studentId, groupId, COMPANY_ID, COMPANY_ID]);
        }
        
        created++;
      } catch (error) {
        console.error(`\n   ⚠️  Ошибка: ${error.message}`);
        skipped++;
      }
      progressBar.update(created + skipped);
    }
    
    progressBar.stop();
    console.log(`✅ Создано абонементов: ${created}`);
    if (skipped > 0) console.log(`⚠️  Пропущено: ${skipped}\n`);
    else console.log();
    return;
  }
  
  // Для каждого филиала делаем запрос
  const allBranches = Array.from(branchMapping.entries()).filter(([id]) => id !== 'default');
  const allGroups = await pool.query('SELECT id FROM groups WHERE company_id = $1', [COMPANY_ID]);
  const allGroupIds = new Set(allGroups.rows.map(g => g.id));
  
  let totalCreated = 0;
  let totalSkipped = 0;
  
  for (const [alfacrmBranchId, ourBranchId] of allBranches) {
    const customers = await fetchAllPages('/v2api/customer/index', {}, alfacrmBranchId);
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progressBar.start(customers.length, 0);
    let created = 0;
    let skipped = 0;
    
    for (const customer of customers) {
      try {
        // Используем уникальный ID студента: ${customerId}_${branchId}
        const uniqueStudentId = `${customer.id?.toString()}_${ourBranchId}`;
        
        // ВАЖНО: Проверяем, что студент существует перед созданием подписки
        const studentExists = await pool.query(
          'SELECT id FROM students WHERE id = $1 AND company_id = $2',
          [uniqueStudentId, COMPANY_ID]
        );
        
        if (studentExists.rows.length === 0) {
          skipped++;
          progressBar.update(created + skipped);
          continue;
        }
        
        const paidCount = customer.paid_count || customer.paid_lesson_count || 0;
        const paidTill = customer.paid_till || null;
        const balance = parseFloat(customer.balance || 0);
        
        // Проверяем активную запись
        const hasActiveEnrollment = (await pool.query(
          'SELECT 1 FROM enrollment WHERE student_id = $1 AND left_at IS NULL AND company_id = $2 AND branch_id = $3',
          [uniqueStudentId, COMPANY_ID, ourBranchId]
        )).rows.length > 0;
        
        const hasActiveSubscription = paidTill && new Date(paidTill) > new Date();
        
        if (paidCount <= 0 && balance <= 0 && !hasActiveSubscription && !hasActiveEnrollment) {
          skipped++;
          progressBar.update(created + skipped);
          continue;
        }
        
        // Ищем группу: сначала по уникальному ID, потом по оригинальному
        let groupId = null;
        if (customer.group_ids && customer.group_ids.length > 0) {
          const alfacrmGroupId = customer.group_ids[0].toString();
          const uniqueGroupId = `${alfacrmGroupId}_${ourBranchId}`;
          if (allGroupIds.has(uniqueGroupId)) {
            groupId = uniqueGroupId;
          } else {
            // Ищем группу в любом филиале
            const foundGroup = Array.from(allGroupIds).find(id => id.startsWith(`${alfacrmGroupId}_`));
            if (foundGroup) groupId = foundGroup;
            else if (allGroupIds.has(alfacrmGroupId)) groupId = alfacrmGroupId;
          }
        }
        
        const totalLessons = paidCount || 8;
        const usedLessons = 0;
        const realPriceFromAlfaCRM = studentPricesCache.get(customer.id?.toString());
        const avgPricePerLesson = realPriceFromAlfaCRM || (balance > 0 && totalLessons > 0 ? balance / totalLessons : 3000);
        const totalPrice = avgPricePerLesson * totalLessons;
        
        const startDate = new Date();
        const endDate = paidTill ? new Date(paidTill) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        
        let status = 'active';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (endDate && endDate < today) {
          status = 'expired';
        } else if (paidCount <= 0 && balance <= 0 && (!paidTill || new Date(paidTill) < today)) {
          status = 'expired';
        }
        
        const typeResult = await pool.query(`
          SELECT id FROM subscription_types WHERE company_id = $1 AND lessons_count >= $2
          ORDER BY ABS(lessons_count - $2) LIMIT 1
        `, [COMPANY_ID, totalLessons]);
        
        let subscriptionTypeId = null;
        if (typeResult.rows.length > 0) {
          subscriptionTypeId = typeResult.rows[0].id;
        }
        
        const branchHash = ourBranchId.substring(ourBranchId.length - 8);
        const subscriptionId = `sub_${uniqueStudentId}_${branchHash}_${Date.now()}`;
        
        await pool.query(`
          INSERT INTO student_subscriptions (
            id, student_id, subscription_type_id, group_id, teacher_id,
            total_lessons, used_lessons, total_price, price_per_lesson,
            start_date, end_date, paid_till, status, freeze_days_remaining, company_id, branch_id, version
          )
          VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 0)
          ON CONFLICT (id) DO UPDATE SET
            total_lessons = EXCLUDED.total_lessons,
            used_lessons = EXCLUDED.used_lessons,
            total_price = EXCLUDED.total_price,
            price_per_lesson = EXCLUDED.price_per_lesson,
            start_date = EXCLUDED.start_date,
            end_date = EXCLUDED.end_date,
            paid_till = EXCLUDED.paid_till,
            status = EXCLUDED.status,
            company_id = EXCLUDED.company_id,
            branch_id = EXCLUDED.branch_id
        `, [
          subscriptionId, uniqueStudentId, subscriptionTypeId, groupId,
          totalLessons, usedLessons, totalPrice, avgPricePerLesson,
          startDate, endDate, paidTill, status, 0, COMPANY_ID, ourBranchId
        ]);
        
        if (groupId) {
          await pool.query(`
            INSERT INTO enrollment (student_id, group_id, joined_at, company_id, branch_id)
            VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4)
            ON CONFLICT (student_id, group_id) WHERE left_at IS NULL DO NOTHING
          `, [uniqueStudentId, groupId, COMPANY_ID, ourBranchId]);
        }
        
        created++;
      } catch (error) {
        console.error(`\n   ⚠️  Ошибка: ${error.message}`);
        skipped++;
      }
      progressBar.update(created + skipped);
    }
    
    progressBar.stop();
    totalCreated += created;
    totalSkipped += skipped;
    console.log(`✅ Филиал ${alfacrmBranchId}: создано ${created} абонементов`);
  }
  
  console.log(`✅ Всего создано абонементов: ${totalCreated}`);
  if (totalSkipped > 0) console.log(`⚠️  Пропущено: ${totalSkipped}\n`);
  else console.log();
}

// === МИГРАЦИЯ ТРАНЗАКЦИЙ ===
// Примечание: AlfaCRM API не предоставляет отдельный эндпоинт для истории платежей
// Рассчитываем общую оплату: Текущий баланс + Сумма всех списаний за посещения

async function migrateTransactions(studentDeductions = null, branchMapping = null) {
  console.log('\n💰 СОЗДАНИЕ ТРАНЗАКЦИЙ С РАСЧЕТОМ ОБЩЕЙ ОПЛАТЫ\n');
  
  if (studentDeductions && studentDeductions.size > 0) {
    console.log(`📊 Используем данные о списаниях для ${studentDeductions.size} студентов\n`);
  }
  
  // Получаем балансы со студентами и их филиалами
  const balances = await pool.query(`
    SELECT sb.student_id, sb.balance, s.name, s.branch_id
    FROM student_balance sb
    JOIN students s ON sb.student_id = s.id
    WHERE s.company_id = $1
  `, [COMPANY_ID]);
  
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(balances.rows.length, 0);
  
  let created = 0;
  const transactionDate = new Date('2025-01-01');
  
  for (const balance of balances.rows) {
    try {
      const currentBalance = parseFloat(balance.balance) || 0;
      // Ищем списания по оригинальному ID студента (без суффикса филиала)
      const originalStudentId = balance.student_id.includes('_') ? balance.student_id.split('_')[0] : balance.student_id;
      const deducted = studentDeductions ? (studentDeductions.get(originalStudentId) || 0) : 0;
      
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
          balance.branch_id || COMPANY_ID
        ]);
        
        created++;
      }
    } catch (error) {
      console.error(`\n   ⚠️  ${balance.name}: ${error.message}`);
    }
    
    progressBar.update(created);
  }
  
  progressBar.stop();
  console.log(`✅ Создано транзакций: ${created}\n`);
}

// === МИГРАЦИЯ ИСТОРИИ ПОСЕЩЕНИЙ УРОКОВ ===

async function migrateLessonHistory(branchMapping) {
  console.log('\n📚 МИГРАЦИЯ ИСТОРИИ ПОСЕЩЕНИЙ УРОКОВ (последние 3 месяца)\n');
  
  // Дата начала периода (3 месяца назад)
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  
  console.log(`🔄 Получение уроков с ${threeMonthsAgo.toLocaleDateString('ru-RU')} по сегодня...`);
  
  const lessons = [];
  
  if (!branchMapping || branchMapping.size === 0) {
    // Fallback: без филиалов
    const token = await getAlfaCRMToken();
    let page = 0;
    let shouldContinue = true;
    
    while (shouldContinue) {
      try {
        const response = await axios.post(`${ALFACRM_API_URL}/v2api/lesson/index`, {
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
          
          // Если урок старше 3 месяцев, прекращаем загрузку
          if (lessonDate && lessonDate < threeMonthsAgo) {
            shouldContinue = false;
            break;
          }
          
          // Если урок в пределах 3 месяцев, добавляем его
          if (lessonDate && lessonDate >= threeMonthsAgo) {
            lessons.push(lesson);
          }
        }
        
        console.log(`   📄 Страница ${page}: получено ${items.length} уроков (отобрано: ${lessons.length})`);
        page++;
        
        // Ограничение для безопасности (максимум 50 страниц для 3 месяцев)
        if (page >= 50) {
          console.log('   ⚠️  Достигнут лимит страниц (50), прекращаем загрузку');
          break;
        }
        
      } catch (error) {
        console.error(`   ❌ Ошибка на странице ${page}: ${error.message}`);
        break;
      }
    }
  } else {
    // Для каждого филиала делаем запрос
    const allBranches = Array.from(branchMapping.entries()).filter(([id]) => id !== 'default');
    
    for (const [alfacrmBranchId, ourBranchId] of allBranches) {
      console.log(`🔄 Получение уроков для филиала (AlfaCRM ID: ${alfacrmBranchId})...`);
      const token = await getAlfaCRMToken();
      let page = 0;
      let shouldContinue = true;
      
      while (shouldContinue) {
        try {
          const response = await axios.post(`${ALFACRM_API_URL}/v2api/${alfacrmBranchId}/lesson/index`, {
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
            
            // Если урок старше 3 месяцев, прекращаем загрузку
            if (lessonDate && lessonDate < threeMonthsAgo) {
              shouldContinue = false;
              break;
            }
            
            // Если урок в пределах 3 месяцев, добавляем его
            if (lessonDate && lessonDate >= threeMonthsAgo) {
              lessons.push(lesson);
            }
          }
          
          console.log(`   📄 Страница ${page}: получено ${items.length} уроков (отобрано: ${lessons.length})`);
          page++;
          
          // Ограничение для безопасности (максимум 50 страниц для 3 месяцев)
          if (page >= 50) {
            console.log('   ⚠️  Достигнут лимит страниц (50), прекращаем загрузку');
            break;
          }
          
        } catch (error) {
          console.error(`   ❌ Ошибка на странице ${page}: ${error.message}`);
          break;
        }
      }
    }
  }
  
  console.log(`\n📊 Получено уроков за последние 3 месяца: ${lessons.length}`);
  
  if (lessons.length === 0) {
    console.log('⚠️  Нет уроков для миграции\n');
    return;
  }
  
  // Фильтруем только прошедшие уроки с посещениями (в пределах 3 месяцев)
  const today = new Date();
  const completedLessons = lessons.filter(lesson => {
    const lessonDate = lesson.date ? new Date(lesson.date) : null;
    return lessonDate && 
           lessonDate >= threeMonthsAgo && 
           lessonDate < today && 
           lesson.customer_ids && 
           lesson.customer_ids.length > 0;
  });
  
  console.log(`📊 Прошедших уроков с посещениями: ${completedLessons.length}\n`);
  
  if (completedLessons.length === 0) {
    console.log('⚠️  Нет прошедших уроков для миграции\n');
    return;
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
        // customerIds уже объявлен выше
        
        for (const customerId of customerIds) {
          try {
            const studentExists = await pool.query(
              'SELECT id FROM students WHERE id = $1 AND company_id = $2',
              [customerId.toString(), COMPANY_ID]
            );
            
            if (studentExists.rows.length === 0) continue;
            
            // Получаем ЛЮБОЙ абонемент студента (для исторических данных берем любой)
            const subscription = await pool.query(`
              SELECT id FROM student_subscriptions
              WHERE student_id = $1 AND company_id = $2
              ORDER BY created_at DESC
              LIMIT 1
            `, [customerId.toString(), COMPANY_ID]);
            
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
            
            // Получаем branch_id из студента
            const studentBranch = await pool.query(
              'SELECT branch_id FROM students WHERE id = $1 AND company_id = $2',
              [customerId.toString(), COMPANY_ID]
            );
            const branchId = studentBranch.rows.length > 0 ? studentBranch.rows[0].branch_id : null;
            
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
              branchId
            ]);
            
            // Теперь создаем запись посещения
            await pool.query(`
              INSERT INTO lesson_attendance (
                lesson_id, student_id, subscription_id, status, 
                marked_at, company_id
              ) VALUES ($1, $2, $3, $4, $5, $6)
              ON CONFLICT DO NOTHING
            `, [lessonId, customerId.toString(), subscriptionId, 'attended', lessonDate, COMPANY_ID]);
            
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
            const alfacrmCustomerId = detail.customer_id?.toString();
            if (!alfacrmCustomerId) continue;
            
            // Ищем студента: сначала по уникальному ID для каждого филиала, потом по оригинальному
            const allStudents = await pool.query('SELECT id, branch_id FROM students WHERE company_id = $1', [COMPANY_ID]);
            const allStudentIds = new Set(allStudents.rows.map(s => s.id));
            const studentBranchMap = new Map();
            allStudents.rows.forEach(s => {
              studentBranchMap.set(s.id, s.branch_id);
            });
            
            let customerId = null;
            let branchId = null;
            
            // Пытаемся найти студента по уникальному ID в любом филиале
            const foundStudent = Array.from(allStudentIds).find(id => id.startsWith(`${alfacrmCustomerId}_`));
            if (foundStudent) {
              customerId = foundStudent;
              branchId = studentBranchMap.get(foundStudent);
            } else if (allStudentIds.has(alfacrmCustomerId)) {
              customerId = alfacrmCustomerId;
              branchId = studentBranchMap.get(alfacrmCustomerId);
            }
            
            if (!customerId) continue;
            
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
              WHERE student_id = $1 AND company_id = $2
              ORDER BY created_at DESC
              LIMIT 1
            `, [customerId, COMPANY_ID]);
            
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
            
            // branchId уже получен из студента выше (строка 1641, 1647, 1650)
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
              branchId
            ]);
            
            // Теперь создаем запись посещения
            await pool.query(`
              INSERT INTO lesson_attendance (
                lesson_id, student_id, subscription_id, status, 
                marked_at, company_id
              ) VALUES ($1, $2, $3, $4, $5, $6)
              ON CONFLICT DO NOTHING
            `, [lessonId, customerId, subscriptionId, status, lessonDate, COMPANY_ID]);
            
            attendanceCreated++;
            
            // Учитываем списание для статистики
            const commission = parseFloat(detail.commission || 0);
            if (commission > 0) {
              // Используем оригинальный ID студента для статистики списаний
              const originalCustomerId = alfacrmCustomerId.includes('_') ? alfacrmCustomerId.split('_')[0] : alfacrmCustomerId;
              const currentTotal = studentDeductions.get(originalCustomerId) || 0;
              studentDeductions.set(originalCustomerId, currentTotal + commission);
              
              // Создаем транзакцию списания (НО НЕ МЕНЯЕМ БАЛАНС - он уже правильный после migrateTransactions)
              // created_by = NULL для исторических транзакций из миграции
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
                branchId || COMPANY_ID
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
  console.log(`✅ Создано записей посещений: ${attendanceCreated}`);
  if (skipped > 0) {
    console.log(`⚠️  Пропущено уроков: ${skipped}\n`);
  } else {
    console.log();
  }
  
  // Возвращаем статистику списаний для расчета общей оплаты
  console.log(`📊 Рассчитаны списания для ${studentDeductions.size} студентов\n`);
  return studentDeductions;
}

// === МИГРАЦИЯ ДОЛГОВ ===

async function migrateDebts() {
  console.log('\n📕 МИГРАЦИЯ ДОЛГОВ\n');
  
  const debtors = await pool.query(`
    SELECT sb.student_id, sb.balance, s.name, s.branch_id
    FROM student_balance sb
    JOIN students s ON sb.student_id = s.id
    WHERE sb.balance < 0 AND s.company_id = $1
  `, [COMPANY_ID]);
  
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(debtors.rows.length, 0);
  
  let created = 0;
  
  for (const debtor of debtors.rows) {
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
        debtor.branch_id || COMPANY_ID
      ]);
      
      created++;
    } catch (error) {
      console.error(`\n   ⚠️  ${debtor.name}: ${error.message}`);
    }
    
    progressBar.update(created);
  }
  
  progressBar.stop();
  console.log(`✅ Создано долгов: ${created}\n`);
}

// === ГЕНЕРАЦИЯ УРОКОВ ===

async function generateLessons() {
  console.log('\n📚 ГЕНЕРАЦИЯ УРОКОВ (3 месяца)\n');
  
  const schedules = await pool.query(`
    SELECT 
      gs.*,
      g.name as group_name,
      g.branch_id as group_branch_id,
      COALESCE(gs.teacher_id, g.teacher_id) as teacher_id,
      r.name as room_name
    FROM group_schedule gs
    JOIN groups g ON gs.group_id = g.id
    LEFT JOIN rooms r ON gs.room_id = r.id
    WHERE gs.is_active = true AND gs.company_id = $1
  `, [COMPANY_ID]);
  
  // Получаем активные записи enrollment (только текущие связи студент-группа)
  const studentGroups = await pool.query(`
    SELECT student_id, group_id 
    FROM enrollment 
    WHERE left_at IS NULL AND company_id = $1
  `, [COMPANY_ID]);
  const groupStudents = {};
  studentGroups.rows.forEach(sg => {
    if (!groupStudents[sg.group_id]) {
      groupStudents[sg.group_id] = [];
    }
    groupStudents[sg.group_id].push(sg.student_id);
  });
  
  // Генерируем уроки на 3 месяца вперед (вместо 2 недель)
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 3);
  
  let expectedLessons = 0;
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
    schedules.rows.forEach(schedule => {
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
    
    for (const schedule of schedules.rows) {
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
      
      // Проверяем, что room_id существует в таблице rooms (если он указан)
      let validRoomId = schedule.room_id;
      if (validRoomId) {
        const roomCheck = await pool.query(
          'SELECT id FROM rooms WHERE id = $1 AND company_id = $2',
          [validRoomId, COMPANY_ID]
        );
        if (roomCheck.rows.length === 0) {
          // Комната не найдена, устанавливаем room_id в NULL
          validRoomId = null;
        }
      }
      
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
        validRoomId, // Используем проверенный room_id
        'scheduled',
        COMPANY_ID,
        schedule.group_branch_id // branch_id из группы
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
  console.log(`✅ Создано уроков: ${totalLessons}`);
  console.log(`✅ Связей студент-урок: ${totalStudentLinks}\n`);
}

// === СОЗДАНИЕ КОМПАНИИ И ФИЛИАЛОВ ===

async function createCompanyAndBranches() {
  console.log('\n🏢 СОЗДАНИЕ КОМПАНИИ И ФИЛИАЛОВ\n');
  
  // Создаем компанию
  await pool.query(`
    INSERT INTO companies (id, name, status)
    VALUES ($1, $2, $3)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      status = EXCLUDED.status
  `, [COMPANY_ID, COMPANY_NAME, 'active']);
  
  console.log(`✅ Компания создана: ${COMPANY_NAME} (ID: ${COMPANY_ID})`);
  
  // Получаем филиалы из AlfaCRM
  const branches = await fetchAllPages('/v2api/branch/index');
  console.log(`📋 Получено филиалов из AlfaCRM: ${branches.length}`);
  
  const branchMapping = new Map(); // alfacrmBranchId -> ourBranchId
  const DEFAULT_BRANCH_ID = `${COMPANY_ID}_default_branch`;
  
  // Создаем дефолтный филиал
  await pool.query(`
    INSERT INTO branches (id, name, company_id, status)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      status = EXCLUDED.status
  `, [DEFAULT_BRANCH_ID, 'Основной филиал', COMPANY_ID, 'active']);
  branchMapping.set('default', DEFAULT_BRANCH_ID);
  
  // Создаем филиалы из AlfaCRM
  for (const branch of branches) {
    const alfacrmBranchId = parseInt(branch.id);
    const ourBranchId = `${COMPANY_ID}_branch_${alfacrmBranchId}`;
    
    await pool.query(`
      INSERT INTO branches (id, name, company_id, status)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        status = EXCLUDED.status
    `, [ourBranchId, branch.name || `Филиал ${alfacrmBranchId}`, COMPANY_ID, 'active']);
    
    branchMapping.set(alfacrmBranchId, ourBranchId);
    console.log(`  ✅ Филиал создан: ${branch.name} (AlfaCRM ID: ${alfacrmBranchId} → наш ID: ${ourBranchId})`);
  }
  
  // Если есть филиалы из AlfaCRM, помечаем дефолтный как неактивный
  if (branches.length > 0) {
    await pool.query(`
      UPDATE branches SET status = 'inactive' WHERE id = $1 AND company_id = $2
    `, [DEFAULT_BRANCH_ID, COMPANY_ID]);
  }
  
  console.log(`✅ Всего создано филиалов: ${branchMapping.size}\n`);
  
  return branchMapping;
}

// === МИГРАЦИЯ ИНДИВИДУАЛЬНЫХ ЗАНЯТИЙ ===

async function migrateIndividualLessons(branchMapping) {
  console.log('\n👤 МИГРАЦИЯ ИНДИВИДУАЛЬНЫХ ЗАНЯТИЙ (БЕЗ групп)\n');
  
  // Получаем существующие группы
  const existingGroups = await pool.query('SELECT id FROM groups WHERE company_id = $1', [COMPANY_ID]);
  const groupIds = new Set(existingGroups.rows.map(g => g.id));
  
  // Получаем расписания для каждого филиала отдельно
  const individualSchedules = [];
  
  if (!branchMapping || branchMapping.size === 0) {
    // Fallback: без филиалов
    const regularLessons = await fetchAllPages('/v2api/regular-lesson/index', {}, null);
    
    for (const lesson of regularLessons) {
      const relatedId = lesson.related_id?.toString();
      if (!relatedId || groupIds.has(relatedId)) continue;
      
      // Проверяем, что это студент
      const student = await pool.query('SELECT id, name, branch_id FROM students WHERE id = $1 AND company_id = $2', [relatedId, COMPANY_ID]);
      if (student.rows.length > 0) {
        individualSchedules.push({
          ...lesson,
          studentId: relatedId,
          studentName: student.rows[0].name,
          branchId: student.rows[0].branch_id
        });
      }
    }
  } else {
    // Для каждого филиала делаем запрос
    const allBranches = Array.from(branchMapping.entries()).filter(([id]) => id !== 'default');
    
    for (const [alfacrmBranchId, ourBranchId] of allBranches) {
      console.log(`🔄 Запрос индивидуальных занятий для филиала (AlfaCRM ID: ${alfacrmBranchId})...`);
      const regularLessons = await fetchAllPages('/v2api/regular-lesson/index', {}, alfacrmBranchId);
      
      for (const lesson of regularLessons) {
        const relatedId = lesson.related_id?.toString();
        if (!relatedId || groupIds.has(relatedId)) continue;
        
        // Проверяем, что это студент в этом филиале
        const student = await pool.query('SELECT id, name, branch_id FROM students WHERE id = $1 AND company_id = $2 AND branch_id = $3', 
          [relatedId, COMPANY_ID, ourBranchId]);
        
        // Если не нашли в этом филиале, ищем по уникальному ID
        if (student.rows.length === 0) {
          const uniqueStudentId = `${relatedId}_${ourBranchId}`;
          const studentResult = await pool.query('SELECT id, name, branch_id FROM students WHERE id = $1 AND company_id = $2', 
            [uniqueStudentId, COMPANY_ID]);
          if (studentResult.rows.length > 0) {
            individualSchedules.push({
              ...lesson,
              studentId: uniqueStudentId,
              studentName: studentResult.rows[0].name,
              branchId: ourBranchId
            });
          }
        } else {
          individualSchedules.push({
            ...lesson,
            studentId: relatedId,
            studentName: student.rows[0].name,
            branchId: ourBranchId
          });
        }
      }
      
      console.log(`   Найдено индивидуальных занятий для филиала ${alfacrmBranchId}: ${individualSchedules.filter(s => s.branchId === ourBranchId).length}`);
    }
  }
  
  console.log(`📊 Найдено индивидуальных занятий: ${individualSchedules.length}`);
  
  if (individualSchedules.length === 0) {
    console.log('⚠️  Нет индивидуальных занятий для миграции\n');
    return;
  }
  
  // Генерируем индивидуальные уроки на 3 месяца вперед
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 3);
  
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
        
        // Получаем branch_id из студента для разрешения room_id
        const studentBranch = await pool.query(
          'SELECT branch_id FROM students WHERE id = $1 AND company_id = $2',
          [studentId, COMPANY_ID]
        );
        const branchId = studentBranch.rows.length > 0 ? studentBranch.rows[0].branch_id : (lesson.branchId || null);
        
        // Разрешаем room_id к уникальному формату (с суффиксом филиала)
        let roomId = null;
        const alfacrmRoomId = lesson.room_id?.toString() || null;
        if (alfacrmRoomId && branchId) {
          // Сначала пытаемся найти комнату с уникальным ID
          const uniqueRoomId = `${alfacrmRoomId}_${branchId}`;
          const roomCheck = await pool.query(
            'SELECT id FROM rooms WHERE id = $1 AND company_id = $2',
            [uniqueRoomId, COMPANY_ID]
          );
          if (roomCheck.rows.length > 0) {
            roomId = uniqueRoomId;
          } else {
            // Пытаемся найти комнату в любом филиале
            const allRooms = await pool.query('SELECT id FROM rooms WHERE company_id = $1', [COMPANY_ID]);
            const foundRoom = allRooms.rows.find(r => r.id.startsWith(`${alfacrmRoomId}_`));
            if (foundRoom) {
              roomId = foundRoom.id;
            } else if (allRooms.rows.find(r => r.id === alfacrmRoomId)) {
              roomId = alfacrmRoomId;
            }
          }
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
        
        // branchId уже получен выше при разрешении room_id
        
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
  console.log(`✅ Создано индивидуальных уроков: ${lessonsCreated}`);
  if (skipped > 0) {
    console.log(`⚠️  Пропущено: ${skipped}`);
  }
  console.log();
}

// === МИГРАЦИЯ СВЯЗЕЙ СТУДЕНТ-ГРУППА ===

async function migrateStudentGroupLinks(branchMapping) {
  console.log('\n🔗 МИГРАЦИЯ СВЯЗЕЙ СТУДЕНТ-ГРУППА\n');
  
  if (!branchMapping || branchMapping.size === 0) {
    // Fallback: без филиалов
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
    
    const links = new Set();
    for (const lesson of lessons) {
      const groupIds = lesson.group_ids || [];
      const customerIds = lesson.customer_ids || [];
      for (const groupId of groupIds) {
        for (const customerId of customerIds) {
          links.add(`${customerId}-${groupId}`);
        }
      }
    }
    
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progressBar.start(links.size, 0);
    let created = 0;
    let skipped = 0;
    
    for (const link of links) {
      const [studentId, groupId] = link.split('-');
      try {
        const studentExists = await pool.query('SELECT id FROM students WHERE id = $1 AND company_id = $2', [studentId, COMPANY_ID]);
        const groupExists = await pool.query('SELECT id FROM groups WHERE id = $1 AND company_id = $2', [groupId, COMPANY_ID]);
        
        if (studentExists.rows.length === 0 || groupExists.rows.length === 0) {
          skipped++;
          progressBar.update(created + skipped);
          continue;
        }
        
        // Получаем branch_id из группы или студента
        const groupBranch = await pool.query('SELECT branch_id FROM groups WHERE id = $1', [groupId]);
        const studentBranch = await pool.query('SELECT branch_id FROM students WHERE id = $1', [studentId]);
        const branchId = groupBranch.rows[0]?.branch_id || studentBranch.rows[0]?.branch_id || COMPANY_ID;
        
        await pool.query(`
          INSERT INTO enrollment (student_id, group_id, joined_at, company_id, branch_id)
          VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4)
          ON CONFLICT (student_id, group_id) WHERE left_at IS NULL DO NOTHING
        `, [studentId, groupId, COMPANY_ID, branchId]);
        created++;
      } catch (error) {
        skipped++;
      }
      progressBar.update(created + skipped);
    }
    
    progressBar.stop();
    console.log(`✅ Создано связей: ${created}`);
    if (skipped > 0) console.log(`⚠️  Пропущено: ${skipped}\n`);
    else console.log();
    return;
  }
  
  // Для каждого филиала делаем запрос
  const allBranches = Array.from(branchMapping.entries()).filter(([id]) => id !== 'default');
  const allStudents = await pool.query('SELECT id FROM students WHERE company_id = $1', [COMPANY_ID]);
  const allStudentIds = new Set(allStudents.rows.map(s => s.id));
  const allGroups = await pool.query('SELECT id FROM groups WHERE company_id = $1', [COMPANY_ID]);
  const allGroupIds = new Set(allGroups.rows.map(g => g.id));
  
  let totalCreated = 0;
  let totalSkipped = 0;
  
  for (const [alfacrmBranchId, ourBranchId] of allBranches) {
    const token = await getAlfaCRMToken();
    const lessons = [];
    const maxPages = 10;
    
    console.log(`🔄 Запрос последних уроков для филиала (макс. 10 страниц)...`);
    
    for (let page = 0; page < maxPages; page++) {
      try {
        const response = await axios.post(`${ALFACRM_API_URL}/v2api/${alfacrmBranchId}/lesson/index`, {
          page,
          count: 50,
        }, {
          headers: { 'X-ALFACRM-TOKEN': token },
        });
        
        const items = response.data.items || [];
        if (items.length === 0) break;
        lessons.push(...items);
        console.log(`   📄 Страница ${page}: получено ${items.length} уроков`);
      } catch (error) {
        console.error(`   ❌ Ошибка на странице ${page}: ${error.message}`);
        break;
      }
    }
    
    const links = new Set();
    for (const lesson of lessons) {
      const groupIds = lesson.group_ids || [];
      const customerIds = lesson.customer_ids || [];
      for (const groupId of groupIds) {
        for (const customerId of customerIds) {
          links.add(`${customerId}-${groupId}`);
        }
      }
    }
    
    console.log(`📊 Получено уроков для филиала: ${lessons.length}`);
    console.log(`📊 Уникальных связей найдено: ${links.size}`);
    
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progressBar.start(links.size, 0);
    let created = 0;
    let skipped = 0;
    
    for (const link of links) {
      const [alfacrmCustomerId, alfacrmGroupId] = link.split('-');
      
      try {
        // Ищем студента: сначала по уникальному ID, потом по оригинальному
        const uniqueStudentId = `${alfacrmCustomerId}_${ourBranchId}`;
        let studentId = null;
        if (allStudentIds.has(uniqueStudentId)) {
          studentId = uniqueStudentId;
        } else {
          const foundStudent = Array.from(allStudentIds).find(id => id.startsWith(`${alfacrmCustomerId}_`));
          if (foundStudent) studentId = foundStudent;
          else if (allStudentIds.has(alfacrmCustomerId)) studentId = alfacrmCustomerId;
        }
        
        // Ищем группу: сначала по уникальному ID, потом по оригинальному
        const uniqueGroupId = `${alfacrmGroupId}_${ourBranchId}`;
        let groupId = null;
        if (allGroupIds.has(uniqueGroupId)) {
          groupId = uniqueGroupId;
        } else {
          const foundGroup = Array.from(allGroupIds).find(id => id.startsWith(`${alfacrmGroupId}_`));
          if (foundGroup) groupId = foundGroup;
          else if (allGroupIds.has(alfacrmGroupId)) groupId = alfacrmGroupId;
        }
        
        if (!studentId || !groupId) {
          skipped++;
          progressBar.update(created + skipped);
          continue;
        }
        
        await pool.query(`
          INSERT INTO enrollment (student_id, group_id, joined_at, company_id, branch_id)
          VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4)
          ON CONFLICT (student_id, group_id) WHERE left_at IS NULL DO NOTHING
        `, [studentId, groupId, COMPANY_ID, ourBranchId]);
        
        created++;
      } catch (error) {
        skipped++;
      }
      progressBar.update(created + skipped);
    }
    
    progressBar.stop();
    totalCreated += created;
    totalSkipped += skipped;
    console.log(`✅ Филиал ${alfacrmBranchId}: создано ${created} связей`);
  }
  
  console.log(`✅ Всего создано связей: ${totalCreated}`);
  if (totalSkipped > 0) console.log(`⚠️  Пропущено: ${totalSkipped}\n`);
  else console.log();
}

// === ГЛАВНАЯ ФУНКЦИЯ ===

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   МИГРАЦИЯ ДАННЫХ ИЗ ALFACRM → CLASSMATE CENTRAL         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  try {
    const branchMapping = await createCompanyAndBranches();
    await migrateTeachers(branchMapping);
    await migrateRooms(branchMapping);
    await migrateTariffs();
    await migrateGroups(branchMapping);
    await migrateGroupSchedules(branchMapping);
    await migrateStudents(branchMapping);
    await migrateIndividualLessons(branchMapping); // Индивидуальные занятия (ПОСЛЕ студентов!)
    await migrateStudentGroupLinks(branchMapping); // Связи студент-группа из уроков
    await preloadStudentPrices(); // Предзагрузка реальных цен уроков из AlfaCRM
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
    
    await migrateDebts();
    await generateLessons(); // Генерация будущих уроков
    
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