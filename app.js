
const money=n=>Number(n||0).toLocaleString('de-DE',{style:'currency',currency:PDS_CONFIG.currency||'EUR'});
let cart=JSON.parse(localStorage.getItem('pds_cart')||'[]'),active='Alle',selected=null,settings=null;
const cats=['Alle',...new Set(PDS_PRODUCTS.filter(p=>!p.isExtra).map(p=>p.category))];

function saveCart(){localStorage.setItem('pds_cart',JSON.stringify(cart));renderCart()}
function closeModal(id){document.getElementById(id).classList.remove('show')}
function showModal(id){document.getElementById(id).classList.add('show')}

async function loadSettings(){
  settings = await PDS_BACKEND.getSettings();
  const badge=document.getElementById('openBadge');
  if(badge){
    badge.textContent=settings.storeOpen?'🟢 Geöffnet':'🔴 Geschlossen';
    badge.style.background=settings.storeOpen?'#eaf8ee':'#fff0ec';
    badge.style.color=settings.storeOpen?'#175d32':'#8d2118';
  }
  const oh=document.getElementById('openingText'); if(oh) oh.textContent=settings.openingHoursText||'Öffnungszeiten folgen'; const ohf=document.getElementById('openingTextFooter'); if(ohf) ohf.textContent=settings.openingHoursText||'';
  const da=document.getElementById('deliveryAreaText'); if(da) da.textContent=settings.deliveryAreaText||'Liefergebiet folgt';
  renderCart();
}

function renderCats(){
 const el=document.getElementById('categories');el.innerHTML='';
 cats.forEach(c=>{let b=document.createElement('button');b.className='chip'+(c===active?' active':'');b.textContent=c;b.onclick=()=>{active=c;renderCats();renderProducts()};el.appendChild(b)})
}
function renderProducts(){
 const el=document.getElementById('products');el.innerHTML='';
 PDS_PRODUCTS.filter(p=>!p.isExtra&&(active==='Alle'||p.category===active)).forEach(p=>{
   const first=Object.values(p.variants)[0], card=document.createElement('article');card.className='product';
   card.innerHTML=`<div class="media"><img src="assets/${p.image}" alt="${p.name}"><span class="num">${p.id}</span>${p.ageRestricted?'<span class="age">18+</span>':''}</div><div class="body"><h3>${p.name}</h3><div class="desc">${p.description||'&nbsp;'}</div><div class="price">ab ${money(first)}</div><button class="btn primary">Auswählen</button></div>`;
   card.querySelector('button').onclick=()=>openProduct(p);el.appendChild(card)
 })
}
function openProduct(p){
 selected=p;document.getElementById('pName').textContent=p.name;document.getElementById('pDesc').textContent=p.description||'';
 const v=document.getElementById('pVariant');v.innerHTML='';Object.entries(p.variants).forEach(([k,val])=>v.add(new Option(`${k} – ${money(val)}`,k)));
 const ef=document.getElementById('extraField'),ex=document.getElementById('pExtra');ex.innerHTML='<option value="">Kein Extra</option>';
 if(p.extras){ef.style.display='grid';Object.entries(p.extras).forEach(([k,val])=>{const o=new Option(`${k} + ${money(val)}`,k);o.dataset.price=val;ex.add(o)})}else ef.style.display='none';
 document.getElementById('pNote').value='';showModal('productModal')
}
function addProduct(){
 const variant=document.getElementById('pVariant').value,note=document.getElementById('pNote').value.trim();
 let price=selected.variants[variant],extraName='',extraPrice=0, ex=document.getElementById('pExtra');
 if(selected.extras&&ex.value){extraName=ex.value;extraPrice=Number(ex.selectedOptions[0].dataset.price||0);price+=extraPrice}
 cart.push({productId:selected.id,name:selected.name,variant,note,extraName,price,qty:1});saveCart();closeModal('productModal')
}
function removeItem(i){cart.splice(i,1);saveCart()}
function renderCart(){
 const count=cart.reduce((s,x)=>s+x.qty,0);document.getElementById('cartCount').textContent=count;document.getElementById('cartCount2').textContent=count;
 const rows=document.getElementById('cartRows');if(!cart.length){rows.className='empty';rows.innerHTML='Dein Warenkorb ist noch leer.'}else{rows.className='';rows.innerHTML=cart.map((x,i)=>`<div class="cart-row"><div><b>${x.qty}× ${x.name}</b><small>${x.variant}${x.extraName?' • '+x.extraName:''}${x.note?' • '+x.note:''}</small></div><div style="text-align:right"><b>${money(x.price*x.qty)}</b><br><button class="linkbtn" onclick="removeItem(${i})">entfernen</button></div></div>`).join('')}
 const subtotal=cart.reduce((s,x)=>s+x.price*x.qty,0), fee=Number(settings?.deliveryFee ?? PDS_CONFIG.deliveryFee ?? 0);document.getElementById('subtotal').textContent=money(subtotal);document.getElementById('deliveryFee').textContent=money(fee);document.getElementById('total').textContent=money(subtotal+fee)
}
function openCheckout(){
 if(!cart.length)return alert('Bitte zuerst etwas auswählen.');
 if(settings && !settings.storeOpen)return alert('Pizza De Silva ist im Moment für Online-Bestellungen geschlossen.');
 const subtotal=cart.reduce((s,x)=>s+x.price*x.qty,0), min=Number(settings?.deliveryMinimum||0);
 if(min>0 && subtotal<min)return alert(`Mindestbestellwert: ${money(min)}.`);
 document.getElementById('checkoutResult').innerHTML='';showModal('checkoutModal')
}
async function placeOrder(){
 const type=document.getElementById('type').value,name=document.getElementById('name').value.trim(),phone=document.getElementById('phone').value.trim(),address=document.getElementById('address').value.trim(),terms=document.getElementById('terms').checked;
 if(!name||!phone||(type==='Lieferung'&&!address)||!terms)return alert('Bitte Name, Telefon, bei Lieferung die Adresse angeben und die Bestätigung anhaken.');
 if(settings && !settings.storeOpen)return alert('Online-Bestellungen sind momentan geschlossen.');
 const subtotal=cart.reduce((s,x)=>s+x.price*x.qty,0),fee=(type==='Lieferung'?Number(settings?.deliveryFee||0):0),total=subtotal+fee;
 const tempNumber = Date.now()%100000;
 const id=crypto.randomUUID?crypto.randomUUID():String(Date.now()); const statusToken=crypto.randomUUID?crypto.randomUUID():(String(Date.now())+'-'+Math.random());
 const order={id,number:tempNumber,statusToken,createdAt:new Date().toISOString(),status:'new',eta:null,expiresAt:Date.now()+Number(settings?.autoCancelMinutes||PDS_CONFIG.autoCancelMinutes||5)*60000,total,items:cart,customer:{type,name,phone,address,payment:document.getElementById('payment').value,note:document.getElementById('note').value.trim()}};
 try{
   const created=await PDS_BACKEND.createOrder(order);
   if(created?.number) order.number=created.number;
   localStorage.setItem('pds_last_order',id); localStorage.setItem(`pds_order_token_${id}`,statusToken);
   cart=[];saveCart();
   document.getElementById('checkoutResult').innerHTML=`<div class="success"><b>Bestellung wurde gesendet.</b><br>Du wirst zur Statusseite weitergeleitet.</div>`;
   setTimeout(()=>location.href=`status.html?id=${encodeURIComponent(id)}`,1100)
 }catch(e){console.error(e);alert('Die Bestellung konnte nicht gesendet werden. Bitte erneut versuchen.')}
}
renderCats();renderProducts();renderCart();loadSettings();
