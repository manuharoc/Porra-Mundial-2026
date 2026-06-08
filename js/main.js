// ===================== REALTIME =====================
let realtimeChannel = null;
let realtimeDebounce = null;
let lastChangerId = null;
let lastChangerTable = null;
let lastChangerDirectName = null;

function setupRealtime(){
  if(realtimeChannel) sb.removeChannel(realtimeChannel);
  realtimeChannel = sb.channel('porra-'+session.liga_id)
    .on('postgres_changes',{event:'*',schema:'public',table:'participantes'}, handleRealtime)
    .on('postgres_changes',{event:'*',schema:'public',table:'predicciones_grupos'}, handleRealtime)
    .on('postgres_changes',{event:'*',schema:'public',table:'predicciones_elim'}, handleRealtime)
    .on('postgres_changes',{event:'*',schema:'public',table:'predicciones_especiales'}, handleRealtime)
    .on('postgres_changes',{event:'*',schema:'public',table:'resultados_globales'}, handleRealtime)
    .subscribe();
}

async function handleRealtime(payload){
  if (payload) {
    lastChangerTable = payload.table;
    if (payload.table === 'participantes') {
      if (payload.new && payload.new.nombre) {
        lastChangerDirectName = payload.new.nombre;
      } else if (payload.old && payload.old.id) {
        lastChangerId = payload.old.id;
      }
    } else {
      if (payload.new && payload.new.participante_id) {
        lastChangerId = payload.new.participante_id;
      } else if (payload.old && payload.old.participante_id) {
        lastChangerId = payload.old.participante_id;
      }
    }
  }

  clearTimeout(realtimeDebounce);
  realtimeDebounce = setTimeout(async()=>{
    await loadAllData();
    renderPage(currentPage);
    applySidebarProfile();
    
    let changerName = 'Alguien';
    if (lastChangerDirectName) {
      changerName = lastChangerDirectName;
    } else if (lastChangerId) {
      const p = cache.participantes.find(x => x.id === lastChangerId);
      if (p) {
        changerName = p.name;
      }
    } else if (lastChangerTable === 'resultados_globales') {
      changerName = 'El administrador';
    }

    if(typeof logActivity === 'function') {
      logActivity(`🔄 ${changerName} ha guardado un cambio. ¡Datos actualizados!`);
    }

    // Reset
    lastChangerId = null;
    lastChangerTable = null;
    lastChangerDirectName = null;
  }, 600);
}


// ===================== INIT =====================
async function initApp(){
  showLoading(true);
  setLoadingText('Conectando con Supabase…');



  const oldSession = localStorage.getItem(SESSION_KEY);
  const multiStr = localStorage.getItem(MULTI_SESSION_KEY);
  if(oldSession && !multiStr){
    try {
      const s = JSON.parse(oldSession);
      const { data: part } = await sb.from('participantes').select('id,liga_id,nombre,emoji').eq('id', s.participante_id).maybeSingle();
      const { data: liga } = await sb.from('ligas').select('nombre').eq('id', s.liga_id).maybeSingle();
      if(part && liga){
        const arr = [{ liga_id: s.liga_id, participante_id: s.participante_id, liga_name: liga.nombre, my_name: part.nombre, avatar: part.emoji }];
        localStorage.setItem(MULTI_SESSION_KEY, JSON.stringify(arr));
      }
    } catch(e){}
  }

  // Check superadmin mode
  if(checkSuperadminUrl()){
    _isSuperadmin = true;
    showLoading(false);
    openSuperadmin();
    return;
  }

  try {
    const stored=localStorage.getItem(SESSION_KEY);
    if(stored){
      const s=JSON.parse(stored);
      const { data:part, error }=await sb.from('participantes').select('id,liga_id').eq('id',s.participante_id).maybeSingle();
      if(part&&part.liga_id===s.liga_id&&!error){
        session=s;
        currentViewUser=session.participante_id;
        await loadAllData();
        setupRealtime();
        showApp();
        return;
      }
    }
  } catch(e){ console.error('Session restore failed:',e); }
  showSetup();

  // Auto-fill invite code if present in URL
  const inviteCode = new URLSearchParams(location.search).get('code');
  if (inviteCode) {
    document.getElementById('setup-join-code').value = inviteCode;
    chooseJoin();
  }
}

