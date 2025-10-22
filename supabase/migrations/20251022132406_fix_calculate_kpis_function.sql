/*
  # Fix KPI calculation function

  1. Changes
    - Fix quote status from 'accepted' to 'accepté' (French)
    - Update function to use correct enum values
*/

CREATE OR REPLACE FUNCTION calculate_current_month_kpis()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_of_month timestamptz;
  end_of_month timestamptz;
  result jsonb;
  quotes_accepted int;
  quotes_total int;
  missions_completed int;
  missions_on_time int;
  avg_satisfaction numeric;
  nps_score numeric;
BEGIN
  start_of_month := date_trunc('month', CURRENT_DATE);
  end_of_month := start_of_month + interval '1 month';
  
  SELECT COUNT(*) INTO quotes_total 
  FROM quotes 
  WHERE created_at >= start_of_month AND created_at < end_of_month;
  
  SELECT COUNT(*) INTO quotes_accepted 
  FROM quotes 
  WHERE status = 'accepté' 
  AND created_at >= start_of_month 
  AND created_at < end_of_month;
  
  SELECT COUNT(*) INTO missions_completed 
  FROM missions 
  WHERE status = 'completed' 
  AND updated_at >= start_of_month 
  AND updated_at < end_of_month;
  
  SELECT COUNT(*) INTO missions_on_time 
  FROM missions 
  WHERE status = 'completed' 
  AND updated_at >= start_of_month 
  AND updated_at < end_of_month 
  AND updated_at <= scheduled_at + interval '2 hours';
  
  SELECT COALESCE(AVG(overall_rating), 0) INTO avg_satisfaction 
  FROM client_satisfaction_surveys 
  WHERE submitted_at >= start_of_month 
  AND submitted_at < end_of_month 
  AND submitted_at IS NOT NULL;
  
  WITH nps_data AS (
    SELECT overall_rating 
    FROM client_satisfaction_surveys 
    WHERE submitted_at >= start_of_month 
    AND submitted_at < end_of_month 
    AND submitted_at IS NOT NULL
  )
  SELECT COALESCE(
    (COUNT(*) FILTER (WHERE overall_rating >= 9)::numeric * 100 / NULLIF(COUNT(*), 0)) -
    (COUNT(*) FILTER (WHERE overall_rating <= 6)::numeric * 100 / NULLIF(COUNT(*), 0)),
    0
  ) INTO nps_score 
  FROM nps_data;
  
  result := jsonb_build_object(
    'period', jsonb_build_object(
      'start', start_of_month,
      'end', end_of_month
    ),
    'revenue', jsonb_build_object(
      'current', 0,
      'change', 0
    ),
    'conversion', jsonb_build_object(
      'quotesTotal', quotes_total,
      'quotesAccepted', quotes_accepted,
      'rate', CASE WHEN quotes_total > 0 THEN (quotes_accepted::numeric / quotes_total * 100) ELSE 0 END
    ),
    'satisfaction', jsonb_build_object(
      'rating', ROUND(avg_satisfaction, 1),
      'nps', ROUND(nps_score, 0),
      'responseRate', 0
    ),
    'operations', jsonb_build_object(
      'missionsCompleted', missions_completed,
      'onTimeRate', CASE WHEN missions_completed > 0 THEN (missions_on_time::numeric / missions_completed * 100) ELSE 0 END,
      'averageDelay', 0
    )
  );
  
  RETURN result;
END;
$$;
