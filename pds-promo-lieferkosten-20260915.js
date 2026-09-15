// Pizza De Silva – Sonderaktion 15./16.09.2026 + feste Liefergebühren
// Aktion: 10 % auf Speisen bis 16.09.2026 01:00 Europe/Berlin. Liefergebühr bleibt ungekürzt.
(function(){
  const originalCheck = window.checkNewCustomerDiscount;
  const originalAmount = window.newCustomerDiscountAmount;

  function berlinStamp(){
    const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
    const g=t=>p.find(x=>x.type===t)?.value||'';
    return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}:${g('second')}`;
  }
  function promoActive(){ return berlinStamp() < '2026-09-16T01:00:00'; }

  // Liefergebühren unabhängig von eventuell noch falschen/alten DB-Werten.
  window.zoneForDistance=function(km){
    const minimum=(key)=>Number(window.settings?.[key]||0);
    if(km<=2) return {label:'bis 2 km',fee:1.00,minimum:minimum('deliveryMinimum2km'),distanceKm:km};
    if(km<=5) return {label:'2–5 km',fee:2.00,minimum:minimum('deliveryMinimum5km'),distanceKm:km};
    if(km<=7) return {label:'5–7 km',fee:3.00,minimum:minimum('deliveryMinimum7km'),distanceKm:km};
    if(km<=10) return {label:'7–10 km',fee:3.50,minimum:minimum('deliveryMinimum10km'),distanceKm:km};
    return null;
  };

  window.newCustomerDiscountAmount=function(subtotal){
    if(promoActive()) return Math.round((Number(subtotal)||0)*10)/100;
    return typeof originalAmount==='function' ? originalAmount(subtotal) : 0;
  };

  window.checkNewCustomerDiscount=async function(phone){
    if(promoActive()){
      window.newCustomerDiscountEligible=true;
      const status=document.getElementById('newCustomerDiscountStatus');
      if(status){status.style.display='block';status.innerHTML='<b>🎉 Nur heute: 10 % Rabatt auf alle Bestellungen – automatisch abgezogen.</b>';}
      if(typeof window.renderCart==='function') window.renderCart();
      return true;
    }
    return typeof originalCheck==='function' ? originalCheck(phone) : false;
  };

  function applyPromoUi(){
    const banner=document.getElementById('newCustomerPromo');
    const row=document.querySelector('#newCustomerDiscountRow span:first-child');
    if(promoActive()){
      if(banner) banner.innerHTML='🎉 NUR HEUTE: 10 % RABATT AUF ALLE BESTELLUNGEN!<small>Bis 16.09.2026 um 01:00 Uhr · Rabatt auf Speisen, Liefergebühr ausgenommen.</small>';
      if(row) row.textContent='🎉 Aktions-Rabatt (10 %)';
      window.newCustomerDiscountEligible=true;
    }else{
      if(banner) banner.innerHTML='🎉 NEUKUNDEN-RABATT: 10 % auf deine erste Bestellung!<small>Gilt für deine erste Online-Bestellung bei Pizza De Silva.</small>';
      if(row) row.textContent='🎉 Neukunden-Rabatt (10 %)';
    }
    if(typeof window.renderCart==='function') window.renderCart();
  }

  applyPromoUi();
  setInterval(applyPromoUi,30000);
})();
