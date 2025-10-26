#!/usr/bin/env node
/**
 * ИСПРАВЛЕНИЕ БАЛАНСОВ ВСЕХ СТУДЕНТОВ
 * Пересчитывает балансы на основе транзакций
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

async function fixBalances() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║   ПЕРЕСЧЕТ БАЛАНСОВ СТУДЕНТОВ                        ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
  
  try {
    // Получаем всех студентов с балансом
    const students = await pool.query(
      `SELECT sb.student_id, sb.balance, s.name
       FROM student_balance sb
       JOIN students s ON s.id = sb.student_id
       WHERE s.company_id = $1`,
      [COMPANY_ID]
    );
    
    console.log(`Найдено студентов: ${students.rows.length}\n`);
    
    let fixed = 0;
    let unchanged = 0;
    
    for (const student of students.rows) {
      const { student_id, balance: currentBalance, name } = student;
      
      // Рассчитываем правильный баланс на основе транзакций
      const transactions = await pool.query(
        `SELECT type, amount FROM payment_transactions WHERE student_id = $1`,
        [student_id]
      );
      
      let calculatedBalance = 0;
      for (const tx of transactions.rows) {
        if (tx.type === 'payment') {
          calculatedBalance += parseFloat(tx.amount);
        } else if (tx.type === 'deduction') {
          calculatedBalance -= parseFloat(tx.amount);
        } else if (tx.type === 'debt') {
          calculatedBalance -= parseFloat(tx.amount);
        }
      }
      
      const diff = Math.abs(currentBalance - calculatedBalance);
      
      if (diff >= 0.01) {
        // Обновляем баланс
        await pool.query(
          'UPDATE student_balance SET balance = $1 WHERE student_id = $2',
          [calculatedBalance, student_id]
        );
        
        console.log(`✅ ${name} (${student_id})`);
        console.log(`   Было: ${currentBalance} ₸ → Стало: ${calculatedBalance.toFixed(2)} ₸\n`);
        fixed++;
      } else {
        unchanged++;
      }
    }
    
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log(`║  ✅ Исправлено: ${fixed}`.padEnd(57) + '║');
    console.log(`║  ℹ️  Без изменений: ${unchanged}`.padEnd(57) + '║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await pool.end();
  }
}

fixBalances();

