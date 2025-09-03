-- Fix security issues detected by linter

-- 1. Fix Function Search Path Mutable - Set search_path for functions that don't have it
-- This prevents search path attacks on SECURITY DEFINER functions

-- Update get_global_stats function to set search_path
CREATE OR REPLACE FUNCTION public.get_global_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Update get_number_frequency function to set search_path
CREATE OR REPLACE FUNCTION public.get_number_frequency(p_draw_name character varying, p_limit integer DEFAULT 100)
RETURNS TABLE(number integer, frequency bigint, percentage numeric)
LANGUAGE plpgsql
SET search_path = 'public'
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

-- Update calculate_prediction_accuracy function to set search_path
CREATE OR REPLACE FUNCTION public.calculate_prediction_accuracy(predicted integer[], actual integer[])
RETURNS numeric
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
DECLARE
  matches INTEGER := 0;
  i INTEGER;
BEGIN
  IF predicted IS NULL OR actual IS NULL THEN RETURN NULL; END IF;
  FOR i IN 1..array_length(predicted, 1) LOOP
    IF predicted[i] = ANY(actual) THEN matches := matches + 1; END IF;
  END LOOP;
  RETURN ROUND((matches::DECIMAL / array_length(predicted, 1)) * 100, 2);
END;
$function$;

-- Update cleanup_old_data function to set search_path
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  DELETE FROM public.ml_predictions WHERE prediction_date < NOW() - INTERVAL '1 year';
  DELETE FROM public.ml_models WHERE is_active = false AND created_at < NOW() - INTERVAL '6 months';
END;
$function$;

-- Update update_updated_at_column function to set search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Update validate_lottery_numbers function to set search_path
CREATE OR REPLACE FUNCTION public.validate_lottery_numbers(numbers integer[])
RETURNS boolean
LANGUAGE plpgsql
SET search_path = 'public'
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

-- Update handle_updated_at trigger function to set search_path
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;