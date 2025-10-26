#!/usr/bin/env node
/**
 * Тестовый скрипт для проверки структуры данных AlfaCRM API
 * Запуск: node test-alfacrm-api.js
 */

require('dotenv').config();
const axios = require('axios');

const ALFACRM_API_URL = process.env.ALFACRM_API_URL;
const ALFACRM_EMAIL = process.env.ALFACRM_EMAIL;
const ALFACRM_API_KEY = process.env.ALFACRM_API_KEY;

let alfacrmToken = null;

async function getAlfaCRMToken() {
  if (alfacrmToken) return alfacrmToken;
  
  console.log('🔐 Получение токена AlfaCRM...');
  const response = await axios.post(`${ALFACRM_API_URL}/v2api/auth/login`, {
    email: ALFACRM_EMAIL,
    api_key: ALFACRM_API_KEY,
  });
  
  alfacrmToken = response.data.token;
  console.log('✅ Токен получен\n');
  return alfacrmToken;
}

async function testEndpoint(endpoint, name) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 ТЕСТИРОВАНИЕ: ${name}`);
  console.log(`🔗 Endpoint: ${endpoint}`);
  console.log('='.repeat(60));
  
  try {
    const token = await getAlfaCRMToken();
    const response = await axios.post(`${ALFACRM_API_URL}${endpoint}`, {
      page: 0,
      count: 3, // Получаем только 3 элемента для теста
    }, {
      headers: { 'X-ALFACRM-TOKEN': token },
    });

    const items = response.data.items || [];
    console.log(`\n✅ Получено элементов: ${items.length}`);
    
    if (items.length > 0) {
      console.log('\n📋 ПРИМЕР ДАННЫХ (первый элемент):\n');
      console.log(JSON.stringify(items[0], null, 2));
      
      console.log('\n🔑 ДОСТУПНЫЕ ПОЛЯ:');
      const fields = Object.keys(items[0]);
      fields.forEach(field => {
        const value = items[0][field];
        const type = Array.isArray(value) ? 'array' : typeof value;
        console.log(`  • ${field}: ${type}`);
      });
    } else {
      console.log('\n⚠️  Нет данных');
    }
    
    return items;
  } catch (error) {
    console.error(`\n❌ ОШИБКА: ${error.message}`);
    if (error.response) {
      console.error(`HTTP ${error.response.status}: ${error.response.statusText}`);
      if (error.response.data) {
        console.error('Response:', error.response.data);
      }
    }
    return [];
  }
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║         ТЕСТИРОВАНИЕ ALFACRM API СТРУКТУРЫ ДАННЫХ         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  console.log(`📍 API URL: ${ALFACRM_API_URL}`);
  console.log(`👤 Email: ${ALFACRM_EMAIL}`);
  console.log(`🔑 API Key: ${ALFACRM_API_KEY ? '***' + ALFACRM_API_KEY.slice(-4) : 'НЕ УКАЗАН'}`);
  
  try {
    // Тестируем разные endpoints
    await testEndpoint('/v2api/teacher/index', 'Преподаватели (Teachers)');
    await testEndpoint('/v2api/customer/index', 'Клиенты/Студенты (Customers)');
    await testEndpoint('/v2api/group/index', 'Группы (Groups)');
    await testEndpoint('/v2api/room/index', 'Комнаты (Rooms)');
    await testEndpoint('/v2api/regular-lesson/index', 'Регулярные занятия (Regular Lessons)');
    await testEndpoint('/v2api/ctt/index', 'Тарифы (CTT/Subscription Types)');
    
    console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                  ✅ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО                ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    process.exit(1);
  }
}

main();

