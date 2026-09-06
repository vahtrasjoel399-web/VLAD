import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'SMOLIN.FX — Automotive Video Creator',
  description:
    'Automotive films, reels and editing by Vladislav Smolin in Estonia.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
