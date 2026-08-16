async function guard(){
  if(!PDS_BACKEND.isSignedIn() || !(await PDS_BACKEND.verifyAdmin())){
    PDS_BACKEND.signOut();
    location.href='admin.html';
    return false;
  }
  return true;
}

async function load(){
  if(!await guard()) return;
  const s=await PDS_BACKEND.getSettings();
  document.getElementById('deliveryOpen').value=String(!!s.deliveryOpen);
  document.getElementById('pickupOpen').value=String(!!s.pickupOpen);
  document.getElementById('openingHours').value=s.openingHoursText||'';
  document.getElementById('deliveryArea').value=s.deliveryAreaText||'';
  document.getElementById('minimum').value=Number(s.deliveryMinimum||0);
  document.getElementById('fee').value=Number(s.deliveryFee||0);
  document.getElementById('cancelMinutes').value=Number(s.autoCancelMinutes||5);
  document.getElementById('restaurantAddress').value=s.restaurantAddress||'Niederstrasse 76, 47829 Krefeld-Uerdingen';
  document.getElementById('deliveryFee5km').value=Number(s.deliveryFee5km||0);
  document.getElementById('deliveryMinimum5km').value=Number(s.deliveryMinimum5km||0);
  document.getElementById('deliveryFee10km').value=Number(s.deliveryFee10km||0);
  document.getElementById('deliveryMinimum10km').value=Number(s.deliveryMinimum10km||0);
}

async function saveSettings(){
  if(!await guard()) return;
  const deliveryOpen=document.getElementById('deliveryOpen').value==='true';
  const pickupOpen=document.getElementById('pickupOpen').value==='true';
  const s={
    storeOpen:deliveryOpen||pickupOpen,
    deliveryOpen,
    pickupOpen,
    openingHoursText:document.getElementById('openingHours').value.trim(),
    deliveryAreaText:document.getElementById('deliveryArea').value.trim(),
    deliveryMinimum:Number(document.getElementById('minimum').value||0),
    deliveryFee:Number(document.getElementById('fee').value||0),
    autoCancelMinutes:Number(document.getElementById('cancelMinutes').value||5),
    restaurantAddress:document.getElementById('restaurantAddress').value.trim(),
    deliveryRadiusKm:10,
    deliveryFee5km:Number(document.getElementById('deliveryFee5km').value||0),
    deliveryMinimum5km:Number(document.getElementById('deliveryMinimum5km').value||0),
    deliveryFee10km:Number(document.getElementById('deliveryFee10km').value||0),
    deliveryMinimum10km:Number(document.getElementById('deliveryMinimum10km').value||0)
  };
  try{
    await PDS_BACKEND.saveSettings(s);
    document.getElementById('result').innerHTML='<div class="success">Einstellungen gespeichert.</div>';
  }catch(e){
    document.getElementById('result').innerHTML='<div class="notice">Speichern fehlgeschlagen. Bitte erneut anmelden.</div>';
  }
}

function logoutSettings(){
  PDS_BACKEND.signOut();
  location.href='admin.html';
}

load();
