#!/bin/bash

# Сначала логинимся и получаем токен
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@mail.com","password":"password"}' | jq -r '.token')

echo "Token: $TOKEN"
echo ""

# Затем проверяем /api/students
echo "=== GET /api/students ==="
curl -s http://localhost:8080/api/students \
  -H "Authorization: Bearer $TOKEN" | jq '.'

