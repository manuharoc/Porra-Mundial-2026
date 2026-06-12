# 🏆 Porra Mundial 2026

> La porra de tu grupo para el Mundial de fútbol USA · México · Canadá 2026.  
> Crea una liga, comparte el código y a competir.

**[→ Abrir app](https://porra-mundial-2026-gilt.vercel.app)**

---

## Qué es

Una app web para organizar predicciones del Mundial 2026 entre amigos. Cada uno entra con su nombre, rellena pronósticos antes de cada partido y sube (o baja) en una tabla de clasificación compartida en tiempo real.

Sin registro de email. Sin contraseñas. Sin instalar nada.

---

## Cómo funciona

1. El organizador crea una liga y obtiene un **código de 4 caracteres**
2. Lo comparte por WhatsApp con el grupo
3. Cada participante entra a la app, pone su nombre y ya está dentro
4. Antes de cada partido, todo el mundo rellena su pronóstico
5. La clasificación se actualiza sola con los resultados reales

---

## Qué puedes predecir

**Partidos (104 en total)**
- 72 de fase de grupos — resultado exacto o ganador/empate
- 32 eliminatorias — quién pasa a la siguiente ronda

**Predicciones especiales** *(antes del 11 de junio)*
- Campeón del Mundial · Subcampeón · Tercer puesto
- Máximo goleador · Máximo goleador de España
- Partido con más goles · Partido con más tarjetas

---

## Puntuación

| Acierto | Puntos |
|---|---|
| Resultado exacto (grupos) | 3 |
| Ganador o empate correcto | 1 |
| Clasificado en Ronda de 32 | 4 |
| Clasificado a octavos | 5 |
| Clasificado a cuartos | 6 |
| Clasificado a semis | 8 |
| Finalista correcto | 10 |
| Subcampeón correcto | 12 |
| **Campeón correcto** | **20** |

Predicciones especiales: entre 8 y 20 puntos cada una.

Si hay prórroga o penaltis, cuenta el equipo clasificado. El resultado a 90' no puntúa.

---

## Modos de juego

El administrador puede elegir cómo se bloquean los pronósticos:

- **Interactivo** — se bloquean por fases (lo más habitual)
- **Flexible** — partido a partido, hasta el pitido inicial
- **Difícil** — todo bloqueado desde el primer partido del torneo

---

## Stack

| | |
|---|---|
| Frontend | HTML + CSS + JavaScript (vanilla) |
| Base de datos | [Supabase](https://supabase.com) (PostgreSQL + Realtime) |
| Resultados en vivo | [API-Football](https://www.api-football.com) |
| Cron-job | Vercel Cron — cada 15 min durante el torneo |
| Hosting | [Vercel](https://vercel.com) |
| PWA | Service Worker + Web App Manifest |

El cron-job consulta API-Football cada 15 minutos, compara con el estado guardado en Supabase y vuelca los resultados nuevos. Supabase Realtime propaga el cambio a todos los clientes conectados sin que nadie tenga que recargar.

No hay framework, no hay bundler, no hay build step. Se sirve como estático.

---

## Estructura del proyecto

```
├── index.html          # app completa
├── style.css           # estilos y layout responsive
├── app.js              # lógica, navegación, Supabase
├── data.js             # fixture oficial FIFA con horarios CEST
├── logo-limpio2.png
└── manifest.json
```

---

## Ejecutar en local

```bash
git clone https://github.com/manuharoc/Porra-Mundial-2026.git
cd Porra-Mundial-2026
```

Abre `index.html` directamente en el navegador o usa un servidor local si Supabase da problemas de CORS:

```bash
npx serve .
# o
python -m http.server 8080
```

Para conectar tu propia instancia de Supabase, edita estas líneas en `app.js`:

```js
const SUPABASE_URL = 'https://xxxx.supabase.co'
const SUPABASE_ANON_KEY = 'tu-anon-key'
```

---

## Despliegue

El proyecto despliega automáticamente en Vercel desde `master`. No hay paso de build.

```
Branch:     master
Framework:  Other (static)
Output dir: /  (raíz del repo)
```

---

## Lo que hay hecho y lo que falta

- [x] Crear y unirse a ligas con código
- [x] Pronósticos de los 104 partidos con horarios CEST
- [x] Predicciones especiales (campeón, goleador, etc.)
- [x] Clasificación en tiempo real via Supabase Realtime
- [x] Fase de grupos con tabla de clasificación por grupo
- [x] Panel de administrador (gestión de participantes, normas, configuración)
- [x] PWA instalable en móvil
- [x] Modos de bloqueo de predicciones
- [x] Sistema de bonus por número de aciertos
- [ ] Notificaciones push antes de cada partido
- [ ] Historial de predicciones por participante
- [ ] Panel para actualizar resultados sin ir a Supabase directamente
- [ ] Compartir clasificación como imagen para WhatsApp

---

## Torneo

**FIFA World Cup 2026** · 11 junio – 19 julio  
48 selecciones · 12 grupos · 104 partidos  
Sede: Estados Unidos, México y Canadá  
Final: MetLife Stadium · Nueva Jersey · 19 julio · 21:00 CEST
