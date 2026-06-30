// ===================== LOAD FROM SUPABASE =====================
async function loadAllData(){
  if(cache.participantes && cache.participantes.length > 0){
    const oldScores = cache.participantes.map(p=>({...p,...calcScore(p.id)})).sort((a,b)=>b.total-a.total);
    window.previousRankingData = oldScores.map((p,i)=>({id:p.id, pos:i+1}));
  }
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
      let rawPts = normasData.filter(n=>n.tipo==='pts');
      let pts = rawPts.length > 0 ? rawPts[rawPts.length-1].datos : null;
      if(!pts || pts.length === 0 || !Array.isArray(pts)) pts = JSON.parse(JSON.stringify(DEFAULT_PTS));
      
      let rawNormas = normasData.filter(n=>n.tipo==='norma');
      let normas = rawNormas.length > 0 ? rawNormas[rawNormas.length-1].datos : null;
      if(!normas || normas.length === 0 || !Array.isArray(normas)) normas = JSON.parse(JSON.stringify(DEFAULT_NORMAS));
      
      // Asegurar que las nuevas normas de eliminatoria interactiva existen
      if (!pts.find(p => p.fase === 'Eliminatorias' && p.desc.includes('exacto'))) {
        pts.push({fase:'Eliminatorias',desc:'Resultado exacto (Sólo modo Interactivo)',pts:5});
        pts.push({fase:'Eliminatorias',desc:'Acierto prórroga (Sólo modo Interactivo)',pts:2});
        pts.push({fase:'Eliminatorias',desc:'Acierto ganador penaltis (Sólo modo Interactivo)',pts:3});
      }
      // Asegurar que existe la norma de bonus por acertar equipo en penaltis
      if (!pts.find(p => p.fase === 'Eliminatorias' && p.desc.includes('bonus') && p.desc.toLowerCase().includes('penaltis'))) {
        pts.push({fase:'Eliminatorias',desc:'Acierto equipo pasa en penaltis (bonus, Sólo modo Interactivo)',pts:5});
      }
      
      cache.normas = { pts, normas };
    cache.normasRaw = normasData;
    const bonusRow = normasData.find(n=>n.tipo==='bonus_aciertos');
    cache.bonusAciertos = bonusRow ? bonusRow.datos : getDefaultBonusAciertos();
    const configModoRow = normasData.find(n=>n.tipo==='config_modo');
    cache.configModo = configModoRow ? configModoRow.datos.modo : 'interactivo';
  } else {
    cache.normas = { pts: JSON.parse(JSON.stringify(DEFAULT_PTS)), normas: JSON.parse(JSON.stringify(DEFAULT_NORMAS)) };
    cache.normasRaw = [];
    cache.bonusAciertos = getDefaultBonusAciertos();
    await saveNormasToSupabase();
  }
}

function getDefaultBonusAciertos(){
  return [
    { n: 10, pts: 10 },
    { n: 20, pts: 20 },
    { n: 30, pts: 30 },
    { n: 40, pts: 40 },
    { n: 50, pts: 50 },
    { n: 60, pts: 60 },
    { n: 70, pts: 70 }
  ];
}

async function saveNormasToSupabase(){
  await sb.from('normas').delete().eq('liga_id', session.liga_id);
  const rows = [
    { liga_id:session.liga_id, tipo:'pts', datos:cache.normas.pts||DEFAULT_PTS, orden:0 },
    { liga_id:session.liga_id, tipo:'norma', datos:cache.normas.normas||DEFAULT_NORMAS, orden:0 },
    { liga_id:session.liga_id, tipo:'bonus_aciertos', datos:cache.bonusAciertos||getDefaultBonusAciertos(), orden:0 },
    ...((cache.normasRaw||[])
      .filter(n=>n.tipo!=='pts'&&n.tipo!=='norma'&&n.tipo!=='bonus_aciertos'&&n.tipo!=='config_modo')
      .map(n=>{
        const { id, ...rest } = n; 
        return {...rest, liga_id:session.liga_id};
      })),
    { liga_id:session.liga_id, tipo:'config_modo', datos:{modo: cache.configModo || 'interactivo'}, orden:0 }
  ];
  if(rows.length > 0) {
    const { error } = await sb.from('normas').insert(rows);
    if(error) {
      console.error("Error saving normas:", error);
      showToast('❌ Error al guardar las normas');
    }
  }
}
