// ===================== SUPABASE =====================
const SUPABASE_URL = 'https://ihuwoccaycdusoydfcfi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodXdvY2NheWNkdXNveWRmY2ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MDIzNTEsImV4cCI6MjA5NTI3ODM1MX0.7TlPdJDpblifVsHgvaM5fc4ZKBUjJbYgezFVI2Fqzu4';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===================== SESSION & CACHE =====================
const SESSION_KEY = 'porra2026_session_v3';
let session = null; // { liga_id, participante_id }

// Cache: field names use camelCase matching original JS code
const cache = {
  liga: null,         // { id, codigo, nombre }
  participantes: [],  // [{ id, name, emoji, avatarBg, avatarColor, isAdmin }]
  predicciones: {},   // { [pid]: { grupos:{key:{gl,gv}}, elim:{code:winner}, especiales:{tipo:valor}, especialesTs:{tipo:isoStr} } }
  resultados: { grupos:{}, elim:{}, especiales:{} },
  normas: { pts:[], normas:[] }
};

let currentViewUser = null; // participant being viewed/edited
let currentPage = 'dashboard';
let _setupMode = 'create';
let _joinLigaId = null;

// Helpers
function getAdminId(){ return cache.participantes.find(p=>p.isAdmin)?.id; }
function getMyId(){ return session?.participante_id; }
function isAdmin(){ return getMyId() === getAdminId(); }

// Convert Supabase row → JS object
function fromSbPart(row){
  return { id:row.id, name:row.nombre, photo:row.emoji, avatarBg:row.avatar_bg, avatarColor:row.avatar_color, isAdmin:row.is_admin };
}

// ===================== AVATAR HELPERS =====================
// Generates avatar HTML: photo (base64) or initials fallback
// size: 'sm'=32px, 'md'=48px, 'lg'=72px
function renderAvatarHtml(p, size='md'){
  const px = size==='sm'?32:size==='lg'?72:48;
  const adminClass = p.isAdmin ? ' is-admin' : '';
  const crown = p.isAdmin ? '<span class="av-crown">👑</span>' : '';
  const isPhoto = p.photo && p.photo.startsWith('data:image');
  const inner = isPhoto
    ? `<img class="av-img" src="${p.photo}" alt="${p.name}">`
    : `<div class="av-initials" style="background:${p.avatarBg||'rgba(123,44,191,.15)'};color:${p.avatarColor||'var(--accent)'};font-size:${Math.round(px*0.35)}px">${(p.name||'?').slice(0,2).toUpperCase()}</div>`;
  return `<div class="av-wrap${adminClass}" style="width:${px}px;height:${px}px">${inner}${crown}</div>`;
}

