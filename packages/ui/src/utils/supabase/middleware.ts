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

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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
  await supabase.auth.getUser();

  return supabaseResponse;
}
