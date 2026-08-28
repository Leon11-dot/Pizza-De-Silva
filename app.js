
function renderDeliveryZonesOverview(){
  if(!settings) return;
  const set=(id,fee,min)=>{
    const el=document.getElementById(id);
    if(el) el.textContent=`Liefergebühr ${money(fee)} · Mindestbestellwert ${money(min)}`;
  };
  set('zone2Info',settings.deliveryFee2km,settings.deliveryMinimum2km);
  set('zone5Info',settings.deliveryFee5km,settings.deliveryMinimum5km);
  set('zone7Info',settings.deliveryFee7km,settings.deliveryMinimum7km);
  set('zone10Info',settings.deliveryFee10km,settings.deliveryMinimum10km);
}


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
  if(km<=2) return {label:"bis 2 km",fee:Number(settings?.deliveryFee2km||0),minimum:Number(settings?.deliveryMinimum2km||0),distanceKm:km};
  if(km<=5) return {label:"2–5 km",fee:Number(settings?.deliveryFee5km||0),minimum:Number(settings?.deliveryMinimum5km||0),distanceKm:km};
  if(km<=7) return {label:"5–7 km",fee:Number(settings?.deliveryFee7km||0),minimum:Number(settings?.deliveryMinimum7km||0),distanceKm:km};
  if(km<=10) return {label:"7–10 km",fee:Number(settings?.deliveryFee10km||0),minimum:Number(settings?.deliveryMinimum10km||0),distanceKm:km};
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
function customerFormData(){
  return {
    name: document.getElementById("name")?.value.trim() || "",
    phone: document.getElementById("phone")?.value.trim() || "",
    address: document.getElementById("address")?.value.trim() || ""
  };
}

function fillCustomerForm(profile){
  if(!profile) return;
  const nameEl=document.getElementById("name");
  const phoneEl=document.getElementById("phone");
  const addressEl=document.getElementById("address");

  if(nameEl && profile.name) nameEl.value=profile.name;
  if(phoneEl && profile.phone) phoneEl.value=profile.phone;
  if(addressEl && profile.address) addressEl.value=profile.address;
}

async function saveCurrentCustomerData(){
  if(!PDS_BACKEND.isCustomerSignedIn()) return;
  const data=customerFormData();
  if(!data.name && !data.phone && !data.address) return;
  try{
    await PDS_BACKEND.saveCustomerProfile(data);
  }catch(e){
    console.warn("Kundendaten konnten nicht gespeichert werden",e);
  }
}

async function syncCustomerUi(){
  const guest=document.getElementById("customerAccountGuest");
  const logged=document.getElementById("customerAccountLogged");
  const status=document.getElementById("customerAccountStatus");
  if(!guest||!logged||!status) return;

  if(PDS_BACKEND.isCustomerSignedIn()){
    guest.style.display="none";
    logged.style.display="block";
    status.textContent="Angemeldet";

    try{
      const profile=await PDS_BACKEND.getCustomerProfile();

      if(profile){
        fillCustomerForm(profile);
      }else{
        // Wenn der Kunde sich gerade registriert hat und Name/Telefon/Adresse
        // bereits eingetragen sind, diese Daten sofort im Konto speichern.
        await saveCurrentCustomerData();
      }
    }catch(e){
      console.warn("Kundenprofil konnte nicht geladen werden",e);
    }
  }else{
    guest.style.display="block";
    logged.style.display="none";
    status.textContent="Nicht angemeldet";
  }
}

async function customerLogin(){
  const msg=document.getElementById("customerAccountMessage");
  const email=document.getElementById("customerEmail")?.value.trim() || "";
  const password=document.getElementById("customerPassword")?.value || "";

  try{
    await PDS_BACKEND.customerSignIn(email,password);

    // Falls noch kein Profil existiert, vorhandene Formulardaten übernehmen.
    const profile=await PDS_BACKEND.getCustomerProfile().catch(()=>null);
    if(!profile) await saveCurrentCustomerData();

    msg.innerHTML='<div class="success">Anmeldung erfolgreich. Deine gespeicherten Daten werden automatisch übernommen.</div>';
    await syncCustomerUi();
  }catch(e){
    msg.innerHTML='<div class="notice">Anmeldung fehlgeschlagen.</div>';
  }
}