// Resize a File to size×size JPEG base64 using canvas
async function resizeImage(file, size=80){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = e => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        // center-crop
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Stores pending photo base64 by context key
const _pendingPhoto = {};

function triggerAvatarPick(ctx){
  document.getElementById(ctx+'-avatar-file').click();
}

async function handleAvatarFile(input, ctx){
  const file = input.files[0];
  if(!file) return;
  if(file.size > 8*1024*1024){ showToast('❌ Foto demasiado grande (máx 8 MB)'); return; }
  showToast('⏳ Procesando imagen…');
  try {
    const b64 = await resizeImage(file, 80);
    _pendingPhoto[ctx] = b64;
    // Update preview
    const preview = document.getElementById(ctx+'-avatar-preview');
    if(preview){ preview.innerHTML = `<img src="${b64}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`; }
    showToast('✅ Foto lista — guarda el perfil para aplicar');
  } catch(e){
    showToast('❌ No se pudo procesar la imagen');
  }
  input.value = '';
}

// ===================== LOAD FROM SUPABASE =====================
async function loadAllData(){
  const { liga_id } = session;
  setLoadingText('Cargando datos…');

  const { data: liga } = await sb.from('ligas').select('*').eq('id', liga_id).single();
  cache.liga = liga;

  const { data: parts } = await sb.from('participantes').select('*').eq('liga_id', liga_id).order('created_at');
  cache.participantes = (parts||[]).map(fromSbPart);

  const partIds = cache.participantes.map(p=>p.id);
  if(partIds.length > 0){
    const [gRes, eRes, spRes] = await Promise.all([
      sb.from('predicciones_grupos').select('*').in('participante_id', partIds),
      sb.from('predicciones_elim').select('*').in('participante_id', partIds),
      sb.from('predicciones_especiales').select('*').in('participante_id', partIds)
    ]);
    cache.predicciones = {};
    for(const r of (gRes.data||[])){
      if(!cache.predicciones[r.participante_id]) cache.predicciones[r.participante_id]={grupos:{},elim:{},especiales:{},especialesTs:{}};
      cache.predicciones[r.participante_id].grupos[r.match_key]={gl:r.goles_local,gv:r.goles_visitante};
    }
    for(const r of (eRes.data||[])){
      if(!cache.predicciones[r.participante_id]) cache.predicciones[r.participante_id]={grupos:{},elim:{},especiales:{},especialesTs:{}};
      cache.predicciones[r.participante_id].elim[r.match_code]=r.ganador;
    }
    for(const r of (spRes.data||[])){
      if(!cache.predicciones[r.participante_id]) cache.predicciones[r.participante_id]={grupos:{},elim:{},especiales:{},especialesTs:{}};
      cache.predicciones[r.participante_id].especiales[r.tipo]=r.valor;
      cache.predicciones[r.participante_id].especialesTs[r.tipo]=r.registrado_at;
    }
  } else { cache.predicciones={}; }

  // Resultados globales — compartidos por todas las ligas
  const { data: resData } = await sb.from('resultados_globales').select('*');
  cache.resultados = { grupos:{}, elim:{}, especiales:{} };
  for(const r of (resData||[])) { cache.resultados[r.tipo]=cache.resultados[r.tipo]||{}; cache.resultados[r.tipo][r.match_key]=r.valor; }

  const { data: normasData } = await sb.from('normas').select('*').eq('liga_id', liga_id).order('orden');
  if(normasData && normasData.length > 0){
    cache.normas = {
      pts: normasData.filter(n=>n.tipo==='pts').map(n=>n.datos),
      normas: normasData.filter(n=>n.tipo==='norma').map(n=>n.datos)
    };
  } else {
    cache.normas = { pts: JSON.parse(JSON.stringify(DEFAULT_PTS)), normas: JSON.parse(JSON.stringify(DEFAULT_NORMAS)) };
    await saveNormasToSupabase();
  }
}

async function saveNormasToSupabase(){
  await sb.from('normas').delete().eq('liga_id', session.liga_id);
  const rows = [
    ...cache.normas.pts.map((p,i)=>({ liga_id:session.liga_id, tipo:'pts', datos:p, orden:i })),
    ...cache.normas.normas.map((n,i)=>({ liga_id:session.liga_id, tipo:'norma', datos:n, orden:i }))
  ];
  if(rows.length > 0) await sb.from('normas').insert(rows);
}

// ===================== REALTIME =====================
let realtimeChannel = null;
let realtimeDebounce = null;

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

async function handleRealtime(){
  clearTimeout(realtimeDebounce);
  realtimeDebounce = setTimeout(async()=>{
    await loadAllData();
    renderPage(currentPage);
    applySidebarProfile();
  }, 600);
}

// ===================== SETUP =====================
function chooseCreate(){
  _setupMode='create';
  document.getElementById('step-0').classList.remove('active');
  document.getElementById('step-1a').classList.add('active');
  setTimeout(()=>document.getElementById('setup-liga-name').focus(), 100);
}

function chooseJoin(){
  _setupMode='join';
  document.getElementById('step-0').classList.remove('active');
  document.getElementById('step-1b').classList.add('active');
  setTimeout(()=>document.getElementById('setup-join-code').focus(), 100);
}

function backToStep0(){
  document.querySelectorAll('.setup-step').forEach(s=>s.classList.remove('active'));
  document.getElementById('step-0').classList.add('active');
}

function setupCreateStep2(){
  const name = document.getElementById('setup-liga-name').value.trim();
  if(!name){ showToast('Escribe un nombre para la liga'); return; }
  document.getElementById('step-2-label').textContent = 'Paso 2 de 2 — Tu perfil (administrador)';
  document.getElementById('step-2-badge').style.display = 'inline-flex';
  document.getElementById('step-2-badge').innerHTML = '👑 Serás el administrador';
  // Reset photo preview for new setup
  delete _pendingPhoto['setup'];
  const prev = document.getElementById('setup-avatar-preview');
  if(prev) prev.innerHTML = '<span>📷</span>';
  document.getElementById('step-2-submit').textContent = 'Crear liga 🚀';
  document.getElementById('step-1a').classList.remove('active');
  document.getElementById('step-2').classList.add('active');
  setTimeout(()=>document.getElementById('setup-admin-name').focus(), 100);
}

async function setupJoinStep2(){
  const code = document.getElementById('setup-join-code').value.trim().toUpperCase();
  if(!code){ showToast('Escribe el código de liga'); return; }
  setLoadingText('Buscando liga…'); showLoading(true);
  const { data: liga, error } = await sb.from('ligas').select('*').eq('codigo', code).single();
  showLoading(false);
  if(error || !liga){ showToast('❌ Código de liga no encontrado'); return; }
  _joinLigaId = liga.id;
  document.getElementById('step-2-label').textContent = `Unirse a "${liga.nombre}"`;
  document.getElementById('step-2-badge').style.display = 'none';
  // Reset photo preview for new setup
  delete _pendingPhoto['setup'];
  const prev = document.getElementById('setup-avatar-preview');
  if(prev) prev.innerHTML = '<span>📷</span>';
  document.getElementById('step-2-submit').textContent = 'Unirme 🚀';
  document.getElementById('step-1b').classList.remove('active');
  document.getElementById('step-2').classList.add('active');
  setTimeout(()=>document.getElementById('setup-admin-name').focus(), 100);
}

function backToStep1(){
  document.getElementById('step-2').classList.remove('active');
  document.getElementById(_setupMode==='create'?'step-1a':'step-1b').classList.add('active');
}

async function setupFinish(){
  const name = document.getElementById('setup-admin-name').value.trim();
  if(!name){ showToast('Escribe tu nombre'); return; }
  const emoji = _pendingPhoto['setup'] || null;
  setLoadingText('Creando…'); showLoading(true);

  if(_setupMode === 'create'){
    const codigo = generateLigaCode();
    const { data: liga, error: ligaErr } = await sb.from('ligas').insert({
      codigo, nombre: document.getElementById('setup-liga-name').value.trim()
    }).select().single();
    if(ligaErr){ showLoading(false); showToast('❌ Error al crear la liga'); return; }
    const c = AVATAR_COLORS[0].split('|');
    const { data: part, error: partErr } = await sb.from('participantes').insert({
      liga_id:liga.id, nombre:name, emoji, avatar_bg:c[0], avatar_color:c[1], is_admin:true
    }).select().single();
    if(partErr){ showLoading(false); showToast('❌ Error al crear el perfil'); return; }
    session = { liga_id:liga.id, participante_id:part.id };
  } else {
    const liga_id = _joinLigaId;
    const { data: existing } = await sb.from('participantes').select('*').eq('liga_id', liga_id).eq('nombre', name).maybeSingle();
    let partId;
    if(existing){
      partId = existing.id;
      showToast('👋 ¡Bienvenido de nuevo, '+name+'!');
    } else {
      const { data: allParts } = await sb.from('participantes').select('id').eq('liga_id', liga_id);
      const c = AVATAR_COLORS[(allParts?.length||0) % AVATAR_COLORS.length].split('|');
      const { data: part, error: partErr } = await sb.from('participantes').insert({
        liga_id, nombre:name, emoji, avatar_bg:c[0], avatar_color:c[1], is_admin:false
      }).select().single();
      if(partErr){ showLoading(false); showToast('❌ Error al unirse'); return; }
      partId = part.id;
    }
    session = { liga_id, participante_id:partId };
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  currentViewUser = session.participante_id;
  await loadAllData();
  setupRealtime();
  showApp();
}

function generateLigaCode(){
  const words = ['MUNDIAL','PORRA','FUTBOL','GOLES','COPA'];
  return words[Math.floor(Math.random()*words.length)]+'-'+Math.floor(1000+Math.random()*9000);
}

// ===================== APP SHELL =====================
function showLoading(v){ document.getElementById('loading-overlay').classList.toggle('hidden',!v); }
function setLoadingText(t){ document.getElementById('loading-text').textContent=t; }

function showSetup(){
  document.getElementById('setup-screen').classList.remove('hidden');
  showLoading(false);
}

function openCustomSpecialModal(){ document.getElementById('modal-custom-special').classList.add('open'); }
function closeCustomSpecialModal(){ document.getElementById('modal-custom-special').classList.remove('open'); }
async function saveCustomSpecialDef(){
  const title=document.getElementById('cs-title').value.trim();
  const icon=document.getElementById('cs-icon').value.trim()||'?';
  const pts=parseInt(document.getElementById('cs-pts').value)||10;
  if(!title) return;
  const id='cs_'+Date.now();
  const res = await sb.from('normas').insert({ liga_id:cache.liga.id, tipo:'special_custom', datos:{ id, titulo:title, icono:icon, puntos:pts, resultado:'' }, orden:99 });
  if(!res.error){ closeCustomSpecialModal(); await loadAllData(); renderEspeciales(); }
}

function openSpecialResultModal(id, title, result){
  document.getElementById('sr-title-label').textContent=title;
  document.getElementById('sr-val').value=result;
  document.getElementById('sr-id').value=id;
  document.getElementById('modal-special-result').classList.add('open');
}
function closeSpecialResultModal(){ document.getElementById('modal-special-result').classList.remove('open'); }
async function saveCustomSpecialResult(){
  const id=document.getElementById('sr-id').value;
  const val=document.getElementById('sr-val').value.trim();
  const norma=cache.normas.find(n=>n.id===id);
  if(!norma) return;
  norma.datos.resultado=val;
  const res = await sb.from('normas').update({datos:norma.datos}).eq('id',id);
  if(!res.error){ closeSpecialResultModal(); await loadAllData(); renderEspeciales(); renderDashboard(); renderRanking(); }
}

function showApp(){
  document.getElementById('setup-screen').classList.add('hidden');
  showLoading(false);
  applySidebarProfile();
  renderDashboard();
  renderGruposTorneo();
  currentPage = 'dashboard';
}

function applySidebarProfile(){
  const ligaName = cache.liga?.nombre || 'Mundial 2026';
  document.getElementById('sidebar-liga-name').textContent = ligaName;
  document.title = ligaName+' — Porra';
  const el = document.getElementById('dash-title');
  if(el) el.textContent = '⚽ '+ligaName;
  const codeEl = document.getElementById('sidebar-liga-code');
  if(codeEl) codeEl.textContent = cache.liga?.codigo || '—';
  const me = cache.participantes.find(p=>p.id===getMyId());
  if(me){
    const wrap = document.getElementById('sidebar-avatar-wrap');
    if(wrap) wrap.innerHTML = renderAvatarHtml(me, 'sm');
    document.getElementById('sidebar-username').textContent = me.name;
    document.getElementById('sidebar-role').innerHTML = isAdmin() ? '<span class="realtime-dot"></span>👑 Admin' : '<span class="realtime-dot"></span>En vivo';
  }
}

function copyLigaCode(e){
  if(e) e.stopPropagation();
  const code = cache.liga?.codigo;
  if(!code) return;
  navigator.clipboard.writeText(code).then(()=>showToast('📋 Código copiado: '+code)).catch(()=>showToast('Código: '+code));
}

// ===================== NAV =====================
function goto(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const el = document.getElementById('page-'+page);
  if(el) el.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b=>{ if(b.getAttribute('onclick')==="goto('"+page+"')") b.classList.add('active'); });
  currentPage = page;
  renderPage(page);
}

function renderPage(page){
  const map = {
    dashboard:renderDashboard, ranking:renderRanking, participantes:renderParticipants,
    'grupos-pred':renderGruposPred, 'eliminatorias-pred':renderElimPred, especiales:renderEspeciales,
    'grupos-torneo':renderGruposTorneo, normas:renderNormas, config:renderConfig
  };
  if(map[page]) map[page]();
}

// ===================== SCORING =====================
function calcScore(uid){
  const preds = cache.predicciones[uid] || {};
  let grupos=0, r32=0, octavos=0, cuartos=0, semis=0, final_=0, campeon_=0, sub=0, customPts=0;
  const gPreds = preds.grupos||{}, gRes = cache.resultados.grupos||{};
  for(const key in gPreds){
    const p=gPreds[key], r=gRes[key];
    if(!r||r.gl===''||r.gl===undefined) continue;
    const pg=parseInt(p.gl), pv=parseInt(p.gv), rg=parseInt(r.gl), rv=parseInt(r.gv);
    if(pg===rg&&pv===rv){ grupos+=3; continue; }
    const pw=pg>pv?'L':pg<pv?'V':'D', rw=rg>rv?'L':rg<rv?'V':'D';
    if(pw===rw) grupos+=1;
  }
  const ePreds=preds.elim||{}, eRes=cache.resultados.elim||{};
  for(const code in ePreds){
    const w=ePreds[code], r=eRes[code];
    if(!r||!w) continue;
    const m=parseInt(code.replace('M',''));
    if(m>=73&&m<=88&&w===r) r32+=4;
    else if(m>=89&&m<=96&&w===r) octavos+=5;
    else if(m>=97&&m<=100&&w===r) cuartos+=6;
    else if((m===101||m===102)&&w===r) semis+=8;
    else if(m===104&&w===r) final_+=10;
  }
  const esp=preds.especiales||{}, re=cache.resultados.especiales||{};
  if(esp.campeon&&re.campeon&&esp.campeon===re.campeon) campeon_+=20;
  if(esp.subcampeon&&re.subcampeon&&esp.subcampeon===re.subcampeon) sub+=12;
  
  (cache.normas||[]).forEach(n=>{
    if(n.tipo==='special_custom'){
      const d=n.datos;
      if(d.resultado && esp[d.id] && esp[d.id].toLowerCase()===d.resultado.toLowerCase()){
        customPts += parseInt(d.puntos)||0;
      }
    }
  });

  return {grupos,r32,octavos,cuartos,semis,final:final_,campeon:campeon_,sub,customPts,total:grupos+r32+octavos+cuartos+semis+final_+campeon_+sub+customPts};
}

// ===================== DASHBOARD =====================
function renderDashboard(){
  document.getElementById('dash-participantes').textContent = cache.participantes.length;
  applySidebarProfile();
  const scores = cache.participantes.map(p=>({...p,...calcScore(p.id)})).sort((a,b)=>b.total-a.total);
  const tbody = document.getElementById('dashboard-ranking-body');
  if(!tbody) return;
  if(!scores.length){
    tbody.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:28px">Añade participantes para ver la clasificación</td></tr>';
  } else {
    tbody.innerHTML = scores.map((p,i)=>{
      const pos=i+1, bc=pos===1?'pos-1':pos===2?'pos-2':pos===3?'pos-3':'pos-n';
      const youMark=p.id===getMyId()?'<span class="you-badge">yo</span>':'';
      const adminMark=p.isAdmin?'<span class="admin-tag">👑</span>':'';
      return `<tr><td><span class="pos-badge ${bc}">${pos}</span></td><td class="name-col">${p.name}${youMark}${adminMark}</td><td class="pts-col">${p.grupos}</td><td>${p.r32+p.octavos+p.cuartos+p.semis+p.final}</td><td style="color:var(--accent2)">${p.campeon}</td><td class="pts-col" style="font-size:18px">${p.total}</td></tr>`;
    }).join('');
  }
  renderNextMatches();
}

function renderNextMatches(){
  const c = document.getElementById('next-matches-list');
  if(!c) return;
  const matches = GRUPOS.flatMap(g=>g.partidos.map(m=>({...m,grupo:g.id}))).slice(0,4);
  c.innerHTML = matches.map(m=>{
    const key=`G${m.grupo}_${m.n}`;
    const res=(cache.resultados.grupos||{})[key];
    const hasRes=res&&res.gl!==''&&res.gl!==undefined;
    return `<div class="match-row"><div class="match-meta"><div class="match-date">${m.fecha}</div><div class="match-time">${m.hora}</div><div style="font-size:10px;color:var(--text3)">Grupo ${m.grupo}</div></div><div class="team-block"><div class="team-name-match">${m.local}</div></div><div class="score-center">${hasRes?`<div class="score-display">${res.gl}–${res.gv}</div>`:'<div class="score-vs">VS</div>'}<div class="sede">${m.sede}</div></div><div class="team-block right"><div class="team-name-match">${m.visitante}</div></div><div class="pred-block">${renderPredInputsHtml(key)}</div></div>`;
  }).join('');
}

// ===================== RANKING =====================
function renderRanking(){
  const scores = cache.participantes.map(p=>({...p,...calcScore(p.id)})).sort((a,b)=>b.total-a.total);
  const tbody = document.getElementById('full-ranking-body');
  if(!tbody) return;
  if(!scores.length){ tbody.innerHTML='<tr><td colspan="11" style="text-align:center;color:var(--text3);padding:28px">Sin participantes</td></tr>'; return; }
  tbody.innerHTML = scores.map((p,i)=>{
    const pos=i+1, bc=pos===1?'pos-1':pos===2?'pos-2':pos===3?'pos-3':'pos-n';
    const youMark=p.id===getMyId()?'<span class="you-badge">yo</span>':'';
    const adminMark=p.isAdmin?'<span class="admin-tag">👑</span>':'';
    return `<tr><td><span class="pos-badge ${bc}">${pos}</span></td><td class="name-col">${p.name}${youMark}${adminMark}</td><td class="pts-col">${p.grupos}</td><td>${p.r32}</td><td>${p.octavos}</td><td>${p.cuartos}</td><td>${p.semis}</td><td>${p.final}</td><td style="color:var(--accent2)">${p.campeon}</td><td>${p.sub}</td><td class="pts-col" style="font-size:18px">${p.total}</td></tr>`;
  }).join('');
}

// ===================== PARTICIPANTS =====================
function openAddParticipant(){
  if(!isAdmin()){ showToast('Solo el admin puede añadir participantes'); return; }
  document.getElementById('add-name').value='';
  // Reset photo preview
  delete _pendingPhoto['add'];
  const prev = document.getElementById('add-avatar-preview');
  if(prev) prev.innerHTML = '<span>📷</span>';
  document.getElementById('modal-add').classList.add('open');
  setTimeout(()=>document.getElementById('add-name').focus(),100);
}

async function addParticipant(){
  const name = document.getElementById('add-name').value.trim();
  if(!name){ showToast('Escribe un nombre'); return; }
  const emoji = _pendingPhoto['add'] || null;
  const c = AVATAR_COLORS[cache.participantes.length % AVATAR_COLORS.length].split('|');
  const { data, error } = await sb.from('participantes').insert({
    liga_id:session.liga_id, nombre:name, emoji, avatar_bg:c[0], avatar_color:c[1], is_admin:false
  }).select().single();
  if(error){ showToast('❌ Error: '+(error.message||'Error desconocido')); return; }
  cache.participantes.push(fromSbPart(data));
  delete _pendingPhoto['add'];
  closeModal('modal-add');
  showToast('✅ '+name+' añadido');
  renderDashboard();
}

function renderParticipants(){
  const grid = document.getElementById('participants-grid');
  const empty = document.getElementById('no-participants');
  if(!grid) return;
  if(!cache.participantes.length){ grid.innerHTML=''; if(empty) empty.style.display='block'; return; }
  if(empty) empty.style.display='none';
  const scores = cache.participantes.map(p=>({...p,...calcScore(p.id)})).sort((a,b)=>b.total-a.total);
  grid.innerHTML = scores.map((p,i)=>{
    const esp=((cache.predicciones[p.id]||{}).especiales)||{};
    const youMark=p.id===getMyId()?'<span class="you-badge">yo</span>':'';
    const delBtn=isAdmin()&&!p.isAdmin?`<button class="btn btn-danger btn-sm btn-icon" style="position:absolute;bottom:12px;right:12px" onclick="event.stopPropagation();deleteParticipant('${p.id}')" title="Eliminar">✕</button>`:'';
    return `<div class="participant-card" onclick="openParticipantModal('${p.id}')" style="padding-top:20px">` +
      `${renderAvatarHtml(p,'md')}` +
      `<div class="p-name" style="margin-top:8px">${p.name} ${youMark}</div><div class="p-pts">${p.total} <span style="font-size:13px;font-weight:400;color:var(--text3)">pts</span></div><div class="p-sub">#${i+1} en el ranking</div>${esp.campeon?`<div class="p-champ">🏆 ${esp.campeon}</div>`:'<div class="p-champ" style="color:var(--text3)">Sin campeón aún</div>'}${delBtn}</div>`;
  }).join('');
}

async function deleteParticipant(uid){
  if(!confirm('¿Eliminar a este participante y todas sus predicciones?')) return;
  const { error } = await sb.from('participantes').delete().eq('id', uid);
  if(error){ showToast('❌ Error al eliminar'); return; }
  cache.participantes = cache.participantes.filter(p=>p.id!==uid);
  delete cache.predicciones[uid];
  if(currentViewUser===uid) currentViewUser=getMyId();
  renderParticipants();
  showToast('Participante eliminado');
}

function openParticipantModal(uid){
  const p = cache.participantes.find(x=>x.id===uid);
  if(!p) return;
  const s = calcScore(uid);
  document.getElementById('modal-p-title').textContent=`${p.name} — ${s.total} pts`;
  document.getElementById('modal-p-content').innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      <div class="stat-card" style="padding:13px"><div class="stat-label">Grupos</div><div class="stat-val gold">${s.grupos}</div></div>
      <div class="stat-card" style="padding:13px"><div class="stat-label">Eliminatorias</div><div class="stat-val">${s.r32+s.octavos+s.cuartos+s.semis+s.final}</div></div>
      <div class="stat-card" style="padding:13px"><div class="stat-label">Campeón</div><div class="stat-val">${s.campeon}</div></div>
      <div class="stat-card" style="padding:13px"><div class="stat-label">TOTAL</div><div class="stat-val gold">${s.total}</div></div>
    </div>
    <button class="btn btn-accent btn-full" onclick="setPredUser('${uid}');closeModal('modal-participant');goto('grupos-pred')">Introducir predicciones de ${p.name}</button>
  `;
  document.getElementById('modal-participant').classList.add('open');
}

function setPredUser(uid){ currentViewUser=uid; }

// ===================== PRED GRUPOS =====================
function renderGruposPred(){
  const c = document.getElementById('grupos-pred-content');
  if(!c) return;
  document.getElementById('pred-user-selector').innerHTML = renderUserSelector('switchPredUser');
  if(!cache.participantes.length){ c.innerHTML='<div class="empty-state"><div class="ei">👥</div><p>Añade participantes primero.</p></div>'; return; }
  let html='';
  GRUPOS.forEach(g=>{
    html+=`<div class="matches-section"><div class="section-title">Grupo ${g.id} <span style="font-size:13px;color:var(--text2);font-family:Barlow,sans-serif">· ${g.equipos.join(' · ')}</span></div>`;
    g.partidos.forEach(m=>{
      const key=`G${g.id}_${m.n}`, res=(cache.resultados.grupos||{})[key];
      const hasRes=res&&res.gl!==''&&res.gl!==undefined;
      const uid=currentViewUser, preds=uid?(((cache.predicciones[uid]||{}).grupos||{})[key]):null;
      let predHtml='';
      if(preds&&preds.gl!==''&&preds.gl!==undefined){
        let cls='pred-partial',label='Ganador ✓',pts='+1 pt';
        if(hasRes){
          if(parseInt(preds.gl)===parseInt(res.gl)&&parseInt(preds.gv)===parseInt(res.gv)){cls='pred-exact';label='¡Exacto! 🎯';pts='+3 pts';}
          else{const pw=parseInt(preds.gl)>parseInt(preds.gv)?'L':parseInt(preds.gl)<parseInt(preds.gv)?'V':'D';const rw=parseInt(res.gl)>parseInt(res.gv)?'L':parseInt(res.gl)<parseInt(res.gv)?'V':'D';if(pw!==rw){cls='pred-wrong';label='Fallo ✗';pts='0 pts';}}
        }
        predHtml=`<span class="${cls}">${preds.gl}–${preds.gv} ${label}<span class="pts-earned">${pts}</span></span>`;
      } else { predHtml=renderPredInputsHtml(key); }
      html+=`<div class="match-row"><div class="match-meta"><div class="match-date">${m.fecha}</div><div class="match-time">${m.hora}</div></div><div class="team-block"><div class="team-name-match">${m.local}</div></div><div class="score-center">${hasRes?`<div class="score-display">${res.gl}–${res.gv}</div>`:'<div class="score-vs">VS</div>'}<div class="sede">${m.sede}</div></div><div class="team-block right"><div class="team-name-match">${m.visitante}</div></div><div class="pred-block"><div class="pred-label">Tu predicción</div>${predHtml}</div></div>`;
    });
    html+='</div>';
  });
  c.innerHTML=html;
}

function renderPredInputsHtml(key){
  const uid=currentViewUser;
  if(!uid) return '<span style="font-size:11px;color:var(--text3)">Selecciona usuario</span>';
  const saved=((cache.predicciones[uid]||{}).grupos||{})[key];
  const isSaved=saved&&saved.gl!==''&&saved.gl!==undefined;
  return `<div class="pred-inputs"><input class="pred-inp" type="number" min="0" max="20" id="pi_${key}_l" value="${isSaved?saved.gl:''}" placeholder="–" ${isSaved?'disabled':''}><span class="pred-sep">–</span><input class="pred-inp" type="number" min="0" max="20" id="pi_${key}_v" value="${isSaved?saved.gv:''}" placeholder="–" ${isSaved?'disabled':''}><button class="pred-save ${isSaved?'saved':''}" id="psb_${key}" onclick="savePredGrupo('${key}')" ${isSaved?'disabled':''}>✓</button></div>`;
}

function fireConfetti() {
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#c77dff', '#e0b3ff', '#00d13b']
    });
  }
}

async function savePredGrupo(key){
  const uid=currentViewUser;
  if(!uid){ showToast('Selecciona un participante primero'); return; }
  const l=document.getElementById('pi_'+key+'_l'), v=document.getElementById('pi_'+key+'_v');
  if(!l||!v||l.value===''||v.value===''){ showToast('Introduce el marcador'); return; }
  const gl=parseInt(l.value), gv=parseInt(v.value);
  // Optimistic UI update
  if(!cache.predicciones[uid]) cache.predicciones[uid]={grupos:{},elim:{},especiales:{},especialesTs:{}};
  cache.predicciones[uid].grupos[key]={gl,gv};
  l.disabled=true; v.disabled=true;
  const btn=document.getElementById('psb_'+key);
  if(btn){ btn.classList.add('saved'); btn.disabled=true; }
  const { error } = await sb.from('predicciones_grupos').upsert({ participante_id:uid, match_key:key, goles_local:gl, goles_visitante:gv },{ onConflict:'participante_id,match_key' });
  if(error){ showToast('❌ Error al guardar'); } else { showToast('✅ Predicción guardada'); fireConfetti(); }
}

// ===================== PRED ELIM =====================
function renderElimPred(){
  const c=document.getElementById('elim-pred-content');
  if(!c) return;
  document.getElementById('pred-user-selector-elim').innerHTML=renderUserSelector('switchPredUserElim');
  if(!cache.participantes.length){ c.innerHTML='<div class="empty-state"><div class="ei">👥</div><p>Añade participantes primero.</p></div>'; return; }
  let html='';
  ELIM_PHASES.forEach(phase=>{
    html+=`<div class="bracket-phase"><div class="bracket-phase-title">${phase.name}</div>`;
    phase.partidos.forEach(m=>{
      const uid=currentViewUser, preds=uid?(((cache.predicciones[uid]||{}).elim||{})[m.code]):null;
      const res=(cache.resultados.elim||{})[m.code];
      html+=`<div class="elim-row"><div class="match-code">${m.code}<br><span style="font-size:10px;color:var(--text3)">${m.fecha}</span></div><div class="elim-team">${m.local}</div><div class="elim-vs">${res||'VS'}</div><div class="elim-team" style="text-align:right">${m.visitante}</div><div class="elim-winner-block"><span class="elim-winner-label">Ganador:</span><select class="winner-select ${preds?'chosen':''}" onchange="savePredElim('${m.code}',this.value)"><option value="">—</option><option value="${m.local}" ${preds===m.local?'selected':''}>${m.local}</option><option value="${m.visitante}" ${preds===m.visitante?'selected':''}>${m.visitante}</option></select></div></div>`;
    });
    html+='</div>';
  });
  c.innerHTML=html;
}

async function savePredElim(code, winner){
  const uid=currentViewUser;
  if(!uid){ showToast('Selecciona un participante primero'); return; }
  if(!cache.predicciones[uid]) cache.predicciones[uid]={grupos:{},elim:{},especiales:{},especialesTs:{}};
  cache.predicciones[uid].elim[code]=winner;
  const { error } = await sb.from('predicciones_elim').upsert({ participante_id:uid, match_code:code, ganador:winner },{ onConflict:'participante_id,match_code' });
  if(error){ showToast('❌ Error al guardar'); } else { showToast('✅ Predicción guardada'); fireConfetti(); }
}

// ===================== ESPECIALES =====================
const TORNEO_START = new Date('2026-06-11T19:00:00Z');

function renderEspeciales(){
  document.getElementById('pred-user-selector-esp').innerHTML=renderUserSelector('switchPredUserEsp');
  const opts=ALL_TEAMS.map(t=>`<option value="${t}">${t}</option>`).join('');
  const matchOpts=GRUPOS.flatMap(g=>g.partidos.map(m=>`<option value="${m.local} vs ${m.visitante}">${m.local} vs ${m.visitante} (Gr. ${g.id})</option>`)).join('');
  ['select-campeon','select-subcampeon','select-tercero'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){const cur=el.value;el.innerHTML='<option value="">— Elige —</option>'+opts;el.value=cur;}
  });
  ['select-mas-goles','select-mas-tarjetas'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){const cur=el.value;el.innerHTML='<option value="">— Elige el partido —</option>'+matchOpts;el.value=cur;}
  });

  const uid=currentViewUser;
  const adminMode = isAdmin();
  const csa = document.getElementById('custom-specials-admin');
  if(csa) csa.innerHTML = adminMode ? '<button class="btn btn-accent btn-sm" onclick="openCustomSpecialModal()">+ Añadir Pregunta Personalizada</button>' : '';

  if(uid){
    const esp=((cache.predicciones[uid]||{}).especiales)||{};
    const ts=((cache.predicciones[uid]||{}).especialesTs)||{};
    if(esp.campeon) document.getElementById('select-campeon').value=esp.campeon;
    if(esp.subcampeon) document.getElementById('select-subcampeon').value=esp.subcampeon;
    if(esp.pichichi) document.getElementById('input-pichichi').value=esp.pichichi;
    if(esp.tercero) document.getElementById('select-tercero').value=esp.tercero;
    if(esp.masGoles) document.getElementById('select-mas-goles').value=esp.masGoles;
    if(esp.masTarjetas) document.getElementById('select-mas-tarjetas').value=esp.masTarjetas;
    ['campeon','subcampeon','pichichi','tercero','masGoles','masTarjetas'].forEach(k=>renderSpecialTimestamp(k,ts[k]));
  } else {
    ['campeon','subcampeon','pichichi','tercero','masGoles','masTarjetas'].forEach(k=>{
      const el=document.getElementById('ts-'+k);
      if(el){el.className='pred-timestamp empty';el.innerHTML='';}
    });
  }

  const customGrid = document.getElementById('custom-special-grid');
  if(customGrid){
    const customs = cache.normas.filter(n=>n.tipo==='special_custom');
    customGrid.innerHTML = customs.map(n=>{
      const d = n.datos;
      const key = d.id;
      const esp = uid && cache.predicciones[uid] && cache.predicciones[uid].especiales ? cache.predicciones[uid].especiales : {};
      const tsVal = uid && cache.predicciones[uid] && cache.predicciones[uid].especialesTs ? cache.predicciones[uid].especialesTs[key] : null;
      let adminControls = '';
      if(adminMode){
        adminControls = `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border2);font-size:11px">
          <div style="color:var(--text3);margin-bottom:4px">Respuesta correcta: <strong style="color:var(--text)">${d.resultado||'No definida'}</strong></div>
          <button class="btn btn-sm" onclick="openSpecialResultModal('${n.id}','${d.titulo.replace(/'/g,"\\'")}','${(d.resultado||'').replace(/'/g,"\\'")}')">Establecer resultado</button>
        </div>`;
      }
      return `<div class="special-card">
        <div class="special-icon">${d.icono}</div>
        <div class="special-label">${d.titulo}</div>
        <div style="font-size:12px;color:var(--text3);margin-bottom:6px">Acierto: <strong style="color:var(--accent)">+${d.puntos} pts</strong></div>
        <input class="form-input" placeholder="Tu respuesta..." style="margin-top:5px" value="${esp[key]||''}" onblur="saveSpecial('${key}',this.value)">
        <div class="pred-timestamp empty" id="ts-${key}"></div>
        ${adminControls}
      </div>`;
    }).join('');
    
    customs.forEach(n=>{
      const key = n.datos.id;
      const tsVal = uid && cache.predicciones[uid] && cache.predicciones[uid].especialesTs ? cache.predicciones[uid].especialesTs[key] : null;
      renderSpecialTimestamp(key, tsVal);
    });
  }
}

function renderSpecialTimestamp(key, isoStr){
  const tsEl=document.getElementById('ts-'+key);
  if(!tsEl) return;
  if(!isoStr){tsEl.className='pred-timestamp empty';tsEl.innerHTML='';return;}
  const date=new Date(isoStr);
  const isValid=date<TORNEO_START;
  const fmt=date.toLocaleString('es-ES',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  tsEl.className='pred-timestamp '+(isValid?'valid':'invalid');
  tsEl.innerHTML=(isValid?'✅ Registrado':'⚠️ Fuera de plazo')+` · ${fmt}`;
}

async function saveSpecial(type, value){
  const uid=currentViewUser;
  if(!uid){ showToast('Selecciona un participante primero'); return; }
  if(!value) return;
  if(!cache.predicciones[uid]) cache.predicciones[uid]={grupos:{},elim:{},especiales:{},especialesTs:{}};
  const isNew=!cache.predicciones[uid].especiales[type];
  cache.predicciones[uid].especiales[type]=value;
  let error;
  if(isNew){
    const ts=new Date().toISOString();
    cache.predicciones[uid].especialesTs[type]=ts;
    const res=await sb.from('predicciones_especiales').insert({ participante_id:uid, tipo:type, valor:value, registrado_at:ts });
    error=res.error;
  } else {
    const res=await sb.from('predicciones_especiales').update({valor:value}).eq('participante_id',uid).eq('tipo',type);
    error=res.error;
  }
  renderSpecialTimestamp(type, cache.predicciones[uid].especialesTs[type]);
  if(!error) { showToast('✅ Guardado'); fireConfetti(); }
}

// ===================== GRUPOS TORNEO =====================
function renderGruposTorneo(){
  const c=document.getElementById('grupos-torneo-content');
  if(!c) return;

  // Calculate actual standings
  const standings = {};
  GRUPOS.forEach(g => {
    standings[g.id] = g.equipos.map(eq => ({ name: eq, pj: 0, pts: 0, gf: 0, gc: 0, gd: 0 }));
    g.partidos.forEach(m => {
      const key = `G${g.id}_${m.n}`;
      const res = cache.resultados.grupos[key];
      if (res && res.gl !== '' && res.gv !== '' && res.gl !== undefined) {
        const gl = parseInt(res.gl);
        const gv = parseInt(res.gv);
        const local = standings[g.id].find(e => e.name === m.local);
        const visitor = standings[g.id].find(e => e.name === m.visitante);
        if (local && visitor) {
          local.pj++; visitor.pj++;
          local.gf += gl; visitor.gf += gv;
          local.gc += gv; visitor.gc += gl;
          local.gd = local.gf - local.gc;
          visitor.gd = visitor.gf - visitor.gc;
          if (gl > gv) { local.pts += 3; } else if (gl < gv) { visitor.pts += 3; } else { local.pts += 1; visitor.pts += 1; }
        }
      }
    });
    // Sort: Pts > GD > GF
    standings[g.id].sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    });
  });

  c.innerHTML=GRUPOS.map(g=>`
    <div class="group-card">
      <div class="group-card-header"><div class="group-letter">${g.id}</div><div class="group-name">Grupo ${g.id}</div></div>
      <table class="group-table">
        <thead><tr><th>Equipo</th><th style="text-align:center">PJ</th><th style="text-align:center">GD</th><th style="text-align:center">Pts</th></tr></thead>
        <tbody>
          ${standings[g.id].map((eq,i)=>`<tr style="position:relative">
            ${i<2?'<td style="padding-left:14px;position:relative"><span style="position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--green)"></span>':'<td>'}
              <div class="flag-name"><span class="team-flag-sm">⚽</span>${eq.name}</div></td>
            <td style="color:var(--text3);font-size:12px;text-align:center">${eq.pj}</td>
            <td style="color:var(--text3);font-size:12px;text-align:center">${eq.gd > 0 ? '+'+eq.gd : eq.gd}</td>
            <td style="color:var(--accent);font-weight:700;font-size:13px;text-align:center">${eq.pts}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`).join('');
}

