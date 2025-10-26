#!/usr/bin/env node

/**
 * Data Integrity Verification Script
 * Checks completeness and consistency of migrated data from AlfaCRM
 */

require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');

const ALFACRM_API_URL = process.env.ALFACRM_API_URL;
const ALFACRM_EMAIL = process.env.ALFACRM_EMAIL;
const ALFACRM_API_KEY = process.env.ALFACRM_API_KEY;
const COMPANY_ID = process.env.COMPANY_ID;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const issues = [];
const warnings = [];

function logIssue(category, message) {
  issues.push({ category, message });
  console.log(`❌ [${category}] ${message}`);
}

function logWarning(category, message) {
  warnings.push({ category, message });
  console.log(`⚠️  [${category}] ${message}`);
}

function logSuccess(category, message) {
  console.log(`✅ [${category}] ${message}`);
}

async function getAlfaCRMToken() {
  const response = await axios.post(`${ALFACRM_API_URL}/v2api/auth/login`, {
    email: ALFACRM_EMAIL,
    api_key: ALFACRM_API_KEY,
  });
  return response.data.token;
}

async function fetchAllPages(endpoint, params = {}) {
  const token = await getAlfaCRMToken();
  let allData = [];
  let page = 0;
  let hasMore = true;

  while (hasMore && page < 100) {
    try {
      const response = await axios.post(`${ALFACRM_API_URL}${endpoint}`, {
        ...params,
        page,
        count: 50,
      }, {
        headers: { 'X-ALFACRM-TOKEN': token },
      });
      
      const items = response.data.items || [];
      if (items.length === 0) break;
      
      allData.push(...items);
      page++;
    } catch (error) {
      break;
    }
  }
  
  return allData;
}

// ============= PHASE 1.1: Migration Data Completeness =============

async function verifyDataCompleteness() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   PHASE 1.1: MIGRATION DATA COMPLETENESS                 ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Teachers
  const alfaTeachers = await fetchAllPages('/v2api/teacher/index');
  const dbTeachers = await pool.query('SELECT COUNT(*) FROM teachers WHERE company_id = $1', [COMPANY_ID]);
  const dbTeacherCount = parseInt(dbTeachers.rows[0].count);
  
  console.log(`👨‍🏫 Teachers:`);
  console.log(`   AlfaCRM: ${alfaTeachers.length}`);
  console.log(`   Database: ${dbTeacherCount}`);
  if (alfaTeachers.length === dbTeacherCount) {
    logSuccess('Teachers', 'Counts match');
  } else {
    logIssue('Teachers', `Mismatch: AlfaCRM has ${alfaTeachers.length}, DB has ${dbTeacherCount}`);
  }

  // Students
  const alfaStudents = await fetchAllPages('/v2api/customer/index');
  const dbStudents = await pool.query('SELECT COUNT(*) FROM students WHERE company_id = $1', [COMPANY_ID]);
  const dbStudentCount = parseInt(dbStudents.rows[0].count);
  
  console.log(`\n🎓 Students:`);
  console.log(`   AlfaCRM: ${alfaStudents.length}`);
  console.log(`   Database: ${dbStudentCount}`);
  if (alfaStudents.length === dbStudentCount) {
    logSuccess('Students', 'Counts match');
  } else {
    logIssue('Students', `Mismatch: AlfaCRM has ${alfaStudents.length}, DB has ${dbStudentCount}`);
  }

  // Groups
  const alfaGroups = await fetchAllPages('/v2api/group/index');
  const dbGroups = await pool.query('SELECT COUNT(*) FROM groups WHERE company_id = $1 AND id NOT LIKE $2', [COMPANY_ID, 'ind_%']);
  const dbGroupCount = parseInt(dbGroups.rows[0].count);
  
  console.log(`\n👥 Groups (regular):`);
  console.log(`   AlfaCRM: ${alfaGroups.length}`);
  console.log(`   Database: ${dbGroupCount}`);
  if (alfaGroups.length === dbGroupCount) {
    logSuccess('Groups', 'Counts match');
  } else {
    logIssue('Groups', `Mismatch: AlfaCRM has ${alfaGroups.length}, DB has ${dbGroupCount}`);
  }

  // Individual lessons (virtual groups)
  const dbIndividualGroups = await pool.query('SELECT COUNT(*) FROM groups WHERE company_id = $1 AND id LIKE $2', [COMPANY_ID, 'ind_%']);
  const individualGroupCount = parseInt(dbIndividualGroups.rows[0].count);
  
  console.log(`\n👤 Individual Lessons (virtual groups):`);
  console.log(`   Database: ${individualGroupCount}`);
  if (individualGroupCount > 0) {
    logSuccess('Individual', `Found ${individualGroupCount} individual lesson groups`);
  } else {
    logWarning('Individual', 'No individual lessons found - this might be expected if there are none in AlfaCRM');
  }

  // Rooms
  const alfaRooms = await fetchAllPages('/v2api/room/index');
  const dbRooms = await pool.query('SELECT COUNT(*) FROM rooms WHERE company_id = $1', [COMPANY_ID]);
  const dbRoomCount = parseInt(dbRooms.rows[0].count);
  
  console.log(`\n🏢 Rooms:`);
  console.log(`   AlfaCRM: ${alfaRooms.length}`);
  console.log(`   Database: ${dbRoomCount}`);
  if (alfaRooms.length === dbRoomCount) {
    logSuccess('Rooms', 'Counts match');
  } else {
    logIssue('Rooms', `Mismatch: AlfaCRM has ${alfaRooms.length}, DB has ${dbRoomCount}`);
  }

  // Schedules
  const alfaSchedules = await fetchAllPages('/v2api/regular-lesson/index');
  const dbSchedules = await pool.query('SELECT COUNT(*) FROM group_schedule WHERE company_id = $1', [COMPANY_ID]);
  const dbScheduleCount = parseInt(dbSchedules.rows[0].count);
  
  console.log(`\n📅 Schedules:`);
  console.log(`   AlfaCRM: ${alfaSchedules.length}`);
  console.log(`   Database: ${dbScheduleCount}`);
  if (alfaSchedules.length === dbScheduleCount) {
    logSuccess('Schedules', 'Counts match');
  } else {
    logIssue('Schedules', `Mismatch: AlfaCRM has ${alfaSchedules.length}, DB has ${dbScheduleCount}`);
  }
}

