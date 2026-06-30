// ===================== BONUS ACIERTOS =====================
const ELIM_ROUND_CODES = {
  r32:     ['M73','M74','M75','M76','M77','M78','M79','M80','M81','M82','M83','M84','M85','M86','M87','M88'],
  octavos: ['M89','M90','M91','M92','M93','M94','M95','M96'],
  cuartos: ['M97','M98','M99','M100'],
  semis:   ['M101','M102'],
  final:   ['M104']
};

function calcBonusAciertos(uid){
  const bonus = cache.bonusAciertos;
  if(!bonus || !Array.isArray(bonus)) return 0;
  const preds = cache.predicciones[uid] || {};
  const eRes = cache.resultados.elim||{};
  const ePreds = preds.elim||{};
  const gPreds = preds.grupos||{}, gRes = cache.resultados.grupos||{};
  
  let totalHits = 0;

  // Aciertos en fase de grupos (ganador, perdedor, empate o exacto)
  for(const key in gPreds){
    const p=gPreds[key], r=gRes[key];
    if(!r||r.gl===''||r.gl===undefined) continue;
    const pg=parseInt(p.gl),pv=parseInt(p.gv),rg=parseInt(r.gl),rv=parseInt(r.gv);
    if(pg===rg&&pv===rv){ totalHits++; continue; }
    const pw=pg>pv?'L':pg<pv?'V':'D', rw=rg>rv?'L':rg<rv?'V':'D';
    if(pw===rw) totalHits++;
  }

  // Aciertos en eliminatorias (ganador que pasa de ronda)
  for(const code in ePreds){
    let w = ePreds[code];
    let r = eRes[code];
    if(!w || !r) continue;
    if(typeof w === 'object' && w !== null) { w = w.ganador; }
    else if(typeof w === 'string' && w.startsWith('{')) { try { w = JSON.parse(w).ganador; } catch(e){} }
    if(typeof r === 'object' && r !== null) { r = r.ganador; }
    else if(typeof r === 'string' && r.startsWith('{')) { try { r = JSON.parse(r).ganador; } catch(e){} }
    if(w === r) totalHits++;
  }

  // Buscar el escalón alcanzado
  let awardedPts = 0;
  const sortedBonus = [...bonus].sort((a,b) => a.n - b.n);
  for(const tier of sortedBonus){
    if(totalHits >= tier.n) {
      awardedPts = tier.pts; // Toma el valor del último nivel superado
    }
  }
  
  return awardedPts;
}

// ===================== SCORING =====================
function getNormaPts(fase, descSubstring, defaultVal) {
  if (!cache.normas || !cache.normas.pts) return defaultVal;
  const match = cache.normas.pts.find(p => p.fase === fase && p.desc.toLowerCase().includes(descSubstring.toLowerCase()));
  if (match && match.pts !== undefined && match.pts !== null) return parseInt(match.pts);
  return defaultVal;
}

