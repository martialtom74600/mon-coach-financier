import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Réglages — Mon Coach Financier',
  description: 'Notifications, emails et vie privée',
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