// ============= Foreign Key Integrity =============

async function verifyForeignKeyIntegrity() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   FOREIGN KEY INTEGRITY                                   ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Orphaned group schedules (no group)
  const orphanedSchedules = await pool.query(`
    SELECT gs.id, gs.group_id 
    FROM group_schedule gs 
    LEFT JOIN groups g ON gs.group_id = g.id 
    WHERE g.id IS NULL AND gs.company_id = $1
  `, [COMPANY_ID]);
  
  if (orphanedSchedules.rows.length === 0) {
    logSuccess('FK', 'No orphaned group schedules');
  } else {
    logIssue('FK', `Found ${orphanedSchedules.rows.length} orphaned group schedules`);
  }

  // Orphaned lessons (no group)
  const orphanedLessons = await pool.query(`
    SELECT l.id, l.group_id 
    FROM lessons l 
    LEFT JOIN groups g ON l.group_id = g.id 
    WHERE l.group_id IS NOT NULL AND g.id IS NULL AND l.company_id = $1
    LIMIT 10
  `, [COMPANY_ID]);
  
  if (orphanedLessons.rows.length === 0) {
    logSuccess('FK', 'No orphaned lessons (missing group)');
  } else {
    logIssue('FK', `Found ${orphanedLessons.rows.length}+ orphaned lessons (missing group)`);
  }

  // Orphaned lesson-student links
  const orphanedLessonStudents = await pool.query(`
    SELECT ls.lesson_id, ls.student_id 
    FROM lesson_students ls 
    LEFT JOIN students s ON ls.student_id = s.id 
    WHERE s.id IS NULL AND ls.company_id = $1
    LIMIT 10
  `, [COMPANY_ID]);
  
  if (orphanedLessonStudents.rows.length === 0) {
    logSuccess('FK', 'No orphaned lesson-student links');
  } else {
    logIssue('FK', `Found ${orphanedLessonStudents.rows.length}+ orphaned lesson-student links`);
  }

  // Orphaned student-group links
  const orphanedStudentGroups = await pool.query(`
    SELECT sg.student_id, sg.group_id 
    FROM student_groups sg 
    LEFT JOIN students s ON sg.student_id = s.id 
    LEFT JOIN groups g ON sg.group_id = g.id 
    WHERE s.id IS NULL OR g.id IS NULL
    LIMIT 10
  `);
  
  if (orphanedStudentGroups.rows.length === 0) {
    logSuccess('FK', 'No orphaned student-group links');
  } else {
    logIssue('FK', `Found ${orphanedStudentGroups.rows.length}+ orphaned student-group links`);
  }
}

