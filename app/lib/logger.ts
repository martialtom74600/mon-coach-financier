/**
 * E.5 — Logger structuré pour API routes et serveur.
 * - En production : sortie JSON sur stderr, capture Sentry pour les erreurs.
 * - En développement : sortie lisible + Sentry si DSN configuré.
 */
import * as Sentry from '@sentry/nextjs';

type LogLevel = 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

function formatStructured(level: LogLevel, message: string, context?: LogContext): string {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };
  return JSON.stringify(entry);
}

function log(level: LogLevel, message: string, context?: LogContext, error?: unknown): void {
  const formatted = formatStructured(level, message, context);
  const isServer = typeof process !== 'undefined';
  if (process.env.NODE_ENV === 'development') {
    const prefix = `[${level.toUpperCase()}]`;
    if (error) {
      console.error(prefix, message, context ?? '', error);
    } else if (level === 'error') {
      console.error(prefix, message, context ?? '');
    } else if (level === 'warn') {
      console.warn(prefix, message, context ?? '');
    } else {
      console.log(prefix, message, context ?? '');
    }
  } else if (isServer && typeof process.stderr?.write === 'function') {
    process.stderr.write(formatted + '\n');
  } else {
    console.error(formatted);
  }

  if (level === 'error' && (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)) {
    if (error instanceof Error) {
      Sentry.captureException(error, { extra: { message, ...context } });
    } else {
      Sentry.captureMessage(message, {
        level: 'error',
        extra: { ...context, rawError: error },
      });
    }
  }
}

export const logger = {
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, context?: LogContext, error?: unknown) =>
    log('error', message, context, error),
};
