// Pizza De Silva – Sonderaktion + feste Lieferzonen
(function(){
  const originalCheck=window.checkNewCustomerDiscount;
  const originalAmount=window.newCustomerDiscountAmount;
  function berlinStamp(){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}:${g('second')}`;}
  function promoActive(){return berlinStamp()<'2026-09-16T01:00:00';}

  // Liefergebühren und Mindestbestellwerte fest, unabhängig von DB-Werten.
  window.zoneForDistance=function(km){
    km=Number(km);
    if(km<=2)return {label:'bis 2 km',fee:1,minimum:15,distanceKm:km};
    if(km<=5)return {label:'2–5 km',fee:2,minimum:25,distanceKm:km};
    if(km<=7)return {label:'5–7 km',fee:3,minimum:35,distanceKm:km};
    if(km<=10)return {label:'7–10 km',fee:3.5,minimum:45,distanceKm:km};
    return null;
  };

  window.newCustomerDiscountAmount=function(subtotal){if(promoActive())return Math.round((Number(subtotal)||0)*10)/100;return typeof originalAmount==='function'?originalAmount(subtotal):0;};
  window.checkNewCustomerDiscount=async function(phone){if(promoActive()){newCustomerDiscountEligible=true;const s=document.getElementById('newCustomerDiscountStatus');if(s){s.style.display='block';s.innerHTML='<b>🎉 Nur heute: 10 % Rabatt auf alle Bestellungen – automatisch abgezogen.</b>';}renderCart();return true;}return typeof originalCheck==='function'?originalCheck(phone):false;};
  function ui(){const b=document.getElementById('newCustomerPromo');const r=document.querySelector('#newCustomerDiscountRow span:first-child');if(promoActive()){if(b)b.innerHTML='🎉 NUR HEUTE: 10 % RABATT AUF ALLE BESTELLUNGEN!<small>Bis 16.09.2026 um 01:00 Uhr · Rabatt auf Speisen, Liefergebühr ausgenommen.</small>';if(r)r.textContent='🎉 Aktions-Rabatt (10 %)';newCustomerDiscountEligible=true;}else{if(b)b.innerHTML='🎉 NEUKUNDEN-RABATT: 10 % auf deine erste Bestellung!<small>Gilt für deine erste Online-Bestellung bei Pizza De Silva.</small>';if(r)r.textContent='🎉 Neukunden-Rabatt (10 %)';}renderCart();}
  ui();setInterval(ui,30000);
})();
