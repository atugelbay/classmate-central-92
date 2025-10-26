#!/usr/bin/env node
/**
 * ОЧИСТКА ДАННЫХ КОМПАНИИ ПЕРЕД ПОВТОРНОЙ МИГРАЦИЕЙ
 */

require('dotenv').config();
const { Pool } = require('pg');

const COMPANY_ID = process.env.COMPANY_ID;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function clearCompanyData() {
  console.log('\n🗑️  ОЧИСТКА ДАННЫХ КОМПАНИИ\n');
  console.log(`Company ID: ${COMPANY_ID}\n`);
  
  try {
    // Сначала получаем ID студентов (для очистки связанных таблиц)
    const studentIds = await pool.query(
      `SELECT id FROM students WHERE company_id = $1`,
      [COMPANY_ID]
    );
    
    // Очищаем таблицы без company_id, но связанные со студентами
    if (studentIds.rows.length > 0) {
      const ids = studentIds.rows.map(r => r.id);
      
      const balanceResult = await pool.query(
        `DELETE FROM student_balance WHERE student_id = ANY($1::varchar[])`,
        [ids]
      );
      console.log(`✅ student_balance: удалено ${balanceResult.rowCount} записей`);
    }
    
    console.log('');
    
    // Порядок важен из-за foreign key constraints
    const tablesWithCompanyId = [
      'lesson_attendance',
      'lessons',
      'payment_transactions',
      'student_subscriptions',
      'subscription_types',
      'students',
      'groups',
      'teachers',
      'rooms',
      'leads'
    ];
    
    for (const table of tablesWithCompanyId) {
      const result = await pool.query(
        `DELETE FROM ${table} WHERE company_id = $1`,
        [COMPANY_ID]
      );
      console.log(`✅ ${table}: удалено ${result.rowCount} записей`);
    }
    
    console.log('\n✅ Данные компании очищены!\n');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await pool.end();
  }
}

clearCompanyData();

