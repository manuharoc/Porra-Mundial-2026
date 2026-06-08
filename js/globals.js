// ===================== SUPABASE =====================
const SUPABASE_URL = 'https://ihuwoccaycdusoydfcfi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodXdvY2NheWNkdXNveWRmY2ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MDIzNTEsImV4cCI6MjA5NTI3ODM1MX0.7TlPdJDpblifVsHgvaM5fc4ZKBUjJbYgezFVI2Fqzu4';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===================== SESSION & CACHE =====================
const SESSION_KEY = 'porra2026_session_v3';
const MULTI_SESSION_KEY = 'porra2026_multi_v1';
let session = null; // { liga_id, participante_id }

// Cache: field names use camelCase matching original JS code
const cache = {
  liga: null,
  participantes: [],
  predicciones: {},
  resultados: { grupos:{}, elim:{}, especiales:{} },
  normas: { pts:[], normas:[] },
  normasRaw: [],      // raw Supabase rows — needed for custom specials
  bonusAciertos: null,   // [ {n:10, pts:15}, {n:20, pts:30}, ... ]
  configModo: 'interactivo'
};

let currentViewUser = null; // participant being viewed/edited
let currentPage = 'dashboard';
let _setupMode = 'create';
let _joinLigaId = null;

// Helpers
function getAdminId(){ return cache.participantes.find(p=>p.isAdmin)?.id; }
function getMyId(){ return session?.participante_id; }
function isAdmin(){ return getMyId() === getAdminId(); }

// Convert Supabase row → JS object
function fromSbPart(row){
  return { id:row.id, name:row.nombre, photo:row.emoji, avatarBg:row.avatar_bg, avatarColor:row.avatar_color, isAdmin:row.is_admin };
}

// ===================== AVATAR HELPERS =====================
// Generates avatar HTML: photo (base64) or initials fallback
// size: 'sm'=32px, 'md'=48px, 'lg'=72px
function renderAvatarHtml(p, size='md'){
  const px = size==='sm'?32:size==='lg'?72:48;
  const adminClass = p.isAdmin ? ' is-admin' : '';
  const crown = p.isAdmin ? '<span class="av-crown">👑</span>' : '';
  const isPhoto = p.photo && p.photo.startsWith('data:image');
  const inner = isPhoto
    ? `<img class="av-img" src="${p.photo}" alt="${p.name}">`
    : `<div class="av-initials" style="background:${p.avatarBg||'rgba(123,44,191,.15)'};color:${p.avatarColor||'var(--accent)'};font-size:${Math.round(px*0.35)}px">${(p.name||'?').slice(0,2).toUpperCase()}</div>`;
  return `<div class="av-wrap${adminClass}" style="width:${px}px;height:${px}px;cursor:pointer;" onclick="event.stopPropagation(); viewAvatarFullScreen('${p.id}')">${inner}${crown}</div>`;
}

function viewAvatarFullScreen(uid) {
  const p = cache.participantes.find(x => x.id === uid);
  if (!p) return;
  const modal = document.getElementById('modal-avatar-fullscreen');
  const imgContainer = document.getElementById('fullscreen-avatar-content');
  
  let html = '';
  if (p.photo && p.photo.startsWith('data:image')) {
    html = `<img src="${p.photo}" style="width:100%;max-width:300px;aspect-ratio:1/1;border-radius:50%;box-shadow:0 10px 40px rgba(0,0,0,0.5);display:block;margin:0 auto;object-fit:cover;">`;
  } else {
    html = `<div style="width:250px;height:250px;border-radius:50%;background:${p.avatarBg||'rgba(123,44,191,.15)'};color:${p.avatarColor||'var(--accent)'};font-size:100px;display:flex;align-items:center;justify-content:center;margin:0 auto;box-shadow:0 10px 40px rgba(0,0,0,0.5);">${(p.name||'?').slice(0,2).toUpperCase()}</div>`;
  }
  html += `<div style="text-align:center;color:white;font-size:28px;font-weight:700;margin-top:24px;text-shadow: 0 2px 10px rgba(0,0,0,0.5);">${p.name}</div>`;
  if(p.isAdmin) {
    html += `<div style="text-align:center;color:var(--gold);font-size:14px;font-weight:600;margin-top:6px;text-shadow: 0 2px 10px rgba(0,0,0,0.5);">👑 Administrador</div>`;
  }
  
  imgContainer.innerHTML = html;
  modal.classList.add('open');
}

// Resize a File to size×size JPEG base64 using canvas
async function resizeImage(file, size=80){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = e => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        // center-crop
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Stores pending photo base64 by context key
const _pendingPhoto = {};

function triggerAvatarPick(ctx){
  document.getElementById(ctx+'-avatar-file').click();
}

async function handleAvatarFile(input, ctx){
  const file = input.files[0];
  if(!file) return;
  if(file.size > 8*1024*1024){ showToast('❌ Foto demasiado grande (máx 8 MB)'); return; }
  showToast('⏳ Procesando imagen…');
  try {
    const b64 = await resizeImage(file, 80);
    _pendingPhoto[ctx] = b64;
    // Update preview
    const preview = document.getElementById(ctx+'-avatar-preview');
    if(preview){ preview.innerHTML = `<img src="${b64}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`; }
    showToast('✅ Foto lista — guarda el perfil para aplicar');
  } catch(e){
    showToast('❌ No se pudo procesar la imagen');
  }
  input.value = '';
}
