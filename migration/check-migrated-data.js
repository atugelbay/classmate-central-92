#!/usr/bin/env node
/**
 * Проверка мигрированных данных
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkData() {
  console.log('\n📊 ПРОВЕРКА ДАННЫХ В БАЗЕ\n');
  
  try {
    // Компании
    console.log('🏢 КОМПАНИИ:');
    const companies = await pool.query('SELECT id, name, status FROM companies ORDER BY created_at');
    companies.rows.forEach(c => {
      console.log(`   - ${c.name} (ID: ${c.id}, Status: ${c.status})`);
    });
    
    // Пользователи
    console.log('\n👤 ПОЛЬЗОВАТЕЛИ:');
    const users = await pool.query('SELECT id, email, name, company_id FROM users ORDER BY id');
    users.rows.forEach(u => {
      console.log(`   - ${u.email} (Name: ${u.name}, Company: ${u.company_id})`);
    });
    
    // Учителя (первые 5)
    console.log('\n👨‍🏫 УЧИТЕЛЯ (первые 5):');
    const teachers = await pool.query('SELECT id, name, email, subject, company_id FROM teachers LIMIT 5');
    if (teachers.rows.length === 0) {
      console.log('   ⚠️  Нет учителей в базе');
    } else {
      teachers.rows.forEach(t => {
        console.log(`   - ${t.name} (${t.subject}, Company: ${t.company_id})`);
      });
    }
    
    // Статистика
    console.log('\n📈 СТАТИСТИКА ПО КОМПАНИЯМ:');
    const stats = await pool.query(`
      SELECT 
        c.name as company_name,
        c.id as company_id,
        (SELECT COUNT(*) FROM teachers WHERE company_id = c.id) as teachers_count,
        (SELECT COUNT(*) FROM students WHERE company_id = c.id) as students_count,
        (SELECT COUNT(*) FROM groups WHERE company_id = c.id) as groups_count,
        (SELECT COUNT(*) FROM lessons WHERE company_id = c.id) as lessons_count
      FROM companies c
    `);
    
    stats.rows.forEach(s => {
      console.log(`\n   ${s.company_name} (${s.company_id}):`);
      console.log(`      - Учителей: ${s.teachers_count}`);
      console.log(`      - Студентов: ${s.students_count}`);
      console.log(`      - Групп: ${s.groups_count}`);
      console.log(`      - Уроков: ${s.lessons_count}`);
    });
    
    console.log('\n');
    
  } catch (error) {
    console.error('\n❌ ОШИБКА:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkData();

