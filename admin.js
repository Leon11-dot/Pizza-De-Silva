
// === Pizza De Silva: Handy-Push für neue Bestellungen ===
const PDS_VAPID_PUBLIC_KEY='BKlfZ_NjAyOm1GuHjIcMbH3pUEachl0ZW06ihTMhrzJOGL0qd0xaywI4w-n_1dvr56xZac8TBCzb3awIbiCBdrI';

function pdsUrlBase64ToUint8Array(base64String){
  const padding='='.repeat((4-base64String.length%4)%4);
  const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
  const rawData=atob(base64);
  return Uint8Array.from([...rawData].map(c=>c.charCodeAt(0)));
}

async function updatePushStatus(){
  const st=document.getElementById('pushStatus');
  const btn=document.getElementById('pushEnableBtn');
  if(!st||!btn) return;
  if(!('serviceWorker' in navigator) || !('PushManager' in window)){
    st.textContent='Push-Benachrichtigungen werden auf diesem Gerät/Browser nicht unterstützt.';
    btn.style.display='none';
    return;
  }
  try{
    const reg=await navigator.serviceWorker.ready;
    const sub=await reg.pushManager.getSubscription();
    if(sub && Notification.permission==='granted'){
      st.textContent='✅ Aktiv – neue Bestellungen melden sich auch wenn die Admin-App nicht geöffnet ist.';
      btn.textContent='✅ Handy-Alarm ist aktiv';
    }else{
      st.textContent='Noch nicht aktiviert.';
      btn.textContent='🔔 Handy-Alarm aktivieren';
    }
  }catch(e){
    st.textContent='Handy-Alarm konnte noch nicht geprüft werden.';
  }
}

async function enableAdminPush(){
  try{
    if(!PDS_BACKEND.isSignedIn()) throw new Error('Bitte zuerst als Admin anmelden.');
    if(!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Push wird von diesem Browser nicht unterstützt.');

    if(/iPhone|iPad|iPod/.test(navigator.userAgent) && !navigator.standalone) throw new Error('Auf dem iPhone bitte erst über Safari zum Home-Bildschirm hinzufügen und die App dort öffnen.');
    const permission=await Notification.requestPermission();
    if(permission!=='granted') throw new Error('Benachrichtigungen wurden nicht erlaubt.');

    const reg=await navigator.serviceWorker.ready;
    let sub=await reg.pushManager.getSubscription();
    if(sub){
      const key=sub.options?.applicationServerKey;
      const current=key?btoa(String.fromCharCode(...new Uint8Array(key))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''):'';
      if(current!==PDS_VAPID_PUBLIC_KEY){await sub.unsubscribe();sub=null;}
    }
    if(!sub){
      sub=await reg.pushManager.subscribe({
        userVisibleOnly:true,
        applicationServerKey:pdsUrlBase64ToUint8Array(PDS_VAPID_PUBLIC_KEY)
      });
    }

    const token=PDS_BACKEND.getAdminAccessToken()||'';
    const res=await fetch('https://rsxviwsmymlrwgphydae.supabase.co/functions/v1/admin-push-subscribe',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization':'Bearer '+token
      },
      body:JSON.stringify({
        subscription:sub.toJSON(),
        userAgent:navigator.userAgent
      })
    });
    let data={};
    try{ data=await res.json(); }catch(e){}
    if(!res.ok) throw new Error(data?.error||'Push-Anmeldung fehlgeschlagen.');

    await updatePushStatus();
    alert('✅ Handy-Bestellalarm ist aktiviert. Neue Bestellungen können jetzt als Push-Benachrichtigung mit Ton/Vibration erscheinen.');
  }catch(e){
    alert(e?.message||'Handy-Alarm konnte nicht aktiviert werden.');
  }
}


let orderTab='new';
function setOrderTab(tab){
  orderTab=['new','accepted','done'].includes(tab)?tab:'new';
  document.querySelectorAll('[data-order-tab]').forEach(b=>{
    const active=b.dataset.orderTab===orderTab;
    b.classList.toggle('active',active);
    b.setAttribute('aria-pressed',String(active));
  });
  render();
}

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
let sound=true,timer=null,audioCtx=null;
let lastNewIds=new Set();
let selectedEtas=JSON.parse(localStorage.getItem('pds_selected_etas')||'{}');

