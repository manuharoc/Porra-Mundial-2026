import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Variables de entorno inyectadas automáticamente por Supabase
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const SPORTS_API_KEY = Deno.env.get("SPORTS_API_KEY")! // Tu API Key de API-Football u otro servicio

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  console.log("Iniciando sincronización de partidos...");

  try {
    // =====================================================================
    // 1. LLAMADA A LA API DE DEPORTES (Ejemplo: API-Football)
    // =====================================================================
    // Aquí consultaríamos los partidos en directo del Mundial 2026.
    // La petición real sería algo parecido a esto:
    /*
    const response = await fetch("https://v3.football.api-sports.io/fixtures?league=1&season=2026&live=all", {
      headers: { "x-apisports-key": SPORTS_API_KEY }
    });
    const apiData = await response.json();
    */

    // Como estamos en fase de desarrollo (2026 aún no ha llegado), 
    // simulamos una respuesta de la API con un resultado de prueba:
    const partidosActualizados = [
      {
        tipo: 'grupos', // o 'elim' para eliminatorias
        match_key: 'A_1', // Código interno del partido (ej. Grupo A, Partido 1)
        valor: { 
          gl: 2, // Goles Local (México)
          gv: 1, // Goles Visitante (Sudáfrica)
          status: 'FINISHED' 
        }
      }
    ];

    // =====================================================================
    // 2. ACTUALIZACIÓN EN SUPABASE
    // =====================================================================
    let actualizadosCount = 0;

    for (const partido of partidosActualizados) {
      // Usamos upsert para actualizar si existe o crear si no existe
      const { error } = await supabase
        .from('resultados_globales')
        .upsert(
          { 
            tipo: partido.tipo, 
            match_key: partido.match_key, 
            valor: partido.valor 
          }, 
          { onConflict: 'tipo,match_key' }
        );

      if (error) {
        console.error(`Error actualizando el partido ${partido.match_key}:`, error.message);
      } else {
        actualizadosCount++;
        console.log(`✅ Partido ${partido.match_key} actualizado con éxito.`);
      }
    }

    // Al terminar, gracias a Supabase Realtime, todos los navegadores
    // conectados a la app recibirán el cambio y recalcularán los puntos.

    return new Response(JSON.stringify({ 
      success: true, 
      mensaje: `Sincronización completada. ${actualizadosCount} partidos actualizados.` 
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error crítico en la sincronización:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
