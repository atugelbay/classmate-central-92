# Admin Panel - Classmate Central

Super Admin dashboard for managing the Classmate Central CRM platform.

## Features

- **Dashboard**: Overview statistics for all companies, users, students, teachers
- **Companies**: View and manage all registered companies
- **Users**: Browse all users across all companies
- **Database Viewer**: View tables, execute readonly SQL queries, export data
- **Logs**: System logs with filtering and search
- **Errors**: Error tracking and monitoring

## Architecture

```
admin/
├── backend/           # Node.js + Express API (port 4000)
│   ├── src/
│   │   ├── routes/    # API endpoints
│   │   ├── services/  # Business logic
│   │   ├── middleware/# Auth middleware
│   │   └── types/     # TypeScript types
│   └── Dockerfile
│
├── frontend/          # React + Vite UI (port 5174)
│   ├── src/
│   │   ├── pages/     # Page components
│   │   ├── components/# UI components
│   │   ├── api/       # API client
│   │   └── context/   # Auth context
│   └── Dockerfile
│
└── docker-compose.yml
```

## Quick Start

### Development

1. **Backend**:
```bash
cd admin/backend
cp .env.example .env
npm install
npm run dev
```

2. **Frontend**:
```bash
cd admin/frontend
npm install
npm run dev
```

3. Access at http://localhost:5174

### Default Credentials (Development)
- Username: `superadmin`
- Password: `admin123`

### Production

1. Create `.env` file from `.env.example`

2. Generate password hash:
```bash
curl -X POST http://localhost:4000/api/auth/generate-hash \
  -H "Content-Type: application/json" \
  -d '{"password":"your-secure-password"}'
```

3. Set `ADMIN_PASSWORD_HASH` in `.env`

4. Build and run:
```bash
cd admin
docker-compose up -d --build
```

## API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current user

### Dashboard
- `GET /api/dashboard/stats` - System statistics
- `GET /api/dashboard/activity` - Activity chart data
- `GET /api/dashboard/system` - System info

### Companies
- `GET /api/companies` - List all companies
- `GET /api/companies/:id` - Company details
- `GET /api/companies/:id/users` - Company users
- `GET /api/companies/:id/stats` - Company statistics

### Users
- `GET /api/users` - List all users
- `GET /api/users/:id` - User details
- `GET /api/users/stats/overview` - User statistics

### Database
- `GET /api/database/tables` - List tables
- `GET /api/database/tables/:name` - Table data
- `POST /api/database/query` - Execute SQL (readonly)
- `GET /api/database/export/:table` - Export table data

### Logs
- `GET /api/logs` - Get logs
- `GET /api/logs/errors` - Get errors
- `GET /api/logs/stats` - Log statistics

## Security

- Separate JWT authentication from main app
- All database queries are readonly (SELECT only)
- Sensitive columns are masked (passwords, tokens)
- Rate limiting on login endpoints
- CORS restricted to admin frontend origin

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `MAIN_API_URL` | Main backend URL | http://backend:8080 |
| `ADMIN_USERNAME` | Super admin username | superadmin |
| `ADMIN_PASSWORD_HASH` | Bcrypt hash of password | - |
| `ADMIN_JWT_SECRET` | JWT signing secret | - |
| `ADMIN_JWT_EXPIRES_IN` | JWT expiration | 24h |
| `CORS_ORIGIN` | Allowed CORS origin | http://localhost:5174 |