async function customerRegister(){
  const msg=document.getElementById("customerAccountMessage");
  const email=document.getElementById("customerEmail")?.value.trim() || "";
  const password=document.getElementById("customerPassword")?.value || "";

  if(!email||password.length<6){
    msg.innerHTML='<div class="notice">Bitte E-Mail und mindestens 6 Zeichen Passwort eingeben.</div>';
    return;
  }

  try{
    const d=await PDS_BACKEND.customerSignUp(email,password);

    if(d.access_token){
      // Name, Telefonnummer und Adresse, die bereits im Bestellformular stehen,
      // werden direkt mit dem neuen Kundenkonto gespeichert.
      await saveCurrentCustomerData();
      msg.innerHTML='<div class="success">Konto erstellt. Deine Kundendaten wurden gespeichert.</div>';
      await syncCustomerUi();
    }else{
      msg.innerHTML='<div class="success">Konto erstellt. Bitte E-Mail bestätigen und danach anmelden. Nach der Anmeldung werden deine Daten gespeichert.</div>';
    }
  }catch(e){
    msg.innerHTML='<div class="notice">Registrierung nicht möglich.</div>';
  }
}

function customerLogout(){
  PDS_BACKEND.customerSignOut();
  syncCustomerUi();
}

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
  renderDeliveryZonesOverview();

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


const CATEGORY_META={
  "Alle":{icon:"🍽️",title:"Alle Gerichte",sub:"Unsere komplette Speisekarte auf einen Blick."},
  "Pizza":{icon:"🍕",title:"Pizza",sub:"Frisch aus dem Ofen – Größen und mehrere Extra-Zutaten auswählbar."},
  "Nudelgerichte":{icon:"🍝",title:"Nudelgerichte",sub:"Wähle Spaghetti, Penne, Maccheroni, Tortellini oder Gnocchi. Käse überbacken +2,00 €."},
  "Finger Food":{icon:"🍟",title:"Finger Food",sub:"Knusprige Klassiker und Beilagen."},
  "Pizzabrötchen":{icon:"🥖",title:"Pizzabrötchen",sub:"Warm, frisch und ideal zum Teilen."},
  "Fleischgerichte":{icon:"🍗",title:"Fleischgerichte",sub:"Herzhafte Gerichte frisch zubereitet."},
  "Baguettes":{icon:"🥖",title:"Baguettes",sub:"Knusprig belegt und frisch zubereitet."},
  "Salate":{icon:"🥗",title:"Salate",sub:"Frisch, knackig und leicht."},
  "Desserts":{icon:"🍰",title:"Desserts",sub:"Etwas Süßes zum Abschluss."},
  "Getränke":{icon:"🥤",title:"Getränke",sub:"Kalt und passend zu deiner Bestellung."}
};

function renderCats(){
  const el=document.getElementById('categories'); el.innerHTML='';
  cats.forEach(c=>{
    const meta=CATEGORY_META[c]||{icon:"•",title:c};
    const b=document.createElement('button');
    b.className='chip'+(c===active?' active':'');
    b.innerHTML=`<span class="cat-icon">${meta.icon}</span><span>${c}</span>`;
    b.onclick=()=>{active=c;renderCats();renderProducts()};
    el.appendChild(b);
  });
}

