/** Routes Clerk (pages auth) : pas de chrome applicatif par-dessus AuthLayout. */
export function isClerkAuthPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname === '/sign-in' ||
    pathname === '/sign-up' ||
    pathname.startsWith('/sign-in/') ||
    pathname.startsWith('/sign-up/')
  );
}
