// ===================== DATA =====================
const GRUPOS = [
  {id:'A',equipos:['México','Sudáfrica','Corea del Sur','República Checa'],partidos:[
    {n:1,fecha:'11 jun',hora:'21:00',local:'México',visitante:'Sudáfrica',sede:'Azteca, México'},
    {n:2,fecha:'12 jun',hora:'04:00*',local:'Corea del Sur',visitante:'República Checa',sede:'Akron, Guadalajara'},
    {n:3,fecha:'18 jun',hora:'18:00',local:'República Checa',visitante:'Sudáfrica',sede:'Atlanta'},
    {n:4,fecha:'19 jun',hora:'03:00*',local:'México',visitante:'Corea del Sur',sede:'Akron, Guadalajara'},
    {n:5,fecha:'25 jun',hora:'03:00*',local:'República Checa',visitante:'México',sede:'Azteca, México'},
    {n:6,fecha:'25 jun',hora:'03:00*',local:'Sudáfrica',visitante:'Corea del Sur',sede:'Monterrey'}
  ]},
  {id:'B',equipos:['Canadá','Suiza','Qatar','Bosnia'],partidos:[
    {n:1,fecha:'12 jun',hora:'21:00',local:'Canadá',visitante:'Bosnia',sede:'BMO Field, Toronto'},
    {n:2,fecha:'13 jun',hora:'21:00',local:'Qatar',visitante:'Suiza',sede:"Levi's, Santa Clara"},
    {n:3,fecha:'18 jun',hora:'21:00',local:'Suiza',visitante:'Bosnia',sede:'SoFi, Los Ángeles'},
    {n:4,fecha:'19 jun',hora:'00:00*',local:'Canadá',visitante:'Qatar',sede:'BC Place, Vancouver'},
    {n:5,fecha:'24 jun',hora:'21:00',local:'Suiza',visitante:'Canadá',sede:'SoFi, Los Ángeles'},
    {n:6,fecha:'24 jun',hora:'21:00',local:'Bosnia',visitante:'Qatar',sede:'SoFi, Los Ángeles'}
  ]},
  {id:'C',equipos:['Brasil','Marruecos','Haití','Escocia'],partidos:[
    {n:1,fecha:'14 jun',hora:'00:00*',local:'Brasil',visitante:'Marruecos',sede:'MetLife, Nueva Jersey'},
    {n:2,fecha:'14 jun',hora:'03:00*',local:'Haití',visitante:'Escocia',sede:'Gillette, Boston'},
    {n:3,fecha:'20 jun',hora:'00:00*',local:'Escocia',visitante:'Marruecos',sede:'Gillette, Boston'},
    {n:4,fecha:'20 jun',hora:'02:30*',local:'Brasil',visitante:'Haití',sede:'Lincoln, Filadelfia'},
    {n:5,fecha:'25 jun',hora:'00:00*',local:'Escocia',visitante:'Brasil',sede:'Gillette, Boston'},
    {n:6,fecha:'25 jun',hora:'00:00*',local:'Marruecos',visitante:'Haití',sede:'Gillette, Boston'}
  ]},
  {id:'D',equipos:['Estados Unidos','Paraguay','Australia','Turquía'],partidos:[
    {n:1,fecha:'13 jun',hora:'03:00*',local:'Estados Unidos',visitante:'Paraguay',sede:'SoFi, Los Ángeles'},
    {n:2,fecha:'14 jun',hora:'06:00*',local:'Australia',visitante:'Turquía',sede:'BC Place, Vancouver'},
    {n:3,fecha:'19 jun',hora:'21:00',local:'Estados Unidos',visitante:'Australia',sede:'Lumen Field, Seattle'},
    {n:4,fecha:'20 jun',hora:'05:00*',local:'Turquía',visitante:'Paraguay',sede:"Levi's, Santa Clara"},
    {n:5,fecha:'26 jun',hora:'04:00*',local:'Turquía',visitante:'Estados Unidos',sede:'AT&T, Dallas'},
    {n:6,fecha:'26 jun',hora:'04:00*',local:'Paraguay',visitante:'Australia',sede:'AT&T, Dallas'}
  ]},
  {id:'E',equipos:['Alemania','Curazao','Costa de Marfil','Ecuador'],partidos:[
    {n:1,fecha:'14 jun',hora:'19:00',local:'Alemania',visitante:'Curazao',sede:'NRG, Houston'},
    {n:2,fecha:'15 jun',hora:'01:00*',local:'Costa de Marfil',visitante:'Ecuador',sede:'Lincoln, Filadelfia'},
    {n:3,fecha:'20 jun',hora:'22:00',local:'Alemania',visitante:'Costa de Marfil',sede:'BMO Field, Toronto'},
    {n:4,fecha:'21 jun',hora:'02:00*',local:'Ecuador',visitante:'Curazao',sede:'Arrowhead, Kansas City'},
    {n:5,fecha:'25 jun',hora:'22:00',local:'Ecuador',visitante:'Alemania',sede:'AT&T, Dallas'},
    {n:6,fecha:'25 jun',hora:'22:00',local:'Curazao',visitante:'Costa de Marfil',sede:'AT&T, Dallas'}
  ]},
  {id:'F',equipos:['Holanda','Japón','Túnez','Suecia'],partidos:[
    {n:1,fecha:'14 jun',hora:'22:00',local:'Holanda',visitante:'Japón',sede:'AT&T, Dallas'},
    {n:2,fecha:'15 jun',hora:'04:00*',local:'Suecia',visitante:'Túnez',sede:'BBVA, Monterrey'},
    {n:3,fecha:'20 jun',hora:'19:00',local:'Holanda',visitante:'Suecia',sede:'NRG, Houston'},
    {n:4,fecha:'21 jun',hora:'06:00*',local:'Túnez',visitante:'Japón',sede:'BBVA, Monterrey'},
    {n:5,fecha:'26 jun',hora:'01:00*',local:'Japón',visitante:'Suecia',sede:'SoFi, Los Ángeles'},
    {n:6,fecha:'26 jun',hora:'01:00*',local:'Túnez',visitante:'Holanda',sede:'SoFi, Los Ángeles'}
  ]},
  {id:'G',equipos:['Bélgica','Egipto','Irán','Nueva Zelanda'],partidos:[
    {n:1,fecha:'15 jun',hora:'21:00',local:'Bélgica',visitante:'Egipto',sede:'Lumen Field, Seattle'},
    {n:2,fecha:'16 jun',hora:'03:00*',local:'Irán',visitante:'Nueva Zelanda',sede:'SoFi, Los Ángeles'},
    {n:3,fecha:'21 jun',hora:'21:00',local:'Bélgica',visitante:'Irán',sede:'Lincoln, Filadelfia'},
    {n:4,fecha:'22 jun',hora:'03:00*',local:'Nueva Zelanda',visitante:'Egipto',sede:'Lincoln, Filadelfia'},
    {n:5,fecha:'27 jun',hora:'05:00*',local:'Nueva Zelanda',visitante:'Bélgica',sede:'Gillette, Boston'},
    {n:6,fecha:'27 jun',hora:'05:00*',local:'Egipto',visitante:'Irán',sede:'Gillette, Boston'}
  ]},
  {id:'H',equipos:['España','Cabo Verde','Arabia Saudí','Uruguay'],partidos:[
    {n:1,fecha:'15 jun',hora:'18:00',local:'España',visitante:'Cabo Verde',sede:'Mercedes-Benz, Atlanta'},
    {n:2,fecha:'16 jun',hora:'00:00*',local:'Arabia Saudí',visitante:'Uruguay',sede:'Hard Rock, Miami'},
    {n:3,fecha:'21 jun',hora:'18:00',local:'España',visitante:'Arabia Saudí',sede:'MetLife, Nueva Jersey'},
    {n:4,fecha:'22 jun',hora:'00:00*',local:'Uruguay',visitante:'Cabo Verde',sede:'MetLife, Nueva Jersey'},
    {n:5,fecha:'27 jun',hora:'02:00*',local:'Uruguay',visitante:'España',sede:'SoFi, Los Ángeles'},
    {n:6,fecha:'27 jun',hora:'02:00*',local:'Cabo Verde',visitante:'Arabia Saudí',sede:'SoFi, Los Ángeles'}
  ]},
  {id:'I',equipos:['Francia','Senegal','Noruega','Irak'],partidos:[
    {n:1,fecha:'16 jun',hora:'21:00',local:'Francia',visitante:'Senegal',sede:'MetLife, Nueva Jersey'},
    {n:2,fecha:'17 jun',hora:'00:00*',local:'Irak',visitante:'Noruega',sede:'Gillette, Boston'},
    {n:3,fecha:'22 jun',hora:'23:00',local:'Francia',visitante:'Irak',sede:'AT&T, Dallas'},
    {n:4,fecha:'23 jun',hora:'02:00*',local:'Noruega',visitante:'Senegal',sede:'Hard Rock, Miami'},
    {n:5,fecha:'26 jun',hora:'21:00',local:'Noruega',visitante:'Francia',sede:'MetLife, Nueva Jersey'},
    {n:6,fecha:'26 jun',hora:'21:00',local:'Senegal',visitante:'Irak',sede:'MetLife, Nueva Jersey'}
  ]},
  {id:'J',equipos:['Argentina','Argelia','Austria','Jordania'],partidos:[
    {n:1,fecha:'17 jun',hora:'03:00*',local:'Argentina',visitante:'Argelia',sede:'Arrowhead, Kansas City'},
    {n:2,fecha:'17 jun',hora:'06:00*',local:'Austria',visitante:'Jordania',sede:"Levi's, Santa Clara"},
    {n:3,fecha:'22 jun',hora:'19:00',local:'Argentina',visitante:'Austria',sede:'MetLife, Nueva Jersey'},
    {n:4,fecha:'23 jun',hora:'05:00*',local:'Jordania',visitante:'Argelia',sede:'MetLife, Nueva Jersey'},
    {n:5,fecha:'28 jun',hora:'04:00*',local:'Jordania',visitante:'Argentina',sede:'AT&T, Dallas'},
    {n:6,fecha:'28 jun',hora:'04:00*',local:'Argelia',visitante:'Austria',sede:'AT&T, Dallas'}
  ]},
  {id:'K',equipos:['Portugal','Colombia','Uzbekistán','R.D. Congo'],partidos:[
    {n:1,fecha:'17 jun',hora:'19:00',local:'Portugal',visitante:'R.D. Congo',sede:'NRG, Houston'},
    {n:2,fecha:'18 jun',hora:'04:00*',local:'Uzbekistán',visitante:'Colombia',sede:'Azteca, México'},
    {n:3,fecha:'23 jun',hora:'19:00',local:'Portugal',visitante:'Uzbekistán',sede:'Lumen Field, Seattle'},
    {n:4,fecha:'24 jun',hora:'04:00*',local:'Colombia',visitante:'R.D. Congo',sede:'Lumen Field, Seattle'},
    {n:5,fecha:'28 jun',hora:'01:30*',local:'Colombia',visitante:'Portugal',sede:'SoFi, Los Ángeles'},
    {n:6,fecha:'28 jun',hora:'01:30*',local:'R.D. Congo',visitante:'Uzbekistán',sede:'SoFi, Los Ángeles'}
  ]},
  {id:'L',equipos:['Inglaterra','Croacia','Ghana','Panamá'],partidos:[
    {n:1,fecha:'17 jun',hora:'22:00',local:'Inglaterra',visitante:'Croacia',sede:'AT&T, Dallas'},
    {n:2,fecha:'18 jun',hora:'01:00*',local:'Ghana',visitante:'Panamá',sede:'BMO Field, Toronto'},
    {n:3,fecha:'23 jun',hora:'22:00',local:'Inglaterra',visitante:'Ghana',sede:'Lincoln, Filadelfia'},
    {n:4,fecha:'24 jun',hora:'01:00*',local:'Panamá',visitante:'Croacia',sede:'Lincoln, Filadelfia'},
    {n:5,fecha:'27 jun',hora:'23:00',local:'Panamá',visitante:'Inglaterra',sede:'Arrowhead, Kansas City'},
    {n:6,fecha:'27 jun',hora:'23:00',local:'Croacia',visitante:'Ghana',sede:'Arrowhead, Kansas City'}
  ]}
];

