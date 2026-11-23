import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { ALL_FONT_VARIABLE_CLASSES } from '@/lib/theme/fonts';
import { ReactQueryProvider } from '@/lib/query-provider';
import { AuthProvider } from '@/lib/auth-context';
import { ClientThemeProvider } from '@/lib/theme/client-theme-provider';

export const metadata: Metadata = {
  title: 'CafeSync | Shop Manager Portal',
  description: 'CafeSync Shop Manager & Outlet Register Management Platform',
  icons: {
    icon: '/brand/cafesync-favicon-64.png',
    shortcut: '/brand/cafesync-favicon-64.png',
    apple: '/brand/cafesync-icon-192.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full ${ALL_FONT_VARIABLE_CLASSES}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  try {
    var slug = localStorage.getItem('cafesync_current_brand_slug') || 'snaxia';
    var cached = localStorage.getItem('cafesync_theme_' + slug);
    if (cached) {
      var data = JSON.parse(cached);
      if (data.mode === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (data.mode === 'light') {
        document.documentElement.classList.remove('dark');
      }
      if (data.cssVars) {
        var root = document.documentElement;
        for (var key in data.cssVars) {
          root.style.setProperty(key, data.cssVars[key]);
        }
      }
    }
  } catch(e) {}
})();
`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <ReactQueryProvider>
          <AuthProvider>
            <ClientThemeProvider>
              {children}
              <Toaster position="top-right" richColors />
            </ClientThemeProvider>
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