function renderProducts(){
  const el=document.getElementById('products'); el.innerHTML='';
  const meta=CATEGORY_META[active]||{icon:"🍽️",title:active,sub:"Wähle dein Lieblingsgericht."};
  const title=document.getElementById('categoryTitle');
  const sub=document.getElementById('categorySubtitle');
  if(title) title.textContent=`${meta.icon} ${meta.title}`;
  if(sub) sub.textContent=meta.sub||'';

  const list=PDS_PRODUCTS.filter(p=>!p.isExtra&&(active==='Alle'||p.category===active));
  list.forEach(p=>{
    const first=Object.values(p.variants)[0];
    const card=document.createElement('article'); card.className='product';
    const pasta=p.category==='Nudelgerichte';
    const pastaControls=pasta ? `
      <div class="inline-options">
        <label>1. Nudelsorte wählen</label>
        <select class="pasta-variant">
          ${Object.entries(p.variants).map(([k,v])=>`<option value="${k}">${k}</option>`).join('')}
        </select>
        <label>2. Optionen</label>
        <label class="cheese-toggle">
          <input type="checkbox" class="pasta-cheese">
          <span>Mit Käse überbacken</span><b>+ ${money(Number(p.pastaCheeseExtra||2))}</b>
        </label>
      </div>` : '';
    card.innerHTML=`<div class="media"><img src="${p.image}" alt="${p.name}" loading="lazy" decoding="async"><span class="num">${p.id}</span>${p.ageRestricted?'<span class="age">18+</span>':''}</div>
      <div class="body"><h3>${p.name}</h3><div class="desc">${p.description||'&nbsp;'}</div>
      <div class="price">ab ${money(first)}</div>${pastaControls}
      <button class="btn primary">${pasta?'In den Warenkorb':'Auswählen'}</button></div>`;
    card.querySelector('button').onclick=()=>pasta?addPastaFromCard(p,card):openProduct(p);
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
  let total=Number(selected.variants?.[variant]||0);
  if(selected.category==='Nudelgerichte' && selected.pastaCheeseExtra){
    if(document.getElementById('pPastaCheese')?.checked){
      const extra=Number(selected.pastaCheeseExtra||2);
      price+=extra;
      extraName='Mit Käse überbacken';
      extraItems=[{name:'Mit Käse überbacken',price:extra}];
    }
  }else if(selected.pizzaExtras){
    total += Math.max(0, selectedPizzaExtras().length-Number(selected.freePizzaExtras||0))*pizzaExtraUnitPrice();
  }
  if(selected.category==='Nudelgerichte' && document.getElementById('pPastaCheese')?.checked){
    total += Number(selected.pastaCheeseExtra||2);
  }
  const target=document.getElementById('pCurrentTotal');
  if(target) target.textContent=money(total);
}


function addPastaFromCard(p,card){
  const variant=card.querySelector('.pasta-variant')?.value || Object.keys(p.variants)[0];
  const cheese=!!card.querySelector('.pasta-cheese')?.checked;
  let price=Number(p.variants[variant]||0);
  const extraItems=[];
  let extraName='';
  if(cheese){
    const extra=Number(p.pastaCheeseExtra||2);
    price+=extra;
    extraName='Mit Käse überbacken';
    extraItems.push({name:'Mit Käse überbacken',price:extra});
  }
  cart.push({
    productId:p.id,name:p.name,variant,note:'',extraName,extraItems,price,qty:1
  });
  saveCart();
  const btn=card.querySelector('.btn.primary');
  if(btn){
    const old=btn.textContent; btn.textContent='✓ Hinzugefügt';
    setTimeout(()=>btn.textContent=old,900);
  }
}

function openProduct(p){
  selected=p;
  document.getElementById('pName').textContent=p.name;
  document.getElementById('pDesc').textContent=p.description||'';
  const variantLabel=document.getElementById('pVariantLabel');
  if(variantLabel) variantLabel.textContent=p.category==='Nudelgerichte'?'Nudelsorte':'Größe / Variante';

  const v=document.getElementById('pVariant');
  v.innerHTML='';
  Object.entries(p.variants).forEach(([k,val])=>v.add(new Option(`${k} – ${money(val)}`,k)));
  v.onchange=()=>{
    if(p.pizzaExtras) updatePizzaExtraPrices();
    else updateProductModalTotal();
  };

  const ef=document.getElementById('extraField');
  if(p.category==='Nudelgerichte' && p.pastaCheeseExtra){
    ef.style.display='grid';
    ef.innerHTML=`
      <label>Option</label>
      <label class="cheese-toggle modal-cheese">
        <input type="checkbox" id="pPastaCheese">
        <span>Mit Käse überbacken</span>
        <b>+ ${money(Number(p.pastaCheeseExtra||2))}</b>
      </label>`;
    ef.querySelector('#pPastaCheese').onchange=updateProductModalTotal;
  }else if(p.pizzaExtras && p.pizzaExtras.length){
    ef.style.display='grid';
    ef.innerHTML=`
      <label>Extra-Zutaten</label>
      <div class="extras-info">${Number(p.freePizzaExtras||0)>0
          ? `Wähle bis zu ${Number(p.freePizzaExtras)} Füllungen inklusive. Jede weitere Füllung + ${money(pizzaExtraUnitPrice())}.`
          : 'Mehrere Extras möglich. Jede Zutat wird einzeln berechnet.'
        }</div>
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
    price += Math.max(0, extras.length-Number(selected.freePizzaExtras||0))*unit;
    extraName = extras.length ? extras.join(', ') : 'Ohne Extra-Zutat';
    {
      const freeCount=Number(selected.freePizzaExtras||0);
      extraItems = extras.map((name,i)=>({name, price:i<freeCount?0:unit}));
    }
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



let orderTimingMode='asap';

function setOrderTimingMode(mode){
  orderTimingMode=mode==='preorder'?'preorder':'asap';
  const asap=document.getElementById('asapBtn');
  const preorder=document.getElementById('preorderBtn');
  const fields=document.getElementById('preorderFields');
  const hint=document.getElementById('timingHint');
  if(asap) asap.classList.toggle('active',orderTimingMode==='asap');
  if(preorder) preorder.classList.toggle('active',orderTimingMode==='preorder');
  if(fields) fields.style.display=orderTimingMode==='preorder'?'grid':'none';

  if(orderTimingMode==='preorder'){
    const d=document.getElementById('preorderDate');
    const t=document.getElementById('preorderTime');
    const now=new Date();
    if(d){
      const local=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10);
      d.min=local;
      if(!d.value) d.value=local;
    }
    if(t && !t.value){
      const future=new Date(now.getTime()+60*60000);
      future.setMinutes(Math.ceil(future.getMinutes()/15)*15,0,0);
      t.value=String(future.getHours()).padStart(2,'0')+':'+String(future.getMinutes()).padStart(2,'0');
    }
    if(hint) hint.textContent='Du kannst für einen späteren Zeitpunkt vorbestellen – auch außerhalb der aktuellen Öffnungszeit.';
  }else{
    if(hint) hint.textContent=(settings?.deliveryOpen||settings?.pickupOpen)
      ? 'Wir bereiten deine Bestellung so schnell wie möglich zu.'
      : 'So schnell wie möglich ist aktuell nicht verfügbar. Bitte Vorbestellen wählen.';
  }
  updateCheckoutAvailability();
}

function getOrderTiming(){
  if(orderTimingMode!=='preorder') return {mode:'asap',requestedFor:null};
  const date=document.getElementById('preorderDate')?.value||'';
  const time=document.getElementById('preorderTime')?.value||'';
  if(!date||!time) return null;
  const requested=new Date(`${date}T${time}:00`);
  if(Number.isNaN(requested.getTime()) || requested.getTime() < Date.now()+10*60000) return false;
  return {mode:'preorder',requestedFor:requested.toISOString(),requestedDate:date,requestedTime:time};
}

function updateCheckoutAvailability(){
  const type=document.getElementById('type');
  if(!type || !settings) return;

  const isPreorder=orderTimingMode==='preorder';
  const deliveryOption=[...type.options].find(o=>o.value==='Lieferung');
  const pickupOption=[...type.options].find(o=>o.value==='Abholung');

  if(deliveryOption){
    deliveryOption.disabled=!isPreorder&&!settings.deliveryOpen;
    deliveryOption.textContent=(isPreorder||settings.deliveryOpen)?'Lieferung':'Lieferung – geschlossen';
  }
  if(pickupOption){
    pickupOption.disabled=!isPreorder&&!settings.pickupOpen;
    pickupOption.textContent=(isPreorder||settings.pickupOpen)?'Abholung':'Abholung – geschlossen';
  }

  if(!isPreorder){
    if(type.value==='Lieferung' && !settings.deliveryOpen && settings.pickupOpen) type.value='Abholung';
    if(type.value==='Abholung' && !settings.pickupOpen && settings.deliveryOpen) type.value='Lieferung';
  }
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
  document.getElementById('checkoutResult').innerHTML='';
  orderTimingMode=(settings.deliveryOpen||settings.pickupOpen)?'asap':'preorder';
  showModal('checkoutModal');
  setOrderTimingMode(orderTimingMode);
  syncCustomerUi();
  const a=document.getElementById('address');
  if(a&&!a.dataset.zoneReset){a.addEventListener('input',()=>{verifiedDeliveryZone=null;const z=document.getElementById('zonePriceInfo');if(z)z.style.display='none';renderCart();});a.dataset.zoneReset='1';}
}

async function createSumupCheckout(amount, orderId){
  const endpoint='https://rsxviwsmymlrwgphydae.supabase.co/functions/v1/create-sumup-checkout';
  const response=await fetch(endpoint,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({amount:Number(amount),orderId:String(orderId)})
  });
  let data={};
  try{data=await response.json();}catch(e){}
  if(!response.ok||!data.checkout_url){
    console.error('Kartenzahlung konnte nicht gestartet werden:',data);
    throw new Error(data?.error||'Kartenzahlung konnte nicht gestartet werden.');
  }
  return data;
}

async function placeOrder(){
  const type=document.getElementById('type').value;
  const name=document.getElementById('name').value.trim();
  const phone=document.getElementById('phone').value.trim();
  const address=document.getElementById('address').value.trim();
  const terms=document.getElementById('terms').checked;
  const timing=getOrderTiming();
  if(timing===null) return alert('Bitte Datum und Uhrzeit für die Vorbestellung auswählen.');
  if(timing===false) return alert('Bitte eine Vorbestellzeit wählen, die mindestens 10 Minuten in der Zukunft liegt.');
  if(orderTimingMode==='asap' && !settings?.deliveryOpen && !settings?.pickupOpen) return alert('Wir haben aktuell geschlossen. Bitte Vorbestellen wählen.');

  if(!name||!phone||!terms) return alert('Bitte Name, Telefonnummer und Bestätigung ausfüllen.');
  if(type==='Lieferung'){
    if(orderTimingMode==='asap' && !settings?.deliveryOpen) return alert('Lieferung ist im Moment geschlossen. Bitte Vorbestellen wählen.');
    if(!address) return alert('Bitte Lieferadresse eingeben.');
    if(!verifiedDeliveryZone) return alert('Bitte zuerst die Lieferadresse prüfen.');
    const subtotalCheck=cart.reduce((s,x)=>s+x.price*x.qty,0);
    if(subtotalCheck<verifiedDeliveryZone.minimum) return alert(`Mindestbestellwert für ${verifiedDeliveryZone.label}: ${money(verifiedDeliveryZone.minimum)}.`);
  }else{
    if(orderTimingMode==='asap' && !settings?.pickupOpen) return alert('Abholung ist im Moment geschlossen. Bitte Vorbestellen wählen.');
  }

  const subtotal=cart.reduce((s,x)=>s+x.price*x.qty,0);
  const fee=(type==='Lieferung'?verifiedDeliveryZone.fee:0), total=subtotal+fee;
  const id=crypto.randomUUID?crypto.randomUUID():String(Date.now());
  const statusToken=crypto.randomUUID?crypto.randomUUID():(String(Date.now())+'-'+Math.random());
  const order={id,number:Date.now()%100000,statusToken,createdAt:new Date().toISOString(),status:'new',eta:null,orderTiming:timing,
    expiresAt:Date.now()+Number(settings?.autoCancelMinutes||5)*60000,total,items:cart,
    customer:{type,name,phone,address:type==='Lieferung'?address:'',deliveryZone:type==='Lieferung'?verifiedDeliveryZone.label:'',deliveryDistanceKm:type==='Lieferung'?verifiedDeliveryZone.distanceKm:null,deliveryFee:fee,payment:document.getElementById('payment').value,note:document.getElementById('note').value.trim()}};
  try{
    const created=await PDS_BACKEND.createOrder(order);
    if(created?.number) order.number=created.number;
    if(PDS_BACKEND.isCustomerSignedIn()) try{await PDS_BACKEND.saveCustomerProfile({name,phone,address});}catch(e){}
    localStorage.setItem('pds_last_order',id);localStorage.setItem(`pds_order_token_${id}`,statusToken);

    const paymentMethod=document.getElementById('payment').value;
    if(paymentMethod==='Mit Karte zahlen'){
      document.getElementById('checkoutResult').innerHTML='<div class="notice"><b>Bestellung gespeichert.</b><br>Sichere Kartenzahlung wird geöffnet …</div>';
      try{
        const checkout=await createSumupCheckout(total,id);
        localStorage.setItem(`pds_sumup_checkout_${id}`,checkout.checkout_id||'');
        cart=[];saveCart();
        location.href=checkout.checkout_url;
        return;
      }catch(paymentError){
        console.error(paymentError);
        document.getElementById('checkoutResult').innerHTML='<div class="notice"><b>Bestellung wurde gespeichert, aber die Kartenzahlung konnte nicht geöffnet werden.</b><br>Bitte rufe Pizza De Silva an und nenne deine Bestellnummer '+String(order.number||'')+'.</div>';
        return;
      }
    }

    cart=[];saveCart();
    document.getElementById('checkoutResult').innerHTML='<div class="success"><b>Bestellung wurde gesendet.</b><br>Du wirst zur Statusseite weitergeleitet.</div>';
    setTimeout(()=>location.href=`status.html?id=${encodeURIComponent(id)}`,1100);
  }catch(e){console.error(e);alert('Die Bestellung konnte nicht gesendet werden. Bitte erneut versuchen.');}
}

document.getElementById('type')?.addEventListener('change',()=>{updateCheckoutTypeUI();updateDeliveryZoneInfo()}); renderCats();renderProducts();renderCart();loadSettings();
