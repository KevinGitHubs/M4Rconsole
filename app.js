/********************************************************************
 *  FIREBASE CONFIG
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

/********************************************************************
 *  CONST & STATE
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
 *  TERMUX-LIKE PROGRESS (TEKS)
 *******************************************************************/
function loading(){
  const sec = 2 + Math.floor(Math.random()*8); // 2-9 detik
  const steps = 20; // 20 update
  const delay = (sec*1000)/steps;
  let prog = 0;
  const div = print('[                    ] 0%','loading');
  const intv = setInterval(()=>{
    prog+=5;
    const hash = Math.floor(prog/5);
    const space=20-hash;
    div.textContent = `[${'#'.repeat(hash)}${'.'.repeat(space)}] ${prog}%`;
    if(prog>=100){ clearInterval(intv); div.remove(); }
  },delay);
  return new Promise(res=>setTimeout(res,sec*1000));
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
    print('🔒 Server maintenance.','sys'); return;
  }
  if(state.users[state.userId]?.banned){ print('You are banned.','sys'); return; }
  if(state.users[state.userId]?.mute>Date.now()){ print('You are muted.','sys'); return; }

  await loading(); // progress palsu

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
  print('Unknown command. Type help','sys');
});

/********************************************************************
 *  BASIC COMMANDS
 *******************************************************************/