// ===================== NORMAS =====================
function renderNormas(){
  const n=cache.normas;
  const adminMode=isAdmin();
  const ptsAdminBtn=document.getElementById('pts-admin-btn');
  const normasAddBtn=document.getElementById('normas-add-btn');
  const normasTopBtn=document.getElementById('normas-admin-btn');
  const ptsTh=document.getElementById('pts-th-actions');
  if(ptsAdminBtn) ptsAdminBtn.innerHTML=adminMode?`<button class="btn btn-sm btn-accent" onclick="toggleNewPtsRow()">+ Añadir fila</button>`:'';
  if(normasAddBtn) normasAddBtn.innerHTML=adminMode?`<button class="btn btn-sm btn-accent" onclick="toggleNewNormaRow()">+ Añadir norma</button>`:'';
  if(normasTopBtn) normasTopBtn.innerHTML=adminMode?`<span class="chip chip-admin">👑 Modo admin</span>`:'';
  if(ptsTh) ptsTh.innerHTML=adminMode?'Acciones':'';
  const tbody=document.getElementById('pts-tbody');
  if(tbody){
    tbody.innerHTML=n.pts.map((row,i)=>`<tr><td>${row.fase}</td><td>${row.desc}</td><td><span class="pts-badge" style="${row.pts===0?'background:rgba(239,68,68,.1);color:var(--red)':''}">${row.pts}</span></td>${adminMode?`<td><div style="display:flex;gap:5px"><button class="btn btn-sm btn-icon" onclick="editPtsRow(${i})" title="Editar">✏️</button><button class="btn btn-danger btn-sm btn-icon" onclick="deletePtsRow(${i})" title="Eliminar">✕</button></div></td>`:''}</tr>`).join('');
  }
  const normasList=document.getElementById('normas-list');
  if(normasList){
    normasList.innerHTML=n.normas.map((norma,i)=>`<div class="rule-item" id="norma-item-${i}"><span class="rule-num">${i+1}</span><div style="flex:1;min-width:0" id="norma-text-${i}"><strong>${norma.title}:</strong> ${norma.desc}</div>${adminMode?`<div class="rule-actions"><button class="btn btn-sm btn-icon" onclick="editNorma(${i})" title="Editar">✏️</button><button class="btn btn-danger btn-sm btn-icon" onclick="deleteNorma(${i})" title="Eliminar">✕</button></div>`:''}</div>`).join('');
  }
}

