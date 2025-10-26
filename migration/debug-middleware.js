// Тестируем что возвращает API
const axios = require('axios');

async function test() {
  console.log('\n🔍 ДЕБАГ API\n');
  
  try {
    // 1. Логинимся под user1
    console.log('1️⃣ Логинимся под user1@mail.com...');
    const loginResponse = await axios.post('http://localhost:8080/api/auth/login', {
      email: 'user1@mail.com',
      password: 'password'
    });
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    
    console.log('✅ Успешно!');
    console.log(`   User ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Company ID: ${user.companyId || 'НЕТ! ❌'}`);
    console.log('');
    
    // 2. Проверяем /api/auth/me
    console.log('2️⃣ Проверяем /api/auth/me...');
    const meResponse = await axios.get('http://localhost:8080/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`   Company ID в ответе: ${meResponse.data.companyId || 'НЕТ! ❌'}`);
    console.log('');
    
    // 3. Пытаемся получить студентов
    console.log('3️⃣ Запрашиваем студентов...');
    const studentsResponse = await axios.get('http://localhost:8080/api/students', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log(`✅ Получено студентов: ${studentsResponse.data.length}`);
    
    if (studentsResponse.data.length === 0) {
      console.log('\n❌ ПРОБЛЕМА: Студентов 0, а должно быть 262!');
      console.log('   → Middleware не работает или company_id не передается');
    } else {
      console.log('\n✅ ВСЕ РАБОТАЕТ!');
    }
    
  } catch (error) {
    console.error('\n❌ Ошибка:', error.response?.data || error.message);
  }
}

test();

