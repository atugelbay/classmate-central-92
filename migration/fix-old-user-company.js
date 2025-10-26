// Исправляет company_id для старых пользователей
require('dotenv').config({ path: '../backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function fix() {
  console.log('\n🔧 ИСПРАВЛЕНИЕ company_id для старых пользователей\n');
  
  try {
    // 1. Проверяем текущее состояние
    const users = await pool.query('SELECT id, email, company_id FROM users ORDER BY id');
    console.log('📋 Текущие пользователи:');
    users.rows.forEach(u => {
      console.log(`   ${u.id}. ${u.email} - company_id: ${u.company_id || 'NULL ❌'}`);
    });
    
    // 2. Находим пользователей без company_id
    const usersWithoutCompany = users.rows.filter(u => !u.company_id);
    
    if (usersWithoutCompany.length > 0) {
      console.log(`\n⚠️  Найдено ${usersWithoutCompany.length} пользователей без company_id`);
      console.log('   Устанавливаю company_id = default-company...\n');
      
      // 3. Обновляем
      await pool.query(`
        UPDATE users 
        SET company_id = 'default-company' 
        WHERE company_id IS NULL
      `);
      
      console.log('✅ Пользователи обновлены!');
    } else {
      console.log('\n✅ Все пользователи уже имеют company_id');
    }
    
    // 4. Проверяем данные
    const students = await pool.query(`
      SELECT company_id, COUNT(*) as count 
      FROM students 
      GROUP BY company_id
    `);
    console.log('\n🎓 Студенты по компаниям:');
    students.rows.forEach(s => {
      console.log(`   ${s.company_id || 'NULL'}: ${s.count} студентов`);
    });
    
    const teachers = await pool.query(`
      SELECT company_id, COUNT(*) as count 
      FROM teachers 
      GROUP BY company_id
    `);
    console.log('\n👨‍🏫 Учителя по компаниям:');
    teachers.rows.forEach(t => {
      console.log(`   ${t.company_id || 'NULL'}: ${t.count} учителей`);
    });
    
    console.log('\n✅ Готово! Теперь перезапусти backend и попробуй войти.\n');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await pool.end();
  }
}

fix();

