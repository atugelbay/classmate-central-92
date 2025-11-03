#!/usr/bin/env node
/**
 * Проверка company_id для учетной записи
 * Показывает company_id для конкретного пользователя или всех пользователей
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
});

async function checkCompanyId() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║   ПРОВЕРКА COMPANY_ID                               ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  const client = await pool.connect();
  
  try {
    // Проверяем пользователя по email (из браузера видно: education@mail.com)
    const email = process.argv[2] || 'education@mail.com';
    
    console.log(`📧 Поиск пользователя: ${email}\n`);
    
    const result = await client.query(
      `SELECT id, name, email, company_id, created_at 
       FROM users 
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      console.log(`❌ Пользователь с email ${email} не найден.\n`);
      console.log('📋 Все пользователи в системе:\n');
      
      // Показываем всех пользователей
      const allUsers = await client.query(
        `SELECT id, name, email, company_id, created_at 
         FROM users 
         ORDER BY created_at DESC`
      );
      
      if (allUsers.rows.length === 0) {
        console.log('   Нет пользователей в системе.');
      } else {
        console.log(`   Найдено пользователей: ${allUsers.rows.length}\n`);
        allUsers.rows.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.name}`);
          console.log(`      Email: ${user.email}`);
          console.log(`      Company ID: ${user.company_id || '❌ НЕ УСТАНОВЛЕН'}`);
          console.log(`      User ID: ${user.id}`);
          console.log('');
        });
      }
    } else {
      const user = result.rows[0];
      console.log('✅ Пользователь найден!\n');
      console.log(`   Имя: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   User ID: ${user.id}`);
      console.log(`   Company ID: ${user.company_id || '❌ НЕ УСТАНОВЛЕН'}`);
      console.log(`   Создан: ${user.created_at}\n`);
      
      if (!user.company_id) {
        console.log('⚠️  У пользователя нет company_id!');
        console.log('   Нужно установить company_id для этого пользователя.\n');
      } else {
        console.log(`✅ Ваш company_id: "${user.company_id}"\n`);
        console.log('💡 Используйте этот company_id в скрипте generate-mock-data.js\n');
      }
    }

    // Также показываем все компании
    console.log('📊 Все компании в системе:\n');
    const companies = await client.query(
      `SELECT id, name, status, created_at 
       FROM companies 
       ORDER BY created_at DESC`
    );
    
    if (companies.rows.length === 0) {
      console.log('   Нет компаний в системе.');
    } else {
      companies.rows.forEach((company, index) => {
        console.log(`   ${index + 1}. ${company.name} (${company.status})`);
        console.log(`      Company ID: ${company.id}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Ошибка при проверке:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkCompanyId().catch(console.error);

