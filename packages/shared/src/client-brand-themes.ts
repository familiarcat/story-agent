/**
 * Client → bespoke brand theme registry.
 *
 * Most clients render in the standard LCARS design system (no entry here). A client with a bespoke
 * visual identity (its own [data-theme] block in design/tokens/lcars.tokens.json — see the `jonah`
 * theme) gets an entry here, keyed by the same client id used in the Supabase `clients` table and in
 * Aha project matching (see ClientProjectMap.ts).
 *
 * This registry is the ONE place "does this client have a bespoke design system" is decided. Before
 * this existed, that fact was hardcoded in exactly one place (ChromeController's PRESENTATION_ROUTES,
 * a literal '/clients/jonah' string) — every consumer now reads this registry instead, so onboarding a
 * second bespoke-brand client is: add a theme block to lcars.tokens.json + one line here, not a hunt
 * through every surface that cared about jonah specifically.
 */
export const CLIENT_BRAND_THEMES: Record<string, string> = {
  jonah: 'jonah',
};

/** Returns the [data-theme] id for a client's bespoke brand, or null if it renders in standard LCARS. */
export function clientBrandTheme(clientId: string | null | undefined): string | null {
  if (!clientId) return null;
  return CLIENT_BRAND_THEMES[clientId.toLowerCase()] ?? null;
}
