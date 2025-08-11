-- Adjust SECURITY DEFINER usage and fix search_path issues
BEGIN;

-- Recreate get_global_stats with SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.get_global_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_draws', COUNT(*),
        'unique_draw_names', COUNT(DISTINCT draw_name),
        'date_range', jsonb_build_object(
            'from', MIN(date),
            'to', MAX(date)
        ),
        'most_frequent_numbers', (
            SELECT jsonb_agg(jsonb_build_object('number', number, 'frequency', frequency))
            FROM (
                SELECT unnest(gagnants) as number, COUNT(*) as frequency
                FROM public.lottery_results
                GROUP BY unnest(gagnants)
                ORDER BY frequency DESC
                LIMIT 10
            ) top_numbers
        )
    ) INTO result
    FROM public.lottery_results;
    
    RETURN result;
END;
$function$;

-- Recreate get_number_frequency with SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.get_number_frequency(p_draw_name character varying, p_limit integer DEFAULT 100)
RETURNS TABLE(number integer, frequency bigint, percentage numeric)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT num AS number,
         COUNT(*) AS frequency,
         ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 2) AS percentage
  FROM (
    SELECT unnest(gagnants) AS num
    FROM public.lottery_results
    WHERE draw_name = p_draw_name
    LIMIT p_limit
  ) t
  GROUP BY num
  ORDER BY frequency DESC, num ASC;
END;
$function$;

-- Recreate validate_lottery_numbers without SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.validate_lottery_numbers(numbers integer[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Vérifier que tous les numéros sont entre 1 et 90
    IF EXISTS (SELECT 1 FROM unnest(numbers) AS num WHERE num < 1 OR num > 90) THEN
        RETURN FALSE;
    END IF;
    
    -- Vérifier qu'il n'y a pas de doublons
    IF array_length(numbers, 1) != (SELECT COUNT(DISTINCT num) FROM unnest(numbers) AS num) THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$function$;

-- Fix handle_updated_at: set proper search_path and remove SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

-- Recreate hash_password without SECURITY DEFINER (no table access required)
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Validate password strength before hashing
    IF length(password) < 12 THEN
        RAISE EXCEPTION 'Password must be at least 12 characters long';
    END IF;
    
    IF NOT (password ~ '[A-Z]' AND password ~ '[a-z]' AND password ~ '[0-9]' AND password ~ '[^A-Za-z0-9]') THEN
        RAISE EXCEPTION 'Password must contain uppercase, lowercase, numbers, and special characters';
    END IF;
    
    RETURN crypt(password, gen_salt('bf', 12));
END;
$function$;

COMMIT;