function toggleNewPtsRow(){const row=document.getElementById('new-pts-row');row.style.display=row.style.display==='none'?'block':'none';if(row.style.display!=='none') document.getElementById('new-pts-fase').focus();}
function toggleNewNormaRow(){const row=document.getElementById('new-norma-row');row.style.display=row.style.display==='none'?'block':'none';if(row.style.display!=='none') document.getElementById('new-norma-title').focus();}

async function addPtsRow(){
  const fase=document.getElementById('new-pts-fase').value.trim();
  const desc=document.getElementById('new-pts-desc').value.trim();
  const pts=parseInt(document.getElementById('new-pts-pts').value)||0;
  if(!fase||!desc){showToast('Rellena todos los campos');return;}
  cache.normas.pts.push({fase,desc,pts});
  await saveNormasToSupabase(); renderNormas(); showToast('✅ Fila añadida');
}
async function deletePtsRow(i){cache.normas.pts.splice(i,1);await saveNormasToSupabase();renderNormas();showToast('Fila eliminada');}
async function editPtsRow(i){
  const row=cache.normas.pts[i];
  const nf=prompt('Fase:',row.fase);if(nf===null)return;
  const nd=prompt('Descripción:',row.desc);if(nd===null)return;
  const np=prompt('Puntos:',row.pts);if(np===null)return;
  cache.normas.pts[i]={fase:nf.trim(),desc:nd.trim(),pts:parseInt(np)||0};
  await saveNormasToSupabase();renderNormas();showToast('✅ Actualizado');
}
async function addNorma(){
  const title=document.getElementById('new-norma-title').value.trim();
  const desc=document.getElementById('new-norma-desc').value.trim();
  if(!title||!desc){showToast('Rellena título y descripción');return;}
  cache.normas.normas.push({title,desc});
  await saveNormasToSupabase();renderNormas();showToast('✅ Norma añadida');
}
async function deleteNorma(i){cache.normas.normas.splice(i,1);await saveNormasToSupabase();renderNormas();showToast('Norma eliminada');}
async function editNorma(i){
  const n=cache.normas.normas[i];
  const nt=prompt('Título:',n.title);if(nt===null)return;
  const nd=prompt('Descripción:',n.desc);if(nd===null)return;
  cache.normas.normas[i]={title:nt.trim(),desc:nd.trim()};
  await saveNormasToSupabase();renderNormas();showToast('✅ Actualizado');
}