function calcScore(uid){
  const preds = cache.predicciones[uid] || {};
  let grupos=0, r32=0, octavos=0, cuartos=0, semis=0, final_=0, campeon_=0, sub=0, customPts=0, exactMatches=0, partialMatches=0;
  
  const ptsExact = getNormaPts('Grupos', 'exacto', 3);
  const ptsPartial = getNormaPts('Grupos', 'correcto', 1);
  const ptsR32 = getNormaPts('Ronda 32', '', 4);
  const ptsOctavos = getNormaPts('Octavos', '', 5);
  const ptsCuartos = getNormaPts('Cuartos', '', 6);
  const ptsSemis = getNormaPts('Semis', '', 8);
  const ptsFinal = getNormaPts('Final', '', 10);
  const ptsSub = getNormaPts('Subcampeón', '', 12);
  const ptsCamp = getNormaPts('Campeón 🏆', '', 20);
  const ptsEspana = getNormaPts('España', 'exacto', 10);

  const gPreds = preds.grupos||{}, gRes = cache.resultados.grupos||{};
  for(const key in gPreds){
    const p=gPreds[key], r=gRes[key];
    if(!r||r.gl===''||r.gl===undefined) continue;
    const pg=parseInt(p.gl), pv=parseInt(p.gv), rg=parseInt(r.gl), rv=parseInt(r.gv);
    
    let currentPtsExact = ptsExact;
    const gid = key.charAt(1);
    const mn = parseInt(key.substring(3));
    const g = GRUPOS.find(x=>x.id===gid);
    if(g) {
      const matchObj = g.partidos.find(x=>x.n===mn);
      if(matchObj && (matchObj.local === 'España' || matchObj.visitante === 'España')) {
        currentPtsExact = ptsEspana;
      }
    }

    if(pg===rg&&pv===rv){ grupos+=currentPtsExact; exactMatches++; continue; }
    const pw=pg>pv?'L':pg<pv?'V':'D', rw=rg>rv?'L':rg<rv?'V':'D';
    if(pw===rw) { grupos+=ptsPartial; partialMatches++; }
  }
  const ePreds=preds.elim||{}, eRes=cache.resultados.elim||{};
  for(const code in ePreds){
    let w=ePreds[code];
    let r=eRes[code];
    if(!r||!w) continue;
    
    let pObj = null, rObj = null;
    let predGanador = w;
    let resGanador = r;
    
    if (typeof w === 'object' && w !== null) {
      pObj = w; predGanador = pObj.ganador;
    } else if (typeof w === 'string' && w.startsWith('{')) {
      try { pObj = JSON.parse(w); predGanador = pObj.ganador; } catch(e){}
    }
    if (typeof r === 'object' && r !== null) {
      rObj = r; resGanador = rObj.ganador;
    } else if (typeof r === 'string' && r.startsWith('{')) {
      try { rObj = JSON.parse(r); resGanador = rObj.ganador; } catch(e){}
    }
    
    const m=parseInt(code.replace('M',''));
    let roundPoints = 0;
    
    if (typeof window.resolveActualTeamForSlot === 'function') {
        predGanador = window.resolveActualTeamForSlot(predGanador);
        resGanador = window.resolveActualTeamForSlot(resGanador);
    }
    
    if (predGanador === resGanador) {
       if(m>=73&&m<=88) roundPoints+=ptsR32;
       else if(m>=89&&m<=96) roundPoints+=ptsOctavos;
       else if(m>=97&&m<=100) roundPoints+=ptsCuartos;
       else if((m===101||m===102)) roundPoints+=ptsSemis;
       else if(m===104) roundPoints+=ptsFinal;
    }
    
    if (pObj && rObj && cache.configModo === 'interactivo') {
       let exact = parseInt(pObj.gl) === parseInt(rObj.gl) && parseInt(pObj.gv) === parseInt(rObj.gv);
       if (exact) {
           // Solo se pierden los 5 pts si el usuario marcó prórroga pero NO hubo prórroga
           let predictedProrrogaButNone = pObj.prorroga === true && !rObj.prorroga;
           if (!predictedProrrogaButNone) {
               roundPoints += getNormaPts('Eliminatorias', 'exacto', 5);
           }
       }
       // Si hubo penaltis: la prórroga es obligatoria, no se puntúa por separado cuando hay penaltis
       if (rObj.prorroga && !rObj.penaltis && pObj.prorroga === true) roundPoints += getNormaPts('Eliminatorias', 'prórroga', 2);
       // 3 pts por predecir que llega a penaltis (haber marcado un equipo ganador en penaltis)
       if (rObj.penaltis && pObj.penaltis) roundPoints += getNormaPts('Eliminatorias', 'penaltis', 3);
    }
    
    if(m>=73&&m<=88) r32+=roundPoints;
    else if(m>=89&&m<=96) octavos+=roundPoints;
    else if(m>=97&&m<=100) cuartos+=roundPoints;
    else if((m===101||m===102)) semis+=roundPoints;
    else if(m===104) final_+=roundPoints;
  }
  const esp=preds.especiales||{}, re=cache.resultados.especiales||{};
  if(esp.campeon&&re.campeon&&esp.campeon===re.campeon) campeon_+=ptsCamp;
  if(esp.subcampeon&&re.subcampeon&&esp.subcampeon===re.subcampeon) sub+=ptsSub;
  if(esp.pichichiEspana&&re.pichichiEspana&&esp.pichichiEspana.toLowerCase()===re.pichichiEspana.toLowerCase()) customPts+=getNormaPts('España', 'goleador', 10);

  (cache.normasRaw||[]).forEach(n=>{
    if(n.tipo==='special_custom'){
      const d=n.datos;
      if(d.resultado && esp[d.id] && esp[d.id].toLowerCase()===d.resultado.toLowerCase()){
        customPts += parseInt(d.puntos)||0;
      }
    }
  });

  const bonus = calcBonusAciertos(uid);
  return {grupos,r32,octavos,cuartos,semis,final:final_,campeon:campeon_,sub,customPts,bonus,total:grupos+r32+octavos+cuartos+semis+final_+campeon_+sub+customPts+bonus,exactMatches,partialMatches};
}
