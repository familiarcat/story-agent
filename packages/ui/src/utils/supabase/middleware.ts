import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * updateSession — called from middleware.ts at the project root.
 * Refreshes the user's auth session on every request so Server Components
 * always see a valid session. Uses the publishable key (browser-safe).
 *
 * WorfGate note: service_role key is never used here; only the publishable
 * key flows through the cookie layer. Server-side DB access uses
 * SUPABASE_KEY (service_role) via packages/shared/src/db.ts directly.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Skip auth middleware if Supabase config is missing
  // Accept either the new publishable key or the legacy anon key env name.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    // NOTE: middleware runs in the Edge runtime — process.stderr is undefined here; use console.
    console.warn('[auth-middleware] Supabase config missing — skipping auth refresh');
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — do not remove, required for Server Component auth.
  // Wrapped in try-catch to handle OAuth registration errors gracefully.
  try {
    await supabase.auth.getUser();
  } catch (error) {
    // Silently ignore auth errors (e.g., no session, OAuth registration issues)
    // Unauthenticated users are allowed; protected routes handle auth checks
    console.warn(`[auth-middleware] Non-critical auth check failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  return supabaseResponse;
}
