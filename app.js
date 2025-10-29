/********************************************************************
 *  LOCAL STATE
 *******************************************************************/
const OWNER_ID   = '000000001';
const OWNER_NAME = 'Aji';

let state = {
  users:{},groups:{},mall:[],storeCatalog:{},maintenance:false,
  autoDel:{},msgTimer:{},nextId:1,nextItemId:1,nextGroupId:100000,
  mode:'normal',chatTarget:null,userId:null,userName:null
};

/********************************************************************
 *  DOM SHORTCUT
 *******************************************************************/
const $ = q => document.querySelector(q);
const screen   = $('#screen');
const promptEl = $('#prompt');
const input    = $('#cmd');
const statusL  = $('#status-left');
const jamEl    = $('#jam');
const sinyalEl = $('#sinyal');

/********************************************************************
 *  UI UTILS
 *******************************************************************/
function print(txt,cls=''){
  const div = document.createElement('div');
  div.className = 'cmd-line '+cls;
  div.textContent = txt;
  screen.appendChild(div);
  screen.scrollTop = screen.scrollHeight;
  return div;
}
function clearInput(){ input.value=''; }
function setMode(m,t=null){
  state.mode = m; state.chatTarget = t;
  updateStatusBar(); updatePrompt();
}
function updateStatusBar(){
  let title = 'M4R Console';
  if(state.mode==='global') title = 'GlobalChat';
  else if(state.mode==='pchat') title = `Chat → ${state.chatTarget}`;
  else if(state.mode==='group') title = `Grup G${state.chatTarget}`;
  statusL.textContent = title;
}
function updatePrompt(){
  if(!state.userId){ promptEl.textContent='$ '; return; }
  const u = state.users[state.userId];
  const b = badge(state.userId);
  if(state.mode==='normal') promptEl.textContent=`(${state.userId}) ${b} ("${u.name}") $ `;
  else if(state.mode==='global') promptEl.textContent=`(${state.userId}) ${b} ("${u.name}") GLOBAL # `;
  else if(state.mode==='pchat') promptEl.textContent=`(${state.userId}) ${b} ("${u.name}") → (${state.chatTarget}) ${b} ("${state.users[state.chatTarget]?.name||'?'}}") # `;
  else if(state.mode==='group') promptEl.textContent=`(${state.userId}) ${b} ("${u.name}") → G${state.chatTarget} # `;
}

/********************************************************************
 *  DEVICE STATUS
 *******************************************************************/
function updateDeviceStatus(){
  const now = new Date();
  jamEl.textContent = now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  let s = '4G';
  if(conn){
    if(conn.effectiveType==='2g') s='2G';
    else if(conn.effectiveType==='3g') s='3G';
    else if(conn.effectiveType==='4g') s='4G';
    else if(conn.effectiveType==='wifi') s='WiFi';
  }
  sinyalEl.textContent = s;
}
setInterval(updateDeviceStatus,1000);
updateDeviceStatus();

/********************************************************************
 *  PROGRESS PER-COMMAND (TEKS TERMUX)
 *******************************************************************/
const PROGRESS = {
  '/+': {sec:3,txt:'Membuat akun'},
  '/GlobalChat': {sec:2,txt:'Masuk GlobalChat'},
  '/+G#': {sec:3,txt:'Membuat grup'},
  '/+#': {sec:2,txt:'Bergabung grup'},
  '/+Store/': {sec:2,txt:'Mendaftar seller'},
  '/store/': {sec:2,txt:'Membuka toko'},
  '/profile': {sec:1,txt:'Memuat profil'},
  '/editprofile': {sec:2,txt:'Update profil'},
  '/setting': {sec:1,txt:'Update setting'},
  '/buy': {sec:3,txt:'Proses beli'},
  '/ban': {sec:5,txt:'Mem-ban user'},
  '/unban': {sec:3,txt:'Membuka ban'},
  '/mute': {sec:3,txt:'Membisukan'},
  '/unmute': {sec:2,txt:'Membuka mute'},
  '/kick': {sec:4,txt:'Mengeluarkan user'},
  '/rank': {sec:2,txt:'Update rank'},
  '/maintenance': {sec:4,txt:'Maintenance mode'},
  '/unmaintenance': {sec:2,txt:'Selesai maintenance'},
  '/broadcast': {sec:2,txt:'Broadcast pesan'},
  '/store': {sec:2,txt:'Admin toko'},
  '/shopedit': {sec:2,txt:'Edit mall'},
  'default': {sec:2,txt:'Loading'}
};

