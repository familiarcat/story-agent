import type { Metadata } from 'next';
import './globals.css';
import NavBar from '../components/NavBar';
import SideNav from '../components/SideNav';
import { ThemeProvider, THEME_INIT_SCRIPT } from '../components/ThemeProvider';
import { SidebarProvider, SIDEBAR_INIT_SCRIPT } from '../components/SidebarProvider';
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
        {/* Pre-paint: apply the persisted sidebar state before hydration (no flash). */}
        <script dangerouslySetInnerHTML={{ __html: SIDEBAR_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>
          <SidebarProvider>
            <NavBar />
            {/* Crew ruling (UI-GLOBAL-NAV): SideNav lives in the ROOT layout — persistent global
                navigation on every route, never re-mounted on transitions. */}
            <div className="app-shell">
              <SideNav />
              <main className="app-main">{children}</main>
            </div>
            {/* Developer-only guided tour — hard-gated, never ships to production (see DevTour). */}
            <DevTour />
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
