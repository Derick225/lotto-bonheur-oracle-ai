-- Fix admin credentials exposure by restricting admin_users table access
-- Remove existing policies that might allow public access
DROP POLICY IF EXISTS "admin_users_select_own_or_service" ON public.admin_users;

-- Create more restrictive policies for admin_users table
-- Only allow service role and admin users to read admin data
CREATE POLICY "admin_users_service_role_access" 
ON public.admin_users 
FOR ALL 
USING (auth.role() = 'service_role');

-- Allow admin users to read only their own record (not all admin records)
CREATE POLICY "admin_users_own_record_only" 
ON public.admin_users 
FOR SELECT 
USING (
  auth.email() IS NOT NULL 
  AND email = auth.email() 
  AND is_active = true
  AND EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = auth.email() 
    AND role = 'admin' 
    AND is_active = true
  )
);

-- Ensure only service role can insert/update/delete admin users
CREATE POLICY "admin_users_service_role_insert" 
ON public.admin_users 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "admin_users_service_role_update" 
ON public.admin_users 
FOR UPDATE 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "admin_users_service_role_delete" 
ON public.admin_users 
FOR DELETE 
USING (auth.role() = 'service_role');