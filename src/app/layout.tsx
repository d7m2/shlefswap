import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Toaster } from "@/components/ui/toaster";
import { AppProviders } from '@/components/AppProviders'; 


export const metadata: Metadata = {
  title: 'Shelf Swap - Your Book Swapping & Discovery Hub',
  description: 'Discover, swap, and sell books with Shelf Swap. AI-powered recommendations and a vibrant marketplace.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>{/* Ensure no leading/trailing whitespace inside <html> */}
      <head>
        <link rel="icon" href="/icons8-love-book-96.png" type="image/png" sizes="96x96" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@emran-alhaddad/saudi-riyal-font/index.css" />
      </head>
      <body className={`${GeistSans.variable} font-sans antialiased flex flex-col min-h-screen`} suppressHydrationWarning>
        <AppProviders>
          <Header />
          <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <Footer />
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
