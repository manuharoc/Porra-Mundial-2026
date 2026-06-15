const fs = require('fs');
const path = require('path');

const TEAM_MAP = {
  "Spain": "España",
  "Mexico": "México",
  "South Africa": "Sudáfrica",
  "South Korea": "Corea del Sur",
  "Korea Republic": "Corea del Sur",
  "Czech Republic": "República Checa",
  "Czechia": "República Checa",
  "Canada": "Canadá",
  "Switzerland": "Suiza",
  "Qatar": "Qatar",
  "Bosnia and Herzegovina": "Bosnia",
  "Bosnia & Herzegovina": "Bosnia",
  "Bosnia": "Bosnia",
  "Brazil": "Brasil",
  "Morocco": "Marruecos",
  "Haiti": "Haití",
  "Scotland": "Escocia",
  "USA": "Estados Unidos",
  "United States": "Estados Unidos",
  "Paraguay": "Paraguay",
  "Australia": "Australia",
  "Turkey": "Turquía",
  "Türkiye": "Turquía",
  "Germany": "Alemania",
  "Curacao": "Curazao",
  "Curaçao": "Curazao",
  "Ivory Coast": "Costa de Marfil",
  "Cote d'Ivoire": "Costa de Marfil",
  "Côte d'Ivoire": "Costa de Marfil",
  "Ecuador": "Ecuador",
  "Netherlands": "Holanda",
  "Japan": "Japón",
  "Tunisia": "Túnez",
  "Sweden": "Suecia",
  "Belgium": "Bélgica",
  "Egypt": "Egipto",
  "Iran": "Irán",
  "IR Iran": "Irán",
  "New Zealand": "Nueva Zelanda",
  "Cape Verde": "Cabo Verde",
  "Cape Verde Islands": "Cabo Verde",
  "Saudi Arabia": "Arabia Saudí",
  "Uruguay": "Uruguay",
  "France": "Francia",
  "Senegal": "Senegal",
  "Norway": "Noruega",
  "Iraq": "Irak",
  "Argentina": "Argentina",
  "Algeria": "Argelia",
  "Austria": "Austria",
  "Jordan": "Jordania",
  "Portugal": "Portugal",
  "Colombia": "Colombia",
  "Uzbekistan": "Uzbekistán",
  "DR Congo": "R.D. Congo",
  "Congo DR": "R.D. Congo",
  "Democratic Republic of the Congo": "R.D. Congo",
  "England": "Inglaterra",
  "Croatia": "Croacia",
  "Ghana": "Ghana",
  "Panama": "Panamá"
};