function showLogin(message=''){
  document.getElementById('login').style.display='flex';
  document.getElementById('panel').style.display='none';
  document.getElementById('logoutBtn').style.display='none';
  document.getElementById('loginError').innerHTML=message?`<div class="notice">${message}</div>`:'';
}


function syncNativePush(){
 try{if(window.PizzaAdminPush && PDS_BACKEND.isSignedIn()){
  const jwt=PDS_BACKEND.getAdminAccessToken();
  if(jwt)window.PizzaAdminPush.register(jwt);
 }}catch(e){console.warn('Native push registration pending');}
}
function showPanel(){
  setTimeout(updatePushStatus,700);
 setTimeout(syncNativePush,800);
  document.getElementById('login').style.display='none';
  document.getElementById('panel').style.display='block';
  document.getElementById('logoutBtn').style.display='inline-flex';
  setTimeout(updatePushStatus,300);
}


// Pizza De Silva: Alarm automatisch scharf schalten.
// Browser erlauben Ton zuverlässig erst nach einer Benutzeraktion.
// Deshalb wird der Alarm beim Anmelden bzw. beim ersten Klick/Tipp automatisch freigeschaltet.
function armOrderAlarm(){
  sound=true;
  if(!window.pdsOrderAlarm){
    window.pdsOrderAlarm=new Audio('/pds_original_alarm.mp3?v=20261023-real');
    window.pdsOrderAlarm.preload='auto';
    window.pdsOrderAlarm.loop=true;
    window.pdsOrderAlarm.volume=1;
  }
  // Browsers need a user gesture before automatic playback.
  const a=window.pdsOrderAlarm;
  if(!a.dataset?.armed){
    a.muted=true;
    const p=a.play();
    if(p&&p.then)p.then(()=>{a.pause();a.currentTime=0;a.muted=false;a.dataset.armed='1';}).catch(()=>{a.muted=false});
  }
}
function syncOrderAlarm(has){
  const a=window.pdsOrderAlarm;
  if(!has){if(a){a.pause();a.currentTime=0;}return;}
  if(!sound)return;
  if(!a){return;}
  if(a.paused){a.play().catch(e=>console.warn('Originalalarm konnte nicht abgespielt werden',e));}
}

// Schon der erste Klick/Tipp irgendwo im Adminpanel schaltet den Alarm frei.
// Der Benutzer muss nicht mehr extra auf "Ton aktivieren" drücken.
['pointerdown','touchstart','keydown'].forEach(evt=>{
  window.addEventListener(evt, armOrderAlarm, {once:true, passive:true});
});

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
 try{window.PizzaAdminPush?.logout();}catch(e){}
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
 if(!sound)return;
 try{
  audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==='suspended')await audioCtx.resume();
  const now=audioCtx.currentTime;
  [[784,0,.28],[988,.17,.34],[1175,.39,.46],[988,1.06,.28],[1175,1.23,.38],[1568,1.45,.52]].forEach(([freq,offset,dur])=>{
   const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
   osc.type='sine';osc.frequency.value=freq;
   gain.gain.setValueAtTime(.0001,now+offset);
   gain.gain.exponentialRampToValueAtTime(.34,now+offset+.018);
   gain.gain.exponentialRampToValueAtTime(.0001,now+offset+dur);
   osc.connect(gain);gain.connect(audioCtx.destination);
   osc.start(now+offset);osc.stop(now+offset+dur+.02);
  });
 }catch(e){console.warn('Fallback-Bestellalarm',e)}
}

async function enableSound(){
  armOrderAlarm();
  try{ await beep(); }catch(e){}
}


function setEta(id,min,el){
  const key=String(id);
  selectedEtas[key]=Number(min);
  localStorage.setItem('pds_selected_etas',JSON.stringify(selectedEtas));

  const card=document.querySelector(`[data-order="${CSS.escape(key)}"]`);
  if(card) card.dataset.eta=String(min);

  document.querySelectorAll(`[data-order="${CSS.escape(key)}"] .time`).forEach(btn=>{
    btn.classList.toggle('sel',Number(btn.dataset.minutes)===Number(min));
  });
}

