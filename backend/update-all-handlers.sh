#!/bin/bash
# Массовое обновление handlers для добавления company_id

# Обновить teacher_handler.go
sed -i 's/h\.repo\.GetAll()/companyID := c.GetString("company_id")\n\tstudents, err := h.repo.GetAll(companyID)/g' backend/internal/handlers/teacher_handler.go

echo "Handlers обновлены"

