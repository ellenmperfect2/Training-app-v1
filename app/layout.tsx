import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/ui/Nav';
import { ThemeProvider } from '@/lib/theme-context';

export const metadata: Metadata = {
  title: 'Summit Dashboard',
  description: 'Personal training dashboard for mountain athletes',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap"
        />
      </head>
      <body className="antialiased bg-glacier-bg text-glacier-primary min-h-screen">
        <ThemeProvider>
          <div style={{ transition: 'background 0.2s, color 0.2s' }}>
            <Nav />
            <main className="max-w-3xl mx-auto px-4 py-8">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
