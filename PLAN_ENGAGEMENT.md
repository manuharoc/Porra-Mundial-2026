# Plan de Acción: Engagement & Comodidad 🚀

Este es el mapa de ruta para integrar las "killer features" que harán que la aplicación sea súper adictiva y facilísima de usar.

## Fase 1: Reducción de Fricción (Comodidad)
**Objetivo:** Que nadie abandone por "pereza".
1. **Filtro "Ocultar Completados":** 
   - Añadir un *toggle* (interruptor) en la barra superior de "Predicciones - Grupos".
   - Al activarlo, ocultará todos los partidos que ya tengan un resultado guardado, limpiando la pantalla para ver solo lo pendiente.
2. **Botón "🎲 Autocompletar Mágicamente":**
   - Un botón flotante o en la barra superior que recorra los 104 partidos de grupos.
   - Generará resultados aleatorios lógicos (0-3 goles) para los partidos **vacíos** y enviará una única petición en bloque a Supabase para guardarlos de golpe.

## Fase 2: Gamificación (El Pique)
**Objetivo:** Generar "salseo" y debate en WhatsApp.
3. **El "Cara a Cara" (Tú vs Rival):**
   - Modificar la tarjeta de perfil que se abre al pinchar a un usuario en el ranking.
   - En lugar de mostrar solo sus estadísticas, mostrará una tabla con los próximos 3-4 partidos comparando su predicción con la tuya: `Tú: 2-1 | Rival: 1-1`.
4. **Sistema de Rachas (🔥):**
   - En la función de cálculo de puntos (`calcScore`), contabilizaremos cuántos resultados *exactos* ha acertado un usuario.
   - Si tiene más de X aciertos exactos, le colocaremos una insignia 🔥 al lado de su nombre en el Top 3 del ranking.

## Fase 3: Sensación de Comunidad
5. **Feed de Actividad en el Dashboard:**
   - Una cajita en la pantalla principal que escuche eventos de Supabase Realtime y diga cosas como: *"Manu ha salvado 3 predicciones"*.
