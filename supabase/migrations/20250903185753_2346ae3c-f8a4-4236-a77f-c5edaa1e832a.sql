-- Fix security vulnerability: Remove policy that allows users to select their own admin records
-- This prevents potential email harvesting attacks

-- Drop the problematic policy that allows authenticated users to select their own records
DROP POLICY IF EXISTS "admin_users_own_record_select" ON public.admin_users;

-- The admin_users table should only be accessible via:
-- 1. Service role (for system operations)
-- 2. Secure SECURITY DEFINER functions (for controlled access)
-- 
-- All existing SECURITY DEFINER functions (authenticate_admin, validate_admin_session, etc.)
-- will continue to work as they bypass RLS policies safely.

-- Add a comment to document the security reasoning
COMMENT ON TABLE public.admin_users IS 'Admin users table - access restricted to service role and SECURITY DEFINER functions only for security';