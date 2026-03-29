/**
 * Origine de l’app pour Clerk (redirects OAuth / PWA). Préférer NEXT_PUBLIC_APP_URL en prod.
 */
export function getClerkAllowedRedirectOrigins(): string[] | undefined {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (explicit) return [explicit];

  const vercel = process.env.VERCEL_URL;
  if (vercel) return [`https://${vercel.replace(/^https?:\/\//, '')}`];

  return undefined;
}
