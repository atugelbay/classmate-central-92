#!/usr/bin/env node
/**
 * Добавление company_id ко всем мигрированным данным
 * 
 * Запускать ПОСЛЕ migrate-from-alfacrm.js если company_id не был добавлен автоматически
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

const COMPANY_ID = process.env.COMPANY_ID || 'default-company';

async function addCompanyIdToAll() {
  console.log('\n🔧 ДОБАВЛЕНИЕ COMPANY_ID КО ВСЕМ ДАННЫМ\n');
  console.log(`Company ID: ${COMPANY_ID}\n`);
  
  try {
    const tables = [
      'teachers',
      'students',
      'groups',
      'rooms',
      'lessons',
      'subscription_types',
      'leads'
    ];
    
    for (const table of tables) {
      const result = await pool.query(`
        UPDATE ${table}
        SET company_id = $1
        WHERE company_id IS NULL OR company_id != $1
      `, [COMPANY_ID]);
      
      console.log(`✅ ${table}: обновлено ${result.rowCount} записей`);
    }
    
    console.log(`\n✅ Все данные привязаны к компании: ${COMPANY_ID}\n`);
    
  } catch (error) {
    console.error('\n❌ ОШИБКА:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  addCompanyIdToAll();
}

module.exports = { addCompanyIdToAll };

