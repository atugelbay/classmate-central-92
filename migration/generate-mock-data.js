#!/usr/bin/env node
/**
 * ГЕНЕРАЦИЯ МОК-ДАННЫХ НА 4 НЕДЕЛИ (2 недели до и 2 недели после)
 * Генерирует фейковые данные для всех вкладок системы для скриншотов
 */

require('dotenv').config();
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
});

// Генерация случайных казахских имен
const firstNames = [
  'Айдар', 'Айгерім', 'Нұрсұлтан', 'Жанна', 'Арман', 'Камила', 'Ілияс', 'Сәуле',
  'Данияр', 'Алма', 'Темирлан', 'Айдана', 'Ерлан', 'Алия', 'Ержан', 'Динара',
  'Асет', 'Гүлнар', 'Мұрат', 'Айжан', 'Данияр', 'Мадина', 'Алтынбек', 'Аружан',
  'Ерболат', 'Жұлдыз', 'Бауыржан', 'Алтынай', 'Данияр', 'Амина', 'Самат', 'Айсана'
];

const lastNames = [
  'Нұрғалиев', 'Қайратұлы', 'Сейтов', 'Бекболатов', 'Әміржанов', 'Серікбаев',
  'Қасымов', 'Әбдіров', 'Оразбаев', 'Тұрсынов', 'Нұрланқызы', 'Бауыржанов',
  'Қайратқызы', 'Мұхамбетов', 'Абдуллаев', 'Ибрагимов', 'Омаров', 'Жаныбеков',
  'Аблайханов', 'Тұрмағамбетов', 'Сағындыков', 'Құдайбергенов', 'Сапарбеков', 'Абдуллин'
];

const subjects = ['Математика', 'Физика', 'Английский язык', 'Информатика', 'Химия', 'История', 'Биология', 'География'];
const teacherSubjects = ['Математика', 'Физика', 'Английский язык', 'Информатика', 'Химия'];
const phonePrefixes = ['701', '702', '705', '708', '777', '747', '775', '776'];
const sources = ['call', 'website', 'social', 'referral', 'other'];
const leadStatuses = ['new', 'in_progress', 'enrolled', 'rejected'];
const paymentMethods = ['cash', 'card', 'transfer', 'other'];
const transactionTypes = ['payment', 'refund', 'debt'];
const lessonStatuses = ['scheduled', 'completed', 'cancelled'];
const attendanceStatuses = ['attended', 'missed', 'cancelled'];
const subscriptionStatuses = ['active', 'expired', 'frozen', 'completed'];
const billingTypes = ['per_lesson', 'monthly', 'unlimited'];
const debtStatuses = ['pending', 'paid'];
const roomColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#06B6D4', '#84CC16'];

