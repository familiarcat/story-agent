'use client';

/**
 * ChromeController — UAT presentation gate for public client pages (e.g. /clients/jonah).
 *
 * Public client presentations should read as the finished product: NO Story Agent NavBar / SideNav
 * / breadcrumbs. But a developer doing UAT still needs to reach the dashboard + crew. So on a
 * "presentation route" we hide the dev chrome by default and expose a single upper-left icon that
 * toggles the full Story Agent navigation back on (persisted per-browser).
 *
 * Mechanism: we drive a `data-chrome` attribute on <html> ("shown" | "hidden"); globals.css hides
 * the navbar/sidebar/breadcrumbs and zeroes the main margin when hidden. A pre-paint init script
 * (CHROME_INIT_SCRIPT, injected in <head> by the root layout) sets the attribute BEFORE hydration
 * so the public page never flashes the sidebar. On non-presentation routes the chrome always shows.
 */
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { CLIENT_BRAND_THEMES } from '@story-agent/shared/client-brand-themes';

/**
 * Routes served as public product presentations (chrome hidden by default). Prefix-matched.
 * Derived from CLIENT_BRAND_THEMES rather than hardcoded: every client with a bespoke design system
 * (see packages/shared/src/client-brand-themes.ts) automatically gets its /clients/<id> presentation
 * route here. Onboarding a second bespoke-brand client after jonah needs zero edits to this file.
 */
export const PRESENTATION_ROUTES = Object.keys(CLIENT_BRAND_THEMES).map((id) => `/clients/${id}`);
/**
 * Sub-segments under a presentation route that are internal crew tooling, not public presentation,
 * even though they nest under a branded client path — e.g. /clients/jonah/dashboard (the client-scoped
 * project dashboard) is for the crew, not a public visitor, so it keeps the full Story Agent chrome.
 */
const INTERNAL_SUBROUTES = ['dashboard'];
const STORAGE_KEY = 'sa-dev-chrome';

/** Runs in <head> before paint (no flash), mirrors the theme/sidebar init scripts. */
export const CHROME_INIT_SCRIPT = `(function(){try{
  var routes=${JSON.stringify(PRESENTATION_ROUTES)};
  var internal=${JSON.stringify(INTERNAL_SUBROUTES)};
  var p=location.pathname;
  var pres=routes.some(function(r){
    if(p===r) return true;
    if(p.indexOf(r+'/')!==0) return false;
    var rest=p.slice(r.length+1).split('/')[0];
    return internal.indexOf(rest)===-1;
  });
  var stored=null; try{stored=localStorage.getItem('${STORAGE_KEY}');}catch(e){}
  var show=pres?(stored==='true'):true;
  var d=document.documentElement;
  d.dataset.chrome=show?'shown':'hidden';
  d.dataset.presentation=pres?'true':'false';
}catch(e){}})();`;

function isPresentation(pathname: string | null): boolean {
  if (!pathname) return false;
  return PRESENTATION_ROUTES.some((r) => {
    if (pathname === r) return true;
    if (!pathname.startsWith(r + '/')) return false;
    const rest = pathname.slice(r.length + 1).split('/')[0];
    return !INTERNAL_SUBROUTES.includes(rest);
  });
}

export default function ChromeController() {
  const pathname = usePathname();
  const pres = isPresentation(pathname);
  const [show, setShow] = useState(true);

  // Re-evaluate on client navigation (the init script only runs on full page load).
  useEffect(() => {
    let stored: string | null = null;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch { /* ignore */ }
    const next = pres ? stored === 'true' : true;
    setShow(next);
    const d = document.documentElement;
    d.dataset.chrome = next ? 'shown' : 'hidden';
    d.dataset.presentation = pres ? 'true' : 'false';
  }, [pres, pathname]);

  const toggle = useCallback(() => {
    setShow((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* ignore */ }
      document.documentElement.dataset.chrome = next ? 'shown' : 'hidden';
      return next;
    });
  }, []);

  // The toggle only appears on presentation routes — elsewhere the chrome is always on.
  if (!pres) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={show}
      title={show ? 'Hide developer navigation (public view)' : 'Show Story Agent developer navigation (UAT)'}
      aria-label={show ? 'Hide developer navigation' : 'Show Story Agent developer navigation'}
      style={{
        position: 'fixed', top: 12, left: 12, zIndex: 4000,
        width: 40, height: 40, borderRadius: 10,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: show ? 'rgba(20,20,24,0.92)' : 'rgba(20,20,24,0.55)',
        color: '#fff', border: '1px solid rgba(255,255,255,0.28)',
        cursor: 'pointer', backdropFilter: 'blur(6px)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.35)', transition: 'background 0.2s ease',
      }}
    >
      {/* panels icon: sidebar + content */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <line x1="9" y1="4" x2="9" y2="20" />
      </svg>
    </button>
  );
}