async function notifyOrderCustomer(id,newStatus,eta){
  try{
    const orders=await PDS_BACKEND.listOrders();
    const order=orders.find(x=>String(x.id)===String(id));
    if(!order) throw new Error('Bestellung nicht gefunden');
    const to=String(order.customer?.email||'').trim();
    if(!to) throw new Error('Keine E-Mail-Adresse bei dieser Bestellung gespeichert');
    const url=PDS_CONFIG.supabaseUrl+'/functions/v1/send-order-email';
    async function send(){
      const token=sessionStorage.getItem('pds_access_token');
      if(!token) throw new Error('Admin-Anmeldung abgelaufen. Bitte neu anmelden.');
      return fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token,'apikey':PDS_CONFIG.supabaseAnonKey},
        body:JSON.stringify({to,customerName:order.customer?.name||'',orderNumber:String(order.number||order.orderNumber||''),status:newStatus,eta:eta||order.eta,fulfillment:order.customer?.type||'',items:(order.items||[]).map(i=>({name:i.name,qty:i.qty,variant:i.variant,extraName:i.extraName,extras:i.extras,price:i.price,total:i.total??i.lineTotal})),total:order.total})});
    }
    let res=await send();
    if(res.status===401){
      const refreshToken=sessionStorage.getItem('pds_refresh_token');
      if(refreshToken){
        const refresh=await fetch(PDS_CONFIG.supabaseUrl+'/auth/v1/token?grant_type=refresh_token',{
          method:'POST',headers:{'Content-Type':'application/json','apikey':PDS_CONFIG.supabaseAnonKey},
          body:JSON.stringify({refresh_token:refreshToken})
        });
        if(refresh.ok){
          const data=await refresh.json();
          sessionStorage.setItem('pds_access_token',data.access_token);
          if(data.refresh_token)sessionStorage.setItem('pds_refresh_token',data.refresh_token);
          res=await send();
        }
      }
    }
    if(!res.ok){
      const detail=await res.text().catch(()=>'');
      throw new Error('HTTP '+res.status+': '+detail.slice(0,220));
    }
    const result=await res.json();
    if(!result.ok)throw new Error('Versand nicht bestätigt');
    console.info('Bestell-E-Mail von Resend angenommen',id,newStatus);
  }catch(e){
    console.error('Bestellbenachrichtigung:',e);
    alert('Bestellstatus gespeichert, aber Kunden-E-Mail NICHT versendet. '+e.message+' Bitte Kunden telefonisch informieren.');
  }
}

async function accept(id){
  const key=String(id);
  const eta=Number(selectedEtas[key]||0);
  if(!eta) return alert('Bitte zuerst eine Zeit auswählen.');
  await PDS_BACKEND.updateOrder(id,{status:'accepted',eta,updatedAt:new Date().toISOString()});
  await notifyOrderCustomer(id,'accepted',eta);
  delete selectedEtas[key];
  localStorage.setItem('pds_selected_etas',JSON.stringify(selectedEtas));
  render();
}

async function reject(id){
  await PDS_BACKEND.updateOrder(id,{status:'cancelled',cancelReason:'Vom Restaurant abgelehnt',updatedAt:new Date().toISOString()});
  await notifyOrderCustomer(id,'cancelled');
  render();
}

async function status(id,s){
  await PDS_BACKEND.updateOrder(id,{status:s,updatedAt:new Date().toISOString()});
  if(['cancelled','ready','on_the_way'].includes(s)) await notifyOrderCustomer(id,s);
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
      await notifyOrderCustomer(x.id,'cancelled');
    }
  }
}


