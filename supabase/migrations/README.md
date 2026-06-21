# Supabase migrations (CLI-managed)

Migrations here are applied to the cloud project with the **Supabase CLI** — no more manual
dashboard paste. Files use the CLI's `<YYYYMMDDHHMMSS>_name.sql` timestamp convention.

## One-time setup
1. `brew upgrade supabase` (pin ≥ v2.107 so it matches `supabase/config.toml`).
2. Add to `~/.alexai-secrets` (WorfGate secrets — never commit): `SUPABASE_ACCESS_TOKEN`, and the cloud DB password as `SUPABASE_DB_PASSWORD`.
3. Link the cloud project (ref `sqachwmzyuuyyyxekdxp`):
   ```bash
   supabase link --project-ref sqachwmzyuuyyyxekdxp
   ```

## Apply migrations
```bash
supabase db push --dry-run   # preview
supabase db push             # apply pending migrations to cloud
```
CI does the same on push to `main` (`.github/workflows/supabase-auto-migrate.yml`), gated on the
`SUPABASE_ACCESS_TOKEN` repo secret.

## Historical migrations
The pre-CLI migrations remain as a flat archive in `supabase/*.sql` (already applied manually).
They are intentionally NOT in this folder, so `db push` only applies NEW migrations and never
re-runs history. To bring a historical migration under CLI tracking, move it here and run
`supabase migration repair --status applied <version>` before the next push.