// ============= PHASE 1.2: Financial Data Accuracy =============

async function verifyFinancialData() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   PHASE 1.2: FINANCIAL DATA ACCURACY                     ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Check balance consistency
  const balanceCheck = await pool.query(`
    SELECT 
      s.id,
      s.name,
      COALESCE(sb.balance, 0) as stored_balance,
      COALESCE(SUM(pt.amount), 0) as calculated_balance
    FROM students s
    LEFT JOIN student_balance sb ON s.id = sb.student_id
    LEFT JOIN payment_transactions pt ON s.id = pt.student_id AND pt.company_id = $1
    WHERE s.company_id = $1
    GROUP BY s.id, s.name, sb.balance
    HAVING COALESCE(sb.balance, 0) != COALESCE(SUM(pt.amount), 0)
    LIMIT 5
  `, [COMPANY_ID]);

  if (balanceCheck.rows.length === 0) {
    logSuccess('Finance', 'All student balances match transaction sums');
  } else {
    logWarning('Finance', `Found ${balanceCheck.rows.length}+ students with balance mismatches`);
    balanceCheck.rows.forEach(row => {
      console.log(`   ${row.name}: stored=${row.stored_balance}, calculated=${row.calculated_balance}`);
    });
  }

  // Check negative subscriptions
  const negativeSubscriptions = await pool.query(`
    SELECT id, student_id, lessons_remaining 
    FROM student_subscriptions 
    WHERE lessons_remaining < 0 AND company_id = $1
  `, [COMPANY_ID]);

  if (negativeSubscriptions.rows.length === 0) {
    logSuccess('Finance', 'No subscriptions with negative lessons');
  } else {
    logIssue('Finance', `Found ${negativeSubscriptions.rows.length} subscriptions with negative lessons`);
  }

  // Check orphaned payment transactions
  const orphanedPayments = await pool.query(`
    SELECT pt.id, pt.student_id 
    FROM payment_transactions pt 
    LEFT JOIN students s ON pt.student_id = s.id 
    WHERE s.id IS NULL AND pt.company_id = $1
  `, [COMPANY_ID]);

  if (orphanedPayments.rows.length === 0) {
    logSuccess('Finance', 'All payment transactions have valid student references');
  } else {
    logIssue('Finance', `Found ${orphanedPayments.rows.length} orphaned payment transactions`);
  }

  // Check orphaned debt records
  const orphanedDebts = await pool.query(`
    SELECT d.id, d.student_id 
    FROM debt_records d 
    LEFT JOIN students s ON d.student_id = s.id 
    WHERE s.id IS NULL AND d.company_id = $1
  `, [COMPANY_ID]);

  if (orphanedDebts.rows.length === 0) {
    logSuccess('Finance', 'All debt records have valid student references');
  } else {
    logIssue('Finance', `Found ${orphanedDebts.rows.length} orphaned debt records`);
  }
}

// ============= PHASE 1.3: Schedule & Lesson Data =============

