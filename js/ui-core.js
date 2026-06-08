// ===================== APP SHELL =====================
function showLoading(v){ document.getElementById('loading-overlay').classList.toggle('hidden',!v); }
function setLoadingText(t){ document.getElementById('loading-text').textContent=t; }

function showSetup(){
  document.getElementById('setup-screen').classList.remove('hidden');
  showLoading(false);
  if(typeof renderSavedLeagues === 'function') renderSavedLeagues();
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
  const norma=(cache.normasRaw||[]).find(n=>n.id===id);
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
  renderParticipants();
  renderRanking();
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
  // Actualizar cabecera del drawer móvil
  const mLiga = document.getElementById('mobile-liga-name');
  if(mLiga) mLiga.textContent = ligaName;
  const mCode = document.getElementById('mobile-liga-code');
  if(mCode) mCode.textContent = cache.liga?.codigo || '—';
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
// Bottom nav pages que tienen botón directo
const BOTTOM_NAV_PAGES = ['dashboard','ranking','grupos-pred','eliminatorias-pred'];


function goto(page){
  closeMobileMenu();
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const el = document.getElementById('page-'+page);
  if(el) el.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b=>{ if(b.getAttribute('onclick')==="goto('"+page+"')") b.classList.add('active'); });
  // Actualizar bottom nav móvil
  document.querySelectorAll('.bn-item').forEach(b=>b.classList.remove('active'));
  const bnEl = document.getElementById('bn-'+page);
  if(bnEl) bnEl.classList.add('active');
  // Si la página no está en el bottom nav principal, marcar el botón 'Más'
  if(!BOTTOM_NAV_PAGES.includes(page)){
    const bnMore = document.getElementById('bn-more');
    if(bnMore) bnMore.classList.add('active');
  }
  currentPage = page;
  renderPage(page);
  // Scroll al inicio
  const mainEl = document.querySelector('.main');
  if(mainEl) mainEl.scrollTo(0,0);
  window.scrollTo(0,0);
}

function renderPage(page){
  const map = {
    dashboard:renderDashboard, ranking:renderRanking, participantes:renderParticipants,
    'grupos-pred': () => { renderGruposPred(); renderElimPred(); }, especiales:renderEspeciales,
    'grupos-torneo':renderGruposTorneo, normas:renderNormas, config:renderConfig
  };
  if(map[page]) map[page]();
}

// ===================== MOBILE MENU =====================
function toggleMobileMenu(){
  const overlay = document.getElementById('mobile-menu-overlay');
  const drawer = document.getElementById('mobile-menu-drawer');
  if(!overlay || !drawer) return;
  const isOpen = drawer.classList.contains('open');
  if(isOpen){ closeMobileMenu(); } else { openMobileMenu(); }
}

function openMobileMenu(){
  document.getElementById('mobile-menu-overlay')?.classList.add('open');
  document.getElementById('mobile-menu-drawer')?.classList.add('open');
  // Evitar scroll del body mientras está abierto
  document.body.style.overflow = 'hidden';
}

function closeMobileMenu(){
  document.getElementById('mobile-menu-overlay')?.classList.remove('open');
  document.getElementById('mobile-menu-drawer')?.classList.remove('open');
  document.body.style.overflow = '';
}


// ===================== USER SELECTOR =====================
function renderUserSelector(fn){
  if(!cache.participantes.length) return '<span style="font-size:12px;color:var(--text3)">Sin participantes</span>';
  return `<select class="form-input" style="width:180px;padding:6px 11px;font-size:13px" onchange="${fn}(this.value)" ${!isAdmin()?'disabled':''}>${cache.participantes.map(p=>`<option value="${p.id}" ${p.id===currentViewUser?'selected':''}>${p.name}${p.isAdmin?' 👑':''}</option>`).join('')}</select>`;
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
