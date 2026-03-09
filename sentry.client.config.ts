/**
 * E.5 — Configuration Sentry côté client (browser).
 * Les erreurs non gérées et les captures manuelles sont envoyées à Sentry.
 * Si NEXT_PUBLIC_SENTRY_DSN n'est pas défini, le SDK ne transmet rien (no-op).
 * Note: Replay désactivé car replayIntegration n'est disponible qu'en browser pur.
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
});
