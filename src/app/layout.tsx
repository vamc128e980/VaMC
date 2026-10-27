// @ts-nocheck
import type { Metadata, Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#050505',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'Vujwala Simha Dry Fruits & Nuts | Royal Fine-Dine',
  description:
    'Fresh Fruit Juices, Thick Shakes, Premium Dry Fruits, Nuts & Royal Dining Experience at Rajeev Circle, Proddatur.',
  applicationName: 'Vujwala Simha Dine',
  keywords: [
    'Vujwala Simha',
    'Dry Fruits & Nuts',
    'Fresh Juice Proddatur',
    'Restaurant Proddatur',
    'Fine Dine',
  ],
  authors: [{ name: 'Vujwala Simha' }],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png' }],
  },
  openGraph: {
    title: 'Vujwala Simha Dry Fruits & Nuts | Royal Fine-Dine',
    description:
      'Digital Touch QR Dining, Fresh Fruit Juices, Thick Shakes & Dry Fruits.',
    siteName: 'Vujwala Simha Restaurant',
    locale: 'en_IN',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} dark`}>
      <head>
        {/* Anti-Flicker & Dark Canvas Background */}
        <meta name="color-scheme" content="dark" />
      </head>
      <body className="min-h-screen bg-[#050505] text-[#FCF6BA] font-sans antialiased selection:bg-[#D4AF37] selection:text-black">
        {children}
      </body>
    </html>
  );
}