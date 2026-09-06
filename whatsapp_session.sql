-- Create whatsapp_sessions table with camelCase columns matching Prisma
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "branchId" UUID NOT NULL UNIQUE,
    "phoneNumber" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "connectedAt" TIMESTAMPTZ,
    "lastSeen" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_branch FOREIGN KEY ("branchId") REFERENCES public.branches(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read and update
CREATE POLICY "Enable all for authenticated" ON public.whatsapp_sessions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
