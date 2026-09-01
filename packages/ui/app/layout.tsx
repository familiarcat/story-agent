import type { Metadata } from 'next';
import './globals.css';
import NavBar from '@/components/NavBar';
import SideNav from '@/components/SideNav';
import LcarsActionDock from '@/components/LcarsActionDock';
import { ThemeProvider, THEME_INIT_SCRIPT } from '@/components/ThemeProvider';
import { SidebarProvider, SIDEBAR_INIT_SCRIPT } from '@/components/SidebarProvider';
import { LoadingStateProvider } from '@/components/LoadingStateProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import DevTour from '@/components/dev-tour/DevTour';
import ChromeController, { CHROME_INIT_SCRIPT } from '@/components/ChromeController';

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
        {/* Pre-paint: on public presentation routes (e.g. /clients/jonah), hide dev chrome before
            hydration so the finished product never flashes the sidebar (toggle via ChromeController). */}
        <script dangerouslySetInnerHTML={{ __html: CHROME_INIT_SCRIPT }} />
      </head>
      <body>
        <ErrorBoundary>
          <ThemeProvider>
            <SidebarProvider>
              <NavBar />
              {/* Crew ruling (UI-GLOBAL-NAV): SideNav lives in the ROOT layout — persistent global
                  navigation on every route, never re-mounted on transitions. */}
              <div className="app-shell">
                <SideNav />
                <main className="app-main">
                  <LoadingStateProvider>{children}</LoadingStateProvider>
                </main>
              </div>
              {/* Persistent 2-Click LCARS Command Dock */}
              <LcarsActionDock />
              {/* UAT presentation gate: hides dev chrome on public client pages, with an upper-left
                  icon to toggle the full Story Agent nav back on. */}
              <ChromeController />
              {/* Developer-only guided tour — hard-gated, never ships to production (see DevTour). */}
              <DevTour />
            </SidebarProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
