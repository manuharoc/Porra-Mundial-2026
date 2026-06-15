// ===================== DASHBOARD =====================
function renderDashboard(){
  document.getElementById('dash-participantes').textContent = cache.participantes.length;
  applySidebarProfile();
  renderCalendar();




  const leaderboardEl = document.getElementById('dash-leaderboard');
  if (leaderboardEl) {
    if (!cache.participantes.length) {
      leaderboardEl.innerHTML = '<div style="color:var(--text3);font-size:12px;text-align:center;padding:16px">Crea o únete a un participante para comenzar.</div>';
    } else {
      const scores = cache.participantes.map(p => ({ ...p, ...calcScore(p.id) })).sort((a, b) => b.total - a.total);
      // Take top 5
      const topScores = scores.slice(0, 5);
      const medals = ['🥇', '🥈', '🥉'];
      leaderboardEl.innerHTML = topScores.map((p, i) => {
        const pos = i + 1;
        const posLabel = medals[i] || `<span style="font-size:12px;font-weight:bold;color:var(--text3);width:20px;display:inline-block;text-align:center">${pos}</span>`;
        const youMark = p.id === getMyId() ? '<span class="you-badge" style="margin-left:4px">yo</span>' : '';
        const adminMark = p.isAdmin ? '👑' : '';
        return `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--s3);border:1px solid var(--border2);border-radius:8px;font-size:13px;">
            <div style="display:flex;align-items:center;gap:10px;min-width:0;">
              <span style="font-size:16px;flex-shrink:0;">${posLabel}</span>
              ${renderAvatarHtml(p, 'sm')}
              <span style="font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;">${p.name}${youMark}${adminMark}</span>
            </div>
            <div style="font-weight:800;color:var(--accent3);font-family:'Outfit',sans-serif;flex-shrink:0;">${p.total} pts</div>
          </div>
        `;
      }).join('');
    }
  }
  renderInsights();
}

function parseMatchTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return 0;
  const parts = dateStr.split(' ');
  const day = parseInt(parts[0]);
  const month = parts[1].startsWith('jun') ? 5 : 6;
  let tStr = timeStr.replace('*', '');
  let tParts = tStr.split(':');
  let h = parseInt(tParts[0]);
  let m = parseInt(tParts[1]);
  return new Date(2026, month, day, h, m, 0).getTime();
}

