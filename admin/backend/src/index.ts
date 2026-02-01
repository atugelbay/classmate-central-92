import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { dashboardRouter } from './routes/dashboard.js';
import { companiesRouter } from './routes/companies.js';
import { usersRouter } from './routes/users.js';
import { databaseRouter } from './routes/database.js';
import { logsRouter } from './routes/logs.js';
import { authMiddleware } from './middleware/auth.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts, please try again later.' },
});

// Body parsing
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes (public)
app.use('/api/auth', authLimiter, authRouter);

// Protected routes
app.use('/api/dashboard', authMiddleware, dashboardRouter);
app.use('/api/companies', authMiddleware, companiesRouter);
app.use('/api/users', authMiddleware, usersRouter);
app.use('/api/database', authMiddleware, databaseRouter);
app.use('/api/logs', authMiddleware, logsRouter);

// Error handling
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: config.nodeEnv === 'development' ? err.message : 'Internal server error',
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

app.listen(config.port, () => {
  console.log(`🚀 Admin API server running on port ${config.port}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);
});

export default app;
