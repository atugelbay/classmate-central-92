#!/usr/bin/env node
/**
 * ОЧИСТКА ВСЕХ МИГРИРОВАННЫХ ДАННЫХ
 * 
 * Удаляет все данные из БД, которые были мигрированы из AlfaCRM
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

async function cleanup() {
  console.log('\n🗑️  ОЧИСТКА ВСЕХ МИГРИРОВАННЫХ ДАННЫХ\n');
  console.log('⚠️  ВНИМАНИЕ: Все данные будут удалены!\n');
  
  try {
    // Порядок удаления важен из-за foreign keys!
    
    console.log('🔧 Удаление занятий и связей...');
    await pool.query('DELETE FROM lesson_students');
    const lessons = await pool.query('DELETE FROM lessons');
    console.log(`   ✅ Удалено уроков: ${lessons.rowCount}`);
    
    console.log('🔧 Удаление финансов...');
    await pool.query('DELETE FROM debt_records');
    await pool.query('DELETE FROM payment_transactions');
    await pool.query('DELETE FROM student_balance');
    console.log(`   ✅ Финансовые данные удалены`);
    
    console.log('🔧 Удаление абонементов...');
    const subs = await pool.query('DELETE FROM student_subscriptions');
    console.log(`   ✅ Удалено абонементов: ${subs.rowCount}`);
    
    console.log('🔧 Удаление студентов...');
    await pool.query('DELETE FROM student_groups');
    const students = await pool.query('DELETE FROM students');
    console.log(`   ✅ Удалено студентов: ${students.rowCount}`);
    
    console.log('🔧 Удаление расписаний и групп...');
    await pool.query('DELETE FROM group_schedule');
    const groups = await pool.query('DELETE FROM groups');
    console.log(`   ✅ Удалено групп: ${groups.rowCount}`);
    
    console.log('🔧 Удаление преподавателей...');
    const teachers = await pool.query('DELETE FROM teachers');
    console.log(`   ✅ Удалено преподавателей: ${teachers.rowCount}`);
    
    console.log('🔧 Удаление комнат...');
    const rooms = await pool.query('DELETE FROM rooms');
    console.log(`   ✅ Удалено комнат: ${rooms.rowCount}`);
    
    console.log('🔧 Удаление тарифов...');
    const tariffs = await pool.query('DELETE FROM subscription_types');
    console.log(`   ✅ Удалено тарифов: ${tariffs.rowCount}`);
    
    console.log('\n✅ ВСЕ ДАННЫЕ УДАЛЕНЫ!\n');
    
  } catch (error) {
    console.error('\n❌ ОШИБКА:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  cleanup();
}

module.exports = { cleanup };
