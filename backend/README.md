# Classmate Central Backend

REST API backend for the Classmate Central educational management system.

## Tech Stack

- **Go** - Programming language
- **Gin** - Web framework
- **PostgreSQL** - Database
- **JWT** - Authentication

## Setup

### Prerequisites

- Go 1.21+
- PostgreSQL 15+
- Docker (optional, for database)

### Installation

1. Install dependencies:
```bash
go mod download
```

2. Start PostgreSQL (using Docker):
```bash
docker-compose up -d
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration

5. Run the server:
```bash
go run cmd/api/main.go
```

The server will start on `http://localhost:8080`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh JWT token
- `GET /api/auth/me` - Get current user (protected)

### Teachers
- `GET /api/teachers` - Get all teachers
- `GET /api/teachers/:id` - Get teacher by ID
- `POST /api/teachers` - Create teacher
- `PUT /api/teachers/:id` - Update teacher
- `DELETE /api/teachers/:id` - Delete teacher

### Students
- `GET /api/students` - Get all students
- `GET /api/students/:id` - Get student by ID
- `POST /api/students` - Create student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Groups
- `GET /api/groups` - Get all groups
- `GET /api/groups/:id` - Get group by ID
- `POST /api/groups` - Create group
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group

### Lessons
- `GET /api/lessons` - Get all lessons
- `GET /api/lessons/:id` - Get lesson by ID
- `POST /api/lessons` - Create lesson
- `PUT /api/lessons/:id` - Update lesson
- `DELETE /api/lessons/:id` - Delete lesson

### Settings
- `GET /api/settings` - Get settings
- `PUT /api/settings` - Update settings

## Database Schema

The database schema is automatically created when the server starts. See `migrations/001_init_schema.up.sql` for details.

## Development

### Running Tests
```bash
go test ./...
```

### Building
```bash
go build -o bin/api cmd/api/main.go
```

### Running Binary
```bash
./bin/api
```

## Environment Variables

See `.env.example` for all available configuration options.

