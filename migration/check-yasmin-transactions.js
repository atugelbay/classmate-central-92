#!/usr/bin/env node
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
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║   ПРОВЕРКА ТРАНЗАКЦИЙ ЯСМИН (4054)                  ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
  
  try {
    const tx = await pool.query(
      `SELECT id, type, amount, description, created_at 
       FROM payment_transactions 
       WHERE student_id = '4054' 
       ORDER BY created_at DESC, id DESC
       LIMIT 20`
    );
    
    console.log(`Найдено транзакций: ${tx.rows.length}\n`);
    
    let payments = 0;
    let deductions = 0;
    let debts = 0;
    let other = 0;
    
    tx.rows.forEach((t, idx) => {
      const sign = t.type === 'payment' ? '+' : '-';
      console.log(`${idx + 1}. [${t.type}] ${sign}${t.amount} ₸`);
      console.log(`   ${t.description}`);
      console.log(`   ${t.created_at}\n`);
      
      if (t.type === 'payment') payments++;
      else if (t.type === 'deduction') deductions++;
      else if (t.type === 'debt') debts++;
      else other++;
    });
    
    console.log('📊 СТАТИСТИКА:\n');
    console.log(`   Оплаты (payment):    ${payments}`);
    console.log(`   Списания (deduction): ${deductions}`);
    console.log(`   Долги (debt):        ${debts}`);
    console.log(`   Другое:              ${other}\n`);
    
    // Проверка баланса
    const balance = await pool.query(
      `SELECT balance FROM student_balance WHERE student_id = '4054'`
    );
    
    if (balance.rows.length > 0) {
      console.log(`💰 Баланс в БД: ${balance.rows[0].balance} ₸\n`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await pool.end();
  }
}

check();

