/**
 * E.5 — Point d'entrée instrumentation Next.js.
 * Charge les configs Sentry selon le runtime (nodejs / edge).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