// ===================== CONFIG =====================
function renderConfig(){
  document.getElementById('config-liga-name').value=cache.liga?.nombre||'';
  const codeEl=document.getElementById('config-liga-code-display');
  if(codeEl) codeEl.textContent=cache.liga?.codigo||'—';
  const me=cache.participantes.find(p=>p.id===getMyId());
  if(me){
    document.getElementById('config-my-name').value=me.name||'';
    // Show current photo preview in config
    const prev=document.getElementById('config-avatar-preview');
    if(prev){
      if(me.photo && me.photo.startsWith('data:image')){
        prev.innerHTML=`<img src="${me.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
      } else {
        prev.innerHTML='<span>📷</span>';
      }
    }
  }
  const admin=cache.participantes.find(p=>p.isAdmin);
  if(admin){ document.getElementById('config-admin-avatar').innerHTML=renderAvatarHtml(admin,'sm'); document.getElementById('config-admin-name').textContent=admin.name; }
  const adminSection=document.getElementById('admin-section');
  if(adminSection) adminSection.style.display=isAdmin()?'block':'none';
  const transferSel=document.getElementById('config-transfer-admin');
  if(transferSel){ transferSel.innerHTML='<option value="">— Selecciona participante —</option>'+cache.participantes.filter(p=>!p.isAdmin).map(p=>`<option value="${p.id}">${p.name}</option>`).join(''); }

  // Generate QR Code
  const qrContainer = document.getElementById('qrcode-container');
  if(qrContainer && cache.liga?.codigo) {
    qrContainer.innerHTML = '';
    const inviteUrl = window.location.origin + '?code=' + cache.liga.codigo;
    new QRCode(qrContainer, {
      text: inviteUrl,
      width: 150,
      height: 150,
      colorDark : "#05020a",
      colorLight : "#ffffff",
      correctLevel : QRCode.CorrectLevel.H
    });
    const codeText = document.createElement('div');
    codeText.style.textAlign = 'center';
    codeText.style.marginTop = '10px';
    codeText.style.fontWeight = 'bold';
    codeText.style.color = '#05020a';
    codeText.textContent = cache.liga.codigo;
    qrContainer.appendChild(codeText);
  }
}

async function saveLigaName(){
  const v=document.getElementById('config-liga-name').value.trim();
  if(!v){showToast('Escribe un nombre');return;}
  const { error }=await sb.from('ligas').update({nombre:v}).eq('id',session.liga_id);
  if(error){showToast('❌ Error');return;}
  cache.liga.nombre=v; applySidebarProfile(); showToast('✅ Nombre guardado');
}

async function saveMyProfile(){
  const name=document.getElementById('config-my-name').value.trim();
  if(!name){showToast('Escribe tu nombre');return;}
  const me=cache.participantes.find(p=>p.id===getMyId());
  // Use new photo if picked, otherwise keep existing
  const newPhoto = _pendingPhoto['config'] !== undefined ? _pendingPhoto['config'] : (me?.photo || null);
  const { error }=await sb.from('participantes').update({nombre:name, emoji:newPhoto}).eq('id',getMyId());
  if(error){showToast('❌ Error');return;}
  if(me){me.name=name; me.photo=newPhoto;}
  delete _pendingPhoto['config'];
  applySidebarProfile(); showToast('✅ Perfil guardado');
}

async function transferAdmin(){
  const newId=document.getElementById('config-transfer-admin').value;
  if(!newId){showToast('Selecciona un participante');return;}
  if(!confirm('¿Transferir la administración? Perderás los privilegios de admin.')) return;
  const oldAdminId=getAdminId();
  await Promise.all([
    sb.from('participantes').update({is_admin:false}).eq('id',oldAdminId),
    sb.from('participantes').update({is_admin:true}).eq('id',newId)
  ]);
  const oldAdmin=cache.participantes.find(p=>p.id===oldAdminId);
  const newAdmin=cache.participantes.find(p=>p.id===newId);
  if(oldAdmin) oldAdmin.isAdmin=false;
  if(newAdmin) newAdmin.isAdmin=true;
  renderConfig(); applySidebarProfile(); showToast('👑 Administración transferida');
}

function confirmReset(){ document.getElementById('modal-reset').classList.add('open'); }
async function doReset(){
  const { error }=await sb.from('ligas').delete().eq('id',session.liga_id);
  if(error){showToast('❌ Error al reiniciar');return;}
  localStorage.removeItem(SESSION_KEY);
  location.reload();
}

// ===================== USER SELECTOR =====================
function renderUserSelector(fn){
  if(!cache.participantes.length) return '<span style="font-size:12px;color:var(--text3)">Sin participantes</span>';
  return `<select class="form-input" style="width:180px;padding:6px 11px;font-size:13px" onchange="${fn}(this.value)">${cache.participantes.map(p=>`<option value="${p.id}" ${p.id===currentViewUser?'selected':''}>${p.name}${p.isAdmin?' 👑':''}</option>`).join('')}</select>`;
}
function switchPredUser(uid){currentViewUser=uid;renderGruposPred();}
function switchPredUserElim(uid){currentViewUser=uid;renderElimPred();}
function switchPredUserEsp(uid){currentViewUser=uid;renderEspeciales();}

// ===================== MODALS =====================
function closeModal(id){ document.getElementById(id).classList.remove('open'); }
document.addEventListener('keydown',e=>{if(e.key==='Escape') document.querySelectorAll('.modal-overlay').forEach(m=>m.classList.remove('open'));});
document.querySelectorAll('.modal-overlay').forEach(m=>{m.addEventListener('click',e=>{if(e.target===m) m.classList.remove('open');});});

// ===================== TOAST =====================
function showToast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2500);
}

// ===================== SUPERADMIN =====================
const SUPERADMIN_KEY = 'PORRA2026ADMIN';
let _isSuperadmin = false;

function checkSuperadminUrl(){
  const p = new URLSearchParams(location.search).get('admin');
  return p === SUPERADMIN_KEY;
}

async function openSuperadmin(){
  const panel = document.getElementById('superadmin-panel');
  panel.classList.add('open');
  showLoading(true); setLoadingText('Cargando resultados globales…');
  const { data } = await sb.from('resultados_globales').select('*');
  const globalRes = { grupos:{}, elim:{}, especiales:{} };
  for(const r of (data||[])){ globalRes[r.tipo]=globalRes[r.tipo]||{}; globalRes[r.tipo][r.match_key]=r.valor; }
  showLoading(false);
  renderSuperadmin(globalRes);
}

function closeSuperadmin(){
  document.getElementById('superadmin-panel').classList.remove('open');
}

function renderSuperadmin(res){
  const body = document.getElementById('sa-body');
  let html = '';

  // ---- FASE DE GRUPOS ----
  html += '<div class="sa-phase"><div class="sa-phase-title">⚽ Fase de Grupos</div>';
  GRUPOS.forEach(g=>{
    html += `<div style="font-size:11px;font-weight:700;letter-spacing:1px;color:var(--text3);text-transform:uppercase;margin:10px 0 6px">Grupo ${g.id}</div>`;
    g.partidos.forEach(m=>{
      const key=`G${g.id}_${m.n}`;
      const r=(res.grupos||{})[key];
      const gl = r!==undefined&&r!==null ? r.gl : '';
      const gv = r!==undefined&&r!==null ? r.gv : '';
      const tag = (gl!==''&&gv!=='') ? `<span class="sa-result-tag">${gl}–${gv}</span>` : '';
      html += `<div class="sa-row">
        <div>
          <div class="sa-match-info">${m.local} vs ${m.visitante} ${tag}</div>
          <div class="sa-match-sub">${m.fecha} · ${m.hora} · ${m.sede}</div>
        </div>
        <div class="sa-inputs">
          <input class="sa-inp" type="number" min="0" max="30" id="sa_${key}_l" value="${gl}" placeholder="–">
          <span class="sa-sep">–</span>
          <input class="sa-inp" type="number" min="0" max="30" id="sa_${key}_v" value="${gv}" placeholder="–">
          <button class="sa-save" onclick="saveGlobalGrupo('${key}','${m.local}','${m.visitante}')">Guardar</button>
        </div>
      </div>`;
    });
  });
  html += '</div>';

  // ---- ELIMINATORIAS ----
  html += '<div class="sa-phase"><div class="sa-phase-title">⚡ Eliminatorias</div>';
  ELIM_PHASES.forEach(phase=>{
    html += `<div style="font-size:11px;font-weight:700;letter-spacing:1px;color:var(--text3);text-transform:uppercase;margin:10px 0 6px">${phase.name}</div>`;
    phase.partidos.forEach(m=>{
      const cur = (res.elim||{})[m.code];
      html += `<div class="sa-row">
        <div>
          <div class="sa-match-info">${m.code}: ${m.local} vs ${m.visitante} ${cur?`<span class="sa-result-tag">✓ ${cur}</span>`:''}</div>
          <div class="sa-match-sub">${m.fecha} · ${m.hora} · ${m.sede}</div>
        </div>
        <div class="sa-inputs">
          <select class="sa-select" id="sa_elim_${m.code}">
            <option value="">— Clasificado —</option>
            <option value="${m.local}" ${cur===m.local?'selected':''}>${m.local}</option>
            <option value="${m.visitante}" ${cur===m.visitante?'selected':''}>${m.visitante}</option>
          </select>
          <button class="sa-save" onclick="saveGlobalElim('${m.code}')">Guardar</button>
        </div>
      </div>`;
    });
  });
  html += '</div>';

  // ---- ESPECIALES ----
  const allTeamsOpts = ALL_TEAMS.map(t=>`<option value="${t}">${t}</option>`).join('');
  const matchOpts = GRUPOS.flatMap(g=>g.partidos.map(m=>`<option value="${m.local} vs ${m.visitante}">${m.local} vs ${m.visitante} (Gr.${g.id})</option>`)).join('');
  const esp = res.especiales||{};
  html += `<div class="sa-phase"><div class="sa-phase-title">🌟 Predicciones Especiales</div>`;
  const especiales = [
    {key:'campeon',label:'🏆 Campeón del Mundial',opts:allTeamsOpts},
    {key:'subcampeon',label:'🥈 Subcampeón',opts:allTeamsOpts},
    {key:'tercero',label:'🥉 Tercer puesto',opts:allTeamsOpts},
    {key:'masGoles',label:'🔥 Partido con más goles',opts:matchOpts},
    {key:'masTarjetas',label:'🟨 Partido con más tarjetas',opts:matchOpts},
  ];
  especiales.forEach(({key,label,opts})=>{
    const cur=esp[key]||'';
    html += `<div class="sa-row">
      <div><div class="sa-match-info">${label} ${cur?`<span class="sa-result-tag">✓ ${cur}</span>`:''}</div></div>
      <div class="sa-inputs">
        <select class="sa-select" id="sa_esp_${key}"><option value="">— Resultado —</option>${opts}</select>
        <button class="sa-save" onclick="saveGlobalEspecial('${key}')">Guardar</button>
      </div>
    </div>`;
  });
  // Pichichi (texto libre)
  const pich = esp['pichichi']||'';
  html += `<div class="sa-row">
    <div><div class="sa-match-info">⚽ Máximo Goleador (Pichichi) ${pich?`<span class="sa-result-tag">✓ ${pich}</span>`:''}</div></div>
    <div class="sa-inputs">
      <input class="sa-inp-text" id="sa_esp_pichichi" value="${pich}" placeholder="Nombre del jugador">
      <button class="sa-save" onclick="saveGlobalPichichi()">Guardar</button>
    </div>
  </div>`;
  html += '</div>';

  body.innerHTML = html;
  // Set select values after render
  especiales.forEach(({key})=>{ const el=document.getElementById('sa_esp_'+key); if(el&&esp[key]) el.value=esp[key]; });
}

async function saveGlobalGrupo(key, local, visitante){
  const gl = document.getElementById('sa_'+key+'_l').value;
  const gv = document.getElementById('sa_'+key+'_v').value;
  if(gl===''||gv===''){ showToast('Introduce ambos marcadores'); return; }
  const valor = {gl:parseInt(gl), gv:parseInt(gv)};
  const { error } = await sb.from('resultados_globales').upsert({tipo:'grupos',match_key:key,valor,updated_at:new Date().toISOString()},{onConflict:'tipo,match_key'});
  if(error){ showToast('❌ Error: '+error.message); return; }
  cache.resultados.grupos = cache.resultados.grupos||{};
  cache.resultados.grupos[key] = valor;
  showToast(`✅ ${local} ${gl}–${gv} ${visitante}`);
  // Refresh panel
  const { data } = await sb.from('resultados_globales').select('*');
  const r={grupos:{},elim:{},especiales:{}};
  for(const x of (data||[])){ r[x.tipo]=r[x.tipo]||{}; r[x.tipo][x.match_key]=x.valor; }
  renderSuperadmin(r);
}

async function saveGlobalElim(code){
  const winner = document.getElementById('sa_elim_'+code).value;
  if(!winner){ showToast('Selecciona el clasificado'); return; }
  const { error } = await sb.from('resultados_globales').upsert({tipo:'elim',match_key:code,valor:winner,updated_at:new Date().toISOString()},{onConflict:'tipo,match_key'});
  if(error){ showToast('❌ Error: '+error.message); return; }
  cache.resultados.elim = cache.resultados.elim||{};
  cache.resultados.elim[code] = winner;
  showToast(`✅ ${code}: ${winner} clasificado`);
  const { data } = await sb.from('resultados_globales').select('*');
  const r={grupos:{},elim:{},especiales:{}};
  for(const x of (data||[])){ r[x.tipo]=r[x.tipo]||{}; r[x.tipo][x.match_key]=x.valor; }
  renderSuperadmin(r);
}

async function saveGlobalEspecial(key){
  const valor = document.getElementById('sa_esp_'+key).value;
  if(!valor){ showToast('Selecciona un valor'); return; }
  const { error } = await sb.from('resultados_globales').upsert({tipo:'especiales',match_key:key,valor,updated_at:new Date().toISOString()},{onConflict:'tipo,match_key'});
  if(error){ showToast('❌ Error: '+error.message); return; }
  showToast('✅ Guardado');
  const { data } = await sb.from('resultados_globales').select('*');
  const r={grupos:{},elim:{},especiales:{}};
  for(const x of (data||[])){ r[x.tipo]=r[x.tipo]||{}; r[x.tipo][x.match_key]=x.valor; }
  renderSuperadmin(r);
}

async function saveGlobalPichichi(){
  const valor = document.getElementById('sa_esp_pichichi').value.trim();
  if(!valor){ showToast('Escribe el nombre del jugador'); return; }
  const { error } = await sb.from('resultados_globales').upsert({tipo:'especiales',match_key:'pichichi',valor,updated_at:new Date().toISOString()},{onConflict:'tipo,match_key'});
  if(error){ showToast('❌ Error: '+error.message); return; }
  showToast('✅ Pichichi guardado');
  const { data } = await sb.from('resultados_globales').select('*');
  const r={grupos:{},elim:{},especiales:{}};
  for(const x of (data||[])){ r[x.tipo]=r[x.tipo]||{}; r[x.tipo][x.match_key]=x.valor; }
  renderSuperadmin(r);
}

// ===================== INIT =====================
async function initApp(){
  showLoading(true);
  setLoadingText('Conectando con Supabase…');

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
    navigator.serviceWorker.register('/sw.js')
      .catch(e => console.warn('SW error:', e));
  });
}
