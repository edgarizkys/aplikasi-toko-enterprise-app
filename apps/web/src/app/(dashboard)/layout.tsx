import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/app/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Aplikasi Toko Enterprise | Manajemen Toko & Retail',
  description: 'Platform manajemen toko enterprise dengan fitur produk, stok, penjualan, pelanggan, dan laporan komprehensif',
  keywords: ['toko', 'retail', 'manajemen', 'penjualan', 'stok', 'pelanggan'],
  authors: [{ name: 'Enterprise Development' }],
  creator: 'Enterprise Development Team',
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: 'https://aplikasi-toko-enterprise.com',
    siteName: 'Aplikasi Toko Enterprise',
    title: 'Aplikasi Toko Enterprise | Manajemen Toko & Retail',
    description: 'Platform manajemen toko enterprise dengan fitur produk, stok, penjualan, pelanggan, dan laporan komprehensif',
    images: [
      {
        url: 'https://aplikasi-toko-enterprise.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Aplikasi Toko Enterprise',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aplikasi Toko Enterprise',
    description: 'Platform manajemen toko enterprise dengan fitur produk, stok, penjualan, pelanggan, dan laporan komprehensif',
    images: ['https://aplikasi-toko-enterprise.com/og-image.png'],
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#0EA5E9" />
        <meta name="color-scheme" content="light dark" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${inter.className} bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-50 antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}