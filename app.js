/********************************************************************
 *  CONFIG & STATE
 *******************************************************************/
const firebaseConfig = {
    apiKey: "AIzaSyAsyka0zXAUyCS9kfnnx4t5M5kQDt9iDgc",
    authDomain: "m4rdb-55f9c.firebaseapp.com",
    projectId: "m4rdb-55f9c",
    storageBucket: "m4rdb-55f9c.firebasestorage.app",
    messagingSenderId: "421535711503",
    appId: "1:421535711503:web:cdc04adb92b945d059be7a",
    measurementId: "G-QDPNVX70R7"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const OWNER_ID   = '000000001';
const OWNER_NAME = 'Aji';

let state = {
  users:{},          // id:{name,rank,banned,mute,joinDate}
  groups:{},
  mall:[],
  storeCatalog:{},
  maintenance:false,
  autoDel:{},        // idUser:menit
  msgTimer:{},
  nextId:1,
  nextItemId:1,
  nextGroupId:100000,
  mode:'normal',     // normal | chat | global | pchat | group
  chatTarget:null,
  userId:null,
  userName:null
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
 *  UTILS
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
  updateStatusBar();
  updatePrompt();
}
function updateStatusBar(){
  let title = 'M4R Console';
  if(m==='global') title = 'GlobalChat';
  else if(m==='pchat') title = `Chat → ${state.chatTarget}`;
  else if(m==='group') title = `Grup G${state.chatTarget}`;
  statusL.textContent = title;
}
function updatePrompt(){
  if(!state.userId){ promptEl.textContent='$ '; return; }
  const u = state.users[state.userId];
  const b = (u.rank==='owner'?'🅒':u.rank==='admin'?'👑':u.rank==='verified'?'✔':u.rank==='store'?'💸':'');
  if(state.mode==='normal') promptEl.textContent=`(${state.userId}) ${b} ("${u.name}") $ `;
  else if(state.mode==='global') promptEl.textContent=`(${state.userId}) ${b} ("${u.name}") GLOBAL # `;
  else if(state.mode==='pchat') promptEl.textContent=`(${state.userId}) ${b} ("${u.name}") → (${state.chatTarget}) # `;
  else if(state.mode==='group') promptEl.textContent=`(${state.userId}) ${b} ("${u.name}") → G${state.chatTarget} # `;
}

/********************************************************************
 *  DEVICE STATUS (JAM & JARINGAN)
 *******************************************************************/
function updateDeviceStatus(){
  const now = new Date();
  jamEl.textContent = now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
  // jaringan: ambil type connection API bila ada
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
 *  LOADING SIMULASI
 *******************************************************************/
function loading(ms=400){
  const div = print('Loading...','loading');
  return new Promise(r=>setTimeout(()=>{div.remove();r();},ms));
}

/********************************************************************
 *  COMMAND ROUTER
 *******************************************************************/
input.addEventListener('keydown',async e=>{
  if(e.key!=='Enter') return;
  const raw = input.value.trim();
  if(!raw){ print(''); return; }
  clearInput();
  if(state.maintenance && state.userId!==OWNER_ID){
    print('🔒 Server maintenance.'); return;
  }
  if(state.users[state.userId]?.banned){ print('You are banned.'); return; }
  if(state.users[state.userId]?.mute>Date.now()){ print('You are muted.'); return; }

  await loading(); // animasi loading tiap command

  // ---------- OWNER ----------
  if(raw.startsWith('/maintenance')) return cmdMaintenance(raw);
  if(raw.startsWith('/unmaintenance')) return cmdUnmaintenance();
  if(raw.startsWith('/rank')) return cmdRank(raw);
  if(raw==='/store') return cmdAdminStore();
  if(raw==='/shopedit') return cmdShopEdit();
  // ---------- USER ----------
  if(raw==='help'||raw==='/help') return cmdHelp();
  if(raw.startsWith('/+')) return cmdRegister(raw);
  if(raw==='/GlobalChat') return cmdGlobalChat();
  if(raw.startsWith('/+G#')) return cmdCreateGroup(raw);
  if(raw.startsWith('/+#')) return cmdJoinGroup(raw);
  if(raw==='/+Store/') return cmdBeSeller();
  if(raw==='/store/') return cmdMyStore();
  if(raw.startsWith('/store/')) return cmdViewStore(raw);
  if(raw==='/profile') return cmdProfile();
  if(raw==='/editprofile') return cmdEditProfile();
  if(raw==='/setting') return cmdSetting();
  if(raw.startsWith('/buy')) return cmdBuy(raw);
  if(raw==='/exit') return cmdExit();
  // ---------- PLAIN MESSAGE ----------
  if(state.mode==='global') return sendGlobal(raw);
  if(state.mode==='pchat') return sendPchat(raw);
  if(state.mode==='group') return sendGroup(raw);
  print('Unknown command. Type help');
});

/********************************************************************
 *  BASIC COMMANDS
 *******************************************************************/
function cmdHelp(){
  print(`Commands:
/help              – bantuan
/+nama             – buat akun
/GlobalChat        – masuk global chat
/+G#namaGrup       – buat grup
/#idGrup           – join grup
/+Store/           – jadi seller
/store/            – kelola toko
/store/id          – lihat toko orang
/profile           – profil
/editprofile       – edit profil
/setting           – auto-hapus pesan
/buy idItem        – beli barang
/exit              – keluar mode
Owner:
/maintenance alasan
/unmaintenance
/rank id {verified,admin}
/store             – admin toko
/shopedit          – admin mall`);
}
function cmdRegister(raw){
  const m=raw.match(/^\/\+(\S+)$/);
  if(!m){print('Usage: /+nama'); return;}
  const nama=m[1];
  if(state.userId){print('Logout first.'); return;}
  const id=String(Math.floor(1000000000+Math.random()*9000000000));
  addUser(id,nama);
  state.userId=id; state.userName=nama;
  print(`Akun dibuat: ID=${id} Nama=${nama}`);
  setMode('normal');
}
function cmdGlobalChat(){
  if(state.mode==='global'){setMode('normal'); return;}
  setMode('global');
}
function cmdCreateGroup(raw){
  const m=raw.match(/^\/\+G#(.+)$/);
  if(!m){print('Usage: /+G#namaGrup'); return;}
  const nama=m[1];
  const id=String(state.nextGroupId++);
  state.groups[id]={name:nama,members:[state.userId]};
  print(`Grup dibuat: G${id} "${nama}"`);
}
function cmdJoinGroup(raw){
  const m=raw.match(/^\/\+#(\d+)$/);
  if(!m){print('Usage: /+#idGrup'); return;}
  const id=m[1];
  if(!state.groups[id]){print('Grup tidak ada.'); return;}
  if(!state.groups[id].members.includes(state.userId))
    state.groups[id].members.push(state.userId);
  setMode('group',id);
}
function cmdBeSeller(){
  const u=state.users[state.userId];
  if(!u){print('Buat akun dulu.'); return;}
  if(u.rank==='store'){print('Sudah seller.'); return;}
  u.rank='store';
  if(!state.storeCatalog[state.userId]) state.storeCatalog[state.userId]=[];
  print('Anda sekarang seller! Rank 💸 aktif.');
  updatePrompt();
}
function cmdMyStore(){
  if(state.users[state.userId]?.rank!=='store'){
    print('Anda belum seller. /+Store/'); return;
  }
  let txt='Dashboard Toko Anda\n';
  const list=state.storeCatalog[state.userId]||[];
  if(list.length===0) txt+='(kosong)';
  else list.forEach(it=>txt+=`ID:${it.id}  ${it.nama}  ${it.harga}  ${it.tipe}\n`);
  print(txt);
}
function cmdViewStore(raw){
  const m=raw.match(/^\/store\/(\d+)$/);
  if(!m){print('Usage: /store/idUser'); return;}
  const uid=m[1];
  const u=state.users[uid];
  if(!u){print('User tidak ada.'); return;}
  const list=state.storeCatalog[uid]||[];
  let txt=`Toko (${uid}) "${u.name}"\n`;
  if(list.length===0) txt+='(toko kosong)';
  else list.forEach(it=>txt+=`ID:${it.id}  ${it.nama}  ${it.harga}  ${it.tipe}\n`);
  print(txt);
}
function cmdProfile(){
  const u=state.users[state.userId];
  if(!u){print('Buat akun dulu.'); return;}
  print(`Profil\nID : ${state.userId}\nNama : ${u.name}\nRank : ${u.rank}\nJoin : ${u.joinDate.toLocaleString()}`);
}
function cmdEditProfile(){
  const u=state.users[state.userId];
  if(!u){print('Buat akun dulu.'); return;}
  const n=prompt('Nama baru:',u.name);
  if(!n){print('Dibatalkan.'); return;}
  u.name=n; state.userName=n;
  print('Profil diperbarui.');
  updatePrompt();
}
function cmdSetting(){
  const m=prompt('Auto-hapus pesan (menit, 0=off):',state.autoDel[state.userId]||0);
  if(m===null){print('Dibatalkan.'); return;}
  state.autoDel[state.userId]=parseInt(m)||0;
  print(`Auto-delete di-set ${m||'off'}.`);
}
function cmdBuy(raw){
  const m=raw.match(/^\/buy\s+(\d+)$/);
  if(!m){print('Usage: /buy idItem'); return;}
  const idIt=m[1];
  let it=state.mall.find(x=>x.id===idIt);
  let src='mall';
  if(!it){
    for(const uid in state.storeCatalog){
      const f=state.storeCatalog[uid].find(x=>x.id===idIt);
      if(f){it=f; src=uid; break;}
    }
  }
  if(!it){print('Item tidak ditemukan.'); return;}
  print(`[BUY-REQ] Anda ingin membeli "${it.nama}" seharga ${it.harga}. (Owner akan proses)`);
  // notif ke owner
  if(state.users[OWNER_ID])
    print(`[BUY-REQ] User (${state.userId})("${state.userName}") ingin membeli "${it.nama}" seharga ${it.harga}.`);
}
function cmdExit(){
  if(state.mode!=='normal') setMode('normal');
}

/********************************************************************
 *  CHAT DELIVERY
 *******************************************************************/
function sendGlobal(txt){
  const del=state.autoDel[state.userId]||0;
  const el=print(`[GLOBAL] (${state.userId})${badge(state.userId)} ("${state.userName}"): ${txt}`);
  if(del) scheduleExpire(el,del);
}
function sendPchat(txt){
  if(!state.chatTarget){ print('No target.'); return; }
  const del=state.autoDel[state.userId]||0;
  const el=print(`[CHAT] (${state.userId})${badge(state.userId)} ("${state.userName}") → (${state.chatTarget})${badge(state.chatTarget)} ("${state.users[state.chatTarget]?.name||'?'}}"): ${txt}`);
  if(del) scheduleExpire(el,del);
}
function sendGroup(txt){
  if(!state.chatTarget){ print('No group.'); return; }
  const del=state.autoDel[state.userId]||0;
  const el=print(`[GRUP G${state.chatTarget}] (${state.userId})${badge(state.userId)} ("${state.userName}"): ${txt}`);
  if(del) scheduleExpire(el,del);
}
function scheduleExpire(el,menit){
  if(!menit) return;
  const ms=menit*60000;
  setTimeout(()=>{el.textContent='[expired]';el.classList.add('expired');},ms);
}
function badge(id){
  const r=state.users[id]?.rank;
  if(r==='owner') return '🅒';
  if(r==='admin') return '👑';
  if(r==='verified') return '✔';
  if(r==='store') return '💸';
  return '';
}

/********************************************************************
 *  OWNER COMMANDS
 *******************************************************************/
function cmdMaintenance(raw){
  const reason=raw.slice(13).trim()||'Maintenance';
  state.maintenance=true;
  print(`🔒 Maintenance aktif: ${reason}`);
  setMode('normal');
}
function cmdUnmaintenance(){
  state.maintenance=false;
  print('🔓 Maintenance selesai. Server online.');
}
function cmdRank(raw){
  const m=raw.match(/^\/rank\s+(\d+)\s+(verified|admin)$/);
  if(!m){print('Usage: /rank id {verified|admin}'); return;}
  const [_,uid,rk]=m;
  if(!state.users[uid]){print('User tidak ada.'); return;}
  state.users[uid].rank=rk;
  print(`Rank (${uid})("${state.users[uid].name}") → ${rk} ${badge(uid)}`);
}

/********************************************************************
 *  USER MANAGEMENT
 *******************************************************************/
function addUser(id,name,rank='verified'){
  if(state.users[id]) return false;
  state.users[id]={name,rank,joinDate:new Date(),banned:false,mute:0};
  return true;
}

/********************************************************************
 *  INIT
 *******************************************************************/
print('Ketik help untuk bantuan.');
updatePrompt();
