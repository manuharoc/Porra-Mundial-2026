// ===================== PRED GRUPOS HELPERS =====================
function getPredictedStandings(uid) {
  const standings = {};
  const preds = (cache.predicciones[uid] || {}).grupos || {};

  GRUPOS.forEach(g => {
    standings[g.id] = g.equipos.map(eq => ({ name: eq, pj: 0, pts: 0, gf: 0, gc: 0, gd: 0 }));
    g.partidos.forEach(m => {
      const key = `G${g.id}_${m.n}`;
      const pred = preds[key];
      if (pred && pred.gl !== '' && pred.gl !== undefined && pred.gv !== '' && pred.gv !== undefined) {
        const gl = parseInt(pred.gl);
        const gv = parseInt(pred.gv);
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
  return standings;
}

function checkPredChanged(key) {
  const uid = currentViewUser;
  if (!uid) return;
  const lEl = document.getElementById(`pi_${key}_l`);
  const vEl = document.getElementById(`pi_${key}_v`);
  const btn = document.getElementById(`psb_${key}`);
  if (!lEl || !vEl || !btn) return;

  const saved = ((cache.predicciones[uid] || {}).grupos || {})[key];
  const savedL = saved && saved.gl !== undefined && saved.gl !== '' ? String(saved.gl) : '';
  const savedV = saved && saved.gv !== undefined && saved.gv !== '' ? String(saved.gv) : '';
  
  if (lEl.value === savedL && vEl.value === savedV) {
    btn.classList.add('saved');
  } else {
    btn.classList.remove('saved');
  }
}

// ===================== PRED GRUPOS =====================
function getMatchLockStatus(matchDateStr, matchTimeStr, isGrupos) {
  const modo = cache.configModo || 'interactivo';
  const inicioTorneo = new Date(2026, 5, 11, 21, 0, 0).getTime();
  const inicioEliminatorias = new Date(2026, 5, 28, 19, 0, 0).getTime();
  const now = new Date().getTime();

  if (modo === 'dificil') return now > inicioTorneo;
  if (modo === 'interactivo') return isGrupos ? (now > inicioTorneo) : (now > inicioEliminatorias);
  if (modo === 'flexible') {
    if (!matchDateStr || !matchTimeStr) return false;
    const parts = matchDateStr.split(' ');
    const day = parseInt(parts[0]);
    const month = parts[1].startsWith('jun') ? 5 : 6;
    let timeStr = matchTimeStr.replace('*', '');
    let tParts = timeStr.split(':');
    let h = parseInt(tParts[0]);
    let m = parseInt(tParts[1]);
    const matchTime = new Date(2026, month, day, h, m, 0).getTime();
    return now > matchTime;
  }
  return false;
}

function getMatchLockStatusByKey(key, isElim) {
  let match = null;
  if (!isElim) {
    const parts = key.split('_');
    const gId = parts[0].replace('G', '');
    const mN = parseInt(parts[1]);
    const g = GRUPOS.find(x => x.id === gId);
    if(g) match = g.partidos.find(x => x.n === mN);
  } else {
    for (const ph of ELIM_PHASES) {
      match = ph.partidos.find(x => x.code === key);
      if (match) break;
    }
  }
  if (!match) return false;
  return getMatchLockStatus(match.fecha, match.hora, !isElim);
}

function renderGruposPred(){
  const c = document.getElementById('grupos-pred-content');
  if(!c) return;
  document.getElementById('pred-user-selector').innerHTML = renderUserSelector('switchPredUser');
  if(!cache.participantes.length){ c.innerHTML='<div class="empty-state"><div class="ei">👥</div><p>Añade participantes primero.</p></div>'; return; }
  
  const uid = currentViewUser;
  const totalGroupMatches = 72;
  let filledCount = 0;
  if (uid) {
    GRUPOS.forEach(g => {
      g.partidos.forEach(m => {
        const key = `G${g.id}_${m.n}`;
        const pred = ((cache.predicciones[uid] || {}).grupos || {})[key];
        if (pred && pred.gl !== '' && pred.gl !== undefined && pred.gv !== '' && pred.gv !== undefined) {
          filledCount++;
        }
      });
    });
  }

  let progressHtml = '';
  if (uid) {
    const pct = Math.round((filledCount / totalGroupMatches) * 100);
    progressHtml = `
      <div class="progress-container" style="background: var(--s2); border: 1px solid var(--border2); border-radius: var(--r); padding: 12px 16px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
        <div style="font-size: 13px; font-weight: 600; color: var(--text);">
          📋 Progreso de tus predicciones: <span style="color: var(--accent3)">${filledCount} / ${totalGroupMatches} partidos</span>
        </div>
        <div style="flex: 1; min-width: 150px; background: var(--s4); height: 8px; border-radius: 4px; overflow: hidden; position: relative;">
          <div style="background: linear-gradient(90deg, var(--accent) 0%, var(--accent3) 100%); height: 100%; width: ${pct}%; transition: width 0.3s ease;"></div>
        </div>
        <div style="font-size: 12px; font-weight: 700; color: var(--accent3);">${pct}%</div>
      </div>
    `;
  }

  let html = progressHtml;
  GRUPOS.forEach(g=>{
    html+=`<div class="matches-section"><div class="section-title">Grupo ${g.id} <span style="font-size:13px;color:var(--text2);font-family:Barlow,sans-serif">· ${g.equipos.join(' · ')}</span></div>`;
    g.partidos.forEach(m=>{
      const key=`G${g.id}_${m.n}`, res=(cache.resultados.grupos||{})[key];
      const hasRes=res&&res.gl!==''&&res.gl!==undefined;
      const preds=uid?(((cache.predicciones[uid]||{}).grupos||{})[key]):null;
      let predHtml='';
      if(hasRes){
        if(preds&&preds.gl!==''&&preds.gl!==undefined){
          let cls='pred-partial',label='Ganador ✓',pts='+1 pt';
          if(parseInt(preds.gl)===parseInt(res.gl)&&parseInt(preds.gv)===parseInt(res.gv)){cls='pred-exact';label='¡Exacto! 🎯';pts='+3 pts';}
          else{const pw=parseInt(preds.gl)>parseInt(preds.gv)?'L':parseInt(preds.gl)<parseInt(preds.gv)?'V':'D';const rw=parseInt(res.gl)>parseInt(res.gv)?'L':parseInt(res.gl)<parseInt(res.gv)?'V':'D';if(pw!==rw){cls='pred-wrong';label='Fallo ✗';pts='0 pts';}}
          predHtml=`<span class="${cls}">${preds.gl}–${preds.gv} ${label}<span class="pts-earned">${pts}</span></span>`;
        } else {
          predHtml=`<span class="pred-wrong" style="background:rgba(239,68,68,0.1);color:var(--red)">Sin predicción <span class="pts-earned">0 pts</span></span>`;
        }
      } else { 
        predHtml=renderPredInputsHtml(key); 
      }
      const isFilled = preds&&preds.gl!==''&&preds.gl!==undefined;
      html+=`<div class="match-row ${isFilled ? 'has-pred' : ''}"><div class="match-meta"><div class="match-date">${m.fecha}</div><div class="match-time">${m.hora}</div></div><div class="team-block"><div class="team-name-match">${getFlagHtml(m.local)}${m.local}</div></div><div class="score-center">${hasRes?`<div class="score-display">${res.gl}–${res.gv}</div>`:'<div class="score-vs">VS</div>'}<div class="sede">${m.sede}</div></div><div class="team-block right"><div class="team-name-match">${getFlagHtml(m.visitante)}${m.visitante}</div></div><div class="pred-block"><div class="pred-label">Tu predicción</div>${predHtml}</div></div>`;
    });
    html+='</div>';
  });

  if (uid && filledCount === totalGroupMatches) {
    const standings = getPredictedStandings(uid);
    html += `
      <div class="matches-section" style="margin-top: 30px; background: var(--s2); border: 1px solid var(--border); padding: 24px; border-radius: var(--r-lg);">
        <div class="section-title" style="color: var(--accent3); font-size: 18px; margin-bottom: 8px; font-family: 'Outfit', sans-serif; font-weight: 800;">
          📊 Clasificación Final Predicha
        </div>
        <p style="font-size: 12px; color: var(--text2); margin-bottom: 20px;">
          ¡Completaste todas las predicciones! Así quedarían las posiciones de los grupos según tus resultados:
        </p>
        <div class="groups-grid">
          ${GRUPOS.map(g => `
            <div class="group-card" style="background: var(--s3)">
              <div class="group-card-header" style="background: var(--s4)">
                <div class="group-letter" style="background: var(--accent); color: white">${g.id}</div>
                <div class="group-name">Grupo ${g.id}</div>
              </div>
              <table class="group-table">
                <thead><tr><th>Equipo</th><th style="text-align:center">PJ</th><th style="text-align:center">GD</th><th style="text-align:center">Pts</th></tr></thead>
                <tbody>
                  ${standings[g.id].map((eq, i) => `
                    <tr style="position:relative">
                      ${i < 2 ? '<td style="padding-left:14px;position:relative"><span style="position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--green)"></span>' : '<td>'}
                      <div class="flag-name"><span class="team-flag-sm">⚽</span>${eq.name}</div></td>
                      <td style="color:var(--text3);font-size:12px;text-align:center">${eq.pj}</td>
                      <td style="color:var(--text3);font-size:12px;text-align:center">${eq.gd > 0 ? '+' + eq.gd : eq.gd}</td>
                      <td style="color:var(--accent3);font-weight:700;font-size:13px;text-align:center">${eq.pts}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  c.innerHTML = html;
}

function renderPredInputsHtml(key){
  const uid=currentViewUser;
  if(!uid) return '<span style="font-size:11px;color:var(--text3)">Selecciona usuario</span>';
  const saved=((cache.predicciones[uid]||{}).grupos||{})[key];
  const isSaved=saved&&saved.gl!==''&&saved.gl!==undefined;
  const isMe = uid === getMyId();
  const isLocked = getMatchLockStatusByKey(key, false);

  if (!isMe && !isLocked) {
     return '<div class="pred-inputs" style="justify-content:center"><span style="font-size:12px;color:var(--text3)">🔒 Oculto</span></div>';
  }

  const glVal = isSaved ? saved.gl : '';
  const gvVal = isSaved ? saved.gv : '';
  const disStr = (isMe && !isLocked) ? '' : ' disabled';
  const btnHtml = (isMe && !isLocked) ? `<button class="pred-save ${isSaved?'saved':''}" id="psb_${key}" onclick="savePredGrupo('${key}')">✓</button>` : '';
  return `<div class="pred-inputs">
    <input class="pred-inp" type="number" min="0" max="20" id="pi_${key}_l" value="${glVal}" placeholder="–" oninput="checkPredChanged('${key}')"${disStr}>
    <span class="pred-sep">–</span>
    <input class="pred-inp" type="number" min="0" max="20" id="pi_${key}_v" value="${gvVal}" placeholder="–" oninput="checkPredChanged('${key}')"${disStr}>
    ${btnHtml}
  </div>`;
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
  if(uid !== getMyId()) { showToast('❌ No puedes modificar las predicciones de otro participante'); return; }
  if(getMatchLockStatusByKey(key, false)) { showToast('❌ Este partido ya está bloqueado'); return; }
  const l=document.getElementById('pi_'+key+'_l'), v=document.getElementById('pi_'+key+'_v');
  if(!l||!v||l.value===''||v.value===''){ showToast('Introduce el marcador'); return; }
  const gl=parseInt(l.value), gv=parseInt(v.value);
  
  r32Memo.ts = 0;
  const oldR32 = JSON.stringify(getPredictedR32(uid));

  if(!cache.predicciones[uid]) cache.predicciones[uid]={grupos:{},elim:{},especiales:{},especialesTs:{}};
  cache.predicciones[uid].grupos[key]={gl,gv};
  
  r32Memo.ts = 0;
  const newR32 = JSON.stringify(getPredictedR32(uid));
  const changedR32 = oldR32 !== newR32 && Object.keys(cache.predicciones[uid].elim || {}).length > 0;

  if (changedR32) {
    cache.predicciones[uid].elim = {};
    await sb.from('predicciones_elim').delete().eq('participante_id', uid);
  }

  const btn=document.getElementById('psb_'+key);
  if(btn){ btn.classList.add('saved'); }
  
  const { error } = await sb.from('predicciones_grupos').upsert({ participante_id:uid, match_key:key, goles_local:gl, goles_visitante:gv },{ onConflict:'participante_id,match_key' });
  if(error){ 
    showToast('❌ Error al guardar'); 
    if(btn) btn.classList.remove('saved');
  } else { 
    if (changedR32) {
      showToast('⚠️ Cruces alterados. Eliminatorias reiniciadas.');
    } else {
      showToast('✅ Predicción guardada'); 
    }
    fireConfetti(); 
    renderGruposPred();
  }
}

function toggleFilledMatches() {
  const isHidden = document.getElementById('hide-filled-matches').checked;
  const rows = document.querySelectorAll('.match-row.has-pred, .elim-row.has-pred');
  rows.forEach(r => r.style.display = isHidden ? 'none' : '');
}

async function magicFill() {
  const uid = currentViewUser;
  if (!uid) { showToast('Selecciona un participante primero'); return; }
  
  if (uid !== getMyId()) {
    showToast('❌ Solo puedes rellenar tus propias predicciones');
    return;
  }

  let emptyMatches = [];
  GRUPOS.forEach(g => {
    g.partidos.forEach(m => {
      const key = `G${g.id}_${m.n}`;
      const isLocked = getMatchLockStatusByKey(key, false);
      const preds = ((cache.predicciones[uid] || {}).grupos || {})[key];
      if (!isLocked && (!preds || preds.gl === '' || preds.gl === undefined)) {
        // Parse date for sorting
        const parts = m.fecha.split(' ');
        const day = parseInt(parts[0]);
        const month = parts[1].toLowerCase().startsWith('jun') ? 5 : 6;
        const [h, min] = m.hora.split(':').map(x => parseInt(x, 10));
        const ts = new Date(2026, month, day, h, min).getTime();
        emptyMatches.push({ key, ts });
      }
    });
  });

  if (emptyMatches.length === 0) {
    showToast('¡Ya tienes todo rellenado!');
    return;
  }

  // Sort chronologically and take only the next 12
  emptyMatches.sort((a, b) => a.ts - b.ts);
  const matchesToFill = emptyMatches.slice(0, 12);

  showToast(`Rellenando próximos ${matchesToFill.length} partidos...`);
  
  r32Memo.ts = 0;
  const oldR32 = JSON.stringify(getPredictedR32(uid));
  const upsertData = matchesToFill.map(match => {
    const gl = Math.floor(Math.random() * 4); // 0 to 3
    const gv = Math.floor(Math.random() * 4); // 0 to 3
    
    // Update UI optimistically
    if (!cache.predicciones[uid]) cache.predicciones[uid] = { grupos: {}, elim: {}, especiales: {}, especialesTs: {} };
    cache.predicciones[uid].grupos[match.key] = { gl, gv };
    
    return { participante_id: uid, match_key: match.key, goles_local: gl, goles_visitante: gv };
  });

  r32Memo.ts = 0;
  const newR32 = JSON.stringify(getPredictedR32(uid));
  const changedR32 = oldR32 !== newR32 && Object.keys(cache.predicciones[uid].elim || {}).length > 0;

  if (changedR32) {
    cache.predicciones[uid].elim = {};
    await sb.from('predicciones_elim').delete().eq('participante_id', uid);
  }

  const { error } = await sb.from('predicciones_grupos').upsert(upsertData, { onConflict: 'participante_id,match_key' });
  if (error) {
    showToast('❌ Error al autocompletar');
  } else {
    if (changedR32) {
      showToast('⚠️ Eliminatorias reiniciadas por cambio en grupos');
    } else {
      showToast('🎲 ¡Todos los partidos rellenados!');
    }
    fireConfetti();
    renderGruposPred();
  }
}

function openVsModal(rivalId) {
  const me = getMyId();
  if(!me || me === rivalId) return;
  const rival = cache.participantes.find(p=>p.id===rivalId);
  if(!rival) return;

  const m = document.getElementById('modal-content');
  const overlay = document.getElementById('modal-overlay');
  if(!m || !overlay) return;

  let html = `<div style="text-align:center;margin-bottom:20px;font-family:'Outfit',sans-serif;font-size:24px;color:var(--text)">TÚ <span style="font-size:16px;color:var(--text3)">vs</span> <span style="color:var(--accent)">${rival.name}</span></div>`;
  html += `<table style="width:100%;font-size:13px;text-align:center;border-collapse:collapse;background:var(--s2);border-radius:12px;overflow:hidden">
            <tr style="background:var(--s1);color:var(--text3);font-weight:bold;font-size:11px"><td style="padding:10px">Partido</td><td style="padding:10px">Tú</td><td style="padding:10px">${rival.name}</td></tr>`;

  let nextMatches = [];
  GRUPOS.forEach(g => {
    g.partidos.forEach(p => {
      const key = `G${g.id}_${p.n}`;
      if(!cache.resultados.grupos[key] || cache.resultados.grupos[key].gl==='') {
        nextMatches.push({ ...p, key, id: g.id });
      }
    });
  });
  nextMatches = nextMatches.slice(0, 5);

  nextMatches.forEach(match => {
    const myPred = ((cache.predicciones[me]||{}).grupos||{})[match.key];
    const rivalPred = ((cache.predicciones[rivalId]||{}).grupos||{})[match.key];
    const myText = myPred && myPred.gl!=='' ? `${myPred.gl}-${myPred.gv}` : '-';
    const rivalText = rivalPred && rivalPred.gl!=='' ? `${rivalPred.gl}-${rivalPred.gv}` : '🤔';
    
    html += `<tr style="border-bottom:1px solid var(--border2)">
              <td style="padding:10px;text-align:left;color:var(--text)">${match.local} vs ${match.visitante}</td>
              <td style="padding:10px;color:var(--accent);font-weight:bold">${myText}</td>
              <td style="padding:10px;color:var(--text2);font-weight:bold">${rivalText}</td>
             </tr>`;
  });

  html += `</table>`;
  
  m.innerHTML = `<div class="modal-header"><div class="modal-title">El Cara a Cara ⚔️</div><button class="modal-close" onclick="closeModal()">&times;</button></div>${html}`;
  overlay.classList.add('open');
}

function logActivity(msg) {
  const feed = document.getElementById('activity-feed');
  if(!feed) return;
  const item = document.createElement('div');
  item.style.padding = "8px 12px";
  item.style.background = "var(--s4)";
  item.style.borderRadius = "8px";
  item.style.animation = "fadeIn 0.3s";
  item.innerHTML = `<span style="color:var(--text3);font-size:10px;margin-right:8px">${new Date().toLocaleTimeString()}</span> ${msg}`;
  if(feed.children.length > 0 && feed.children[0].innerText.includes("Esperando")) {
    feed.innerHTML = '';
  }
  feed.prepend(item);
  if(feed.children.length > 30) feed.lastChild.remove();
}

// ===================== PRED ELIM HELPERS =====================
function findMatchInPhases(code) {
  for (const phase of ELIM_PHASES) {
    const m = phase.partidos.find(x => x.code === code);
    if (m) return m;
  }
  return null;
}

function getPossibleTeamsForSlot(slot) {
  if (!slot) return [];
  if (slot.startsWith('W') || slot.startsWith('Perdedor') || slot.startsWith('Ganador')) {
    return ALL_TEAMS;
  }
  const matches = slot.match(/[A-L]/g);
  if (matches && matches.length > 0) {
    const teams = [];
    matches.forEach(letter => {
      const g = GRUPOS.find(x => x.id === letter);
      if (g) teams.push(...g.equipos);
    });
    return [...new Set(teams)].sort();
  }
  return ALL_TEAMS;
}

let r32Memo = { uid: null, map: null, ts: 0 };
function getPredictedR32(uid) {
  if (r32Memo.uid === uid && Date.now() - r32Memo.ts < 1000) return r32Memo.map;
  
  const standings = getPredictedStandings(uid);
  const mapping = {};
  
  GRUPOS.forEach(g => {
    mapping[`1°${g.id}`] = standings[g.id][0].name;
    mapping[`2°${g.id}`] = standings[g.id][1].name;
  });

  let thirds = [];
  GRUPOS.forEach(g => {
    thirds.push({ group: g.id, team: standings[g.id][2] });
  });
  thirds.sort((a, b) => {
    if (b.team.pts !== a.team.pts) return b.team.pts - a.team.pts;
    if (b.team.gd !== a.team.gd) return b.team.gd - a.team.gd;
    return b.team.gf - a.team.gf;
  });
  
  const top8Thirds = thirds.slice(0, 8);
  const thirdSlots = [
    { key: '3er C/D/F/G/H', groups: ['C','D','F','G','H'] },
    { key: '3er A/B/C/D/E', groups: ['A','B','C','D','E'] },
    { key: '3er C/E/F/H/I', groups: ['C','E','F','H','I'] },
    { key: '3er E/H/I/J/K', groups: ['E','H','I','J','K'] },
    { key: '3er B/D/F/I/J', groups: ['B','D','F','I','J'] },
    { key: '3er A/E/H/I/J', groups: ['A','E','H','I','J'] },
    { key: '3er E/F/G/I/J', groups: ['E','F','G','I','J'] },
    { key: '3er D/E/I/J/L', groups: ['D','E','I','J','L'] }
  ];

  let assigned = {}; 
  let usedGroups = new Set();
  
  function solve(slotIndex) {
    if (slotIndex === thirdSlots.length) return true;
    const slot = thirdSlots[slotIndex];
    for (const t of top8Thirds) {
      if (!usedGroups.has(t.group) && slot.groups.includes(t.group)) {
        assigned[slot.key] = t.team.name;
        usedGroups.add(t.group);
        if (solve(slotIndex + 1)) return true;
        usedGroups.delete(t.group);
        delete assigned[slot.key];
      }
    }
    return false;
  }
  
  if (solve(0)) {
    Object.assign(mapping, assigned);
  } else {
    top8Thirds.forEach(t => {
      const slot = thirdSlots.find(s => s.groups.includes(t.group) && !assigned[s.key]);
      if (slot) {
        assigned[slot.key] = t.team.name;
        usedGroups.add(t.group);
      }
    });
    Object.assign(mapping, assigned);
  }
  
  r32Memo = { uid, map: mapping, ts: Date.now() };
  return mapping;
}

function resolveTeamForSlot(slot, uid) {
  if (!uid) return slot;

  if (slot.match(/^[12]°[A-L]$/) || slot.startsWith('3er')) {
    const r32Map = getPredictedR32(uid);
    if (r32Map[slot]) return r32Map[slot];
  }

  const preds = cache.predicciones[uid] || {};
  const elimPreds = preds.elim || {};

  if (ALL_TEAMS.includes(slot)) return slot;

  if (slot.startsWith('W')) {
    const code = 'M' + slot.slice(1);
    const predVal = elimPreds[code];
    if (predVal) {
      if (predVal.startsWith('{')) {
        try { return JSON.parse(predVal).ganador || slot; } catch(e){}
      }
      return predVal;
    }
    return slot;
  }

  if (slot === 'Ganador SF1') {
    const predVal = elimPreds['M101'];
    if (predVal) {
      if (predVal.startsWith('{')) {
        try { return JSON.parse(predVal).ganador || slot; } catch(e){}
      }
      return predVal;
    }
    return slot;
  }
  if (slot === 'Ganador SF2') {
    const predVal = elimPreds['M102'];
    if (predVal) {
      if (predVal.startsWith('{')) {
        try { return JSON.parse(predVal).ganador || slot; } catch(e){}
      }
      return predVal;
    }
    return slot;
  }
  if (slot === 'Perdedor SF1') {
    const predVal = elimPreds['M101'];
    if (predVal) {
      let winner = predVal;
      let local = 'W97';
      let visitante = 'W98';
      if (predVal.startsWith('{')) {
        try {
          const parsed = JSON.parse(predVal);
          winner = parsed.ganador;
          local = parsed.local;
          visitante = parsed.visitante;
        } catch(e){}
      } else {
        const m101 = findMatchInPhases('M101');
        if (m101) {
          local = resolveTeamForSlot(m101.local, uid);
          visitante = resolveTeamForSlot(m101.visitante, uid);
        }
      }
      return winner === local ? visitante : local;
    }
    return slot;
  }
  if (slot === 'Perdedor SF2') {
    const predVal = elimPreds['M102'];
    if (predVal) {
      let winner = predVal;
      let local = 'W99';
      let visitante = 'W100';
      if (predVal.startsWith('{')) {
        try {
          const parsed = JSON.parse(predVal);
          winner = parsed.ganador;
          local = parsed.local;
          visitante = parsed.visitante;
        } catch(e){}
      } else {
        const m102 = findMatchInPhases('M102');
        if (m102) {
          local = resolveTeamForSlot(m102.local, uid);
          visitante = resolveTeamForSlot(m102.visitante, uid);
        }
      }
      return winner === local ? visitante : local;
    }
    return slot;
  }
  return slot;
}

function resolveActualTeamForSlot(slot) {
  if (ALL_TEAMS.includes(slot)) return slot;

  const elimRes = cache.resultados.elim || {};

  if (slot.startsWith('W')) {
    const code = 'M' + slot.slice(1);
    return elimRes[code] || slot;
  }
  if (slot === 'Ganador SF1') return elimRes['M101'] || slot;
  if (slot === 'Ganador SF2') return elimRes['M102'] || slot;
  if (slot === 'Perdedor SF1') {
    const winner = elimRes['M101'];
    if (winner) {
      const m101 = findMatchInPhases('M101');
      if (m101) {
        const local = resolveActualTeamForSlot(m101.local);
        const visitante = resolveActualTeamForSlot(m101.visitante);
        return winner === local ? visitante : local;
      }
    }
    return slot;
  }
  if (slot === 'Perdedor SF2') {
    const winner = elimRes['M102'];
    if (winner) {
      const m102 = findMatchInPhases('M102');
      if (m102) {
        const local = resolveActualTeamForSlot(m102.local);
        const visitante = resolveActualTeamForSlot(m102.visitante);
        return winner === local ? visitante : local;
      }
    }
    return slot;
  }
  return slot;
}

function updateWinnerDropdown(code) {
  const localEl = document.getElementById('local-' + code);
  const visitanteEl = document.getElementById('visitante-' + code);
  const winnerEl = document.getElementById('winner-' + code);
  if (!winnerEl) return;

  const localVal = localEl ? (localEl.value || localEl.textContent || '').trim() : '';
  const visitanteVal = visitanteEl ? (visitanteEl.value || visitanteEl.textContent || '').trim() : '';

  const curWinner = winnerEl.value;

  winnerEl.innerHTML = `
    <option value="">— Ganador —</option>
    ${localVal && ALL_TEAMS.includes(localVal) ? `<option value="${localVal}">${localVal}</option>` : ''}
    ${visitanteVal && ALL_TEAMS.includes(visitanteVal) ? `<option value="${visitanteVal}">${visitanteVal}</option>` : ''}
  `;
  if (curWinner === localVal || curWinner === visitanteVal) {
    winnerEl.value = curWinner;
  } else {
    winnerEl.value = '';
  }
}

async function saveElimPredRow(code) {
  const uid = currentViewUser;
  if (!uid) { showToast('Selecciona un participante primero'); return; }
  if (uid !== getMyId()) { showToast('❌ No puedes modificar las predicciones de otro participante'); return; }
  if (getMatchLockStatusByKey(code, true)) { showToast('❌ Este partido ya está bloqueado'); return; }

  const localEl = document.getElementById('local-' + code);
  const visitanteEl = document.getElementById('visitante-' + code);
  const winnerEl = document.getElementById('winner-' + code);

  const local = localEl ? (localEl.value || localEl.textContent || '').trim() : '';
  const visitante = visitanteEl ? (visitanteEl.value || visitanteEl.textContent || '').trim() : '';
  const ganador = winnerEl ? winnerEl.value : '';

  if (!cache.predicciones[uid]) cache.predicciones[uid] = { grupos:{}, elim:{}, especiales:{}, especialesTs:{} };

  const data = { local, visitante, ganador };
  const jsonStr = JSON.stringify(data);
  cache.predicciones[uid].elim[code] = jsonStr;

  const { error } = await sb.from('predicciones_elim').upsert({
    participante_id: uid,
    match_code: code,
    ganador: jsonStr
  }, { onConflict: 'participante_id,match_code' });

  if (error) {
    showToast('❌ Error al guardar');
  } else {
    showToast('✅ Guardado');
    if (typeof currentElimView !== 'undefined' && currentElimView === 'bracket') {
      renderElimBracketView();
    } else {
      renderElimListView();
    }
  }
}

// ===================== PRED ELIM =====================
let currentElimView = 'list';

function areGroupsFullyPredicted(uid) {
  if (!uid) return false;
  let filledCount = 0;
  const preds = (cache.predicciones[uid] || {}).grupos || {};
  GRUPOS.forEach(g => {
    g.partidos.forEach(m => {
      const key = `G${g.id}_${m.n}`;
      const pred = preds[key];
      if (pred && pred.gl !== '' && pred.gl !== undefined && pred.gv !== '' && pred.gv !== undefined) {
        filledCount++;
      }
    });
  });
  return filledCount === 72;
}

function renderElimPred(){
  const c=document.getElementById('elim-pred-content');
  if(!c) return;
  
  let headerHtml = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px;">
      <div id="pred-user-selector-elim"></div>
      <div class="view-toggle" style="display:flex; gap:8px;">
        <button id="btn-view-list" class="btn btn-sm ${currentElimView === 'list' ? 'btn-accent' : ''}" onclick="toggleElimView('list')">Vista Lista</button>
        <button id="btn-view-bracket" class="btn btn-sm ${currentElimView === 'bracket' ? 'btn-accent' : ''}" onclick="toggleElimView('bracket')">Vista Cuadro</button>
      </div>
    </div>
    <div id="elim-view-container"></div>
  `;
  c.innerHTML = headerHtml;
  document.getElementById('pred-user-selector-elim').innerHTML=renderUserSelector('switchPredUserElim');
  
  if(!cache.participantes.length){ 
    document.getElementById('elim-view-container').innerHTML='<div class="empty-state"><div class="ei">👥</div><p>Añade participantes primero.</p></div>'; 
    return; 
  }

  const uid = currentViewUser;
  const modo = cache.configModo || 'interactivo';
  const groupIsLocked = getMatchLockStatusByKey('GA_1', false); // Arbitrary group match to check if groups are locked by time

  if (modo === 'interactivo' && !areGroupsFullyPredicted(uid) && !groupIsLocked) {
    document.getElementById('elim-view-container').innerHTML = `
      <div class="empty-state" style="margin-top:24px;">
        <div class="ei">🔒</div>
        <p style="font-size:16px; color:var(--text); margin-bottom:8px;"><strong>Eliminatorias Bloqueadas</strong></p>
        <p style="font-size:14px; color:var(--text2); max-width:400px; margin:0 auto;">Debes completar todas las predicciones de la Fase de Grupos (72 partidos) para desbloquear y predecir la fase final.</p>
      </div>
    `;
    return;
  }

  if (currentElimView === 'bracket') {
    renderElimBracketView();
  } else {
    renderElimListView();
  }
}

function toggleElimView(view) {
  currentElimView = view;
  const bl = document.getElementById('btn-view-list');
  const bb = document.getElementById('btn-view-bracket');
  if(bl) bl.className = view === 'list' ? 'btn btn-sm btn-accent' : 'btn btn-sm';
  if(bb) bb.className = view === 'bracket' ? 'btn btn-sm btn-accent' : 'btn btn-sm';
  
  if (view === 'list') {
    renderElimListView();
  } else {
    renderElimBracketView();
  }
}

function renderElimListView() {
  const container = document.getElementById('elim-view-container');
  if (!container) return;
  const uid=currentViewUser;
  const isMe = uid === getMyId();
  const disStr = isMe ? '' : ' disabled';
  let html='';
  
  ELIM_PHASES.forEach(phase=>{
    html+=`<div class="bracket-phase"><div class="bracket-phase-title">${phase.name}</div>`;
    phase.partidos.forEach(m=>{
      const predVal = uid ? (((cache.predicciones[uid]||{}).elim||{})[m.code]) : null;
      let predWinner = '';
      if (predVal) {
        if (predVal.startsWith('{')) {
          try { predWinner = JSON.parse(predVal).ganador || ''; } catch(e) { predWinner = predVal; }
        } else {
          predWinner = predVal;
        }
      }

      const displayLocal = resolveTeamForSlot(m.local, uid);
      const displayVisitante = resolveTeamForSlot(m.visitante, uid);

      const res=(cache.resultados.elim||{})[m.code];
      const vsText = res ? `<span class="sa-result-tag">✓ ${res}</span>` : 'VS';

      const isLocked = getMatchLockStatusByKey(m.code, true);
      let selectHtml = '';
      if (!isMe && !isLocked) {
         selectHtml = `<div style="font-size:12px;color:var(--text3);padding:8px 0;text-align:center">🔒 Oculto</div>`;
      } else {
         const dStr = (isMe && !isLocked) ? '' : ' disabled';
         selectHtml = `
            <select id="winner-${m.code}" class="winner-select ${predWinner ? 'chosen' : ''}" onchange="saveElimPredRow('${m.code}')"${dStr}>
              <option value="">— Ganador —</option>
              ${displayLocal && ALL_TEAMS.includes(displayLocal) ? `<option value="${displayLocal}" ${predWinner === displayLocal ? 'selected' : ''}>${displayLocal}</option>` : ''}
              ${displayVisitante && ALL_TEAMS.includes(displayVisitante) ? `<option value="${displayVisitante}" ${predWinner === displayVisitante ? 'selected' : ''}>${displayVisitante}</option>` : ''}
            </select>
         `;
      }

      html+=`
        <div class="elim-row ${predVal ? 'has-pred' : ''}">
          <div class="match-code">${m.code}<br><span style="font-size:10px;color:var(--text3)">${m.fecha}</span></div>
          <div id="local-${m.code}" class="elim-team-label" style="font-weight:700">${getFlagHtml(displayLocal)}${displayLocal}</div>
          <div class="elim-vs">${vsText}</div>
          <div id="visitante-${m.code}" class="elim-team-label" style="font-weight:700; text-align:right">${getFlagHtml(displayVisitante)}${displayVisitante}</div>
          <div class="elim-winner-block">
            ${selectHtml}
          </div>
        </div>
      `;
    });
    html+='</div>';
  });
  container.innerHTML=html;
}

function renderElimBracketView() {
  const container = document.getElementById('elim-view-container');
  if (!container) return;
  const uid=currentViewUser;
  const isMe = uid === getMyId();
  const disStr = isMe ? '' : ' disabled';

  let html = '<div class="bracket-wrapper"><div class="bracket-layout">';
  
  ELIM_PHASES.forEach(phase => {
    if (phase.name.includes('Tercer Puesto')) return; // Skip 3rd place in standard bracket view
    
    // Shorten phase names
    let shortName = phase.name.replace(/^[🏆🥉🟣🟢🟠🔵] /,'').split(' —')[0];
    
    html += `<div class="bracket-column">`;
    html += `<div class="bracket-col-title">${shortName}</div>`;
    
    phase.partidos.forEach(m => {
      const predVal = uid ? (((cache.predicciones[uid]||{}).elim||{})[m.code]) : null;
      let predWinner = '';
      if (predVal) {
        if (predVal.startsWith('{')) {
          try { predWinner = JSON.parse(predVal).ganador || ''; } catch(e) { predWinner = predVal; }
        } else {
          predWinner = predVal;
        }
      }

      const displayLocal = resolveTeamForSlot(m.local, uid);
      const displayVisitante = resolveTeamForSlot(m.visitante, uid);

      html += `
        <div class="bracket-match">
          <div class="bm-code">${m.code} <span style="font-size:9px;color:var(--text3);margin-left:4px">${m.fecha}</span></div>
          <div class="bm-team ${predWinner === displayLocal && predWinner ? 'winner' : ''}">${getFlagHtml(displayLocal)} ${displayLocal || '—'}</div>
          <div class="bm-team ${predWinner === displayVisitante && predWinner ? 'winner' : ''}">${getFlagHtml(displayVisitante)} ${displayVisitante || '—'}</div>
          <div style="margin-top:6px; display:none;">
            <input type="hidden" id="local-${m.code}" value="${displayLocal}">
            <input type="hidden" id="visitante-${m.code}" value="${displayVisitante}">
          </div>
          <div style="margin-top:6px">
            ${(() => {
              const isLocked = getMatchLockStatusByKey(m.code, true);
              if (!isMe && !isLocked) {
                return '<div style="font-size:11px;color:var(--text3);text-align:center;padding:4px">🔒 Oculto</div>';
              }
              const dStr = (isMe && !isLocked) ? '' : ' disabled';
              return `
                <select id="winner-${m.code}" class="winner-select ${predWinner ? 'chosen' : ''}" style="width:100%; font-size:12px; padding:4px;" onchange="saveElimPredRow('${m.code}')"${dStr}>
                  <option value="">— Seleccionar —</option>
                  ${displayLocal && ALL_TEAMS.includes(displayLocal) ? `<option value="${displayLocal}" ${predWinner === displayLocal ? 'selected' : ''}>${displayLocal}</option>` : ''}
                  ${displayVisitante && ALL_TEAMS.includes(displayVisitante) ? `<option value="${displayVisitante}" ${predWinner === displayVisitante ? 'selected' : ''}>${displayVisitante}</option>` : ''}
                </select>
              `;
            })()}
          </div>
        </div>
      `;
    });
    
    html += `</div>`; // End column
  });
  
  html += '</div></div>';
  container.innerHTML = html;
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
  if(csa) csa.innerHTML = adminMode
    ? `<button class="btn btn-accent btn-sm" onclick="openCustomSpecialModal()">+ A&ntilde;adir Pregunta</button>
       <button class="btn btn-sm" style="margin-left:6px" onclick="openBonusAciertosConfig()">🎯 Bonus aciertos</button>`
    : '';

  // Render bonus panel (visible for all)
  renderBonusAciertosPanel();
  const isMe = uid === getMyId();
  const disStr = isMe ? '' : ' disabled';

  ['select-campeon','select-subcampeon','input-pichichi','input-pichichiEspana','select-tercero','select-mas-goles','select-mas-tarjetas'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.disabled = !isMe;
  });

  if(uid){
    const esp=((cache.predicciones[uid]||{}).especiales)||{};
    const ts=((cache.predicciones[uid]||{}).especialesTs)||{};
    if(esp.campeon) document.getElementById('select-campeon').value=esp.campeon;
    if(esp.subcampeon) document.getElementById('select-subcampeon').value=esp.subcampeon;
    if(esp.pichichi) document.getElementById('input-pichichi').value=esp.pichichi;
    if(esp.pichichiEspana) document.getElementById('input-pichichiEspana').value=esp.pichichiEspana;
    if(esp.tercero) document.getElementById('select-tercero').value=esp.tercero;
    if(esp.masGoles) document.getElementById('select-mas-goles').value=esp.masGoles;
    if(esp.masTarjetas) document.getElementById('select-mas-tarjetas').value=esp.masTarjetas;
    ['campeon','subcampeon','pichichi','pichichiEspana','tercero','masGoles','masTarjetas'].forEach(k=>renderSpecialTimestamp(k,ts[k]));
  } else {
    ['campeon','subcampeon','pichichi','pichichiEspana','tercero','masGoles','masTarjetas'].forEach(k=>{
      const el=document.getElementById('ts-'+k);
      if(el){el.className='pred-timestamp empty';el.innerHTML='';}
    });
  }

  const customGrid = document.getElementById('custom-special-grid');
  if(customGrid){
    const customs = (cache.normasRaw||[]).filter(n=>n.tipo==='special_custom');
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
        <input class="form-input" placeholder="Tu respuesta..." style="margin-top:5px" value="${esp[key]||''}" onblur="saveSpecial('${key}',this.value)"${disStr}>
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
  if(uid !== getMyId()) { showToast('❌ No puedes modificar las predicciones de otro participante'); return; }
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