function renderInsights() {
  const container = document.getElementById('dash-insights');
  if(!container) return;

  if(!cache.participantes.length) {
    container.innerHTML = '<div class="stat-card" style="grid-column: 1 / -1;"><div class="stat-label" style="text-align:center;">Esperando participantes...</div></div>';
    return;
  }

  const campeones = {};
  let totalCampeon = 0;
  Object.values(cache.predicciones).forEach(p => {
    if(p.especiales && p.especiales.campeon) {
      campeones[p.especiales.campeon] = (campeones[p.especiales.campeon] || 0) + 1;
      totalCampeon++;
    }
  });
  
  let favMundialHtml = '<div class="stat-sub">Sin datos aún</div>';
  if (totalCampeon > 0) {
    const sorted = Object.entries(campeones).sort((a,b)=>b[1]-a[1]);
    const top = sorted[0];
    const pct = Math.round((top[1] / totalCampeon) * 100);
    favMundialHtml = `<div class="stat-val" style="font-size:18px">${top[0]}</div><div class="stat-sub">${pct}% de los votos</div>`;
  }

  const now = new Date().getTime();
  let nextMatch = null;
  
  // Find in Groups
  for(const g of GRUPOS) {
    for(const m of g.partidos) {
      const mTime = parseMatchTime(m.fecha, m.hora);
      // Keep showing it up to 2.5 hours after start
      if(mTime >= now - 9000000) {
        if(!nextMatch || mTime < nextMatch.time) {
          nextMatch = { ...m, key: `G${g.id}_${m.n}`, time: mTime, isElim: false };
        }
      }
    }
  }

  // Find in Elim
  for(const phase of ELIM_PHASES) {
    for(const m of phase.partidos) {
      const mTime = parseMatchTime(m.fecha, m.hora);
      if(mTime >= now - 9000000) {
        if(!nextMatch || mTime < nextMatch.time) {
          nextMatch = { ...m, key: m.code, time: mTime, isElim: true };
        }
      }
    }
  }

  let nextMatchHtml = '<div class="stat-sub">Sin partidos próximos</div>';
  if (nextMatch) {
    let localName = nextMatch.isElim ? (resolveTeamForSlot(nextMatch.local, null) || nextMatch.local) : nextMatch.local;
    let visitName = nextMatch.isElim ? (resolveTeamForSlot(nextMatch.visitante, null) || nextMatch.visitante) : nextMatch.visitante;

    let localW = 0, draw = 0, visitW = 0, totalP = 0;
    Object.values(cache.predicciones).forEach(p => {
      if (!nextMatch.isElim) {
        if(p.grupos && p.grupos[nextMatch.key]) {
          const pred = p.grupos[nextMatch.key];
          if(pred.gl !== '' && pred.gv !== '' && pred.gl !== undefined) {
            totalP++;
            if (parseInt(pred.gl) > parseInt(pred.gv)) localW++;
            else if (parseInt(pred.gl) < parseInt(pred.gv)) visitW++;
            else draw++;
          }
        }
      } else {
        if(p.elim && p.elim[nextMatch.key]) {
          const pred = p.elim[nextMatch.key];
          let winner = pred;
          try { if(winner.startsWith('{')) winner = JSON.parse(winner).ganador; } catch(e){}
          if (winner) {
            totalP++;
            if (winner === localName) localW++;
            else if (winner === visitName) visitW++;
          }
        }
      }
    });

    if (totalP > 0) {
      const pL = Math.round((localW/totalP)*100);
      const pE = Math.round((draw/totalP)*100);
      const pV = Math.round((visitW/totalP)*100);
      let barHtml = nextMatch.isElim ? 
        `<div style="display:flex;height:6px;width:100%;background:var(--s4);border-radius:3px;overflow:hidden;margin-bottom:4px;">
           <div style="width:${pL}%;background:var(--green)"></div>
           <div style="width:${pV}%;background:var(--red)"></div>
         </div>
         <span style="color:var(--green)">${pL}%</span> - <span style="color:var(--red)">${pV}%</span>` :
        `<div style="display:flex;height:6px;width:100%;background:var(--s4);border-radius:3px;overflow:hidden;margin-bottom:4px;">
           <div style="width:${pL}%;background:var(--green)"></div>
           <div style="width:${pE}%;background:var(--text3)"></div>
           <div style="width:${pV}%;background:var(--red)"></div>
         </div>
         <span style="color:var(--green)">${pL}%</span> - <span style="color:var(--text3)">${pE}%</span> - <span style="color:var(--red)">${pV}%</span>`;

      nextMatchHtml = `
        <div class="stat-val" style="font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          <span style="font-size:10px;color:var(--text3);margin-right:6px">${nextMatch.hora}</span>
          ${localName} vs ${visitName}
        </div>
        <div class="stat-sub" style="margin-top:4px;">
          ${barHtml}
        </div>
      `;
    } else {
      nextMatchHtml = `
        <div class="stat-val" style="font-size:14px">
          <span style="font-size:10px;color:var(--text3);margin-right:6px">${nextMatch.hora}</span>
          ${localName} vs ${visitName}
        </div>
        <div class="stat-sub">Nadie ha predicho aún</div>`;
    }
  }

  container.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">🏆 Favorito de la Liga</div>
      ${favMundialHtml}
    </div>
    <div class="stat-card">
      <div class="stat-label">🔜 Próximo Partido</div>
      ${nextMatchHtml}
    </div>
  `;
}

let currentCalendarDate = null;

function renderCalendar(dateStr) {
  const c = document.getElementById('dashboard-calendar');
  if(!c) return;
  
  // 1. Collect all matches
  const allMatches = [];
  
  // Grupos
  GRUPOS.forEach(g => {
    g.partidos.forEach(m => {
      const key = `G${g.id}_${m.n}`;
      const res = (cache.resultados.grupos || {})[key];
      const isPlayed = res && res.gl !== '' && res.gl !== undefined;
      const resultText = isPlayed ? `${res.gl} – ${res.gv}` : '';
      allMatches.push({ ...m, stage: `Grupo ${g.id}`, key, isPlayed, resultText, isElim: false });
    });
  });
  
  // Eliminatorias
  ELIM_PHASES.forEach(phase => {
    // Short name
    let shortName = phase.name.replace(/^[🏆🥉🟣🟢🟠🔵] /,'').split(' —')[0];
    phase.partidos.forEach(m => {
      const localResolved = resolveTeamForSlot(m.local, null) || m.local;
      const visitanteResolved = resolveTeamForSlot(m.visitante, null) || m.visitante;
      const res = (cache.resultados.elim || {})[m.code];
      const isPlayed = !!res;
      const resultText = isPlayed ? `✓ ${res}` : '';
      allMatches.push({ ...m, local: localResolved, visitante: visitanteResolved, stage: shortName, key: m.code, isPlayed, resultText, isElim: true });
    });
  });

  // Extract unique dates (only the day and month, like "11 jun")
  const uniqueDates = [...new Set(allMatches.map(m => {
    const parts = m.fecha.split(' ');
    return parts[0] + ' ' + parts[1].toLowerCase();
  }))];
  
  // Sort them chronologically
  uniqueDates.sort((a,b) => {
    const parseDate = (d) => {
      const parts = d.split(' ');
      const day = parseInt(parts[0]);
      const month = parts[1].startsWith('jun') ? 5 : 6;
      return new Date(2026, month, day).getTime();
    };
    return parseDate(a) - parseDate(b);
  });
  
  if (!currentCalendarDate) {
    const today = new Date();
    const todayStr = `${today.getDate()} ${today.getMonth() === 5 ? 'jun' : 'jul'}`;
    if (uniqueDates.includes(todayStr)) {
      currentCalendarDate = todayStr;
    } else {
      currentCalendarDate = uniqueDates[0];
    }
  }
  
  if (dateStr) currentCalendarDate = dateStr;
  
  // Build Nav
  let html = '<div class="calendar-nav">';
  uniqueDates.forEach(d => {
    const act = d === currentCalendarDate ? ' active' : '';
    html += `<div class="calendar-day-pill${act}" onclick="renderCalendar('${d}')">${d}</div>`;
  });
  html += '</div>';
  
  // Build matches for selected date
  html += '<div class="calendar-matches">';
  const dayMatches = allMatches.filter(m => m.fecha.toLowerCase().startsWith(currentCalendarDate));
  
  // Sort by time
  dayMatches.sort((a,b) => {
    const ah = parseInt(a.hora.replace('*','').split(':')[0]);
    const am = parseInt(a.hora.replace('*','').split(':')[1]);
    const bh = parseInt(b.hora.replace('*','').split(':')[0]);
    const bm = parseInt(b.hora.replace('*','').split(':')[1]);
    return (ah*60+am) - (bh*60+bm);
  });
  
  if (!dayMatches.length) {
    html += '<div style="text-align:center;color:var(--text3);padding:20px;font-size:13px">No hay partidos este día.</div>';
  } else {
    dayMatches.forEach(m => {
      let resHtml = '';
      if (m.isPlayed) {
        resHtml = `<div class="cal-match-result ${m.isElim ? 'elim' : ''}">${m.resultText}</div>`;
      } else {
        resHtml = `<div style="font-size:12px;color:var(--text3);font-weight:700">VS</div>`;
      }
      
      const localFlag = ALL_TEAMS.includes(m.local) ? getFlagHtml(m.local) : '';
      const visitanteFlag = ALL_TEAMS.includes(m.visitante) ? getFlagHtml(m.visitante) : '';
      
      let predsHtml = '';
      if (cache.participantes.length > 0) {
        let itemsHtml = '';
        cache.participantes.forEach(p => {
          let predVal = null;
          const userPreds = cache.predicciones[p.id] || {};
          
          if (!m.isElim) {
            const pGroup = userPreds.grupos?.[m.key];
            if (pGroup && pGroup.gl !== '' && pGroup.gv !== '' && pGroup.gl !== undefined) {
              predVal = `<span style="font-weight:700">${pGroup.gl} - ${pGroup.gv}</span>`;
            }
          } else {
            const pElim = userPreds.elim?.[m.key];
            if (pElim) {
               let winner = pElim;
               try { if (winner.startsWith('{')) winner = JSON.parse(winner).ganador; } catch(e){}
               if (winner) {
                  predVal = `<span style="font-weight:600">${ALL_TEAMS.includes(winner) ? getFlagHtml(winner) : ''}${winner}</span>`;
               }
            }
          }
          
          if (predVal) {
             itemsHtml += `
               <div style="display:inline-flex; align-items:center; gap:6px; background:var(--s2); border:1px solid var(--border2); padding:4px 8px; border-radius:12px; flex-shrink:0;">
                 ${renderAvatarHtml(p, 'sm')}
                 <span style="font-size:12px; color:var(--text); white-space:nowrap;">${predVal}</span>
               </div>
             `;
          }
        });
        
        if (itemsHtml !== '') {
          predsHtml = `
            <div style="display:flex; flex-wrap:nowrap; overflow-x:auto; gap:8px; padding:8px 16px; background:var(--s1); border-top:1px solid var(--border2); scrollbar-width:none; -ms-overflow-style:none;">
              ${itemsHtml}
            </div>
          `;
        }
      }
      
      html += `
        <div style="background:var(--s2); border:1px solid var(--border2); border-radius:var(--r-lg); margin-bottom:12px; overflow:hidden;">
          <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px;">
            <div class="cal-match-info">
              <div class="cal-match-time">${m.stage} · ${m.hora}</div>
              <div class="cal-match-teams">
                <span>${localFlag}${m.local}</span> 
                <span style="color:var(--text3);font-size:10px;margin:0 4px">—</span> 
                <span>${visitanteFlag}${m.visitante}</span>
              </div>
              <div style="font-size:10px;color:var(--text3);margin-top:4px">${m.sede}</div>
            </div>
            ${resHtml}
          </div>
          ${predsHtml}
        </div>
      `;
    });
  }
  html += '</div>';
  
  c.innerHTML = html;
  
  // Auto-scroll the nav to the active pill
  setTimeout(() => {
    const nav = document.querySelector('.calendar-nav');
    const activePill = nav?.querySelector('.active');
    if (nav && activePill) {
      activePill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, 50);
}

// ===================== RANKING =====================
function renderRanking(){
  const scores = cache.participantes.map(p=>({...p,...calcScore(p.id)})).sort((a,b)=>b.total-a.total);
  const tbody = document.getElementById('full-ranking-body');
  if(!tbody) return;

  if(!scores.length){
    tbody.innerHTML='<tr><td colspan="11" style="text-align:center;color:var(--text3);padding:28px">Sin participantes</td></tr>';
    const mob = document.getElementById('ranking-mobile-list');
    if(mob) mob.innerHTML='<div class="empty-state"><div class="ei">🏆</div><p>Sin participantes aún.</p></div>';
    return;
  }

  // ---- Desktop tabla ----
  tbody.innerHTML = scores.map((p,i)=>{
    const pos=i+1, bc=pos===1?'pos-1':pos===2?'pos-2':pos===3?'pos-3':'pos-n';
    const youMark=p.id===getMyId()?'<span class="you-badge">yo</span>':'';
    const adminMark=p.isAdmin?'<span class="admin-tag">👑</span>':'';
    let trendHtml = '';
    if (window.previousRankingData) {
      const old = window.previousRankingData.find(x => x.id === p.id);
      if (old) {
        if (old.pos > pos) trendHtml = `<span style="color:var(--green);font-size:12px;margin-left:4px;display:inline-block;animation:pop 0.3s ease;">⬆️${old.pos - pos}</span>`;
        else if (old.pos < pos) trendHtml = `<span style="color:var(--red);font-size:12px;margin-left:4px;display:inline-block;animation:pop 0.3s ease;">⬇️${pos - old.pos}</span>`;
        else trendHtml = `<span style="color:var(--text3);font-size:12px;margin-left:4px;">-</span>`;
      }
    }
    return `<tr><td><span class="pos-badge ${bc}">${pos}</span>${trendHtml}</td><td class="name-col"><div style="display:flex;align-items:center;gap:8px">${renderAvatarHtml(p, 'sm')}<span>${p.name}${youMark}${adminMark}</span></div></td><td class="pts-col">${p.grupos}</td><td>${p.r32}</td><td>${p.octavos}</td><td>${p.cuartos}</td><td>${p.semis}</td><td>${p.final}</td><td style="color:var(--accent2)">${p.campeon}</td><td>${p.sub}</td><td class="pts-col" style="font-size:18px">${p.total}</td></tr>`;
  }).join('');

  // ---- Móvil cards ----
  const mob = document.getElementById('ranking-mobile-list');
  if(!mob) return;
  const medals = ['🥇','🥈','🥉'];
  mob.innerHTML = scores.map((p,i)=>{
    const pos=i+1;
    const topClass = pos<=3 ? 'top-'+pos : '';
    const posLabel = medals[i] || `<span style="font-size:14px;color:var(--text3)">${pos}</span>`;
    const youMark = p.id===getMyId() ? '<span class="you-badge">yo</span>' : '';
    const adminMark = p.isAdmin ? '👑 ' : '';
    const esp = ((cache.predicciones[p.id]||{}).especiales)||{};
    const champStr = esp.campeon ? `🏆 ${esp.campeon}` : '';
    let trendHtml = '';
    if (window.previousRankingData) {
      const old = window.previousRankingData.find(x => x.id === p.id);
      if (old) {
        if (old.pos > pos) trendHtml = `<div style="color:var(--green);font-size:10px;text-align:center;margin-top:2px;animation:pop 0.3s ease;">⬆️${old.pos - pos}</div>`;
        else if (old.pos < pos) trendHtml = `<div style="color:var(--red);font-size:10px;text-align:center;margin-top:2px;animation:pop 0.3s ease;">⬇️${pos - old.pos}</div>`;
        else trendHtml = `<div style="color:var(--text3);font-size:10px;text-align:center;margin-top:2px;">-</div>`;
      }
    }
    return `<div class="ranking-card ${topClass}">
      <div class="rc-pos" style="display:flex;flex-direction:column;justify-content:center;">${posLabel}${trendHtml}</div>
      <div class="rc-info">
        <div class="rc-name" style="display:flex;align-items:center;gap:6px">${renderAvatarHtml(p, 'sm')} <span>${adminMark}${p.name}${youMark}</span></div>
        <div class="rc-detail">Grupos: <b>${p.grupos}</b> · Elim: <b>${p.r32+p.octavos+p.cuartos+p.semis+p.final}</b> · Esp: <b>${p.campeon+p.sub}</b>${champStr?' · '+champStr:''}</div>
      </div>
      <div class="rc-pts">${p.total}<span> pts</span></div>
    </div>`;
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
  renderParticipants();
  renderRanking();
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
  renderDashboard();
  renderParticipants();
  renderRanking();
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
    <div style="display:flex; flex-direction:column; gap:10px;">
      <button class="btn btn-accent btn-full" onclick="setPredUser('${uid}');closeModal('modal-participant');goto('grupos-pred')">${uid === getMyId() ? 'Modificar mis predicciones' : 'Ver predicciones de ' + p.name}</button>
      ${uid !== getMyId() ? `<button class="btn btn-full" onclick="closeModal('modal-participant');openVsModal('${uid}')">⚔️ Cara a Cara vs ${p.name}</button>` : ''}
    </div>
  `;
  document.getElementById('modal-participant').classList.add('open');
}