function printOrder(id){
  PDS_BACKEND.listOrders().then(all=>{
    const x=all.find(o=>String(o.id)===String(id));
    if(!x)return alert('Bestellung nicht gefunden.');

    const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const m=v=>Number(v||0).toLocaleString('de-DE',{style:'currency',currency:PDS_CONFIG.currency||'EUR'});
    const c=x.customer||{};
    const isDelivery=c.type==='Lieferung';
    const items=(x.items||[]).map(i=>{
      const details=[];
      if(i.variant)details.push(i.variant);
      if(i.extraName)details.push(i.extraName);
      if(Array.isArray(i.extras)&&i.extras.length)details.push('Extras: '+i.extras.map(e=>typeof e==='string'?e:(e.name||e.label||'')).filter(Boolean).join(', '));
      if(i.note)details.push('Wunsch: '+i.note);
      const line=Number(i.total??i.lineTotal??(Number(i.price||i.unitPrice||0)*Number(i.qty||1)));
      return `<tr><td class="qty">${Number(i.qty||1)}×</td><td><b>${esc(i.name)}</b>${details.length?`<div class="details">${details.map(esc).join('<br>')}</div>`:''}</td><td class="price">${m(line)}</td></tr>`;
    }).join('');

    const fee=Number(x.deliveryFee??x.delivery_fee??0);
    const subtotal=Number(x.subtotal??Math.max(0,Number(x.total||0)-fee));
    const html=`<!doctype html><html><head><meta charset="utf-8"><title>Bestellung ${esc(x.number)}</title>
<style>
@page{margin:6mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#000;margin:0;font-size:13px}.r{max-width:760px;margin:auto}
.h{display:grid;grid-template-columns:1fr auto;gap:16px;border-bottom:2px solid #000;padding-bottom:9px}h1{font-size:22px;margin:0 0 4px}.mode{font-size:23px;font-weight:900;text-align:right}.pay{text-align:right;font-weight:800;margin-top:5px}
.box{padding:10px 0;border-bottom:1px solid #999}.title{font-size:11px;font-weight:900;letter-spacing:.6px;margin-bottom:5px}.customer{font-size:14px;line-height:1.45}
table{width:100%;border-collapse:collapse}th{text-align:left;font-size:11px;border-bottom:1px solid #000;padding:6px 3px}td{vertical-align:top;border-bottom:1px solid #ccc;padding:8px 3px}.qty{width:45px;font-weight:900}.price{width:90px;text-align:right;font-weight:900}.details{font-size:11px;line-height:1.4;margin-top:3px}
.totals{width:280px;margin:12px 0 0 auto}.sum{display:flex;justify-content:space-between;padding:3px 0}.grand{border-top:2px solid #000;margin-top:5px;padding-top:7px;font-size:19px;font-weight:900}.note{font-weight:700}.footer{text-align:center;font-size:10px;margin-top:14px}
</style></head><body><div class="r">
<div class="h"><div><h1>Pizza De Silva</h1><div>Niederstraße 76<br>47829 Krefeld-Uerdingen</div><br><b>Bestellung:</b> #${esc(x.number)}<br><b>Zeit:</b> ${new Date(x.createdAt).toLocaleString('de-DE')}</div><div><div class="mode">${esc(c.type||'')}</div><div class="pay">${esc(c.payment||'')}</div></div></div>
<div class="box"><div class="title">KUNDENDATEN</div><div class="customer"><b>${esc(c.name||'')}</b><br>Telefon: ${esc(c.phone||'')}${isDelivery?`<br><b>Lieferadresse:</b> ${esc(c.address||'')}`:''}</div></div>
<div class="box"><div class="title">BESTELLUNG</div><table><thead><tr><th>MENGE</th><th>PRODUKT / EXTRAS</th><th style="text-align:right">PREIS</th></tr></thead><tbody>${items}</tbody></table>
<div class="totals"><div class="sum"><span>Zwischensumme</span><b>${m(subtotal)}</b></div>${isDelivery?`<div class="sum"><span>Liefergebühr</span><b>${m(fee)}</b></div>`:''}<div class="sum grand"><span>GESAMT</span><span>${m(x.total)}</span></div></div></div>
${c.note?`<div class="box"><div class="title">BEMERKUNG</div><div class="note">${esc(c.note)}</div></div>`:''}
<div class="footer">Pizza De Silva · Niederstraße 76 · 47829 Krefeld-Uerdingen<br>Bestellausdruck – keine Rechnung</div>
</div><script>window.onload=()=>setTimeout(()=>window.print(),150)<\/script></body></html>`;
    const w=window.open('','_blank','width=900,height=900');
    if(!w)return alert('Popup blockiert. Bitte Popups erlauben.');
    w.document.open();w.document.write(html);w.document.close();
  }).catch(()=>alert('Bestellung konnte nicht zum Drucken geladen werden.'));
}

