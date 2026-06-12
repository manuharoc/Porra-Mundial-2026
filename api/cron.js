const fs = require('fs');
const path = require('path');

const TEAM_MAP = {
  "Spain": "España",
  "Mexico": "México",
  "South Africa": "Sudáfrica",
  "South Korea": "Corea del Sur",
  "Czech Republic": "República Checa",
  "Canada": "Canadá",
  "Switzerland": "Suiza",
  "Qatar": "Qatar",
  "Bosnia and Herzegovina": "Bosnia",
  "Bosnia": "Bosnia",
  "Brazil": "Brasil",
  "Morocco": "Marruecos",
  "Haiti": "Haití",
  "Scotland": "Escocia",
  "USA": "Estados Unidos",
  "Paraguay": "Paraguay",
  "Australia": "Australia",
  "Turkey": "Turquía",
  "Germany": "Alemania",
  "Curacao": "Curazao",
  "Ivory Coast": "Costa de Marfil",
  "Cote d'Ivoire": "Costa de Marfil",
  "Ecuador": "Ecuador",
  "Netherlands": "Holanda",
  "Japan": "Japón",
  "Tunisia": "Túnez",
  "Sweden": "Suecia",
  "Belgium": "Bélgica",
  "Egypt": "Egipto",
  "Iran": "Irán",
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
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY || !API_FOOTBALL_KEY) {
      return res.status(500).json({ error: "Missing environment variables" });
    }

    // 1. Fetch all matches from API-Football for the tournament
    const apiUrl = `https://v3.football.api-sports.io/fixtures?league=1&season=2026`;
    
    const apiRes = await fetch(apiUrl, {
      headers: {
        'x-apisports-key': API_FOOTBALL_KEY
      }
    });
    
    const apiData = await apiRes.json();
    if (!apiData || !apiData.response) {
      return res.status(500).json({ error: "Invalid API-Football response", data: apiData });
    }

    // 2. Read local data.js to get GRUPOS
    const dataJsPath = path.join(process.cwd(), 'data.js');
    const dataStr = fs.readFileSync(dataJsPath, 'utf8');
    
    let GRUPOS = [];
    try {
      const vm = require('vm');
      const sandbox = { Math, Date, String, Number, Array, Object };
      vm.createContext(sandbox);
      vm.runInContext(dataStr.replace(/const\s+GRUPOS\s*=/, 'var GRUPOS_OUT ='), sandbox);
      GRUPOS = sandbox.GRUPOS_OUT || [];
    } catch(err) {
      console.error("Error parsing GRUPOS from data.js", err);
    }

    let updatesCount = 0;

    for (const match of apiData.response) {
      const status = match.fixture.status.short;
      // Skip matches that haven't started or are cancelled
      if (['NS', 'PST', 'CAN', 'ABD'].includes(status)) continue;

      let homeTeamEng = match.teams.home.name;
      let awayTeamEng = match.teams.away.name;
      let goalsHome = match.goals.home;
      let goalsAway = match.goals.away;

      if (goalsHome === null || goalsAway === null) {
          goalsHome = 0;
          goalsAway = 0;
      }

      const homeEs = TEAM_MAP[homeTeamEng] || homeTeamEng;
      const awayEs = TEAM_MAP[awayTeamEng] || awayTeamEng;

      // Find match_key
      let matchKey = null;
      for (const g of GRUPOS) {
        if (!g.partidos) continue;
        for (const p of g.partidos) {
          if (normalizeName(p.local) === normalizeName(homeEs) && normalizeName(p.visitante) === normalizeName(awayEs)) {
            matchKey = `G${g.id}_${p.n}`;
            break;
          }
        }
        if (matchKey) break;
      }

      if (matchKey) {
        // Upsert to Supabase
        const upsertUrl = `${SUPABASE_URL}/rest/v1/resultados_globales`;
        const payload = {
          tipo: 'grupos',
          match_key: matchKey,
          valor: { gl: goalsHome.toString(), gv: goalsAway.toString() },
          updated_at: new Date().toISOString()
        };

        await fetch(upsertUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(payload)
        });
        updatesCount++;
      }
    }

    return res.status(200).json({ 
      success: true, 
      updates: updatesCount,
      debug: updatesCount === 0 ? apiData.response.slice(0, 5) : undefined
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};