function cmdHelp(){
  const isOwner = state.userId===OWNER_ID;
  let txt='Commands:\n';
  txt+='help, /+nama, /GlobalChat, /+G#namaGrup, /+#idGrup, /+Store/, /store/, /store/id, /profile, /editprofile, /setting, /buy idItem, /exit';
  if(isOwner){
    txt+='\nOwner:\n/maintenance alasan, /unmaintenance, /rank id {verified,admin}, /ban id menit, /unban id, /mute id menit, /unmute id, /kick id, /broadcast pesan, /store, /shopedit';
  }
  print(txt,'sys');
}
function cmdRegister(raw){
  const m=raw.match(/^\/\+(\S+)$/);
  if(!m){print('Usage: /+nama','sys'); return;}
  const nama=m[1];
  if(state.userId){print('Logout first.','sys'); return;}
  // cek duplikat nama & id
  db.collection('users').where('name','==',nama).get().then(snap=>{
    if(!snap.empty){ print('Nama sudah dipakai.','sys'); return; }
    const id = nama.toLowerCase()==='aji' ? OWNER_ID : String(Math.floor(1000000000+Math.random()*9000000000));
    db.collection('users').doc(id).set({
      name:nama,
      rank: id===OWNER_ID ? 'owner' : 'verified',
      joinDate: firebase.firestore.FieldValue.serverTimestamp(),
      banned:false,
      mute:0
    }).then(()=>{
      state.users[id]={name:nama,rank:id===OWNER_ID?'owner':'verified',joinDate:new Date(),banned:false,mute:0};
      state.userId=id; state.userName=nama;
      print(`Akun dibuat: ID=${id} Nama=${nama}`,'sys');
      setMode('normal');
    });
  });
}
function cmdGlobalChat(){
  if(state.mode==='global'){setMode('normal'); return;}
  setMode('global');
}
function cmdCreateGroup(raw){
  const m=raw.match(/^\/\+G#(.+)$/);
  if(!m){print('Usage: /+G#namaGrup','sys'); return;}
  const nama=m[1];
  const id=String(state.nextGroupId++);
  db.collection('groups').doc(id).set({
    name:nama,
    members:[state.userId]
  }).then(()=>{
    state.groups[id]={name:nama,members:[state.userId]};
    print(`Grup dibuat: G${id} "${nama}"`,'sys');
  });
}
function cmdJoinGroup(raw){
  const m=raw.match(/^\/\+#(\d+)$/);
  if(!m){print('Usage: /+#idGrup','sys'); return;}
  const id=m[1];
  db.collection('groups').doc(id).get().then(doc=>{
    if(!doc.exists){ print('Grup tidak ada.','sys'); return; }
    const data=doc.data();
    if(!data.members.includes(state.userId)){
      data.members.push(state.userId);
      db.collection('groups').doc(id).update({members:data.members});
    }
    state.groups[id]=data;
    setMode('group',id);
  });
}
function cmdBeSeller(){
  const u=state.users[state.userId];
  if(!u){print('Buat akun dulu.','sys'); return;}
  if(u.rank==='store'){print('Sudah seller.','sys'); return;}
  db.collection('users').doc(state.userId).update({rank:'store'}).then(()=>{
    u.rank='store';
    if(!state.storeCatalog[state.userId]) state.storeCatalog[state.userId]=[];
    print('Anda sekarang seller! Rank 💸 aktif.','sys');
    updatePrompt();
  });
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
  db.collection('users').doc(uid).get().then(doc=>{
    if(!doc.exists){ print('User tidak ada.','sys'); return; }
    const u=doc.data();
    const list=state.storeCatalog[uid]||[];
    let txt=`Toko (${uid}) "${u.name}"\n`;
    if(list.length===0) txt+='(toko kosong)';
    else list.forEach(it=>txt+=`ID:${it.id}  ${it.nama}  ${it.harga}  ${it.tipe}\n`);
    print(txt);
  });
}
function cmdProfile(){
  const u=state.users[state.userId];
  if(!u){print('Anda belum punya akun. Ketik /+namaAnda','sys'); return;}
  print(`Profil\nID : ${state.userId}\nNama : ${u.name}\nRank : ${u.rank} ${badge(state.userId)}\nJoin : ${u.joinDate.toDate().toLocaleString()}`);
}
function cmdEditProfile(){
  const u=state.users[state.userId];
  if(!u){print('Buat akun dulu.','sys'); return;}
  const n=prompt('Nama baru:',u.name);
  if(!n){print('Dibatalkan.','sys'); return;}
  db.collection('users').doc(state.userId).update({name:n}).then(()=>{
    u.name=n; state.userName=n;
    print('Profil diperbarui.','sys');
    updatePrompt();
  });
}
function cmdSetting(){
  const m=prompt('Auto-hapus pesan (menit, 0=off):',state.autoDel[state.userId]||0);
  if(m===null){print('Dibatalkan.','sys'); return;}
  state.autoDel[state.userId]=parseInt(m)||0;
  print(`Auto-delete di-set ${m||'off'}.`,'sys');
}
function cmdExit(){
  if(state.mode!=='normal') setMode('normal');
}

/********************************************************************
 *  CHAT DELIVERY
 *******************************************************************/
function sendGlobal(txt){
  const del=state.autoDel[state.userId]||0;
  const el=print(`[GLOBAL] (${state.userId})${badge(state.userId)} ("${state.userName}"): ${txt}`,'self');
  if(del) scheduleExpire(el,del);
  // simpan ke firestore (broadcast ke listener lain)
  db.collection('globalChat').add({from:state.userId,txt,timestamp:firebase.firestore.FieldValue.serverTimestamp()});
}
function sendPchat(txt){
  if(!state.chatTarget){ print('No target.','sys'); return; }
  const del=state.autoDel[state.userId]||0;
  const el=print(`[CHAT] (${state.userId})${badge(state.userId)} ("${state.userName}") → (${state.chatTarget})${badge(state.chatTarget)} ("${state.users[state.chatTarget]?.name||'?'}}"): ${txt}`,'self');
  if(del) scheduleExpire(el,del);
}
function sendGroup(txt){
  if(!state.chatTarget){ print('No group.','sys'); return; }
  const del=state.autoDel[state.userId]||0;
  const el=print(`[GRUP G${state.chatTarget}] (${state.userId})${badge(state.userId)} ("${state.userName}"): ${txt}`,'self');
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
  db.collection('users').doc(uid).update({rank:rk}).then(()=>{
    state.users[uid].rank=rk;
    print(`Rank (${uid})("${state.users[uid].name}") → ${rk} ${badge(uid)}`,'sys');
  });
}
function cmdBan(raw){
  const m=raw.match(/^\/ban\s+(\d+)(?:\s+(\d+))?$/);
  if(!m){print('Usage: /ban id [menit] (0=perma)','sys'); return;}
  const [_,uid,min=0]=m;
  if(!state.users[uid]){print('User tidak ada.','sys'); return;}
  const until=min?Date.now()+min*60000:0;
  db.collection('users').doc(uid).update({banned:true,banUntil:until}).then(()=>{
    state.users[uid].banned=true;
    print(`User (${uid})("${state.users[uid].name}") diban ${min||'perma'}.`,'sys');
  });
}
function cmdUnban(raw){
  const m=raw.match(/^\/unban\s+(\d+)$/);
  if(!m){print('Usage: /unban id','sys'); return;}
  const uid=m[1];
  if(!state.users[uid]){print('User tidak ada.','sys'); return;}
  db.collection('users').doc(uid).update({banned:false}).then(()=>{
    state.users[uid].banned=false;
    print(`User (${uid})("${state.users[uid].name}") di-unban.`,'sys');
  });
}
function cmdMute(raw){
  const m=raw.match(/^\/mute\s+(\d+)\s+(\d+)$/);
  if(!m){print('Usage: /mute id menit','sys'); return;}
  const [_,uid,min]=m;
  if(!state.users[uid]){print('User tidak ada.','sys'); return;}
  const until=Date.now()+min*60000;
  db.collection('users').doc(uid).update({mute:until}).then(()=>{
    state.users[uid].mute=until;
    print(`User (${uid})("${state.users[uid].name}") dimute ${min} menit.`,'sys');
  });
}
function cmdUnmute(raw){
  const m=raw.match(/^\/unmute\s+(\d+)$/);
  if(!m){print('Usage: /unmute id','sys'); return;}
  const uid=m[1];
  if(!state.users[uid]){print('User tidak ada.','sys'); return;}
  db.collection('users').doc(uid).update({mute:0}).then(()=>{
    state.users[uid].mute=0;
    print(`User (${uid})("${state.users[uid].name}") di-unmute.`,'sys');
  });
}
function cmdKick(raw){
  const m=raw.match(/^\/kick\s+(\d+)$/);
  if(!m){print('Usage: /kick id','sys'); return;}
  const uid=m[1];
  if(!state.users[uid]){print('User tidak ada.','sys'); return;}
  // keluarkan dari semua grup & global
  if(state.mode==='global' && state.userId===uid) setMode('normal');
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
 *  USER MANAGEMENT
 *******************************************************************/
function addUser(id,name,rank='verified'){
  if(state.users[id]) return false;
  state.users[id]={name,rank,joinDate:new Date(),banned:false,mute:0};
  return true;
}

/********************************************************************
 *  LISTENER GLOBAL CHAT (REALTIME)
 *******************************************************************/
db.collection('globalChat').orderBy('timestamp','desc').limit(50).onSnapshot(snap=>{
  snap.docChanges().reverse().forEach(chg=>{
    if(chg.type==='added'){
      const msg=chg.doc.data();
      if(msg.from===state.userId) return; // skip diri sendiri
      const el=print(`[GLOBAL] (${msg.from})${badge(msg.from)} ("${state.users[msg.from]?.name||'?'}"): ${msg.txt}`,'other');
      const del=state.autoDel[msg.from]||0;
      if(del) scheduleExpire(el,del);
    }
  });
});

/********************************************************************
 *  INIT
 *******************************************************************/
print('Ketik help untuk bantuan.','sys');
updatePrompt();
