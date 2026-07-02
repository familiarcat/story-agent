import type { Metadata } from 'next';
import './globals.css';
import NavBar from '../components/NavBar';
import { ThemeProvider, THEME_INIT_SCRIPT } from '../components/ThemeProvider';
import DevTour from '../components/dev-tour/DevTour';

export const metadata: Metadata = {
  title: 'Story Agent',
  description: 'Agentic story delivery dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: THEME_INIT_SCRIPT sets data-theme on <html> before hydration
    // (no-FOUC), so the pre-paint DOM intentionally differs from the SSR HTML on this element only.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Pre-paint: apply the persisted theme before hydration (no flash). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>
          <NavBar />
          <main style={{ padding: '2rem' }}>{children}</main>
          {/* Developer-only guided tour — hard-gated, never ships to production (see DevTour). */}
          <DevTour />
        </ThemeProvider>
      </body>
    </html>
  );
}
