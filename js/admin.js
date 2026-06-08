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
      const localResolved = resolveActualTeamForSlot(m.local);
      const visitanteResolved = resolveActualTeamForSlot(m.visitante);
      const cur = (res.elim||{})[m.code];
      html += `<div class="sa-row">
        <div>
          <div class="sa-match-info">${m.code}: ${localResolved} vs ${visitanteResolved} ${cur?`<span class="sa-result-tag">✓ ${cur}</span>`:''}</div>
          <div class="sa-match-sub">${m.fecha} · ${m.hora} · ${m.sede}</div>
        </div>
        <div class="sa-inputs">
          <select class="sa-select" id="sa_elim_${m.code}">
            <option value="">— Clasificado —</option>
            <option value="${localResolved}" ${cur===localResolved?'selected':''}>${localResolved}</option>
            <option value="${visitanteResolved}" ${cur===visitanteResolved?'selected':''}>${visitanteResolved}</option>
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
  const pichEspana = esp['pichichiEspana']||'';
  html += `<div class="sa-row">
    <div><div class="sa-match-info">🇪🇸 Máximo Goleador de España ${pichEspana?`<span class="sa-result-tag">✓ ${pichEspana}</span>`:''}</div></div>
    <div class="sa-inputs">
      <input class="sa-inp-text" id="sa_esp_pichichiEspana" value="${pichEspana}" placeholder="Nombre del jugador">
      <button class="sa-save" onclick="saveGlobalPichichiEspana()">Guardar</button>
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

async function saveGlobalPichichiEspana(){
  const valor = document.getElementById('sa_esp_pichichiEspana').value.trim();
  if(!valor){ showToast('Escribe el nombre del jugador'); return; }
  const { error } = await sb.from('resultados_globales').upsert({tipo:'especiales',match_key:'pichichiEspana',valor,updated_at:new Date().toISOString()},{onConflict:'tipo,match_key'});
  if(error){ showToast('❌ Error: '+error.message); return; }
  showToast('✅ Pichichi España guardado');
  const { data } = await sb.from('resultados_globales').select('*');
  const r={grupos:{},elim:{},especiales:{}};
  for(const x of (data||[])){ r[x.tipo]=r[x.tipo]||{}; r[x.tipo][x.match_key]=x.valor; }
  renderSuperadmin(r);
}
