#!/usr/bin/env node
/**
 * Применение multi-tenancy миграции через Node.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function applyMigration() {
  console.log('\n🔧 ПРИМЕНЕНИЕ MULTI-TENANCY МИГРАЦИИ\n');
  
  try {
    // Читаем SQL файл
    const sqlPath = path.join(__dirname, '..', 'backend', 'migrations', '006_add_multi_tenancy.up.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Выполняем SQL
    await pool.query(sql);
    
    console.log('✅ Миграция успешно применена!\n');
    console.log('📋 Что добавлено:');
    console.log('   - Таблица companies');
    console.log('   - Поле company_id во всех таблицах');
    console.log('   - Индексы для быстрой фильтрации');
    console.log('   - Компания "Smart Education" (default-company)\n');
    
    // Проверяем
    const result = await pool.query('SELECT * FROM companies');
    console.log('🏢 Компании в БД:');
    result.rows.forEach(company => {
      console.log(`   - ${company.name} (ID: ${company.id})`);
    });
    console.log('');
    
  } catch (error) {
    console.error('\n❌ ОШИБКА:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();