const ELIM_PHASES = [
  {name:'🔵 Ronda de 32 — Dieciseisavos',partidos:[
    {code:'M73',fecha:'29 jun',hora:'05:00*',local:'2°A',visitante:'2°B',sede:'Los Ángeles'},
    {code:'M74',fecha:'30 jun',hora:'03:30*',local:'1°E',visitante:'3er C/D/F/G/H',sede:'Boston'},
    {code:'M75',fecha:'30 jun',hora:'02:00*',local:'1°F',visitante:'2°C',sede:'Monterrey'},
    {code:'M76',fecha:'30 jun',hora:'01:00*',local:'1°C',visitante:'2°F',sede:'Houston'},
    {code:'M77',fecha:'1 jul',hora:'04:00*',local:'1°I',visitante:'3er A/B/C/D/E',sede:'Nueva Jersey'},
    {code:'M78',fecha:'1 jul',hora:'01:00*',local:'2°E',visitante:'2°I',sede:'Dallas'},
    {code:'M79',fecha:'1 jul',hora:'02:00*',local:'1°A',visitante:'3er C/E/F/H/I',sede:'Ciudad de México'},
    {code:'M80',fecha:'1 jul',hora:'23:00',local:'1°L',visitante:'3er E/H/I/J/K',sede:'Atlanta'},
    {code:'M81',fecha:'2 jul',hora:'01:00*',local:'1°D',visitante:'3er B/D/F/I/J',sede:'Santa Clara'},
    {code:'M82',fecha:'2 jul',hora:'06:00*',local:'1°G',visitante:'3er A/E/H/I/J',sede:'Seattle'},
    {code:'M83',fecha:'3 jul',hora:'00:00*',local:'2°K',visitante:'2°L',sede:'Toronto'},
    {code:'M84',fecha:'3 jul',hora:'05:00*',local:'1°H',visitante:'2°J',sede:'Los Ángeles'},
    {code:'M85',fecha:'3 jul',hora:'04:00*',local:'1°B',visitante:'3er E/F/G/I/J',sede:'Vancouver'},
    {code:'M86',fecha:'3 jul',hora:'23:00',local:'1°J',visitante:'2°H',sede:'Miami'},
    {code:'M87',fecha:'4 jul',hora:'02:30*',local:'1°K',visitante:'3er D/E/I/J/L',sede:'Kansas City'},
    {code:'M88',fecha:'4 jul',hora:'02:00*',local:'2°D',visitante:'2°G',sede:'Dallas'}
  ]},
  {name:'🟢 Octavos de Final',partidos:[
    {code:'M89',fecha:'4 jul',hora:'19:00',local:'W73',visitante:'W77',sede:'Filadelfia'},
    {code:'M90',fecha:'4 jul',hora:'23:00',local:'W74',visitante:'W75',sede:'Houston'},
    {code:'M91',fecha:'5 jul',hora:'22:00',local:'W76',visitante:'W78',sede:'Nueva Jersey'},
    {code:'M92',fecha:'6 jul',hora:'02:00*',local:'W79',visitante:'W80',sede:'Ciudad de México'},
    {code:'M93',fecha:'6 jul',hora:'21:00',local:'W83',visitante:'W84',sede:'Dallas'},
    {code:'M94',fecha:'7 jul',hora:'02:00*',local:'W81',visitante:'W82',sede:'Seattle'},
    {code:'M95',fecha:'7 jul',hora:'18:00',local:'W86',visitante:'W88',sede:'Atlanta'},
    {code:'M96',fecha:'7 jul',hora:'22:00',local:'W85',visitante:'W87',sede:'Vancouver'}
  ]},
  {name:'🟣 Cuartos de Final',partidos:[
    {code:'M97',fecha:'9 jul',hora:'22:00',local:'W89',visitante:'W90',sede:'Boston'},
    {code:'M98',fecha:'10 jul',hora:'21:00',local:'W93',visitante:'W94',sede:'Los Ángeles'},
    {code:'M99',fecha:'11 jul',hora:'23:00',local:'W91',visitante:'W92',sede:'Miami'},
    {code:'M100',fecha:'12 jul',hora:'03:00*',local:'W95',visitante:'W96',sede:'Kansas City'}
  ]},
  {name:'🟠 Semifinales',partidos:[
    {code:'M101',fecha:'14 jul',hora:'21:00',local:'W97',visitante:'W98',sede:'AT&T, Dallas'},
    {code:'M102',fecha:'15 jul',hora:'21:00',local:'W99',visitante:'W100',sede:'Mercedes-Benz, Atlanta'}
  ]},
  {name:'🥉 Tercer Puesto',partidos:[
    {code:'M103',fecha:'18 jul',hora:'23:00',local:'Perdedor SF1',visitante:'Perdedor SF2',sede:'Hard Rock, Miami'}
  ]},
  {name:'🏆 Gran Final — MetLife Stadium',partidos:[
    {code:'M104',fecha:'19 jul',hora:'21:00',local:'Ganador SF1',visitante:'Ganador SF2',sede:'MetLife, Nueva Jersey'}
  ]}
];