function normalizeName(s) {
  if (!s) return "";
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

module.exports = async (req, res) => {
  try {
    const now = new Date();
    const utcHour = now.getUTCHours();
    
    // Pausa el cron entre las 09:00 y las 15:00 CEST (07:00 - 13:00 UTC)
    // TEMPORALMENTE COMENTADO PARA PRUEBAS
    /*
    if (utcHour >= 7 && utcHour < 13) {
      return res.status(200).json({
        success: true,
        message: "Cron pausado por horario (09:00 - 15:00 CEST) para ahorrar peticiones a la API."
      });
    }
    */

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY || !API_FOOTBALL_KEY) {
      return res.status(500).json({ error: "Missing environment variables" });
    }

    // 1. Fetch matches from football-data.org for yesterday and today
    const today = new Date();
    const isoToday = today.toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isoYesterday = yesterday.toISOString().split('T')[0];

    // Use the same API_FOOTBALL_KEY env variable for the new football-data.org token to avoid changing Vercel config
    const headers = { 'X-Auth-Token': API_FOOTBALL_KEY };
    
    // Fetch both days in a single API call to save requests
    const resMatches = await fetch(`https://api.football-data.org/v4/matches?dateFrom=${isoYesterday}&dateTo=${isoToday}`, { headers });
    const dataMatches = await resMatches.json();

    if (!dataMatches || dataMatches.errorCode) {
      return res.status(500).json({ error: "Invalid football-data response", data: dataMatches });
    }

    // Filter locally to only include World Cup matches (competition id 2000)
    const allMatchesRaw = dataMatches.matches || [];
    const allMatches = allMatchesRaw.filter(m => m.competition && m.competition.id === 2000);
    const rawLeagues = [...new Set(allMatchesRaw.map(m => m.competition?.id))];
    const rawMatchesLength = allMatchesRaw.length;
    const apiData = { response: allMatches, raw_debug: { data: dataMatches } };

    let updatesCount = 0;
    let matchDebug = [];
    let gruposExtractError = "";
    
    // 2. Read local data.js to get GRUPOS
    const dataJsPath = path.join(process.cwd(), 'data.js');
    const dataStr = fs.readFileSync(dataJsPath, 'utf8');
    
    let GRUPOS = [];
    try {
      const match = dataStr.match(/const\s+GRUPOS\s*=\s*(\[\s*\{[\s\S]*?\]);\s*const\s+/);
      if (match) {
        GRUPOS = eval(match[1]);
      } else {
        gruposExtractError = "Regex did not match GRUPOS in data.js. Start of file: " + dataStr.substring(0, 200);
      }
    } catch(err) {
      gruposExtractError = "Error evaluating GRUPOS: " + err.message;
    }

    for (const match of apiData.response) {
      const status = match.status;
      // Skip matches that haven't started or are cancelled
      if (['SCHEDULED', 'TIMED', 'POSTPONED', 'CANCELLED', 'SUSPENDED'].includes(status)) continue;

      let homeTeamEng = match.homeTeam.name;
      let awayTeamEng = match.awayTeam.name;
      
      let goalsHome = match.score?.fullTime?.home ?? match.score?.regularTime?.home ?? 0;
      let goalsAway = match.score?.fullTime?.away ?? match.score?.regularTime?.away ?? 0;

      if (goalsHome === null || goalsAway === null) {
          goalsHome = 0;
          goalsAway = 0;
      }

      const homeEs = TEAM_MAP[homeTeamEng] || homeTeamEng;
      const awayEs = TEAM_MAP[awayTeamEng] || awayTeamEng;

      // Find match_key
      let matchKey = null;
      let checkLog = [];
      for (const g of GRUPOS) {
        if (!g.partidos) continue;
        for (const p of g.partidos) {
          const l1 = normalizeName(p.local);
          const l2 = normalizeName(homeEs);
          const v1 = normalizeName(p.visitante);
          const v2 = normalizeName(awayEs);
          if (l1 === l2 && v1 === v2) {
            matchKey = `G${g.id}_${p.n}`;
            break;
          }
        }
        if (matchKey) break;
      }

      matchDebug.push({
        homeEng: homeTeamEng, awayEng: awayTeamEng,
        homeEs: homeEs, awayEs: awayEs,
        homeNorm: normalizeName(homeEs), awayNorm: normalizeName(awayEs),
        matchKey: matchKey, status: status
      });

      if (matchKey) {
        // Upsert to Supabase
        const upsertUrl = `${SUPABASE_URL}/rest/v1/resultados_globales?on_conflict=tipo,match_key`;
        const payload = {
          tipo: 'grupos',
          match_key: matchKey,
          valor: { gl: goalsHome.toString(), gv: goalsAway.toString() },
          updated_at: new Date().toISOString()
        };

        const res = await fetch(upsertUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(payload)
        });
        
        if (!res.ok) {
           const errText = await res.text();
           console.error("Supabase error for", matchKey, errText);
        } else {
           updatesCount++;
        }
      }
    }

    return res.status(200).json({ 
      success: true, 
      updates: updatesCount,
      debug: {
        gruposLength: GRUPOS.length,
        gruposError: gruposExtractError,
        matches: matchDebug,
        rawMatchesLength: rawMatchesLength,
        rawLeagues: rawLeagues,
        apiErrors: dataMatches.errorCode ? dataMatches : null
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};
