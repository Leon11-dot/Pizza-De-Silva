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
let selectedEtas=JSON.parse(localStorage.getItem('pds_selected_etas')||'{}');

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
    const start=audioCtx.currentTime;
    const master=audioCtx.createGain();
    master.gain.setValueAtTime(0.0001,start);
    master.gain.exponentialRampToValueAtTime(0.32,start+0.03);
    master.gain.setValueAtTime(0.32,start+2.85);
    master.gain.exponentialRampToValueAtTime(0.0001,start+3.0);
    master.connect(audioCtx.destination);
    const notes=[
      [880,0.00,0.34],[660,0.36,0.34],
      [880,0.72,0.34],[660,1.08,0.34],
      [990,1.44,0.34],[700,1.80,0.34],
      [990,2.16,0.34],[700,2.52,0.34]
    ];
    notes.forEach(([freq,offset,duration])=>{
      const osc=audioCtx.createOscillator();
      const gain=audioCtx.createGain();
      osc.type='square';
      osc.frequency.setValueAtTime(freq,start+offset);
      gain.gain.setValueAtTime(0.0001,start+offset);
      gain.gain.exponentialRampToValueAtTime(0.22,start+offset+0.015);
      gain.gain.setValueAtTime(0.22,start+offset+duration-0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001,start+offset+duration);
      osc.connect(gain);
      gain.connect(master);
      osc.start(start+offset);
      osc.stop(start+offset+duration);
    });
  }catch(e){
    console.warn('Bestellalarm Fehler',e);
  }
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

async function accept(id){
  const key=String(id);
  const eta=Number(selectedEtas[key]||0);
  if(!eta) return alert('Bitte zuerst eine Zeit auswählen.');
  await PDS_BACKEND.updateOrder(id,{status:'accepted',eta,updatedAt:new Date().toISOString()});
  delete selectedEtas[key];
  localStorage.setItem('pds_selected_etas',JSON.stringify(selectedEtas));
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
    if(has&&sound&&!timer)timer=setInterval(beep,5000);
    if(!has&&timer){clearInterval(timer);timer=null}

    const labels={new:'NEU – Bestätigung nötig',accepted:'Angenommen',preparing:'In Zubereitung',ready:'Bereit / unterwegs',done:'Abgeschlossen',cancelled:'Storniert'};

    document.getElementById('orders').innerHTML=all.length?all.map(x=>{
      const items=(x.items||[]).map(i=>`<li>${i.qty}× ${i.name} (${i.variant})${i.extraName?' + '+i.extraName:''}${i.note?' – '+i.note:''}</li>`).join('');
      let actions='';
      if(x.status==='new'){
        const chosen=Number(selectedEtas[String(x.id)]||0);
        const timeBtn=(m)=>`<button class="time ${chosen===m?'sel':''}" data-minutes="${m}" onclick="setEta('${x.id}',${m},this)">${m} Min</button>`;
        actions=`<div class="actions">${[20,30,40,50,60,90].map(timeBtn).join('')}</div><div class="actions"><button class="btn green" onclick="accept('${x.id}')">✓ Annehmen</button><button class="btn danger" onclick="reject('${x.id}')">✕ Ablehnen</button></div>`;
      }
      if(x.status==='accepted')actions=`<div class="actions"><button class="btn blue" onclick="status('${x.id}','preparing')">In Zubereitung</button></div>`;
      if(x.status==='preparing')actions=`<div class="actions"><button class="btn secondary" onclick="status('${x.id}','ready')">${x.customer.type==='Abholung'?'Bereit zur Abholung':'Als unterwegs markieren'}</button></div>`;
      if(x.status==='ready')actions=`<div class="actions"><button class="btn green" onclick="status('${x.id}','done')">Abschließen</button></div>`;

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
