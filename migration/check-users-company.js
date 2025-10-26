require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function check() {
  console.log('\n📋 Проверка company_id:\n');
  
  // Пользователи
  const users = await pool.query('SELECT id, email, name, company_id FROM users ORDER BY id');
  console.log('👤 Пользователи:');
  users.rows.forEach(u => {
    console.log(`   ${u.id}. ${u.email} - company_id: ${u.company_id || 'NULL'}`);
  });
  
  // Студенты
  const students = await pool.query('SELECT company_id, COUNT(*) as count FROM students GROUP BY company_id');
  console.log('\n🎓 Студенты по компаниям:');
  students.rows.forEach(s => {
    console.log(`   ${s.company_id || 'NULL'}: ${s.count} студентов`);
  });
  
  // Учителя
  const teachers = await pool.query('SELECT company_id, COUNT(*) as count FROM teachers GROUP BY company_id');
  console.log('\n👨‍🏫 Учителя по компаниям:');
  teachers.rows.forEach(t => {
    console.log(`   ${t.company_id || 'NULL'}: ${t.count} учителей`);
  });
  
  await pool.end();
}

check().catch(console.error);

