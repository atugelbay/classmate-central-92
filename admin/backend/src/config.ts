import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/classmate_central',
  
  // Main API
  mainApiUrl: process.env.MAIN_API_URL || 'http://localhost:8080',
  
  // Admin credentials
  adminUsername: process.env.ADMIN_USERNAME || 'superadmin',
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || '',
  
  // JWT
  jwtSecret: process.env.ADMIN_JWT_SECRET || 'admin-jwt-secret-change-in-production',
  jwtExpiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '24h',
  
  // Server
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Security
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5174',
};
