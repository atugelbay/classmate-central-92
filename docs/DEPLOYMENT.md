# Deployment Guide

## Overview

This guide covers deploying Classmate Central to production.

## Prerequisites

- Docker and Docker Compose installed
- PostgreSQL database (local or managed service)
- Domain name and SSL certificate (for production)
- SMTP server credentials (for email notifications)

## Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd classmate-central-92
```

### 2. Configure Environment

#### Backend

Copy and edit `.env.example`:

```bash
cd backend
cp .env.example .env
# Edit .env with your production values
```

Key variables to set:

- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET` (generate a strong random secret)
- `ALLOWED_ORIGINS` (your frontend domain)
- `SMTP_*` (email configuration)
- `ENV=production`

#### Frontend

Copy and edit `.env.production.example`:

```bash
cd frontend
cp .env.production.example .env.production
# Edit with your backend API URL
```

### 3. Build and Run with Docker Compose

```bash
# From project root
docker-compose -f docker-compose.prod.yml up -d
```

### 4. Run Migrations

```bash
# Migrations run automatically on backend startup
# Or manually:
docker exec -it classmate_central_api_prod ./main
```

### 5. Verify Deployment

- Health check: `http://your-domain/health`
- Readiness check: `http://your-domain/ready`
- Metrics: `http://your-domain/metrics`

## Production Checklist

### Security

- [ ] Change all default passwords
- [ ] Set strong `JWT_SECRET`
- [ ] Configure `ALLOWED_ORIGINS` for CORS
- [ ] Enable SSL/TLS (HTTPS)
- [ ] Set up firewall rules
- [ ] Enable rate limiting (already configured)
- [ ] Review security headers in nginx

### Database

- [ ] Set up automated backups (see `BACKUP_GUIDE.md`)
- [ ] Configure connection pooling
- [ ] Set up database monitoring
- [ ] Enable SSL for database connections

### Monitoring

- [ ] Set up Prometheus metrics collection
- [ ] Configure alerting (5xx errors, high latency)
- [ ] Set up log aggregation
- [ ] Monitor disk space

### Email

- [ ] Configure SMTP settings
- [ ] Test email delivery
- [ ] Set up email monitoring

## Docker Deployment

### Build Images

```bash
# Backend
cd backend
docker build -t classmate-central-api:latest .

# Frontend
cd frontend
docker build -t classmate-central-web:latest .
```

### Run Containers

```bash
# Using docker-compose
docker-compose -f docker-compose.prod.yml up -d

# Or manually
docker run -d \
  --name classmate-central-api \
  -p 8080:8080 \
  --env-file backend/.env \
  classmate-central-api:latest

docker run -d \
  --name classmate-central-web \
  -p 80:80 \
  classmate-central-web:latest
```

## Manual Deployment

### Backend

1. Build binary:

```bash
cd backend
go build -o api ./cmd/api
```

2. Run migrations:

```bash
./api migrate
```

3. Start server:

```bash
./api
```

### Frontend

1. Build:

```bash
cd frontend
npm install
npm run build
```

2. Serve with nginx:

```bash
# Copy dist/ to nginx html directory
sudo cp -r dist/* /usr/share/nginx/html/
```

## SSL/TLS Setup

### Using Let's Encrypt (Certbot)

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Nginx SSL Configuration

Update `nginx.prod.conf` to include SSL:

```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    # ... rest of config
}
```

## Scaling

### Horizontal Scaling

- Use load balancer (nginx, HAProxy)
- Multiple backend instances
- Shared database
- Session storage (if needed)

### Database Scaling

- Read replicas for read-heavy workloads
- Connection pooling
- Query optimization
- Indexing

## Troubleshooting

### Backend Not Starting

1. Check logs:

```bash
docker logs classmate_central_api_prod
```

2. Verify database connection
3. Check environment variables

### Frontend Not Loading

1. Check nginx logs:

```bash
docker logs classmate_central_web_prod
```

2. Verify API URL in frontend config
3. Check CORS settings

### Database Connection Issues

1. Verify database is accessible
2. Check credentials
3. Verify network connectivity
4. Check firewall rules

## Rollback Procedure

1. Stop current containers:

```bash
docker-compose -f docker-compose.prod.yml down
```

2. Restore database from backup (see `BACKUP_GUIDE.md`)

3. Deploy previous version:

```bash
git checkout <previous-version>
docker-compose -f docker-compose.prod.yml up -d
```

## Maintenance

### Regular Tasks

- Monitor disk space
- Review logs for errors
- Check backup success
- Update dependencies
- Security patches

### Updates

1. Pull latest code
2. Run tests
3. Build new images
4. Deploy with zero-downtime strategy
5. Monitor for issues

## Support

For issues or questions, refer to:
- `README.md` - Project overview
- `BACKUP_GUIDE.md` - Backup procedures
- `API_DOCUMENTATION.md` - API reference