const ALL_TEAMS = [...new Set(GRUPOS.flatMap(g=>g.equipos))].sort();
const AVATAR_COLORS = [
  'rgba(59,130,246,.15)|#60a5fa','rgba(34,197,94,.15)|#22c55e',
  'rgba(123,44,191,.15)|#7b2cbf','rgba(239,68,68,.15)|#ef4444',
  'rgba(139,92,246,.15)|#a78bfa','rgba(232,93,48,.15)|#e85d30',
  'rgba(20,184,166,.15)|#2dd4bf','rgba(251,191,36,.15)|#fbbf24'
];

const DEFAULT_PTS = [
  {fase:'Grupos',desc:'Resultado exacto',pts:3},
  {fase:'Grupos',desc:'Ganador/empate correcto',pts:1},
  {fase:'Grupos',desc:'Resultado incorrecto',pts:0},
  {fase:'Ronda 32',desc:'Clasificado correcto',pts:4},
  {fase:'Octavos',desc:'Clasificado correcto',pts:5},
  {fase:'Cuartos',desc:'Clasificado correcto',pts:6},
  {fase:'Semis',desc:'Clasificado correcto',pts:8},
  {fase:'Final',desc:'Finalista correcto',pts:10},
  {fase:'Subcampeón',desc:'Subcampeón correcto',pts:12},
  {fase:'Campeón 🏆',desc:'Campeón del mundo',pts:20},
  {fase:'Pichichi',desc:'Máximo goleador',pts:10},
  {fase:'3er puesto',desc:'3er clasificado correcto',pts:8},
  {fase:'Eliminatorias',desc:'Resultado exacto (Sólo modo Interactivo)',pts:5},
  {fase:'Eliminatorias',desc:'Acierto prórroga (Sólo modo Interactivo)',pts:2},
  {fase:'Eliminatorias',desc:'Acierto ganador penaltis (Sólo modo Interactivo)',pts:3}
];

