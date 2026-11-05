import type { Metadata, Viewport } from 'next';
import { Baloo_2, Caprasimo } from 'next/font/google';
import './globals.css';

const display = Caprasimo({ weight: '400', subsets: ['latin'], variable: '--font-display' });
const body = Baloo_2({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: 'Bunot Manito Manita',
  description: 'Sit by the fire and draw your manito or manita from Santa’s jar.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#160c12' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
