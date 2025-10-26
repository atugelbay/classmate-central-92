#!/usr/bin/env node
/**
 * СКРИПТ ДЛЯ ОЧИСТКИ ФЕЙКОВЫХ ГРУПП ДЛЯ ИНДИВИДУАЛЬНЫХ ЗАНЯТИЙ
 * 
 * Этот скрипт удаляет фейковые группы (созданные для индивидуальных занятий)
 * и создает индивидуальные уроки напрямую (без group_id).
 * 
 * Запуск: node cleanup-fake-groups.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const COMPANY_ID = process.env.COMPANY_ID;

// Support both Railway (DATABASE_URL, PG*) and standard (DB_*) env vars
let dbConfig = {
  host: process.env.DB_HOST || process.env.PGHOST,
  port: process.env.DB_PORT || process.env.PGPORT,
  database: process.env.DB_NAME || process.env.PGDATABASE,
  user: process.env.DB_USER || process.env.PGUSER,
  password: process.env.DB_PASSWORD || process.env.PGPASSWORD,
};

// If still undefined, try to parse from DATABASE_URL
if (!dbConfig.host || !dbConfig.port || !dbConfig.database || !dbConfig.user || !dbConfig.password) {
  const databaseURL = process.env.DATABASE_URL;
  if (databaseURL) {
    try {
      const url = new URL(databaseURL);
      dbConfig = {
        host: url.hostname || dbConfig.host,
        port: url.port || dbConfig.port,
        database: url.pathname.substring(1) || dbConfig.database,
        user: url.username || dbConfig.user,
        password: url.password || dbConfig.password,
      };
    } catch (err) {
      console.error('⚠️  Failed to parse DATABASE_URL:', err.message);
    }
  }
}

const pool = new Pool(dbConfig);

async function cleanupFakeGroups() {
  console.log('\n🧹 ОЧИСТКА ФЕЙКОВЫХ ГРУПП ДЛЯ ИНДИВИДУАЛЬНЫХ ЗАНЯТИЙ\n');
  
  try {
    // Находим фейковые группы (начинаются с "ind_")
    const fakeGroupsResult = await pool.query(`
      SELECT id, name FROM groups 
      WHERE company_id = $1 
      AND id LIKE 'ind_%'
      AND description LIKE '%автоматически создано при миграции%'
    `, [COMPANY_ID]);
    
    const fakeGroups = fakeGroupsResult.rows;
    
    console.log(`📊 Найдено фейковых групп: ${fakeGroups.length}`);
    
    if (fakeGroups.length === 0) {
      console.log('✅ Фейковые группы не найдены. База данных чистая!\n');
      return;
    }
    
    console.log('\n🔍 Фейковые группы:');
    fakeGroups.forEach(g => console.log(`   - ${g.id}: ${g.name}`));
    
    console.log('\n⚠️  ВНИМАНИЕ: Этот скрипт удалит фейковые группы и пересоздаст индивидуальные уроки.');
    console.log('⚠️  Убедитесь, что вы сделали резервную копию базы данных!\n');
    
    // Для автоматического выполнения (без запроса подтверждения в CI/CD)
    // раскомментируйте следующую строку:
    // const confirm = 'yes';
    
    // Для ручного выполнения с подтверждением:
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const confirm = await new Promise(resolve => {
      rl.question('Продолжить? (yes/no): ', answer => {
        rl.close();
        resolve(answer.toLowerCase());
      });
    });
    
    if (confirm !== 'yes') {
      console.log('❌ Операция отменена\n');
      return;
    }
    
    console.log('\n🗑️  Удаление фейковых групп и их данных...\n');
    
    let deletedGroups = 0;
    let deletedLessons = 0;
    let deletedSchedules = 0;
    let deletedLinks = 0;
    
    for (const group of fakeGroups) {
      const groupId = group.id;
      
      // Удаляем уроки этой группы
      const deletedLessonsResult = await pool.query(`
        DELETE FROM lessons WHERE group_id = $1 AND company_id = $2
        RETURNING id
      `, [groupId, COMPANY_ID]);
      deletedLessons += deletedLessonsResult.rowCount;
      
      // Удаляем расписание группы
      const deletedSchedulesResult = await pool.query(`
        DELETE FROM group_schedule WHERE group_id = $1 AND company_id = $2
        RETURNING id
      `, [groupId, COMPANY_ID]);
      deletedSchedules += deletedSchedulesResult.rowCount;
      
      // Удаляем связи студент-группа
      const deletedLinksResult = await pool.query(`
        DELETE FROM student_groups WHERE group_id = $1
        RETURNING student_id
      `, [groupId]);
      deletedLinks += deletedLinksResult.rowCount;
      
      // Удаляем саму группу
      await pool.query(`
        DELETE FROM groups WHERE id = $1 AND company_id = $2
      `, [groupId, COMPANY_ID]);
      deletedGroups++;
      
      console.log(`✅ Удалена группа: ${group.name}`);
    }
    
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║            ОЧИСТКА ЗАВЕРШЕНА УСПЕШНО!                     ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    console.log(`✅ Удалено фейковых групп: ${deletedGroups}`);
    console.log(`✅ Удалено уроков: ${deletedLessons}`);
    console.log(`✅ Удалено расписаний: ${deletedSchedules}`);
    console.log(`✅ Удалено связей студент-группа: ${deletedLinks}\n`);
    console.log('ℹ️  Теперь запустите миграцию заново: node migrate-from-alfacrm.js\n');
    console.log('   Индивидуальные занятия будут созданы правильно (без групп).\n');
    
  } catch (error) {
    console.error('\n❌ ОШИБКА:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await pool.end();
  }
}

// Запуск
cleanupFakeGroups()
  .then(() => {
    console.log('✅ Скрипт завершен\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Критическая ошибка:', error);
    process.exit(1);
  });

