-- Final security fix: Ensure ALL database functions have SET search_path to prevent attacks

-- Update authenticate_admin function - add search_path
CREATE OR REPLACE FUNCTION public.authenticate_admin(p_email text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
        -- Log failed attempt for security monitoring
        INSERT INTO public.admin_sessions (user_id, token, ip_address, user_agent, is_active)
        VALUES (null, 'FAILED_LOGIN_' || extract(epoch from now()), null, 'Failed login attempt', false);
        
        RETURN jsonb_build_object('success', false, 'error', 'Invalid credentials');
    END IF;
    
    -- Use proper bcrypt verification instead of simple comparison
    IF NOT (user_record.password_hash = crypt(p_password, user_record.password_hash)) THEN
        -- Log failed attempt
        INSERT INTO public.admin_sessions (user_id, token, ip_address, user_agent, is_active)
        VALUES (user_record.id, 'FAILED_LOGIN_' || extract(epoch from now()), null, 'Failed password attempt', false);
        
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

-- Update create_admin_session function - add search_path
CREATE OR REPLACE FUNCTION public.create_admin_session(p_user_id uuid, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    session_token text;
    session_count integer;
BEGIN
    -- Check for too many active sessions (prevent session flooding)
    SELECT COUNT(*) INTO session_count
    FROM admin_sessions
    WHERE user_id = p_user_id AND is_active = true AND expires_at > NOW();
    
    IF session_count >= 5 THEN
        -- Invalidate oldest sessions if too many active
        UPDATE admin_sessions 
        SET is_active = false 
        WHERE user_id = p_user_id 
        AND is_active = true 
        AND id IN (
            SELECT id FROM admin_sessions 
            WHERE user_id = p_user_id AND is_active = true 
            ORDER BY created_at ASC 
            LIMIT (session_count - 4)
        );
    END IF;
    
    -- Generate cryptographically secure token
    session_token := encode(gen_random_bytes(32), 'base64');
    
    -- Insert session with enhanced tracking
    INSERT INTO admin_sessions (user_id, token, ip_address, user_agent, last_accessed)
    VALUES (p_user_id, session_token, p_ip_address, p_user_agent, NOW());
    
    RETURN session_token;
END;
$function$;

-- Update validate_admin_session function - add search_path
CREATE OR REPLACE FUNCTION public.validate_admin_session(session_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    session_record admin_sessions%ROWTYPE;
    user_record admin_users%ROWTYPE;
BEGIN
    -- Validate token format first
    IF session_token IS NULL OR length(session_token) < 32 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid session token format');
    END IF;
    
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
        -- Invalidate session if user not found
        UPDATE admin_sessions SET is_active = false WHERE id = session_record.id;
        RETURN jsonb_build_object('success', false, 'error', 'User not found or inactive');
    END IF;
    
    -- Update session last_accessed
    UPDATE admin_sessions 
    SET last_accessed = NOW() 
    WHERE id = session_record.id;
    
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

-- Update invalidate_admin_session function - add search_path
CREATE OR REPLACE FUNCTION public.invalidate_admin_session(session_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
    -- Validate token format
    IF session_token IS NULL OR length(session_token) < 32 THEN
        RETURN false;
    END IF;
    
    UPDATE admin_sessions
    SET is_active = false, expires_at = NOW()
    WHERE token = session_token;
    
    RETURN FOUND;
END;
$function$;

-- Update log_security_event function - add search_path  
CREATE OR REPLACE FUNCTION public.log_security_event(event_type text, user_id uuid DEFAULT NULL::uuid, ip_address inet DEFAULT NULL::inet, user_agent text DEFAULT NULL::text, details jsonb DEFAULT NULL::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'  
AS $function$
BEGIN
    -- Insert security event log
    INSERT INTO admin_sessions (user_id, token, ip_address, user_agent, is_active)
    VALUES (
        user_id, 
        'SECURITY_EVENT_' || event_type || '_' || extract(epoch from now()),
        ip_address,
        COALESCE(user_agent, event_type || ': ' || COALESCE(details::text, 'No details')),
        false
    );
END;
$function$;