async function verifyScheduleData() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   PHASE 1.3: SCHEDULE & LESSON DATA                       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Check lessons without student links
  const lessonsWithoutStudents = await pool.query(`
    SELECT l.id, l.title, l.group_id 
    FROM lessons l 
    LEFT JOIN lesson_students ls ON l.id = ls.lesson_id 
    WHERE ls.lesson_id IS NULL AND l.company_id = $1
    LIMIT 10
  `, [COMPANY_ID]);

  const totalLessons = await pool.query('SELECT COUNT(*) FROM lessons WHERE company_id = $1', [COMPANY_ID]);
  const totalLessonCount = parseInt(totalLessons.rows[0].count);

  if (lessonsWithoutStudents.rows.length === 0) {
    logSuccess('Lessons', 'All lessons have student links');
  } else {
    logWarning('Lessons', `Found ${lessonsWithoutStudents.rows.length}+ lessons without students (might be empty classes)`);
  }

  console.log(`\n📊 Lesson Statistics:`);
  console.log(`   Total lessons: ${totalLessonCount}`);

  // Check lesson date ranges
  const lessonDateRange = await pool.query(`
    SELECT 
      MIN(start_time) as first_lesson,
      MAX(start_time) as last_lesson
    FROM lessons 
    WHERE company_id = $1
  `, [COMPANY_ID]);

  if (lessonDateRange.rows[0].first_lesson) {
    console.log(`   Date range: ${lessonDateRange.rows[0].first_lesson} to ${lessonDateRange.rows[0].last_lesson}`);
    logSuccess('Lessons', 'Lessons have valid date range');
  }

  // Check schedule date consistency
  const invalidSchedules = await pool.query(`
    SELECT id, group_id, start_date, end_date 
    FROM group_schedule 
    WHERE start_date > end_date AND company_id = $1
  `, [COMPANY_ID]);

  if (invalidSchedules.rows.length === 0) {
    logSuccess('Schedule', 'All schedules have valid date ranges (start <= end)');
  } else {
    logIssue('Schedule', `Found ${invalidSchedules.rows.length} schedules with invalid date ranges`);
  }

  // Check room consistency
  const lessonsWithInvalidRooms = await pool.query(`
    SELECT l.id, l.room_id 
    FROM lessons l 
    LEFT JOIN rooms r ON l.room_id = r.id 
    WHERE l.room_id IS NOT NULL AND r.id IS NULL AND l.company_id = $1
    LIMIT 10
  `, [COMPANY_ID]);

  if (lessonsWithInvalidRooms.rows.length === 0) {
    logSuccess('Rooms', 'All lessons have valid room references');
  } else {
    logIssue('Rooms', `Found ${lessonsWithInvalidRooms.rows.length}+ lessons with invalid room_id`);
  }
}

// ============= Multi-Tenancy Check =============

async function verifyMultiTenancy() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   MULTI-TENANCY ISOLATION                                 ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Check all records have company_id
  const tables = [
    'teachers', 'students', 'groups', 'rooms', 'lessons',
    'group_schedule', 'student_subscriptions', 'subscription_types',
    'payment_transactions', 'debt_records', 'lesson_students'
  ];

  for (const table of tables) {
    try {
      const result = await pool.query(`
        SELECT COUNT(*) 
        FROM ${table} 
        WHERE company_id IS NULL OR company_id = ''
      `);
      
      const nullCount = parseInt(result.rows[0].count);
      if (nullCount === 0) {
        logSuccess('Multi-tenancy', `${table}: All records have company_id`);
      } else {
        logIssue('Multi-tenancy', `${table}: ${nullCount} records missing company_id`);
      }
    } catch (error) {
      logWarning('Multi-tenancy', `${table}: Could not verify (${error.message})`);
    }
  }

  // Verify all records belong to correct company
  const result = await pool.query(`
    SELECT COUNT(*) 
    FROM students 
    WHERE company_id = $1
  `, [COMPANY_ID]);

  console.log(`\n📊 Records for company ${COMPANY_ID}:`);
  console.log(`   Students: ${result.rows[0].count}`);
}

// ============= Main Execution =============

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                DATA INTEGRITY VERIFICATION                ║');
  console.log('║            Comprehensive System Check Report              ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  try {
    await verifyDataCompleteness();
    await verifyForeignKeyIntegrity();
    await verifyFinancialData();
    await verifyScheduleData();
    await verifyMultiTenancy();

    // Summary
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                      SUMMARY                              ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log(`❌ Issues Found: ${issues.length}`);
    console.log(`⚠️  Warnings: ${warnings.length}`);

    if (issues.length > 0) {
      console.log('\n📋 Critical Issues:');
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. [${issue.category}] ${issue.message}`);
      });
    }

    if (warnings.length > 0) {
      console.log('\n📋 Warnings:');
      warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. [${warning.category}] ${warning.message}`);
      });
    }

    if (issues.length === 0 && warnings.length === 0) {
      console.log('\n🎉 All checks passed! Data integrity verified.');
    }

  } catch (error) {
    console.error('\n❌ VERIFICATION ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

