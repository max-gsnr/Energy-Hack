import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SolarTwin · O&M Agent Console',
  description: 'Enerparc digital twin — anomaly detection & AI agent console',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
