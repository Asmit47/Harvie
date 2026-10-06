import type { Metadata } from 'next';
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: 'italic',
  variable: '--font-instrument-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://harvie.me'),
  title: 'Harvie · The AI assistant that follows through',
  description: 'Harvie remembers your work, acts in Gmail and Calendar with your OK, and keeps track of every open loop until it is done.',
  openGraph: {
    title: 'Harvie · The AI assistant that follows through',
    description: 'Harvie remembers your work, acts in Gmail and Calendar with your OK, and keeps track of every open loop until it is done.',
    url: 'https://harvie.me',
    siteName: 'Harvie',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Harvie · The AI assistant that follows through',
    description: 'Harvie remembers your work, acts in Gmail and Calendar with your OK, and keeps track of every open loop until it is done.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${instrumentSerif.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
