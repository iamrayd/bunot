import type { Metadata, Viewport } from 'next';
import { Baloo_2, Caprasimo } from 'next/font/google';
import './globals.css';

const display = Caprasimo({ weight: '400', subsets: ['latin'], variable: '--font-display' });
const body = Baloo_2({ subsets: ['latin'], variable: '--font-body' });

const title = 'Bunot: manito, manita';
const description = 'Sit by the fire with the family and draw your manito or manita from Santa’s jar.';
const site = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title,
  description,
  // The card relatives see when the room link lands in a chat.
  openGraph: { title, description, type: 'website', siteName: 'Bunot' },
  twitter: { card: 'summary_large_image', title, description },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#160c12' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
