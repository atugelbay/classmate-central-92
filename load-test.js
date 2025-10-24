import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Разогрев: 10 пользователей
    { duration: '1m', target: 50 },    // Нормальная нагрузка: 50 пользователей
    { duration: '2m', target: 100 },   // Увеличение: 100 пользователей
    { duration: '1m', target: 200 },   // Пиковая нагрузка: 200 пользователей
    { duration: '30s', target: 0 },    // Спад до 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],   // 95% запросов должны быть быстрее 1s
    http_req_failed: ['rate<0.05'],      // Менее 5% ошибок
    errors: ['rate<0.1'],                // Менее 10% ошибок приложения
  },
};

// Замените на ваш Railway URL или ngrok URL
const BASE_URL = __ENV.API_URL || 'http://localhost:8080';

// Тестовые данные
const TEST_USER = {
  email: 'test@example.com',
  password: 'password123',
};

export default function() {
  // 1. Тест логина
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify(TEST_USER),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'Login' },
    }
  );

  const loginSuccess = check(loginRes, {
    'login status 200': (r) => r.status === 200,
    'login has token': (r) => r.json('token') !== undefined,
  });

  errorRate.add(!loginSuccess);

  if (!loginSuccess) {
    console.error(`Login failed: ${loginRes.status} - ${loginRes.body}`);
    sleep(1);
    return;
  }

  const token = loginRes.json('token');
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // 2. Тест получения учителей
  const teachersRes = http.get(`${BASE_URL}/api/teachers`, {
    headers,
    tags: { name: 'GetTeachers' },
  });

  check(teachersRes, {
    'teachers status 200': (r) => r.status === 200,
    'teachers is array': (r) => Array.isArray(r.json()),
  });

  // 3. Тест получения студентов
  const studentsRes = http.get(`${BASE_URL}/api/students`, {
    headers,
    tags: { name: 'GetStudents' },
  });

  check(studentsRes, {
    'students status 200': (r) => r.status === 200,
    'students is array': (r) => Array.isArray(r.json()),
  });

  // 4. Тест получения уроков
  const lessonsRes = http.get(`${BASE_URL}/api/lessons`, {
    headers,
    tags: { name: 'GetLessons' },
  });

  check(lessonsRes, {
    'lessons status 200': (r) => r.status === 200,
    'lessons is array': (r) => Array.isArray(r.json()),
  });

  // 5. Тест получения групп
  const groupsRes = http.get(`${BASE_URL}/api/groups`, {
    headers,
    tags: { name: 'GetGroups' },
  });

  check(groupsRes, {
    'groups status 200': (r) => r.status === 200,
    'groups is array': (r) => Array.isArray(r.json()),
  });

  // 6. Тест получения лидов
  const leadsRes = http.get(`${BASE_URL}/api/leads`, {
    headers,
    tags: { name: 'GetLeads' },
  });

  check(leadsRes, {
    'leads status 200': (r) => r.status === 200,
  });

  // 7. Тест статистики лидов
  const statsRes = http.get(`${BASE_URL}/api/leads/stats`, {
    headers,
    tags: { name: 'GetLeadStats' },
  });

  check(statsRes, {
    'stats status 200': (r) => r.status === 200,
  });

  // 8. Тест получения комнат
  const roomsRes = http.get(`${BASE_URL}/api/rooms`, {
    headers,
    tags: { name: 'GetRooms' },
  });

  check(roomsRes, {
    'rooms status 200': (r) => r.status === 200,
  });

  // 9. Тест финансов - транзакции
  const transactionsRes = http.get(`${BASE_URL}/api/payments/transactions`, {
    headers,
    tags: { name: 'GetTransactions' },
  });

  check(transactionsRes, {
    'transactions status 200': (r) => r.status === 200,
  });

  // 10. Тест абонементов
  const subscriptionsRes = http.get(`${BASE_URL}/api/subscriptions`, {
    headers,
    tags: { name: 'GetSubscriptions' },
  });

  check(subscriptionsRes, {
    'subscriptions status 200': (r) => r.status === 200,
  });

  // Случайная задержка между 1 и 3 секундами (имитация реального пользователя)
  sleep(Math.random() * 2 + 1);
}

// Функция, которая выполняется один раз в конце теста
export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let summary = '\n';
  summary += `${indent}✓ Checks.........................: ${(data.metrics.checks.values.passes / data.metrics.checks.values.count * 100).toFixed(2)}% (${data.metrics.checks.values.passes}/${data.metrics.checks.values.count})\n`;
  summary += `${indent}✓ HTTP requests..................: ${data.metrics.http_reqs.values.count}\n`;
  summary += `${indent}✓ HTTP request duration..........: avg=${data.metrics.http_req_duration.values.avg.toFixed(2)}ms min=${data.metrics.http_req_duration.values.min.toFixed(2)}ms max=${data.metrics.http_req_duration.values.max.toFixed(2)}ms\n`;
  summary += `${indent}✓ HTTP request duration (p95)....: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `${indent}✓ HTTP request failed............: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n`;
  summary += `${indent}✓ Iterations.....................: ${data.metrics.iterations.values.count}\n`;
  summary += `${indent}✓ VUs............................: ${data.metrics.vus.values.value}\n`;

  return summary;
}

