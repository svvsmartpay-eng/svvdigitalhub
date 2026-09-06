-- Drop the existing policy
DROP POLICY IF EXISTS "Enable all for authenticated" ON public.whatsapp_sessions;

-- Create a new policy that allows everyone (including anon) since the demo doesn't use Supabase Auth
CREATE POLICY "Enable all" ON public.whatsapp_sessions
    FOR ALL
    USING (true)
    WITH CHECK (true);
