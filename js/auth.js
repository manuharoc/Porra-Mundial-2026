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



  currentViewUser = session.participante_id;
  await loadAllData();
  saveCurrentToMultiSession();
  setupRealtime();
  showApp();
}

function saveCurrentToMultiSession(){
  if(!session || !cache.liga) return;
  const me = cache.participantes.find(p=>p.id===session.participante_id);
  const arr = JSON.parse(localStorage.getItem(MULTI_SESSION_KEY)||'[]');
  const idx = arr.findIndex(x=>x.liga_id===session.liga_id && x.participante_id===session.participante_id);
  const entry = { liga_id:session.liga_id, participante_id:session.participante_id, liga_name:cache.liga.nombre, my_name:me?me.name:'', avatar:me?me.photo:null };
  if(idx>=0) arr[idx] = entry; else arr.push(entry);
  localStorage.setItem(MULTI_SESSION_KEY, JSON.stringify(arr));
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function switchLeague(){
  session = null;
  currentViewUser = null;
  localStorage.removeItem(SESSION_KEY);
  if(realtimeChannel) { sb.removeChannel(realtimeChannel); realtimeChannel=null; }
  document.getElementById('setup-screen').classList.remove('hidden');
  document.querySelectorAll('.setup-step').forEach(s=>s.classList.remove('active'));
  document.getElementById('step-0').classList.add('active');
  renderSavedLeagues();
}

function renderSavedLeagues(){
  const arr = JSON.parse(localStorage.getItem(MULTI_SESSION_KEY)||'[]');
  const cont = document.getElementById('saved-leagues-container');
  const list = document.getElementById('saved-leagues-list');
  if(!arr.length){ cont.style.display='none'; return; }
  cont.style.display='block';
  list.innerHTML = arr.map(x=>`
    <button class="setup-opt-btn" onclick="enterSavedLeague('${x.liga_id}', '${x.participante_id}')" style="text-align:left;flex-direction:row;align-items:center;padding:12px 16px;gap:12px">
      ${x.avatar && x.avatar.startsWith('data:') ? `<img src="${x.avatar}" style="width:40px;height:40px;border-radius:50%;object-fit:cover">` : `<div style="width:40px;height:40px;border-radius:50%;background:rgba(123,44,191,0.15);color:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px">${(x.my_name||'?').slice(0,2).toUpperCase()}</div>`}
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;color:var(--text);font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${x.liga_name}</div>
        <div style="color:var(--text3);font-size:13px">${x.my_name}</div>
      </div>
      <div style="color:var(--text3)">➔</div>
    </button>
  `).join('');
}

async function enterSavedLeague(liga_id, participante_id){
  setLoadingText('Verificando liga...'); showLoading(true);
  const { data: ligaCheck } = await sb.from('ligas').select('id').eq('id', liga_id).maybeSingle();
  if(!ligaCheck){
    const arr = JSON.parse(localStorage.getItem(MULTI_SESSION_KEY)||'[]');
    const newArr = arr.filter(x => x.liga_id !== liga_id);
    localStorage.setItem(MULTI_SESSION_KEY, JSON.stringify(newArr));
    showToast('❌ La liga ya no existe (ha sido borrada)');
    showLoading(false);
    renderSavedLeagues();
    return;
  }

  session = { liga_id, participante_id };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  currentViewUser = session.participante_id;
  setLoadingText('Entrando...');
  await loadAllData();
  saveCurrentToMultiSession();
  setupRealtime();
  showApp();
}

function generateLigaCode(){
  const words = ['MUNDIAL','PORRA','FUTBOL','GOLES','COPA'];
  return words[Math.floor(Math.random()*words.length)]+'-'+Math.floor(1000+Math.random()*9000);
}