initApp();

// ===================== SHARE =====================
async function shareRanking(){
  const wrap = document.querySelector('#page-ranking .table-wrap');
  if(!wrap) return;
  
  showLoading(true);
  setLoadingText('Generando imagen...');
  
  try {
    const canvas = await html2canvas(wrap, {
      backgroundColor: '#110622',
      scale: 2
    });
    
    canvas.toBlob(async (blob) => {
      showLoading(false);
      
      if (!blob) {
        showToast('❌ Error al generar la imagen');
        return;
      }
      
      const file = new File([blob], 'clasificacion-porra.png', { type: 'image/png' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: cache.liga?.nombre || 'Clasificación',
            text: '¡Mira la clasificación de nuestra porra!',
            files: [file]
          });
          showToast('✅ Imagen compartida');
        } catch (e) {
          if (e.name !== 'AbortError') {
            downloadImage(blob, 'clasificacion-porra.png');
          }
        }
      } else {
        downloadImage(blob, 'clasificacion-porra.png');
      }
    }, 'image/png');
  } catch (e) {
    showLoading(false);
    showToast('❌ Error al procesar la imagen');
  }
}

function downloadImage(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('✅ Imagen descargada');
}

// Register Service Worker (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js?v=13')
      .catch(e => console.warn('SW error:', e));
  });
}

// Force App cache clear and update
async function forceAppUpdate() {
  showToast('🔄 Limpiando caché...');
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let reg of registrations) {
        await reg.unregister();
      }
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      for (let key of keys) {
        await caches.delete(key);
      }
    }
    showToast('✅ Caché limpia. Recargando...', 2000);
    setTimeout(() => {
      window.location.reload(true);
    }, 1000);
  } catch (err) {
    console.error('Error clearing cache:', err);
    window.location.reload(true);
  }
}

// ===================== NOTIFICACIONES =====================
function requestLocalNotifications() {
  if (!("Notification" in window)) {
    showToast("Este navegador no soporta notificaciones de escritorio.");
    return;
  }
  Notification.requestPermission().then(permission => {
    const statusEl = document.getElementById('notif-status');
    if (permission === "granted") {
      if(statusEl) { statusEl.textContent = "✅ Notificaciones activadas."; statusEl.style.color = "var(--green)"; }
      startNotificationChecker();
    } else {
      if(statusEl) { statusEl.textContent = "❌ Notificaciones denegadas."; statusEl.style.color = "var(--red)"; }
    }
  });
}

function startNotificationChecker() {
  if (window.notifInterval) clearInterval(window.notifInterval);
  window.notifInterval = setInterval(checkUpcomingMatchesForNotifs, 60000);
  checkUpcomingMatchesForNotifs();
}

function checkUpcomingMatchesForNotifs() {
  if (Notification.permission !== "granted") return;
  const now = new Date().getTime();
  const uid = getMyId();
  if (!uid) return;
  
  if (!window.notifiedMatches) window.notifiedMatches = new Set();
  
  for(const g of GRUPOS) {
    for(const m of g.partidos) {
      if (window.notifiedMatches.has(m.n)) continue;
      
      const key = `G${g.id}_${m.n}`;
      const mTime = parseMatchTime(m.fecha, m.hora);
      const diffMs = mTime - now;
      
      if (diffMs > 0 && diffMs <= 60 * 60 * 1000) {
        const pPred = ((cache.predicciones[uid] || {}).grupos || {})[key];
        if (!pPred || pPred.gl === '' || pPred.gl === undefined || pPred.gv === '' || pPred.gv === undefined) {
          new Notification("¡Partido a punto de empezar!", {
            body: `Falta menos de 1 hora para el ${m.local} vs ${m.visitante} y no tienes predicción.`,
            icon: "logo-limpio2.png"
          });
          window.notifiedMatches.add(m.n);
        }
      }
    }
  }
}

if ("Notification" in window && Notification.permission === "granted") {
  startNotificationChecker();
}
