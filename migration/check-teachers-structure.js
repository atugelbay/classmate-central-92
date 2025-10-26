#!/usr/bin/env node
/**
 * Проверка структуры таблицы teachers
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

async function checkTeachersStructure() {
  console.log('\n📋 СТРУКТУРА ТАБЛИЦЫ TEACHERS\n');
  
  try {
    const columns = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'teachers'
      ORDER BY ordinal_position
    `);
    
    console.log('Столбцы:');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });
    
    console.log('\n📊 ПРИМЕРЫ УЧИТЕЛЕЙ:\n');
    const teachers = await pool.query(`
      SELECT * FROM teachers 
      WHERE company_id = 'default-company'
      LIMIT 3
    `);
    
    if (teachers.rows.length === 0) {
      console.log('   ⚠️  Нет учителей');
    } else {
      teachers.rows.forEach((t, i) => {
        console.log(`\n   Учитель ${i + 1}:`);
        Object.keys(t).forEach(key => {
          console.log(`      ${key}: ${t[key]}`);
        });
      });
    }
    
    console.log('\n');
    
  } catch (error) {
    console.error('\n❌ ОШИБКА:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkTeachersStructure();