async function render(){
  if(document.getElementById('panel').style.display==='none') return;
  try{
    let all=await PDS_BACKEND.listOrders();
    await expire(all);
    all=await PDS_BACKEND.listOrders();

    document.getElementById('modeLabel').textContent=PDS_BACKEND.modeLabel;
    const newCount=all.filter(x=>x.status==='new').length;
    const acceptedCount=all.filter(x=>['accepted','preparing','ready'].includes(x.status)).length;
    const doneCount=all.filter(x=>['done','cancelled'].includes(x.status)).length;
    document.getElementById('tabNewCount').textContent=newCount;
    document.getElementById('tabAcceptedCount').textContent=acceptedCount;
    document.getElementById('tabDoneCount').textContent=doneCount;

    const currentNewIds=new Set(all.filter(x=>x.status==='new').map(x=>String(x.id)));
    const hasNewArrival=[...currentNewIds].some(id=>!lastNewIds.has(id));
    if(hasNewArrival && sound && !timer) syncOrderAlarm(true);
    lastNewIds=currentNewIds;
    const has=all.some(x=>x.status==='new');
    document.getElementById('alarm').classList.toggle('show',has);
    syncOrderAlarm(has);
    if(has&&sound&&!timer)timer=setInterval(()=>syncOrderAlarm(true),3000);
    if(!has&&timer){clearInterval(timer);timer=null}

    const labels={new:'NEU – Bestätigung nötig',accepted:'Angenommen',preparing:'In Zubereitung',ready:'Bereit / unterwegs',done:'Abgeschlossen',cancelled:'Storniert'};

    const visibleOrders=all.filter(x=>orderTab==='new'?x.status==='new':orderTab==='accepted'?['accepted','preparing','ready'].includes(x.status):['done','cancelled'].includes(x.status));
    const isHistory=orderTab==='done';

    const renderOrderCard=(x,isHistory=false)=>{
      const items=(x.items||[]).map(i=>`<li>${i.qty}× ${i.name} (${i.variant})${i.extraName?' + '+i.extraName:''}${i.note?' – '+i.note:''}</li>`).join('');
      let actions='';
      if(!isHistory && x.status==='new'){
        const chosen=Number(selectedEtas[String(x.id)]||0);
        const timeBtn=(m)=>`<button class="time ${chosen===m?'sel':''}" data-minutes="${m}" onclick="setEta('${x.id}',${m},this)">${m} Min</button>`;
        actions=`<div class="actions">${[20,30,40,50,60,90].map(timeBtn).join('')}</div><div class="actions"><button class="btn green" onclick="accept('${x.id}')">✓ Annehmen</button><button class="btn danger" onclick="reject('${x.id}')">✕ Ablehnen</button></div>`;
      }
      if(!isHistory && x.status==='accepted')actions=`<div class="actions"><button class="btn blue" onclick="status('${x.id}','preparing')">In Zubereitung</button></div>`;
      if(!isHistory && x.status==='preparing')actions=`<div class="actions"><button class="btn secondary" onclick="status('${x.id}','ready')">${x.customer.type==='Abholung'?'Bereit zur Abholung':'Als unterwegs markieren'}</button></div>`;
      if(!isHistory && x.status==='ready')actions=`<div class="actions"><button class="btn green" onclick="status('${x.id}','done')">Abschließen</button></div>`;

      return `<article class="order ${x.status}" data-order="${x.id}" data-eta="${selectedEtas[String(x.id)]||x.eta||''}">
        <h3>#${x.number} • ${labels[x.status]}</h3>
        <div class="meta">${new Date(x.createdAt).toLocaleString('de-DE')} • ${x.customer.type} • ${x.customer.payment}</div>
        <p><b>${x.customer.name}</b><br>${x.customer.phone}<br>${x.customer.address||''}</p>
        <ul class="items">${items}</ul>
        <p><b>Gesamt: ${money(x.total)}</b>${x.eta?` • ca. ${x.eta} Min.`:''}</p>
        ${x.customer.note?`<p class="meta">Hinweis: ${x.customer.note}</p>`:''}
        ${x.cancelReason?`<div class="notice">${x.cancelReason}</div>`:''}
        <div class="actions"><button class="btn secondary" onclick="printOrder('${x.id}')">🖨️ Drucken</button></div>
        ${actions}
      </article>`;
    };

    const ordersBox=document.getElementById('orders');
    if(ordersBox) ordersBox.innerHTML=visibleOrders.length
      ? visibleOrders.map(x=>renderOrderCard(x,['done','cancelled'].includes(x.status))).join('')
      : '<div class="empty">Keine Bestellungen in diesem Bereich.</div>';
  }catch(e){
    console.error(e);
    PDS_BACKEND.signOut();
    showLogin('Deine Admin-Sitzung ist abgelaufen. Bitte erneut anmelden.');
  }
}

document.getElementById('pw')?.addEventListener('keydown',e=>{if(e.key==='Enter')login()});
setInterval(()=>{if(document.getElementById('panel').style.display!=='none')render()},1500);
initAdmin();
