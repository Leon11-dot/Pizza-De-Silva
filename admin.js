async function resumeAudioOnInteraction(){
  if(!sound) return;
  try{
    audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==='suspended') await audioCtx.resume();
  }catch(e){}
}
['click','pointerup','touchend','keydown'].forEach(evt=>{
  document.addEventListener(evt,resumeAudioOnInteraction,{passive:true});
});

const money=n=>Number(n||0).toLocaleString('de-DE',{style:'currency',currency:PDS_CONFIG.currency||'EUR'});
let sound=localStorage.getItem('pds_sound_enabled')==='1',timer=null,audioCtx=null;
let lastNewIds=new Set();

function showLogin(message=''){
  document.getElementById('login').style.display='flex';
  document.getElementById('panel').style.display='none';
  document.getElementById('logoutBtn').style.display='none';
  document.getElementById('loginError').innerHTML=message?`<div class="notice">${message}</div>`:'';
}

function showPanel(){
  document.getElementById('login').style.display='none';
  document.getElementById('panel').style.display='block';
  document.getElementById('logoutBtn').style.display='inline-flex';
}

async function login(){
  const email=document.getElementById('email').value.trim();
  const password=document.getElementById('pw').value;
  const err=document.getElementById('loginError');
  err.innerHTML='';
  try{
    await PDS_BACKEND.signIn(email,password);
    showPanel();
    await render();
  }catch(e){
    showLogin(e?.message?.includes('nicht als') ? e.message : 'Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort prüfen.');
  }
}

function logout(){
  PDS_BACKEND.signOut();
  if(timer){clearInterval(timer);timer=null}
  showLogin('Du wurdest abgemeldet.');
}

function updateSoundStatus(){
  const st=document.getElementById('soundStatus');
  if(st) st.textContent=sound?'✅ Ton ist aktiviert':'';
}
async function initAdmin(){
  if(!PDS_BACKEND.isSignedIn()) return showLogin();
  const ok=await PDS_BACKEND.verifyAdmin();
  if(!ok){PDS_BACKEND.signOut();return showLogin('Bitte erneut anmelden.');}
  showPanel();
  updateSoundStatus();
  await render();
}

async function beep(){
  if(!sound) return;
  try{
    audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==='suspended') await audioCtx.resume();
    const now=audioCtx.currentTime;
    const gain=audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001,now);
    gain.gain.exponentialRampToValueAtTime(0.2,now+0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001,now+0.9);
    gain.connect(audioCtx.destination);
    [880,1175].forEach((freq,i)=>{
      const o=audioCtx.createOscillator();
      o.type='sine';
      o.frequency.value=freq;
      o.connect(gain);
      o.start(now+i*0.15);
      o.stop(now+0.7+i*0.15);
    });
  }catch(e){ console.warn('Bestellalarm Fehler',e); }
}

async function enableSound(){
  try{
    audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
    await audioCtx.resume();
    sound=true;
    localStorage.setItem('pds_sound_enabled','1');
    const st=document.getElementById('soundStatus');
    if(st) st.textContent='✅ Ton ist aktiviert';
    await beep();
  }catch(e){
    const st=document.getElementById('soundStatus');
    if(st) st.textContent='❌ Ton konnte nicht aktiviert werden';
  }
}

async function accept(id){
  const card=document.querySelector(`[data-order="${CSS.escape(String(id))}"]`);
  const eta=Number(card.dataset.eta||0);
  if(!eta)return alert('Bitte zuerst eine Zeit auswählen.');
  await PDS_BACKEND.updateOrder(id,{status:'accepted',eta,updatedAt:new Date().toISOString()});
  render();
}

async function reject(id){
  await PDS_BACKEND.updateOrder(id,{status:'cancelled',cancelReason:'Vom Restaurant abgelehnt',updatedAt:new Date().toISOString()});
  render();
}

async function status(id,s){
  await PDS_BACKEND.updateOrder(id,{status:s,updatedAt:new Date().toISOString()});
  render();
}

async function expire(all){
  const now=Date.now();
  for(const x of all){
    if(x.status==='new'&&x.expiresAt&&now>x.expiresAt){
      await PDS_BACKEND.updateOrder(x.id,{
        status:'cancelled',
        cancelReason:'Nicht innerhalb der Bestätigungszeit angenommen',
        updatedAt:new Date().toISOString()
      });
    }
  }
}

