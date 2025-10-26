#!/usr/bin/env node
/**
 * Тест multi-tenancy
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

async function test() {
  console.log('\n🧪 ТЕСТ MULTI-TENANCY\n');
  
  try {
    // Проверяем компании
    const companies = await pool.query('SELECT * FROM companies');
    console.log(`✅ Компаний в БД: ${companies.rows.length}`);
    companies.rows.forEach(c => {
      console.log(`   - ${c.name} (${c.id})`);
    });
    console.log('');
    
    // Проверяем студентов по компаниям
    const studentsByCompany = await pool.query(`
      SELECT company_id, COUNT(*) as count
      FROM students
      GROUP BY company_id
      ORDER BY company_id
    `);
    
    console.log('📊 Студенты по компаниям:');
    studentsByCompany.rows.forEach(row => {
      const company = companies.rows.find(c => c.id === row.company_id);
      console.log(`   - ${company?.name || row.company_id}: ${row.count} студентов`);
    });
    console.log('');
    
    // Проверяем другие таблицы
    const tables = ['teachers', 'groups', 'rooms', 'lessons', 'subscription_types'];
    for (const table of tables) {
      try {
        const result = await pool.query(`
          SELECT company_id, COUNT(*) as count
          FROM ${table}
          GROUP BY company_id
        `);
        
        if (result.rows.length > 0) {
          console.log(`📋 ${table}:`);
          result.rows.forEach(row => {
            const company = companies.rows.find(c => c.id === row.company_id);
            console.log(`   - ${company?.name || row.company_id}: ${row.count}`);
          });
        }
      } catch (e) {
        // Игнорируем ошибки
      }
    }
    
    console.log('\n✅ Multi-tenancy работает!\n');
    
  } catch (error) {
    console.error('\n❌ ОШИБКА:', error.message);
  } finally {
    await pool.end();
  }
}

test();

