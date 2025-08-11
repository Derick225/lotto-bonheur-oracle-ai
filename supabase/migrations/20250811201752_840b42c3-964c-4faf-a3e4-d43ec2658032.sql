BEGIN;

-- Hardening admin_users: enforce strict RLS and remove any public access
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Revoke any direct grants for web roles (defense-in-depth; RLS still applies)
REVOKE ALL ON TABLE public.admin_users FROM anon, authenticated;

-- Drop any existing policies to recreate the strict set
DROP POLICY IF EXISTS admin_users_select_public ON public.admin_users;
DROP POLICY IF EXISTS admin_users_select_own_or_service ON public.admin_users;
DROP POLICY IF EXISTS admin_users_insert_service ON public.admin_users;
DROP POLICY IF EXISTS admin_users_update_service ON public.admin_users;
DROP POLICY IF EXISTS admin_users_delete_service ON public.admin_users;

-- Allow only service_role or the user themself (active) to SELECT their row
CREATE POLICY admin_users_select_own_or_service
ON public.admin_users
FOR SELECT
USING (
  auth.role() = 'service_role'
  OR (
    auth.email() IS NOT NULL AND (email)::text = auth.email() AND is_active = true
  )
);

-- Mutations restricted strictly to service_role
CREATE POLICY admin_users_insert_service
ON public.admin_users
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY admin_users_update_service
ON public.admin_users
FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY admin_users_delete_service
ON public.admin_users
FOR DELETE
USING (auth.role() = 'service_role');

COMMIT;