function setPredUser(uid){ currentViewUser=uid; }


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
              <div class="flag-name">${getFlagHtml(eq.name)}${eq.name}</div></td>
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
async function saveGameMode(){
  if(!isAdmin()) return;
  const val = document.getElementById('config-game-mode').value;
  cache.configModo = val;
  await saveNormasToSupabase();
  showToast('✅ Modo de juego actualizado');
}

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

  const modeSel = document.getElementById('config-game-mode');
  if(modeSel) modeSel.value = cache.configModo || 'interactivo';

  const notifStatus = document.getElementById('notif-status');
  if (notifStatus && "Notification" in window) {
    if (Notification.permission === "granted") {
      notifStatus.textContent = "✅ Notificaciones activadas.";
      notifStatus.style.color = "var(--green)";
    } else if (Notification.permission === "denied") {
      notifStatus.textContent = "❌ Notificaciones denegadas por el navegador.";
      notifStatus.style.color = "var(--red)";
    }
  }

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


// ===================== BONUS ACIERTOS UI =====================
function renderBonusAciertosPanel() {
  const panel = document.getElementById('bonus-aciertos-panel');
  if(!panel) return;
  const bonus = cache.bonusAciertos;
  if(!bonus || !Array.isArray(bonus)) return;
  
  const sortedBonus = [...bonus].sort((a,b) => a.n - b.n);
  
  let html = `<div style="font-family:'Outfit',sans-serif;font-size:18px;font-weight:700;color:var(--text);margin-bottom:12px;">🎯 Bonus Aciertos Totales</div>
              <div style="font-size:13px;color:var(--text2);margin-bottom:16px;">Acumula puntos extra acertando el resultado en la fase de grupos y los ganadores en las eliminatorias. Solo recibes los puntos del nivel más alto que hayas superado (no es acumulativo).</div>`;
  
  html += `<div class="special-grid">`;
  for(const tier of sortedBonus) {
    html += `<div class="special-card" style="text-align:center;padding:16px">
               <div style="font-size:24px;font-weight:800;color:var(--accent);margin-bottom:4px">+${tier.pts} pts</div>
               <div style="font-size:12px;color:var(--text3)">Al llegar a <strong>${tier.n}</strong> aciertos</div>
             </div>`;
  }
  html += `</div>`;
  
  panel.innerHTML = html;
}