// Генерация случайного имени
function randomName() {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${firstName} ${lastName}`;
}

// Генерация email
function randomEmail(name) {
  const cleanName = name.toLowerCase().replace(/[^a-zа-яё]/g, '');
  const domains = ['example.com', 'test.kz', 'demo.edu'];
  return `${cleanName}${Math.floor(Math.random() * 1000)}@${domains[Math.floor(Math.random() * domains.length)]}`;
}

// Генерация телефона
function randomPhone() {
  const prefix = phonePrefixes[Math.floor(Math.random() * phonePrefixes.length)];
  const number = Math.floor(1000000 + Math.random() * 9000000);
  return `+7 (${prefix}) ${String(number).slice(0, 3)}-${String(number).slice(3, 5)}-${String(number).slice(5)}`;
}

// Получение текущего company_id из users
async function getCompanyId() {
  // Проверяем аргумент командной строки (приоритет 1)
  if (process.argv[2]) {
    console.log(`📌 Используется COMPANY_ID из аргумента: ${process.argv[2]}`);
    return process.argv[2];
  }
  
  // Пытаемся найти по email пользователя из браузера (приоритет 2)
  const email = 'education@mail.com';
  const userResult = await pool.query(
    `SELECT company_id FROM users WHERE email = $1 AND company_id IS NOT NULL`,
    [email]
  );
  if (userResult.rows.length > 0) {
    console.log(`📌 Найден company_id по email ${email}: ${userResult.rows[0].company_id}`);
    return userResult.rows[0].company_id;
  }
  
  // Проверяем переменную окружения COMPANY_ID (приоритет 3)
  if (process.env.COMPANY_ID) {
    console.log(`📌 Используется COMPANY_ID из переменной окружения: ${process.env.COMPANY_ID}`);
    return process.env.COMPANY_ID;
  }
  
  // Или берем первый доступный
  const result = await pool.query(
    `SELECT company_id FROM users WHERE company_id IS NOT NULL LIMIT 1`
  );
  if (result.rows.length > 0) {
    return result.rows[0].company_id;
  }
  
  // Если нет company_id в users, создаем тестовую компанию
  const companyId = 'test-company-' + uuidv4();
  await pool.query(
    `INSERT INTO companies (id, name, status) VALUES ($1, $2, $3)
     ON CONFLICT (id) DO NOTHING`,
    [companyId, 'Тестовая компания', 'active']
  );
  return companyId;
}

async function generateMockData() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║   ГЕНЕРАЦИЯ МОК-ДАННЫХ НА 4 НЕДЕЛИ                   ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Получаем company_id
    const companyId = await getCompanyId();
    console.log(`✓ Используется company_id: ${companyId}\n`);

    // Вычисляем даты для 4 недель (2 недели до и 2 недели после текущей даты)
    const now = new Date();
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const twoWeeksLater = new Date(now);
    twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);

    console.log(`📅 Период данных: ${twoWeeksAgo.toLocaleDateString('ru-RU')} - ${twoWeeksLater.toLocaleDateString('ru-RU')}\n`);

    // 1. ГЕНЕРАЦИЯ УЧИТЕЛЕЙ
    console.log('📚 Генерация учителей...');
    const teachers = [];
    for (let i = 0; i < 8; i++) {
      const id = `mock-teacher-${uuidv4()}`;
      const name = randomName();
      const subject = teacherSubjects[i % teacherSubjects.length];
      const email = randomEmail(name);
      const phone = randomPhone();
      
      await client.query(
        `INSERT INTO teachers (id, name, subject, email, phone, status, workload, company_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
        [id, name, subject, email, phone, 'active', 10 + Math.floor(Math.random() * 10), companyId]
      );
      teachers.push({ id, name, subject });
    }
    console.log(`✓ Создано ${teachers.length} учителей\n`);

    // 2. ГЕНЕРАЦИЯ КОМНАТ
    console.log('🏢 Генерация комнат...');
    const rooms = [];
    for (let i = 0; i < 6; i++) {
      const id = `mock-room-${uuidv4()}`;
      const name = `Аудитория ${101 + i}`;
      const capacity = 15 + Math.floor(Math.random() * 15);
      const color = roomColors[i % roomColors.length];
      
      await client.query(
        `INSERT INTO rooms (id, name, capacity, color, status, company_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
        [id, name, capacity, color, 'active', companyId]
      );
      rooms.push({ id, name });
    }
    console.log(`✓ Создано ${rooms.length} комнат\n`);

    // 3. ГЕНЕРАЦИЯ УЧЕНИКОВ
    console.log('👥 Генерация учеников...');
    const students = [];
    for (let i = 0; i < 25; i++) {
      const id = `mock-student-${uuidv4()}`;
      const name = randomName();
      const age = 14 + Math.floor(Math.random() * 5);
      const email = randomEmail(name);
      const phone = randomPhone();
      const statuses = ['active', 'active', 'active', 'inactive', 'frozen'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      await client.query(
        `INSERT INTO students (id, name, age, email, phone, status, company_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
        [id, name, age, email, phone, status, companyId, twoWeeksAgo]
      );

      // Добавляем предметы ученикам
      const studentSubjects = [];
      const numSubjects = 1 + Math.floor(Math.random() * 3);
      for (let j = 0; j < numSubjects; j++) {
        const subject = subjects[Math.floor(Math.random() * subjects.length)];
        if (!studentSubjects.includes(subject)) {
          studentSubjects.push(subject);
          await client.query(
            `INSERT INTO student_subjects (student_id, subject)
             VALUES ($1, $2)
             ON CONFLICT (student_id, subject) DO NOTHING`,
            [id, subject]
          );
        }
      }
      
      students.push({ id, name, age, status });
    }
    console.log(`✓ Создано ${students.length} учеников\n`);

    // 4. ГЕНЕРАЦИЯ ГРУПП
    console.log('📦 Генерация групп...');
    const groups = [];
    for (let i = 0; i < 10; i++) {
      const id = `mock-group-${uuidv4()}`;
      const subject = teacherSubjects[i % teacherSubjects.length];
      const teacher = teachers[Math.floor(Math.random() * teachers.length)];
      const room = rooms[Math.floor(Math.random() * rooms.length)];
      const name = `${subject} ${i + 1}${String.fromCharCode(65 + (i % 3))}`;
      const schedules = [
        'Пн, Ср, Пт 10:00-11:30',
        'Вт, Чт 14:00-15:30',
        'Пн, Ср 16:00-17:30',
        'Сб 10:00-13:00',
        'Вт, Чт 10:00-11:30'
      ];
      const schedule = schedules[i % schedules.length];
      
      await client.query(
        `INSERT INTO groups (id, name, subject, teacher_id, room_id, schedule, status, company_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
        [id, name, subject, teacher.id, room.id, schedule, 'active', companyId]
      );

      // Добавляем учеников в группы
      const numStudentsInGroup = 3 + Math.floor(Math.random() * 8);
      const shuffledStudents = [...students].sort(() => Math.random() - 0.5);
      for (let j = 0; j < Math.min(numStudentsInGroup, shuffledStudents.length); j++) {
        await client.query(
          `INSERT INTO student_groups (student_id, group_id)
           VALUES ($1, $2)
           ON CONFLICT (student_id, group_id) DO NOTHING`,
          [shuffledStudents[j].id, id]
        );
      }
      
      groups.push({ id, name, subject, teacherId: teacher.id, roomId: room.id });
    }
    console.log(`✓ Создано ${groups.length} групп\n`);

    // 5. ГЕНЕРАЦИЯ УРОКОВ НА 4 НЕДЕЛИ
    console.log('📅 Генерация уроков на 4 недели...');
    let lessonCount = 0;
    const lessonTitles = {
      'Математика': ['Алгебра', 'Геометрия', 'Тригонометрия', 'Производные', 'Интегралы'],
      'Физика': ['Механика', 'Термодинамика', 'Электричество', 'Оптика', 'Квантовая физика'],
      'Английский язык': ['Grammar', 'Speaking', 'Reading', 'Writing', 'Vocabulary'],
      'Информатика': ['Программирование', 'Алгоритмы', 'Базы данных', 'Веб-разработка', 'ООП'],
      'Химия': ['Органическая химия', 'Неорганическая химия', 'Химические реакции', 'Периодическая таблица']
    };

    // Генерируем уроки для каждого дня в течение 4 недель
    const currentDate = new Date(twoWeeksAgo);
    while (currentDate <= twoWeeksLater) {
      const dayOfWeek = currentDate.getDay(); // 0 = воскресенье, 1 = понедельник, и т.д.
      
      // Генерируем уроки только в рабочие дни (понедельник-суббота)
      if (dayOfWeek >= 1 && dayOfWeek <= 6) {
        // Каждый день создаем несколько уроков
        const lessonsPerDay = 5 + Math.floor(Math.random() * 8);
        
        for (let i = 0; i < lessonsPerDay; i++) {
          const group = groups[Math.floor(Math.random() * groups.length)];
          const teacher = teachers.find(t => t.id === group.teacherId) || teachers[0];
          const room = rooms[Math.floor(Math.random() * rooms.length)];
          
          // Время урока (между 9:00 и 19:00)
          const hour = 9 + Math.floor(Math.random() * 10);
          const minute = Math.random() > 0.5 ? 0 : 30;
          const startTime = new Date(currentDate);
          startTime.setHours(hour, minute, 0, 0);
          const endTime = new Date(startTime);
          endTime.setHours(startTime.getHours() + 1, startTime.getMinutes() + 30);

          // Определяем статус урока (прошлые уроки - completed, будущие - scheduled)
          let status = 'scheduled';
          if (startTime < now) {
            status = Math.random() > 0.1 ? 'completed' : 'cancelled';
          }

          const titles = lessonTitles[group.subject] || ['Урок'];
          const title = `${group.subject}: ${titles[Math.floor(Math.random() * titles.length)]}`;
          
          const lessonId = `mock-lesson-${uuidv4()}`;
          
          await client.query(
            `INSERT INTO lessons (id, title, teacher_id, group_id, subject, start_time, end_time, room, room_id, status, company_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (id) DO NOTHING`,
            [lessonId, title, teacher.id, group.id, group.subject, startTime, endTime, room.name, room.id, status, companyId]
          );

          // Добавляем учеников группы к уроку
          const groupStudents = await client.query(
            `SELECT student_id FROM student_groups WHERE group_id = $1`,
            [group.id]
          );
          
          for (const studentRow of groupStudents.rows) {
            await client.query(
              `INSERT INTO lesson_students (lesson_id, student_id, company_id)
               VALUES ($1, $2, $3)
               ON CONFLICT (lesson_id, student_id) DO NOTHING`,
              [lessonId, studentRow.student_id, companyId]
            );

            // Создаем посещаемость для завершенных уроков
            if (status === 'completed') {
              const attendanceStatuses = ['attended', 'attended', 'attended', 'missed', 'cancelled'];
              const attendanceStatus = attendanceStatuses[Math.floor(Math.random() * attendanceStatuses.length)];
              const reasons = {
                'missed': ['Болезнь', 'Семейные обстоятельства', 'Не смог прийти'],
                'cancelled': ['Отменено', 'Перенесено']
              };
              const reason = reasons[attendanceStatus] ? reasons[attendanceStatus][Math.floor(Math.random() * reasons[attendanceStatus].length)] : null;
              
              // Пробуем вставить с максимальным количеством полей, которые могут быть
              await client.query(
                `INSERT INTO lesson_attendance (lesson_id, student_id, status, reason, notes, marked_at, company_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (lesson_id, student_id) DO NOTHING`,
                [lessonId, studentRow.student_id, attendanceStatus, reason, attendanceStatus === 'attended' ? 'Посещено' : null, endTime, companyId]
              ).catch(async (err) => {
                // Если не работает с marked_at, пробуем без него
                if (err.message.includes('marked_at')) {
                  await client.query(
                    `INSERT INTO lesson_attendance (lesson_id, student_id, status, reason, notes, company_id)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     ON CONFLICT (lesson_id, student_id) DO NOTHING`,
                    [lessonId, studentRow.student_id, attendanceStatus, reason, attendanceStatus === 'attended' ? 'Посещено' : null, companyId]
                  ).catch(() => {
                    // Игнорируем, если структура отличается
                  });
                }
              });
            }
          }
          
          lessonCount++;
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    console.log(`✓ Создано ${lessonCount} уроков\n`);

    // 6. ГЕНЕРАЦИЯ ЛИДОВ
    console.log('📞 Генерация лидов...');
    let leadCount = 0;
    for (let i = 0; i < 30; i++) {
      const id = `mock-lead-${uuidv4()}`;
      const name = randomName();
      const phone = randomPhone();
      const email = randomEmail(name);
      const source = sources[Math.floor(Math.random() * sources.length)];
      const status = leadStatuses[Math.floor(Math.random() * leadStatuses.length)];
      const createdAt = new Date(twoWeeksAgo);
      createdAt.setDate(createdAt.getDate() + Math.floor(Math.random() * 28));
      
      await client.query(
        `INSERT INTO leads (id, name, phone, email, source, status, notes, company_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING`,
        [id, name, phone, email, source, status, `Заметка о лиде: ${name}`, companyId, createdAt, createdAt]
      );

      // Создаем активности для лидов
      if (Math.random() > 0.3) {
        const activityTypes = ['call', 'meeting', 'note', 'email'];
        const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
        const descriptions = {
          'call': 'Звонок клиенту',
          'meeting': 'Встреча с клиентом',
          'note': 'Заметка о клиенте',
          'email': 'Отправлено письмо'
        };
        
        // lead_activities может не иметь company_id
        await client.query(
          `INSERT INTO lead_activities (lead_id, activity_type, description, created_at)
           VALUES ($1, $2, $3, $4)`,
          [id, activityType, descriptions[activityType], createdAt]
        ).catch(() => {
          // Игнорируем ошибку, если company_id не поддерживается
        });
      }
      
      leadCount++;
    }
    console.log(`✓ Создано ${leadCount} лидов\n`);

    // 7. ГЕНЕРАЦИЯ АБОНЕМЕНТОВ
    console.log('🎫 Генерация типов абонементов...');
    const subscriptionTypes = [];
    const typeNames = ['Базовый', 'Стандарт', 'Премиум', 'Индивидуальный', 'Групповой'];
    for (let i = 0; i < 5; i++) {
      const id = `mock-sub-type-${uuidv4()}`;
      const name = typeNames[i];
      const lessonsCount = [8, 12, 16, 20, 24][i];
      const price = [15000, 22000, 28000, 35000, 42000][i];
      const billingType = billingTypes[Math.floor(Math.random() * billingTypes.length)];
      
      await client.query(
        `INSERT INTO subscription_types (id, name, lessons_count, price, billing_type, can_freeze, description, company_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [id, name, lessonsCount, price, billingType, Math.random() > 0.5, `Абонемент: ${name}`, companyId, now]
      );
      subscriptionTypes.push({ id, name, lessonsCount, price });
    }
    console.log(`✓ Создано ${subscriptionTypes.length} типов абонементов\n`);

    console.log('🎫 Генерация абонементов для учеников...');
    let subscriptionCount = 0;
    for (let i = 0; i < 15; i++) {
      const student = students[Math.floor(Math.random() * students.length)];
      const subType = subscriptionTypes[Math.floor(Math.random() * subscriptionTypes.length)];
      const group = groups[Math.floor(Math.random() * groups.length)];
      
      const startDate = new Date(twoWeeksAgo);
      startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 28));
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (subType.lessonsCount * 2));
      
      const totalLessons = subType.lessonsCount;
      const usedLessons = startDate < now ? Math.floor(Math.random() * totalLessons * 0.7) : 0;
      const remainingLessons = totalLessons - usedLessons;
      
      let status = 'active';
      if (endDate < now) status = 'expired';
      if (Math.random() > 0.8) status = 'frozen';
      
      const id = `mock-subscription-${uuidv4()}`;
      
      await client.query(
        `INSERT INTO student_subscriptions (id, student_id, subscription_type_id, group_id, total_lessons, used_lessons, total_price, price_per_lesson, start_date, end_date, status, company_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (id) DO NOTHING`,
        [id, student.id, subType.id, group.id, totalLessons, usedLessons, subType.price, subType.price / totalLessons, startDate, endDate, status, companyId, startDate, startDate]
      );
      
      subscriptionCount++;
    }
    console.log(`✓ Создано ${subscriptionCount} абонементов\n`);

    // 8. ГЕНЕРАЦИЯ ПЛАТЕЖЕЙ
    console.log('💰 Генерация платежей...');
    let paymentCount = 0;
    for (let i = 0; i < 40; i++) {
      const student = students[Math.floor(Math.random() * students.length)];
      const amount = [5000, 10000, 15000, 20000, 25000, 30000][Math.floor(Math.random() * 6)];
      const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const createdAt = new Date(twoWeeksAgo);
      createdAt.setDate(createdAt.getDate() + Math.floor(Math.random() * 28));
      
      await client.query(
        `INSERT INTO payment_transactions (student_id, amount, type, payment_method, description, created_at, company_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [student.id, amount, type, paymentMethod, `Оплата: ${type}`, createdAt, companyId]
      );
      
      paymentCount++;
    }
    console.log(`✓ Создано ${paymentCount} платежей\n`);

    // Обновляем балансы студентов
    console.log('💵 Обновление балансов студентов...');
    for (const student of students) {
      const result = await client.query(
        `SELECT 
          COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END), 0) as income,
          COALESCE(SUM(CASE WHEN type IN ('debt', 'refund') THEN amount ELSE 0 END), 0) as expenses
         FROM payment_transactions 
         WHERE student_id = $1`,
        [student.id]
      );
      
      const balance = parseFloat(result.rows[0].income) - parseFloat(result.rows[0].expenses);
      
      await client.query(
        `INSERT INTO student_balance (student_id, balance, last_payment_date)
         VALUES ($1, $2, NOW())
         ON CONFLICT (student_id) DO UPDATE SET balance = $2, last_payment_date = NOW()`,
        [student.id, balance]
      );
    }
    console.log(`✓ Обновлены балансы\n`);

    // 9. ГЕНЕРАЦИЯ ДОЛГОВ
    console.log('📋 Генерация долгов...');
    let debtCount = 0;
    for (let i = 0; i < 8; i++) {
      const student = students[Math.floor(Math.random() * students.length)];
      const amount = [3000, 5000, 7000, 10000, 15000][Math.floor(Math.random() * 5)];
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 30));
      const status = Math.random() > 0.5 ? 'pending' : 'paid';
      const createdAt = new Date(twoWeeksAgo);
      createdAt.setDate(createdAt.getDate() + Math.floor(Math.random() * 28));
      
      await client.query(
        `INSERT INTO debt_records (student_id, amount, due_date, status, notes, created_at, company_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [student.id, amount, dueDate, status, `Долг за услуги`, createdAt, companyId]
      );
      
      debtCount++;
    }
    console.log(`✓ Создано ${debtCount} долгов\n`);

    await client.query('COMMIT');
    console.log('\n✅ Все мок-данные успешно созданы!\n');
    console.log(`📊 Итоговая статистика:`);
    console.log(`   - Учителей: ${teachers.length}`);
    console.log(`   - Комнат: ${rooms.length}`);
    console.log(`   - Учеников: ${students.length}`);
    console.log(`   - Групп: ${groups.length}`);
    console.log(`   - Уроков: ${lessonCount}`);
    console.log(`   - Лидов: ${leadCount}`);
    console.log(`   - Абонементов: ${subscriptionCount}`);
    console.log(`   - Платежей: ${paymentCount}`);
    console.log(`   - Долгов: ${debtCount}\n`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка при генерации данных:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

generateMockData().catch(console.error);