function loadingCustom(cmd){
  const cfg = PROGRESS[cmd] || PROGRESS['default'];
  const sec = cfg.sec;
  const txt = cfg.txt;
  const steps = 20;
  const delay = (sec*1000)/steps;
  let prog = 0;
  const div = print(`[${'.'.repeat(20)}] 0%  ${txt}`,'loading');
  const intv = setInterval(()=>{
    prog+=5;
    const hash = Math.floor(prog/5);
    const space=20-hash;
    div.textContent = `[${'#'.repeat(hash)}${'.'.repeat(space)}] ${prog}%  ${txt}`;
    if(prog>=100){ clearInterval(intv); div.remove(); }
  },delay);
  return new Promise(res=>setTimeout(res,sec*1000));
}

/********************************************************************
 *  ROUTER + REDIRECT MODE BARU
 *******************************************************************/
input.addEventListener('keydown',async e=>{
  if(e.key!=='Enter') return;
  const raw = input.value.trim();
  if(!raw){ print(''); return; }
  clearInput();
  if(state.maintenance && state.userId!==OWNER_ID){
    print('🔒 Server maintenance.','sys'); return;
  }
  if(state.users[state.userId]?.banned){ print('You are banned.','sys'); return; }
  if(state.users[state.userId]?.mute>Date.now()){ print('You are muted.','sys'); return; }

  // ---------- REDIRECT MODE BARU ----------
  if(raw==='/GlobalChat'){
    await loadingCustom('/GlobalChat');
    location.href='?mode=globalchat';
    return;
  }
  if(raw==='/+Store/'){
    await loadingCustom('/+Store/');
    location.href='?mode=store';
    return;
  }
  if(raw.startsWith('/+#')){
    const m=raw.match(/^\/+#(\d+)$/);
    if(!m){print('Usage: /+#idGrup','sys'); return;}
    await loadingCustom('/+#');
    location.href='?mode=group&id='+m[1];
    return;
  }
  if(raw.startsWith('/+G#')){
    const m=raw.match(/^\/\+G#(.+)$/);
    if(!m){print('Usage: /+G#namaGrup','sys'); return;}
    await loadingCustom('/+G#');
    // buat grup dulu (local) lalu masuk
    const nama=m[1];
    const id=String(state.nextGroupId++);
    state.groups[id]={name:nama,members:[state.userId]};
    location.href='?mode=group&id='+id;
    return;
  }

  // ---------- COMMAND BIASA (TETAP LOCAL) ----------
  await loadingCustom(raw.split(' ')[0]);

  // ---------- OWNER ONLY ----------
  if(raw.startsWith('/maintenance')) return cmdMaintenance(raw);
  if(raw.startsWith('/unmaintenance')) return cmdUnmaintenance();
  if(raw.startsWith('/rank')) return cmdRank(raw);
  if(raw.startsWith('/ban')) return cmdBan(raw);
  if(raw.startsWith('/unban')) return cmdUnban(raw);
  if(raw.startsWith('/mute')) return cmdMute(raw);
  if(raw.startsWith('/unmute')) return cmdUnmute(raw);
  if(raw.startsWith('/kick')) return cmdKick(raw);
  if(raw.startsWith('/broadcast')) return cmdBroadcast(raw);
  if(raw==='/store') return cmdAdminStore();
  if(raw==='/shopedit') return cmdShopEdit();
  // ---------- USER ----------
  if(raw==='help'||raw==='/help') return cmdHelp();
  if(raw.startsWith('/+')) return cmdRegister(raw);
  if(raw==='/profile') return cmdProfile();
  if(raw==='/editprofile') return cmdEditProfile();
  if(raw==='/setting') return cmdSetting();
  if(raw==='/store/') return cmdMyStore();
  if(raw.startsWith('/store/')) return cmdViewStore(raw);
  if(raw.startsWith('/buy')) return cmdBuy(raw);
  if(raw==='/exit') return cmdExit();
  // ---------- PLAIN MESSAGE ----------
  if(state.mode==='global') return sendGlobal(raw);
  if(state.mode==='pchat') return sendPchat(raw);
  if(state.mode==='group') return sendGroup(raw);
  print('Unknown command. Type help','sys');
});

/********************************************************************
 *  LOCAL REGISTRASI (TANPA FIRESTORE)
 *******************************************************************/
function cmdRegister(raw){
  const m=raw.match(/^\/\+(\S+)$/);
  if(!m){print('Usage: /+nama','sys'); return;}
  const nama=m[1];
  if(state.userId){print('Logout first.','sys'); return;}
  // cek lokal dulu
  const exists = Object.values(state.users).some(u=>u.name===nama);
  if(exists){ print('Nama sudah dipakai.','sys'); return; }
  const id = nama.toLowerCase()==='aji' ? OWNER_ID : String(Math.floor(1000000000+Math.random()*9000000000));
  state.users[id]={name:nama,rank:id===OWNER_ID?'owner':'verified',joinDate:new Date(),banned:false,mute:0};
  // simpan ke localStorage (opsional)
  localStorage.setItem('m4rUser',JSON.stringify({id,name:nama,rank:state.users[id].rank}));
  state.userId=id; state.userName=nama;
  print(`Akun dibuat: ID=${id} Nama=${nama}`,'sys');
  setMode('normal');
}

/********************************************************************
 *  LOCAL PROFILE & LAINNYA (TANPA FIRESTORE)
 *******************************************************************/
function cmdProfile(){
  const u=state.users[state.userId];
  if(!u){print('Anda belum punya akun. Ketik /+namaAnda','sys'); return;}
  print(`Profil\nID : ${state.userId}\nNama : ${u.name}\nRank : ${u.rank} ${badge(state.userId)}\nJoin : ${u.joinDate.toLocaleString()}`);
}
function cmdEditProfile(){
  const u=state.users[state.userId];
  if(!u){print('Buat akun dulu.','sys'); return;}
  const n=prompt('Nama baru:',u.name);
  if(!n){print('Dibatalkan.','sys'); return;}
  // cek duplikat lokal
  const exists = Object.values(state.users).some(us=>us.name===n && us!==u);
  if(exists){ print('Nama sudah dipakai.','sys'); return; }
  u.name=n; state.userName=n;
  localStorage.setItem('m4rUser',JSON.stringify({id:state.userId,name:n,rank:u.rank}));
  print('Profil diperbarui.','sys');
  updatePrompt();
}
function cmdSetting(){
  const m=prompt('Auto-hapus pesan (menit, 0=off):',state.autoDel[state.userId]||0);
  if(m===null){print('Dibatalkan.','sys'); return;}
  state.autoDel[state.userId]=parseInt(m)||0;
  print(`Auto-delete di-set ${m||'off'}.`,'sys');
}
function cmdMyStore(){
  if(state.users[state.userId]?.rank!=='store'){
    print('Anda belum seller. /+Store/','sys'); return;
  }
  const list=state.storeCatalog[state.userId]||[];
  let txt='Dashboard Toko Anda\n';
  if(list.length===0) txt+='(kosong)';
  else list.forEach(it=>txt+=`ID:${it.id}  ${it.nama}  ${it.harga}  ${it.tipe}\n`);
  print(txt);
}
function cmdViewStore(raw){
  const m=raw.match(/^\/store\/(\d+)$/);
  if(!m){print('Usage: /store/idUser','sys'); return;}
  const uid=m[1];
  const u=state.users[uid];
  if(!u){ print('User tidak ada.','sys'); return; }
  const list=state.storeCatalog[uid]||[];
  let txt=`Toko (${uid}) "${u.name}"\n`;
  if(list.length===0) txt+='(toko kosong)';
  else list.forEach(it=>txt+=`ID:${it.id}  ${it.nama}  ${it.harga}  ${it.tipe}\n`);
  print(txt);
}
function cmdBuy(raw){
  const m=raw.match(/^\/buy\s+(\d+)$/);
  if(!m){print('Usage: /buy idItem','sys'); return;}
  const idIt=m[1];
  let it=state.mall.find(x=>x.id===idIt);
  let src='mall';
  if(!it){
    for(const uid in state.storeCatalog){
      const f=state.storeCatalog[uid].find(x=>x.id===idIt);
      if(f){it=f; src=uid; break;}
    }
  }
  if(!it){print('Item tidak ditemukan.','sys'); return;}
  print(`[BUY-REQ] Anda ingin membeli "${it.nama}" seharga ${it.harga}. (Owner akan proses)`,'sys');
}
function cmdExit(){
  if(state.mode!=='normal') setMode('normal');
}

/********************************************************************
 *  OWNER COMMANDS (LOCAL)
 *******************************************************************/
function cmdMaintenance(raw){
  const reason=raw.slice(13).trim()||'Maintenance';
  state.maintenance=true;
  print(`🔒 Maintenance aktif: ${reason}`,'sys');
  setMode('normal');
}
function cmdUnmaintenance(){
  state.maintenance=false;
  print('🔓 Maintenance selesai. Server online.','sys');
}
function cmdRank(raw){
  const m=raw.match(/^\/rank\s+(\d+)\s+(verified|admin)$/);
  if(!m){print('Usage: /rank id {verified,admin}','sys'); return;}
  const [_,uid,rk]=m;
  if(!state.users[uid]){print('User tidak ada.','sys'); return;}
  state.users[uid].rank=rk;
  print(`Rank (${uid})("${state.users[uid].name}") → ${rk} ${badge(uid)}`,'sys');
}
function cmdBan(raw){
  const m=raw.match(/^\/ban\s+(\d+)(?:\s+(\d+))?$/);
  if(!m){print('Usage: /ban id [menit] (0=perma)','sys'); return;}
  const [_,uid,min=0]=m;
  if(!state.users[uid]){print('User tidak ada.','sys'); return;}
  state.users[uid].banned=true;
  print(`User (${uid})("${state.users[uid].name}") diban ${min||'perma'}.`,'sys');
}
function cmdUnban(raw){
  const m=raw.match(/^\/unban\s+(\d+)$/);
  if(!m){print('Usage: /unban id','sys'); return;}
  const uid=m[1];
  if(!state.users[uid]){print('User tidak ada.','sys'); return;}
  state.users[uid].banned=false;
  print(`User (${uid})("${state.users[uid].name}") di-unban.`,'sys');
}
function cmdMute(raw){
  const m=raw.match(/^\/mute\s+(\d+)\s+(\d+)$/);
  if(!m){print('Usage: /mute id menit','sys'); return;}
  const [_,uid,min]=m;
  if(!state.users[uid]){print('User tidak ada.','sys'); return;}
  state.users[uid].mute=Date.now()+min*60000;
  print(`User (${uid})("${state.users[uid].name}") dimute ${min} menit.`,'sys');
}
function cmdUnmute(raw){
  const m=raw.match(/^\/unmute\s+(\d+)$/);
  if(!m){print('Usage: /unmute id','sys'); return;}
  const uid=m[1];
  if(!state.users[uid]){print('User tidak ada.','sys'); return;}
  state.users[uid].mute=0;
  print(`User (${uid})("${state.users[uid].name}") di-unmute.`,'sys');
}
function cmdKick(raw){
  const m=raw.match(/^\/kick\s+(\d+)$/);
  if(!m){print('Usage: /kick id','sys'); return;}
  const uid=m[1];
  if(!state.users[uid]){print('User tidak ada.','sys'); return;}
  for(const gid in state.groups){
    state.groups[gid].members=state.groups[gid].members.filter(x=>x!==uid);
  }
  print(`User (${uid})("${state.users[uid].name}") dikick.`,'sys');
}
function cmdBroadcast(raw){
  const txt=raw.slice(11).trim()||'Broadcast';
  print(`[BROADCAST] ${txt}`,'sys');
}
function cmdAdminStore(){
  let txt='Admin Panel – Semua Toko\n';
  for(const uid in state.storeCatalog){
    const u=state.users[uid];
    const list=state.storeCatalog[uid];
    txt+=`\nToko (${uid}) "${u?u.name:'?'}"\n`;
    list.forEach(it=>txt+=`ID:${it.id}  ${it.nama}  ${it.harga}  ${it.tipe}\n`);
  }
  print(txt,'sys');
}
function cmdShopEdit(){
  let txt='Mall Admin – Kelola Barang\n';
  state.mall.forEach(it=>txt+=`ID:${it.id}  ${it.nama}  ${it.harga}  Stok:${it.stok}\n`);
  print(txt,'sys');
}

/********************************************************************
 *  UTILS
 *******************************************************************/
function badge(id){
  const r=state.users[id]?.rank;
  if(r==='owner') return '🅒';
  if(r==='admin') return '👑';
  if(r==='verified') return '✔';
  if(r==='store') return '💸';
  return '';
}

/********************************************************************
 *  AUTO LOGIN DARI LOCALSTORAGE / URL MODE
 *******************************************************************/
window.addEventListener('DOMContentLoaded',()=>{
  // cek localStorage dulu
  const saved = localStorage.getItem('m4rUser');
  if(saved){
    const u=JSON.parse(saved);
    state.userId=u.id; state.userName=u.name;
    state.users[u.id]={name:u.name,rank:u.rank,joinDate:new Date(),banned:false,mute:0};
  }
  // cek URL mode
  const params = new URLSearchParams(location.search);
  const mode = params.get('mode');
  if(mode==='globalchat') setMode('global');
  else if(mode==='store') setMode('normal');
  else if(mode==='group'){
    const gid=params.get('id')||'0';
    state.groups[gid]={name:'Grup '+gid,members:[state.userId]};
    setMode('group',gid);
  }
  updatePrompt();
});