function openBonusAciertosConfig() {
  const tbody = document.getElementById('bonus-aciertos-tbody');
  if(!tbody) return;
  tbody.innerHTML = '';
  const bonus = cache.bonusAciertos || [];
  const sortedBonus = [...bonus].sort((a,b) => a.n - b.n);
  
  for(const tier of sortedBonus) {
    addBonusAciertoRowHTML(tier.n, tier.pts);
  }
  
  openModal('modal-bonus-aciertos');
}

function addBonusAciertoRow() {
  addBonusAciertoRowHTML('', '');
}

function addBonusAciertoRowHTML(nVal, ptsVal) {
  const tbody = document.getElementById('bonus-aciertos-tbody');
  if(!tbody) return;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="number" class="form-input acierto-n" value="${nVal}" placeholder="Ej: 10" style="padding:6px;min-height:0"></td>
    <td><input type="number" class="form-input acierto-pts" value="${ptsVal}" placeholder="Ej: 15" style="padding:6px;min-height:0"></td>
    <td><button class="btn btn-sm btn-danger" onclick="this.parentElement.parentElement.remove()">✕</button></td>
  `;
  tbody.appendChild(tr);
}

async function saveBonusAciertosConfig() {
  const tbody = document.getElementById('bonus-aciertos-tbody');
  if(!tbody) return;
  const rows = tbody.querySelectorAll('tr');
  const newBonus = [];
  rows.forEach(tr => {
    const n = parseInt(tr.querySelector('.acierto-n').value);
    const pts = parseInt(tr.querySelector('.acierto-pts').value);
    if(!isNaN(n) && !isNaN(pts)) {
      newBonus.push({ n, pts });
    }
  });
  
  cache.bonusAciertos = newBonus;
  await saveNormasToSupabase();
  showToast('Bonus Aciertos actualizado correctamente');
  closeModal('modal-bonus-aciertos');
  renderBonusAciertosPanel();
}
