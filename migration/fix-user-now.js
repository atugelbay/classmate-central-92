const { Pool } = require('pg');

// Используем credentials напрямую
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'classmate_central',
  user: 'postgres',
  password: 'postgres',
});

async function fix() {
  console.log('\n🔧 ИСПРАВЛЕНИЕ company_id\n');
  
  try {
    // 1. Смотрим текущее состояние
    console.log('📋 До исправления:');
    const before = await pool.query('SELECT id, email, company_id FROM users ORDER BY id');
    before.rows.forEach(u => {
      console.log(`   ${u.id}. ${u.email} - company_id: ${u.company_id || 'NULL ❌'}`);
    });
    
    // 2. Исправляем
    console.log('\n⚙️  Обновляю...');
    const result = await pool.query(`
      UPDATE users 
      SET company_id = 'default-company' 
      WHERE company_id IS NULL
    `);
    console.log(`✅ Обновлено строк: ${result.rowCount}`);
    
    // 3. Проверяем результат
    console.log('\n📋 После исправления:');
    const after = await pool.query('SELECT id, email, company_id FROM users ORDER BY id');
    after.rows.forEach(u => {
      console.log(`   ${u.id}. ${u.email} - company_id: ${u.company_id} ✅`);
    });
    
    // 4. Проверяем данные
    console.log('\n🎓 Студенты:');
    const students = await pool.query(`
      SELECT company_id, COUNT(*) as count 
      FROM students 
      GROUP BY company_id
    `);
    students.rows.forEach(s => {
      console.log(`   ${s.company_id}: ${s.count} студентов`);
    });
    
    console.log('\n👨‍🏫 Учителя:');
    const teachers = await pool.query(`
      SELECT company_id, COUNT(*) as count 
      FROM teachers 
      GROUP BY company_id
    `);
    teachers.rows.forEach(t => {
      console.log(`   ${t.company_id}: ${t.count} учителей`);
    });
    
    console.log('\n✅ ГОТОВО! Теперь:');
    console.log('   1. Перезапусти backend (Ctrl+C и запусти заново)');
    console.log('   2. Открой фронтенд и войди');
    console.log('   3. Должны появиться студенты и учителя!\n');
    
  } catch (error) {
    console.error('\n❌ Ошибка:', error.message);
  } finally {
    await pool.end();
  }
}

fix();

