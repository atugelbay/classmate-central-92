import { LogEntry } from '../types/index.js';

// In-memory log storage (in production, this would read from a file or external service)
const logs: LogEntry[] = [];
let logIdCounter = 1;

/**
 * Log levels with priority
 */
const LOG_LEVELS = {
  info: 0,
  warn: 1,
  error: 2,
} as const;

/**
 * Add a log entry
 */
export function addLog(
  level: 'info' | 'warn' | 'error',
  message: string,
  context?: Record<string, unknown>,
  source?: string
): void {
  const entry: LogEntry = {
    id: logIdCounter++,
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
    source,
  };

  logs.push(entry);

  // Keep only last 10000 logs in memory
  if (logs.length > 10000) {
    logs.shift();
  }

  // Also log to console
  const logFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  logFn(`[${level.toUpperCase()}] ${message}`, context || '');
}

/**
 * Get logs with filtering
 */
export function getLogs(options: {
  level?: 'info' | 'warn' | 'error';
  search?: string;
  startDate?: string;
  endDate?: string;
  source?: string;
  limit?: number;
  offset?: number;
}): { logs: LogEntry[]; total: number } {
  let filtered = [...logs];

  // Filter by level (and above)
  if (options.level) {
    const minLevel = LOG_LEVELS[options.level];
    filtered = filtered.filter(log => LOG_LEVELS[log.level] >= minLevel);
  }

  // Filter by search text
  if (options.search) {
    const searchLower = options.search.toLowerCase();
    filtered = filtered.filter(
      log =>
        log.message.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.context || {}).toLowerCase().includes(searchLower)
    );
  }

  // Filter by date range
  if (options.startDate) {
    filtered = filtered.filter(log => log.timestamp >= options.startDate!);
  }
  if (options.endDate) {
    filtered = filtered.filter(log => log.timestamp <= options.endDate!);
  }

  // Filter by source
  if (options.source) {
    filtered = filtered.filter(log => log.source === options.source);
  }

  // Sort by timestamp descending (newest first)
  filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const total = filtered.length;

  // Apply pagination
  const offset = options.offset || 0;
  const limit = options.limit || 100;
  filtered = filtered.slice(offset, offset + limit);

  return { logs: filtered, total };
}

/**
 * Get error logs only
 */
export function getErrors(options: {
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}): { logs: LogEntry[]; total: number } {
  return getLogs({ ...options, level: 'error' });
}

/**
 * Get log statistics
 */
export function getLogStats(): {
  total: number;
  byLevel: Record<string, number>;
  last24h: number;
  errorsLast24h: number;
} {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const byLevel = {
    info: 0,
    warn: 0,
    error: 0,
  };

  let last24h = 0;
  let errorsLast24h = 0;

  for (const log of logs) {
    byLevel[log.level]++;
    if (log.timestamp >= yesterday) {
      last24h++;
      if (log.level === 'error') {
        errorsLast24h++;
      }
    }
  }

  return {
    total: logs.length,
    byLevel,
    last24h,
    errorsLast24h,
  };
}

/**
 * Clear all logs (use with caution)
 */
export function clearLogs(): void {
  logs.length = 0;
}

/**
 * Logger utility for the admin backend
 */
export const logger = {
  info: (message: string, context?: Record<string, unknown>) => addLog('info', message, context, 'admin-backend'),
  warn: (message: string, context?: Record<string, unknown>) => addLog('warn', message, context, 'admin-backend'),
  error: (message: string, context?: Record<string, unknown>) => addLog('error', message, context, 'admin-backend'),
};
