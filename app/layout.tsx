import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  adjustFontFallback: true
});

export const metadata: Metadata = {
  title: 'Slith3r',
  description: 'A multiplayer snake game',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#0a0a1f'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Suspense fallback={<div>Loading...</div>}>
          {children}
        </Suspense>
      </body>
    </html>
  );
}