const DEFAULT_NORMAS = [
  {title:'Fecha límite',desc:'Pronósticos antes del inicio de cada partido. Pasado ese momento, 0 puntos.'},
  {title:'Fase de grupos',desc:'Indicar marcador exacto (goles local – goles visitante).'},
  {title:'Eliminatorias',desc:'Indicar el equipo que pasa (no hace falta marcador).'},
  {title:'Prórrogas',desc:'Si hay prórroga o penaltis, cuenta el equipo clasificado, no el resultado a 90\'.'},
  {title:'Desempate',desc:'Pts grupos → aciertos eliminatorias → acierto campeón → reparto.'},
  {title:'Pago',desc:'Cuota antes del inicio. Sin pago = pronóstico no contabilizado.'},
  {title:'Premios sugeridos',desc:'50% al 1º, 30% al 2º, 20% al 3º.'},
  {title:'Dudas',desc:'Por mayoría. El organizador tiene voto de calidad.'},
  {title:'Formato',desc:'48 equipos, 12 grupos, nueva Ronda de 32 (dieciseisavos). 104 partidos.'},
  {title:'Horarios',desc:'CEST = hora española en verano (ET+6h). Horarios con * son de madrugada.'}
];

const COUNTRY_CODES = {
  'México': 'mx', 'Sudáfrica': 'za', 'Corea del Sur': 'kr', 'República Checa': 'cz',
  'Canadá': 'ca', 'Suiza': 'ch', 'Qatar': 'qa', 'Bosnia': 'ba',
  'Brasil': 'br', 'Marruecos': 'ma', 'Haití': 'ht', 'Escocia': 'gb-sct',
  'Estados Unidos': 'us', 'Paraguay': 'py', 'Australia': 'au', 'Turquía': 'tr',
  'Alemania': 'de', 'Curazao': 'cw', 'Costa de Marfil': 'ci', 'Ecuador': 'ec',
  'Holanda': 'nl', 'Japón': 'jp', 'Túnez': 'tn', 'Suecia': 'se',
  'Bélgica': 'be', 'Egipto': 'eg', 'Irán': 'ir', 'Nueva Zelanda': 'nz',
  'España': 'es', 'Cabo Verde': 'cv', 'Arabia Saudí': 'sa', 'Uruguay': 'uy',
  'Francia': 'fr', 'Senegal': 'sn', 'Noruega': 'no', 'Irak': 'iq',
  'Argentina': 'ar', 'Argelia': 'dz', 'Austria': 'at', 'Jordania': 'jo',
  'Portugal': 'pt', 'Colombia': 'co', 'Uzbekistán': 'uz', 'R.D. Congo': 'cd',
  'Inglaterra': 'gb-eng', 'Croacia': 'hr', 'Ghana': 'gh', 'Panamá': 'pa'
};

function getFlagHtml(teamName) {
  const code = COUNTRY_CODES[teamName];
  if (!code) return '';
  return `<span class="fi fi-${code}" style="margin-right: 6px; border-radius: 2px;"></span>`;
}
