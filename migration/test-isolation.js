const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'classmate_central',
  user: 'postgres',
  password: 'postgres',
});

async function test() {
  console.log('\n🧪 ТЕСТ ИЗОЛЯЦИИ\n');
  
  // Проверяем пользователей
  const users = await pool.query('SELECT id, email, company_id FROM users ORDER BY id');
  console.log('👤 Пользователи и их компании:');
  users.rows.forEach(u => {
    console.log(`   ID: ${u.id} | Email: ${u.email} | Company: ${u.company_id}`);
  });
  
  // Проверяем что должен видеть каждый пользователь
  console.log('\n📊 Что ДОЛЖЕН видеть каждый пользователь:\n');
  
  for (const user of users.rows) {
    console.log(`🔍 Пользователь: ${user.email} (company: ${user.company_id})`);
    
    const students = await pool.query(
      'SELECT COUNT(*) FROM students WHERE company_id = $1',
      [user.company_id]
    );
    
    const teachers = await pool.query(
      'SELECT COUNT(*) FROM teachers WHERE company_id = $1',
      [user.company_id]
    );
    
    console.log(`   → Студенты: ${students.rows[0].count}`);
    console.log(`   → Учителя: ${teachers.rows[0].count}`);
    console.log('');
  }
  
  await pool.end();
}

test().catch(console.error);

