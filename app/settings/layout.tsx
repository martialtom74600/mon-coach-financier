import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Paramètres — Mon Coach Financier',
  description: 'Notifications, emails et confidentialité',
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
