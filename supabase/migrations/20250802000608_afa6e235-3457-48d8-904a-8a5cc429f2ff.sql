-- Fix critical password security and RLS policies (corrected version)

-- First, let's fix the password hashing function to use proper bcrypt
CREATE OR REPLACE FUNCTION public.authenticate_admin(p_email text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    user_record public.admin_users%ROWTYPE;
    result jsonb;
BEGIN
    -- Get user record
    SELECT * INTO user_record
    FROM public.admin_users
    WHERE email = p_email AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid credentials');
    END IF;
    
    -- Use proper bcrypt verification instead of simple comparison
    IF NOT (user_record.password_hash = crypt(p_password, user_record.password_hash)) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid credentials');
    END IF;
    
    -- Update last login
    UPDATE public.admin_users
    SET last_login = NOW()
    WHERE id = user_record.id;
    
    RETURN jsonb_build_object(
        'success', true,
        'user', jsonb_build_object(
            'id', user_record.id,
            'email', user_record.email,
            'role', user_record.role
        )
    );
END;
$function$;

-- Create a function to hash passwords properly
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN crypt(password, gen_salt('bf'));
END;
$function$;

-- Create admin sessions table for secure session management
CREATE TABLE IF NOT EXISTS public.admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS on admin_sessions
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin_sessions
CREATE POLICY "admin_sessions_admin_access" ON public.admin_sessions
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM admin_users 
        WHERE admin_users.email = auth.email() 
        AND admin_users.is_active = true 
        AND admin_users.role = 'admin'
    )
);

-- Fix overly permissive RLS policies on ml_models
DROP POLICY IF EXISTS "select_ml_models" ON public.ml_models;
DROP POLICY IF EXISTS "insert_ml_models" ON public.ml_models;
DROP POLICY IF EXISTS "update_ml_models" ON public.ml_models;
DROP POLICY IF EXISTS "delete_ml_models" ON public.ml_models;

-- Create more restrictive policies for ml_models
CREATE POLICY "admin_select_ml_models" ON public.ml_models
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM admin_users 
        WHERE admin_users.email = auth.email() 
        AND admin_users.is_active = true 
        AND admin_users.role = 'admin'
    )
);

CREATE POLICY "admin_insert_ml_models" ON public.ml_models
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM admin_users 
        WHERE admin_users.email = auth.email() 
        AND admin_users.is_active = true 
        AND admin_users.role = 'admin'
    )
);

CREATE POLICY "admin_update_ml_models" ON public.ml_models
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM admin_users 
        WHERE admin_users.email = auth.email() 
        AND admin_users.is_active = true 
        AND admin_users.role = 'admin'
    )
);

CREATE POLICY "admin_delete_ml_models" ON public.ml_models
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM admin_users 
        WHERE admin_users.email = auth.email() 
        AND admin_users.is_active = true 
        AND admin_users.role = 'admin'
    )
);

-- Create function for secure session validation
CREATE OR REPLACE FUNCTION public.validate_admin_session(session_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    session_record admin_sessions%ROWTYPE;
    user_record admin_users%ROWTYPE;
BEGIN
    -- Get active session
    SELECT * INTO session_record
    FROM admin_sessions
    WHERE token = session_token 
    AND is_active = true 
    AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired session');
    END IF;
    
    -- Get user info
    SELECT * INTO user_record
    FROM admin_users
    WHERE id = session_record.user_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found or inactive');
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'user', jsonb_build_object(
            'id', user_record.id,
            'email', user_record.email,
            'role', user_record.role
        ),
        'session', jsonb_build_object(
            'id', session_record.id,
            'expires_at', session_record.expires_at
        )
    );
END;
$function$;

-- Create function to create secure session
CREATE OR REPLACE FUNCTION public.create_admin_session(p_user_id uuid, p_ip_address inet DEFAULT NULL, p_user_agent text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    session_token text;
BEGIN
    -- Generate cryptographically secure token
    session_token := encode(gen_random_bytes(32), 'base64');
    
    -- Insert session
    INSERT INTO admin_sessions (user_id, token, ip_address, user_agent)
    VALUES (p_user_id, session_token, p_ip_address, p_user_agent);
    
    RETURN session_token;
END;
$function$;

-- Create function to invalidate session
CREATE OR REPLACE FUNCTION public.invalidate_admin_session(session_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE admin_sessions
    SET is_active = false
    WHERE token = session_token;
    
    RETURN FOUND;
END;
$function$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_id ON admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);