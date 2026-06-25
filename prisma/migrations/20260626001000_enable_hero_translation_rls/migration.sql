ALTER TABLE "HeroTranslation" ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies are created on purpose.
-- Server-side admin actions should use SUPABASE_SERVICE_ROLE_KEY,
-- which bypasses RLS without exposing write access to public clients.
