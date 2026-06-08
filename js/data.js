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
      let pts = rawPts.length === 1 && Array.isArray(rawPts[0].datos) ? rawPts[0].datos : rawPts.map(n=>n.datos);
      if(pts.length === 1 && Array.isArray(pts[0])) pts = pts[0];
      if(!pts || pts.length === 0) pts = JSON.parse(JSON.stringify(DEFAULT_PTS));
      
      let rawNormas = normasData.filter(n=>n.tipo==='norma');
      let normas = rawNormas.length === 1 && Array.isArray(rawNormas[0].datos) ? rawNormas[0].datos : rawNormas.map(n=>n.datos);
      if(normas.length === 1 && Array.isArray(normas[0])) normas = normas[0];
      if(!normas || normas.length === 0) normas = JSON.parse(JSON.stringify(DEFAULT_NORMAS));
      
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
    { n: 10, pts: 15 },
    { n: 20, pts: 30 },
    { n: 30, pts: 45 },
    { n: 40, pts: 60 },
    { n: 50, pts: 75 },
    { n: 60, pts: 90 },
    { n: 70, pts: 105 }
  ];
}

async function saveNormasToSupabase(){
  await sb.from('normas').delete().eq('liga_id', session.liga_id);
  const rows = [
    { liga_id:session.liga_id, tipo:'pts', datos:cache.normas.pts||DEFAULT_PTS, orden:0 },
    { liga_id:session.liga_id, tipo:'norma', datos:cache.normas.normas||DEFAULT_NORMAS, orden:0 },
    { liga_id:session.liga_id, tipo:'bonus_aciertos', datos:cache.bonusAciertos||getDefaultBonusAciertos(), orden:0 },
    ...((cache.normasRaw||[]).filter(n=>n.tipo!=='pts'&&n.tipo!=='norma'&&n.tipo!=='bonus_aciertos').map(n=>({...n, liga_id:session.liga_id}))),
    { liga_id:session.liga_id, tipo:'config_modo', datos:{modo: cache.configModo || 'interactivo'}, orden:0 }
  ];
  if(rows.length > 0) await sb.from('normas').insert(rows);
}
