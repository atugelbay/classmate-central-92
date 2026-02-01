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
import { licensesRouter } from './routes/licenses.js';
import { authMiddleware } from './middleware/auth.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));

// Rate limiting
const isDev = config.nodeEnv === 'development';

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: isDev ? 0 : 300, // 300 requests per minute in prod
  message: { error: 'Too many requests, please try again later.' },
  skip: () => isDev, // Skip rate limiting entirely in dev
});
app.use(limiter);

// Rate limiting for auth routes (protect against brute force)
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: isDev ? 0 : 10, // 10 login attempts per 5 min
  message: { error: 'Too many login attempts, please try again in 5 minutes.' },
  skip: () => isDev, // Skip rate limiting entirely in dev
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
app.use('/api/licenses', authMiddleware, licensesRouter);

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
