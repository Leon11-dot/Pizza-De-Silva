
const PDS_RESTAURANT={lat:51.357857,lon:6.648934};
let verifiedDeliveryZone=null;

function haversineKm(a,b,c,d){
  const R=6371,toRad=x=>x*Math.PI/180;
  const x=toRad(c-a),y=toRad(d-b);
  const q=Math.sin(x/2)**2+Math.cos(toRad(a))*Math.cos(toRad(c))*Math.sin(y/2)**2;
  return R*2*Math.atan2(Math.sqrt(q),Math.sqrt(1-q));
}
async function geocodeAddress(address){
  const r=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=de&q=${encodeURIComponent(address)}`);
  if(!r.ok) throw new Error("Adresse nicht gefunden");
  const x=await r.json();
  if(!x.length) throw new Error("Adresse nicht gefunden");
  return {lat:Number(x[0].lat),lon:Number(x[0].lon)};
}
function zoneForDistance(km){
  if(km<=5) return {label:"bis 5 km",fee:Number(settings?.deliveryFee5km||0),minimum:Number(settings?.deliveryMinimum5km||0),distanceKm:km};
  if(km<=10) return {label:"5–10 km",fee:Number(settings?.deliveryFee10km||0),minimum:Number(settings?.deliveryMinimum10km||0),distanceKm:km};
  return null;
}
async function checkDeliveryAddress(){
  const addr=document.getElementById("address")?.value.trim();
  const info=document.getElementById("zonePriceInfo");
  if(!addr) return alert("Bitte zuerst die Lieferadresse eingeben.");
  info.style.display="block"; info.className="notice"; info.textContent="Adresse wird geprüft…";
  try{
    const g=await geocodeAddress(addr);
    const km=haversineKm(PDS_RESTAURANT.lat,PDS_RESTAURANT.lon,g.lat,g.lon);
    const z=zoneForDistance(km);
    if(!z){verifiedDeliveryZone=null;info.innerHTML=`Entfernung ca. <b>${km.toFixed(1)} km</b>. Lieferung ist nur bis 10 km möglich.`;renderCart();return;}
    verifiedDeliveryZone=z; info.className="success";
    info.innerHTML=`Entfernung ca. <b>${km.toFixed(1)} km</b> • ${z.label}<br>Liefergebühr: <b>${money(z.fee)}</b> • Mindestbestellwert: <b>${money(z.minimum)}</b>`;
    renderCart();
  }catch(e){verifiedDeliveryZone=null;info.className="notice";info.textContent="Adresse nicht gefunden. Bitte Straße, Hausnummer, PLZ und Ort vollständig eingeben.";renderCart();}
}
async function syncCustomerUi(){
  const guest=document.getElementById("customerAccountGuest"),logged=document.getElementById("customerAccountLogged"),status=document.getElementById("customerAccountStatus");
  if(!guest||!logged||!status) return;
  if(PDS_BACKEND.isCustomerSignedIn()){
    guest.style.display="none";logged.style.display="block";status.textContent="Angemeldet";
    try{const p=await PDS_BACKEND.getCustomerProfile();if(p){if(p.name)name.value=p.name;if(p.phone)phone.value=p.phone;if(p.address)address.value=p.address;}}catch(e){}
  }else{guest.style.display="block";logged.style.display="none";status.textContent="Nicht angemeldet";}
}
async function customerLogin(){
  const msg=document.getElementById("customerAccountMessage");
  try{await PDS_BACKEND.customerSignIn(customerEmail.value.trim(),customerPassword.value);msg.innerHTML='<div class="success">Anmeldung erfolgreich.</div>';await syncCustomerUi();}
  catch(e){msg.innerHTML='<div class="notice">Anmeldung fehlgeschlagen.</div>';}
}
async function customerRegister(){
  const msg=document.getElementById("customerAccountMessage"),email=customerEmail.value.trim(),pw=customerPassword.value;
  if(!email||pw.length<6){msg.innerHTML='<div class="notice">Bitte E-Mail und mindestens 6 Zeichen Passwort eingeben.</div>';return;}
  try{const d=await PDS_BACKEND.customerSignUp(email,pw);msg.innerHTML=d.access_token?'<div class="success">Konto erstellt.</div>':'<div class="success">Konto erstellt. Bitte E-Mail bestätigen und danach anmelden.</div>';await syncCustomerUi();}
  catch(e){msg.innerHTML='<div class="notice">Registrierung nicht möglich.</div>';}
}
function customerLogout(){PDS_BACKEND.customerSignOut();syncCustomerUi();}


function getSelectedDeliveryZone(){ return verifiedDeliveryZone||{label:"nicht geprüft",fee:0,minimum:0,distanceKm:null}; }
function updateDeliveryZoneInfo(){ renderCart(); }


const money=n=>Number(n||0).toLocaleString('de-DE',{style:'currency',currency:PDS_CONFIG.currency||'EUR'});
let cart=JSON.parse(localStorage.getItem('pds_cart')||'[]'),active='Alle',selected=null,settings=null;
const cats=['Alle',...new Set(PDS_PRODUCTS.filter(p=>!p.isExtra).map(p=>p.category))];

function saveCart(){localStorage.setItem('pds_cart',JSON.stringify(cart));renderCart()}
function closeModal(id){document.getElementById(id).classList.remove('show')}
function showModal(id){document.getElementById(id).classList.add('show')}

async function loadSettings(){
  settings=await PDS_BACKEND.getSettings();

  const deliveryOpen=!!settings.deliveryOpen;
  const pickupOpen=!!settings.pickupOpen;
  const badge=document.getElementById('openBadge');

  if(badge){
    if(deliveryOpen && pickupOpen){
      badge.textContent='🟢 Geöffnet';
      badge.style.background='#eaf8ee';
      badge.style.color='#175d32';
    }else if(!deliveryOpen && !pickupOpen){
      badge.textContent='🔴 Geschlossen';
      badge.style.background='#fff0ec';
      badge.style.color='#8d2118';
    }else if(deliveryOpen){
      badge.textContent='🟢 Nur Lieferung geöffnet';
      badge.style.background='#eaf8ee';
      badge.style.color='#175d32';
    }else{
      badge.textContent='🟢 Nur Abholung geöffnet';
      badge.style.background='#eaf8ee';
      badge.style.color='#175d32';
    }
  }

  const deliveryStatus=document.getElementById('deliveryStatusText');
  if(deliveryStatus) deliveryStatus.textContent=deliveryOpen?'Lieferung geöffnet':'Lieferung geschlossen';

  const pickupStatus=document.getElementById('pickupStatusText');
  if(pickupStatus) pickupStatus.textContent=pickupOpen?'Abholung geöffnet':'Abholung geschlossen';

  const oh=document.getElementById('openingText'); if(oh) oh.textContent=settings.openingHoursText||'Öffnungszeiten folgen';
  const ohf=document.getElementById('openingTextFooter'); if(ohf) ohf.textContent=settings.openingHoursText||'';
  const da=document.getElementById('deliveryAreaText'); if(da) da.textContent=settings.deliveryAreaText||'Liefergebiet folgt';

  updateCheckoutAvailability();
  renderCart();
}

function renderCats(){
  const el=document.getElementById('categories'); el.innerHTML='';
  cats.forEach(c=>{
    const b=document.createElement('button');
    b.className='chip'+(c===active?' active':'');
    b.textContent=c;
    b.onclick=()=>{active=c;renderCats();renderProducts()};
    el.appendChild(b);
  });
}

function renderProducts(){
  const el=document.getElementById('products'); el.innerHTML='';
  PDS_PRODUCTS.filter(p=>!p.isExtra&&(active==='Alle'||p.category===active)).forEach(p=>{
    const first=Object.values(p.variants)[0];
    const card=document.createElement('article'); card.className='product';
    card.innerHTML=`<div class="media"><img src="${p.image}" alt="${p.name}" loading="lazy" decoding="async"><span class="num">${p.id}</span>${p.ageRestricted?'<span class="age">18+</span>':''}</div>
      <div class="body"><h3>${p.name}</h3><div class="desc">${p.description||'&nbsp;'}</div>
      <div class="price">ab ${money(first)}</div><button class="btn primary">Auswählen</button></div>`;
    card.querySelector('button').onclick=()=>openProduct(p);
    el.appendChild(card);
  });
}

function pizzaExtraUnitPrice(){
  if(!selected?.pizzaExtraPrices) return 0;
  const variant=document.getElementById('pVariant')?.value || '';
  return Number(selected.pizzaExtraPrices[variant]||0);
}

function selectedPizzaExtras(){
  return [...document.querySelectorAll('#pizzaExtras input[type="checkbox"]:checked')].map(x=>x.value);
}

function updatePizzaExtraPrices(){
  const unit=pizzaExtraUnitPrice();
  document.querySelectorAll('#pizzaExtras [data-price]').forEach(el=>el.textContent=`+ ${money(unit)}`);
  updateProductModalTotal();
}

function updateProductModalTotal(){
  if(!selected) return;
  const variant=document.getElementById('pVariant')?.value || '';
  const base=Number(selected.variants?.[variant]||0);
  const extras=selectedPizzaExtras();
  const extraTotal=extras.length*pizzaExtraUnitPrice();
  const target=document.getElementById('pCurrentTotal');
  if(target) target.textContent=money(base+extraTotal);
}

function openProduct(p){
  selected=p;
  document.getElementById('pName').textContent=p.name;
  document.getElementById('pDesc').textContent=p.description||'';

  const v=document.getElementById('pVariant');
  v.innerHTML='';
  Object.entries(p.variants).forEach(([k,val])=>v.add(new Option(`${k} – ${money(val)}`,k)));
  v.onchange=()=>{
    if(p.pizzaExtras) updatePizzaExtraPrices();
    else updateProductModalTotal();
  };

  const ef=document.getElementById('extraField');
  if(p.pizzaExtras && p.pizzaExtras.length){
    ef.style.display='grid';
    ef.innerHTML=`
      <label>Extra-Zutaten</label>
      <div class="extras-info">Mehrere Extras möglich. Jede Zutat wird einzeln berechnet.</div>
      <div id="noExtraBox" class="no-extra active">Ohne Extra-Zutat <span>+ 0,00 €</span></div>
      <div id="pizzaExtras" class="extras-grid">
        ${p.pizzaExtras.map(x=>`
          <label class="extra-check">
            <input type="checkbox" value="${x}">
            <span>+ ${x}</span>
            <b data-price></b>
          </label>`).join('')}
      </div>`;
    ef.querySelectorAll('#pizzaExtras input').forEach(cb=>{
      cb.addEventListener('change',()=>{
        const chosen=selectedPizzaExtras();
        document.getElementById('noExtraBox')?.classList.toggle('active', chosen.length===0);
        updatePizzaExtraPrices();
      });
    });
  }else if(p.extras && !Array.isArray(p.extras)){
    ef.style.display='grid';
    ef.innerHTML='<label>Extra</label><select id="pExtra"><option value="">Kein Extra</option></select>';
    const ex=ef.querySelector('#pExtra');
    Object.entries(p.extras).forEach(([k,val])=>{
      const o=new Option(`${k} + ${money(val)}`,k); o.dataset.price=val; ex.add(o);
    });
    ex.onchange=updateProductModalTotal;
  }else{
    ef.style.display='none';
    ef.innerHTML='';
  }

  document.getElementById('pNote').value='';
  let totalBox=document.getElementById('pCurrentTotal');
  if(!totalBox){
    totalBox=document.createElement('div');
    totalBox.id='pTotalBox';
    totalBox.className='modal-total';
    totalBox.innerHTML='Aktueller Preis: <strong id="pCurrentTotal"></strong>';
    document.getElementById('pNote').closest('.field').after(totalBox);
  }
  showModal('productModal');
  if(p.pizzaExtras) updatePizzaExtraPrices(); else updateProductModalTotal();
}

function addProduct(){
  const variant=document.getElementById('pVariant').value;
  const note=document.getElementById('pNote').value.trim();
  let price=Number(selected.variants[variant]||0);
  let extraName='';
  let extraItems=[];

  if(selected.pizzaExtras){
    const extras=selectedPizzaExtras();
    const unit=pizzaExtraUnitPrice();
    price += extras.length*unit;
    extraName = extras.length ? extras.join(', ') : 'Ohne Extra-Zutat';
    extraItems = extras.map(name=>({name, price:unit}));
  }else{
    const ex=document.getElementById('pExtra');
    if(ex && ex.value){
      extraName=ex.value;
      const extraPrice=Number(ex.selectedOptions[0].dataset.price||0);
      price += extraPrice;
      extraItems=[{name:extraName,price:extraPrice}];
    }
  }

  cart.push({
    productId:selected.id,
    name:selected.name,
    variant,
    note,
    extraName,
    extraItems,
    price,
    qty:1
  });
  saveCart();
  closeModal('productModal');
}

function removeItem(i){cart.splice(i,1);saveCart()}

function renderCart(){
  const count=cart.reduce((s,x)=>s+x.qty,0);
  document.getElementById('cartCount').textContent=count;
  document.getElementById('cartCount2').textContent=count;
  const rows=document.getElementById('cartRows');

  if(!cart.length){
    rows.className='empty'; rows.innerHTML='Dein Warenkorb ist noch leer.';
  }else{
    rows.className='';
    rows.innerHTML=cart.map((x,i)=>`<div class="cart-row"><div><b>${x.qty}× ${x.name}</b>
      <small>${x.variant}${x.extraName?' • Extras: '+x.extraName:''}${x.note?' • '+x.note:''}</small></div>
      <div style="text-align:right"><b>${money(x.price*x.qty)}</b><br><button class="linkbtn" onclick="removeItem(${i})">entfernen</button></div></div>`).join('');
  }

  const subtotal=cart.reduce((s,x)=>s+x.price*x.qty,0);
  const fee=(document.getElementById('type')?.value==='Lieferung'&&verifiedDeliveryZone?verifiedDeliveryZone.fee:0);
  document.getElementById('subtotal').textContent=money(subtotal);
  document.getElementById('deliveryFee').textContent=money(fee);
  document.getElementById('total').textContent=money(subtotal+fee);
}


function updateCheckoutAvailability(){
  const type=document.getElementById('type');
  if(!type || !settings) return;

  const deliveryOption=[...type.options].find(o=>o.value==='Lieferung');
  const pickupOption=[...type.options].find(o=>o.value==='Abholung');

  if(deliveryOption){
    deliveryOption.disabled=!settings.deliveryOpen;
    deliveryOption.textContent=settings.deliveryOpen?'Lieferung':'Lieferung – geschlossen';
  }
  if(pickupOption){
    pickupOption.disabled=!settings.pickupOpen;
    pickupOption.textContent=settings.pickupOpen?'Abholung':'Abholung – geschlossen';
  }

  if(type.value==='Lieferung' && !settings.deliveryOpen && settings.pickupOpen) type.value='Abholung';
  if(type.value==='Abholung' && !settings.pickupOpen && settings.deliveryOpen) type.value='Lieferung';

  updateCheckoutTypeUI();
}

function updateCheckoutTypeUI(){
  const type=document.getElementById('type'); if(!type) return;
  const isDelivery=type.value==='Lieferung';
  const address=document.getElementById('address');
  if(address) address.closest('.field').style.display=isDelivery?'grid':'none';
  const df=document.getElementById('distanceField'); if(df) df.style.display=isDelivery?'grid':'none';
  const zi=document.getElementById('zonePriceInfo'); if(zi&&!isDelivery) zi.style.display='none';
  const minimumInfo=document.getElementById('deliveryMinimumInfo'); if(minimumInfo) minimumInfo.style.display='none';
  renderCart();
}

function openCheckout(){
  if(!cart.length) return alert('Bitte zuerst etwas auswählen.');
  if(!settings) return alert('Shop-Einstellungen werden noch geladen.');
  if(!settings.deliveryOpen&&!settings.pickupOpen) return alert('Pizza De Silva ist im Moment geschlossen.');
  document.getElementById('checkoutResult').innerHTML='';
  updateCheckoutAvailability();
  showModal('checkoutModal');
  syncCustomerUi();
  const a=document.getElementById('address');
  if(a&&!a.dataset.zoneReset){a.addEventListener('input',()=>{verifiedDeliveryZone=null;const z=document.getElementById('zonePriceInfo');if(z)z.style.display='none';renderCart();});a.dataset.zoneReset='1';}
}

async function placeOrder(){
  const type=document.getElementById('type').value;
  const name=document.getElementById('name').value.trim();
  const phone=document.getElementById('phone').value.trim();
  const address=document.getElementById('address').value.trim();
  const terms=document.getElementById('terms').checked;

  if(!name||!phone||!terms) return alert('Bitte Name, Telefonnummer und Bestätigung ausfüllen.');
  if(type==='Lieferung'){
    if(!settings?.deliveryOpen) return alert('Lieferung ist im Moment geschlossen.');
    if(!address) return alert('Bitte Lieferadresse eingeben.');
    if(!verifiedDeliveryZone) return alert('Bitte zuerst die Lieferadresse prüfen.');
    const subtotalCheck=cart.reduce((s,x)=>s+x.price*x.qty,0);
    if(subtotalCheck<verifiedDeliveryZone.minimum) return alert(`Mindestbestellwert für ${verifiedDeliveryZone.label}: ${money(verifiedDeliveryZone.minimum)}.`);
  }else{
    if(!settings?.pickupOpen) return alert('Abholung ist im Moment geschlossen.');
  }

  const subtotal=cart.reduce((s,x)=>s+x.price*x.qty,0);
  const fee=(type==='Lieferung'?verifiedDeliveryZone.fee:0), total=subtotal+fee;
  const id=crypto.randomUUID?crypto.randomUUID():String(Date.now());
  const statusToken=crypto.randomUUID?crypto.randomUUID():(String(Date.now())+'-'+Math.random());
  const order={id,number:Date.now()%100000,statusToken,createdAt:new Date().toISOString(),status:'new',eta:null,
    expiresAt:Date.now()+Number(settings?.autoCancelMinutes||5)*60000,total,items:cart,
    customer:{type,name,phone,address:type==='Lieferung'?address:'',deliveryZone:type==='Lieferung'?verifiedDeliveryZone.label:'',deliveryDistanceKm:type==='Lieferung'?verifiedDeliveryZone.distanceKm:null,deliveryFee:fee,payment:document.getElementById('payment').value,note:document.getElementById('note').value.trim()}};
  try{
    const created=await PDS_BACKEND.createOrder(order);
    if(created?.number) order.number=created.number;
    if(PDS_BACKEND.isCustomerSignedIn()) try{await PDS_BACKEND.saveCustomerProfile({name,phone,address:type==='Lieferung'?address:''});}catch(e){}
    localStorage.setItem('pds_last_order',id);localStorage.setItem(`pds_order_token_${id}`,statusToken);
    cart=[];saveCart();
    document.getElementById('checkoutResult').innerHTML='<div class="success"><b>Bestellung wurde gesendet.</b><br>Du wirst zur Statusseite weitergeleitet.</div>';
    setTimeout(()=>location.href=`status.html?id=${encodeURIComponent(id)}`,1100);
  }catch(e){console.error(e);alert('Die Bestellung konnte nicht gesendet werden. Bitte erneut versuchen.');}
}

document.getElementById('type')?.addEventListener('change',()=>{updateCheckoutTypeUI();updateDeliveryZoneInfo()}); renderCats();renderProducts();renderCart();loadSettings();
