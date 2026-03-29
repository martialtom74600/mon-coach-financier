/**
 * Segment auth : aucun chrome applicatif (nav / header).
 * Les pages utilisent `AuthLayout` ; les URLs restent `/sign-in`, `/sign-up`.
 */
export default function AuthSegmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
