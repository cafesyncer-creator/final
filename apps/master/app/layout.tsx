import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { ALL_FONT_VARIABLE_CLASSES } from '@/lib/theme/fonts';
import { ReactQueryProvider } from '@/lib/query-provider';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: 'CafeSync Master',
  description: 'CafeSync Master Administration Platform',
  icons: {
    icon: '/brand/cafesync-favicon-64.png',
    shortcut: '/brand/cafesync-favicon-64.png',
    apple: '/brand/cafesync-icon-192.png',
  },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#8D5B4C',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full ${ALL_FONT_VARIABLE_CLASSES}`} style={{ backgroundColor: '#EFE8E1' }}>
      <body className="min-h-full flex flex-col font-sans bg-[#EFE8E1] text-[#3E2723] antialiased">
        <ReactQueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ReactQueryProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
