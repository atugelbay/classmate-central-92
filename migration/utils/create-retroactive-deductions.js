#!/usr/bin/env node
/**
 * СОЗДАНИЕ РЕТРОАКТИВНЫХ ТРАНЗАКЦИЙ СПИСАНИЯ
 * Для посещений, которые были отмечены БЕЗ создания транзакций
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

async function createRetroactiveDeductions() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║   СОЗДАНИЕ РЕТРОАКТИВНЫХ ТРАНЗАКЦИЙ СПИСАНИЯ         ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
  
  try {
    // Находим все посещения (attended), у которых НЕТ соответствующей транзакции списания
    const attendances = await pool.query(`
      SELECT 
        la.id,
        la.student_id,
        la.lesson_id,
        la.marked_at,
        ss.price_per_lesson,
        st.billing_type
      FROM lesson_attendance la
      JOIN student_subscriptions ss ON la.subscription_id = ss.id
      JOIN subscription_types st ON ss.subscription_type_id = st.id
      WHERE la.status = 'attended'
        AND la.company_id = $1
        AND st.billing_type = 'per_lesson'
        AND ss.price_per_lesson > 0
        AND NOT EXISTS (
          SELECT 1 FROM payment_transactions pt
          WHERE pt.student_id = la.student_id
            AND pt.type = 'deduction'
            AND pt.description LIKE '%' || la.lesson_id || '%'
        )
      ORDER BY la.marked_at
    `, [COMPANY_ID]);
    
    console.log(`Найдено посещений без транзакций: ${attendances.rows.length}\n`);
    
    if (attendances.rows.length === 0) {
      console.log('✅ Все посещения уже имеют транзакции!\n');
      return;
    }
    
    let created = 0;
    
    for (const att of attendances.rows) {
      try {
        // Создаем транзакцию списания
        await pool.query(`
          INSERT INTO payment_transactions (
            student_id, amount, type, payment_method, description, created_at, company_id
          ) VALUES ($1, $2, 'deduction', 'subscription', $3, $4, $5)
        `, [
          att.student_id,
          att.price_per_lesson,
          `Списание за посещенное занятие (Урок ID: ${att.lesson_id})`,
          att.marked_at,
          COMPANY_ID
        ]);
        
        // Обновляем баланс студента
        await pool.query(`
          UPDATE student_balance 
          SET balance = balance - $1
          WHERE student_id = $2
        `, [att.price_per_lesson, att.student_id]);
        
        created++;
        
        if (created % 10 === 0) {
          console.log(`   Создано: ${created} транзакций...`);
        }
        
      } catch (error) {
        console.error(`   ⚠️  Ошибка для посещения ${att.id}: ${error.message}`);
      }
    }
    
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log(`║  ✅ Создано транзакций: ${created}`.padEnd(57) + '║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');
    
    // Пересчитываем балансы
    console.log('📊 Пересчет балансов...\n');
    
    const uniqueStudents = [...new Set(attendances.rows.map(a => a.student_id))];
    
    for (const studentId of uniqueStudents) {
      const transactions = await pool.query(
        `SELECT type, amount FROM payment_transactions WHERE student_id = $1`,
        [studentId]
      );
      
      let calculatedBalance = 0;
      for (const tx of transactions.rows) {
        if (tx.type === 'payment') {
          calculatedBalance += parseFloat(tx.amount);
        } else if (tx.type === 'deduction' || tx.type === 'debt') {
          calculatedBalance -= parseFloat(tx.amount);
        }
      }
      
      await pool.query(
        'UPDATE student_balance SET balance = $1 WHERE student_id = $2',
        [calculatedBalance, studentId]
      );
    }
    
    console.log(`✅ Обновлено балансов: ${uniqueStudents.length}\n`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

createRetroactiveDeductions();