async function render(){
  if(document.getElementById('panel').style.display==='none') return;
  try{
    let all=await PDS_BACKEND.listOrders();
    await expire(all);
    all=await PDS_BACKEND.listOrders();

    document.getElementById('modeLabel').textContent=PDS_BACKEND.modeLabel;
    document.getElementById('sNew').textContent=all.filter(x=>x.status==='new').length;
    document.getElementById('sAccepted').textContent=all.filter(x=>x.status==='accepted').length;
    document.getElementById('sPrep').textContent=all.filter(x=>x.status==='preparing').length;
    document.getElementById('sDone').textContent=all.filter(x=>x.status==='done').length;
    document.getElementById('sRevenue').textContent=money(all.filter(x=>x.status!=='cancelled').reduce((s,x)=>s+x.total,0));

    const currentNewIds=new Set(all.filter(x=>x.status==='new').map(x=>String(x.id)));
    const hasNewArrival=[...currentNewIds].some(id=>!lastNewIds.has(id));
    if(hasNewArrival && sound) beep();
    lastNewIds=currentNewIds;
    const has=all.some(x=>x.status==='new');
    document.getElementById('alarm').classList.toggle('show',has);
    if(has&&sound&&!timer)timer=setInterval(beep,4500);
    if(!has&&timer){clearInterval(timer);timer=null}

    const labels={new:'NEU – Bestätigung nötig',accepted:'Angenommen',preparing:'In Zubereitung',ready:'Bereit / unterwegs',done:'Abgeschlossen',cancelled:'Storniert'};

    document.getElementById('orders').innerHTML=all.length?all.map(x=>{
      const items=(x.items||[]).map(i=>`<li>${i.qty}× ${i.name} (${i.variant})${i.extraName?' + '+i.extraName:''}${i.note?' – '+i.note:''}</li>`).join('');
      let actions='';
      if(x.status==='new')actions=`<div class="actions"><button class="time" onclick="setEta('${x.id}',20,this)">20 Min</button><button class="time" onclick="setEta('${x.id}',30,this)">30 Min</button><button class="time" onclick="setEta('${x.id}',40,this)">40 Min</button><button class="time" onclick="setEta('${x.id}',50,this)">50 Min</button><button class="time" onclick="setEta('${x.id}',60,this)">60 Min</button><button class="time" onclick="setEta('${x.id}',90,this)">90 Min</button></div><div class="actions"><button class="btn green" onclick="accept('${x.id}')">✓ Annehmen</button><button class="btn danger" onclick="reject('${x.id}')">✕ Ablehnen</button></div>`;
      if(x.status==='accepted')actions=`<div class="actions"><button class="btn blue" onclick="status('${x.id}','preparing')">In Zubereitung</button></div>`;
      if(x.status==='preparing')actions=`<div class="actions"><button class="btn secondary" onclick="status('${x.id}','ready')">${x.customer.type==='Abholung'?'Bereit zur Abholung':'Als unterwegs markieren'}</button></div>`;
      if(x.status==='ready')actions=`<div class="actions"><button class="btn green" onclick="status('${x.id}','done')">Abschließen</button></div>`;

      return `<article class="order ${x.status}" data-order="${x.id}">
        <h3>#${x.number} • ${labels[x.status]}</h3>
        <div class="meta">${new Date(x.createdAt).toLocaleString('de-DE')} • ${x.customer.type} • ${x.customer.payment}</div>
        <p><b>${x.customer.name}</b><br>${x.customer.phone}<br>${x.customer.address||''}</p>
        <ul class="items">${items}</ul>
        <p><b>Gesamt: ${money(x.total)}</b>${x.eta?` • ca. ${x.eta} Min.`:''}</p>
        ${x.customer.note?`<p class="meta">Hinweis: ${x.customer.note}</p>`:''}
        ${x.cancelReason?`<div class="notice">${x.cancelReason}</div>`:''}
        ${actions}
      </article>`;
    }).join(''):'<div class="empty">Noch keine Bestellungen.</div>';
  }catch(e){
    console.error(e);
    PDS_BACKEND.signOut();
    showLogin('Deine Admin-Sitzung ist abgelaufen. Bitte erneut anmelden.');
  }
}

document.getElementById('pw')?.addEventListener('keydown',e=>{if(e.key==='Enter')login()});
setInterval(()=>{if(document.getElementById('panel').style.display!=='none')render()},1500);
initAdmin();
