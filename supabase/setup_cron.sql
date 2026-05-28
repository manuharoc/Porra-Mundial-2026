-- ==============================================================================
-- 🚀 CONFIGURACIÓN DEL CRON JOB (PILOTO AUTOMÁTICO)
-- ==============================================================================
-- Ejecuta este código en el panel de SQL de Supabase para decirle a la base
-- de datos que llame a tu función automáticamente cada 5 minutos.
-- 
-- Nota: La extensión pg_net y pg_cron deben estar activadas en tu base de datos.
-- ==============================================================================

-- 1. Asegúrate de tener la extensión pg_net habilitada (permite hacer peticiones HTTP desde SQL)
create extension if not exists pg_net;

-- 2. Programa la tarea (Cron Job)
-- Esto ejecutará una llamada HTTP a tu Edge Function cada 5 minutos
select
  cron.schedule(
    'sync-matches-every-5-min', -- Nombre de la tarea
    '*/5 * * * *', -- Expresión cron: cada 5 minutos
    $$
    select
      net.http_post(
          url:='https://[TU_PROYECTO_SUPABASE_REF].supabase.co/functions/v1/sync-matches',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer [TU_SERVICE_ROLE_KEY]"}'::jsonb
      ) as request_id;
    $$
  );

-- ==============================================================================
-- COMANDOS ÚTILES PARA EL CRON
-- ==============================================================================

-- Si alguna vez quieres PAUSAR el piloto automático (por ejemplo, cuando no hay partidos):
-- select cron.unschedule('sync-matches-every-5-min');

-- Si quieres ver el historial para comprobar que la función se está llamando:
-- select * from cron.job_run_details order by start_time desc limit 10;
