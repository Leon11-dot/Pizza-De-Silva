// Pizza De Silva – feste Lieferkosten / Mindestbestellwerte + Rabattlogik
(function(){
  const originalCheck=checkNewCustomerDiscount;
  const originalAmount=newCustomerDiscountAmount;
  const originalRenderCart=renderCart;

  function berlinStamp(){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}:${g('second')}`;}
  function promoActive(){return berlinStamp()>='2026-09-15T00:00:00' && berlinStamp()<'2026-09-16T01:00:00';}

  // WICHTIG: direkte Zuweisung an die aktive globale Funktion, nicht nur window.*
  zoneForDistance=function(km){
    km=Number(km);
    if(km<=2)return {label:'bis 2 km',fee:1.00,minimum:15.00,distanceKm:km};
    if(km<=5)return {label:'2–5 km',fee:2.00,minimum:25.00,distanceKm:km};
    if(km<=7)return {label:'5–7 km',fee:3.00,minimum:35.00,distanceKm:km};
    if(km<=10)return {label:'7–10 km',fee:3.50,minimum:45.00,distanceKm:km};
    return null;
  };

  // Adresse prüfen und die ermittelte Zone direkt in verifiedDeliveryZone speichern.
  checkDeliveryAddress=async function(){
    const addr=document.getElementById('address')?.value.trim();
    const info=document.getElementById('zonePriceInfo');
    if(!addr) return alert('Bitte zuerst die Lieferadresse eingeben.');
    info.style.display='block'; info.className='notice'; info.textContent='Adresse wird geprüft…';
    try{
      const g=await geocodeAddress(addr);
      const km=haversineKm(PDS_RESTAURANT.lat,PDS_RESTAURANT.lon,g.lat,g.lon);
      const z=zoneForDistance(km);
      if(!z){verifiedDeliveryZone=null;info.innerHTML=`Entfernung ca. <b>${km.toFixed(1)} km</b>. Lieferung ist nur bis 10 km möglich.`;renderCart();return;}
      verifiedDeliveryZone=z;
      info.className='success';
      info.innerHTML=`Entfernung ca. <b>${km.toFixed(1)} km</b> • ${z.label}<br>Liefergebühr: <b>${money(z.fee)}</b> • Mindestbestellwert: <b>${money(z.minimum)}</b>`;
      renderCart();
    }catch(e){verifiedDeliveryZone=null;info.className='notice';info.textContent='Adresse nicht gefunden. Bitte Straße, Hausnummer, PLZ und Ort vollständig eingeben.';renderCart();}
  };

  // Warenkorb: Liefergebühr aus der geprüften Zone immer zum Gesamtpreis addieren.
  renderCart=function(){
    originalRenderCart();
    const isDelivery=document.getElementById('type')?.value==='Lieferung';
    const fee=isDelivery&&verifiedDeliveryZone ? Number(verifiedDeliveryZone.fee||0) : 0;
    const subtotal=cart.reduce((s,x)=>s+Number(x.price||0)*Number(x.qty||0),0);
    const discount=newCustomerDiscountAmount(subtotal);
    const feeEl=document.getElementById('deliveryFee');
    const totalEl=document.getElementById('total');
    if(feeEl) feeEl.textContent=money(fee);
    if(totalEl) totalEl.textContent=money(subtotal+fee-discount);
  };

  newCustomerDiscountAmount=function(subtotal){
    if(promoActive()) return Math.round((Number(subtotal)||0)*10)/100;
    return originalAmount(subtotal);
  };
  checkNewCustomerDiscount=async function(phone){
    if(promoActive()){
      newCustomerDiscountEligible=true;
      const s=document.getElementById('newCustomerDiscountStatus');
      if(s){s.style.display='block';s.innerHTML='<b>🎉 10 % Aktionsrabatt werden automatisch abgezogen.</b>';}
      renderCart(); return true;
    }
    return originalCheck(phone);
  };

  // Nach Ende der Aktion wieder normaler Neukunden-Hinweis.
  const banner=document.getElementById('newCustomerPromo');
  if(banner && !promoActive()) banner.innerHTML='🎉 NEUKUNDEN-RABATT: 10 % auf deine erste Bestellung!<small>Gilt für deine erste Online-Bestellung bei Pizza De Silva.</small>';
  renderCart();
})();
