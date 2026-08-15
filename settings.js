
async function load(){
 const s=await PDS_BACKEND.getSettings();document.getElementById('storeOpen').value=String(!!s.storeOpen);document.getElementById('openingHours').value=s.openingHoursText||'';document.getElementById('deliveryArea').value=s.deliveryAreaText||'';document.getElementById('minimum').value=Number(s.deliveryMinimum||0);document.getElementById('fee').value=Number(s.deliveryFee||0);document.getElementById('cancelMinutes').value=Number(s.autoCancelMinutes||5)
}
async function saveSettings(){
 const s={storeOpen:document.getElementById('storeOpen').value==='true',openingHoursText:document.getElementById('openingHours').value.trim(),deliveryAreaText:document.getElementById('deliveryArea').value.trim(),deliveryMinimum:Number(document.getElementById('minimum').value||0),deliveryFee:Number(document.getElementById('fee').value||0),autoCancelMinutes:Number(document.getElementById('cancelMinutes').value||5)};
 await PDS_BACKEND.saveSettings(s);document.getElementById('result').innerHTML='<div class="success">Einstellungen gespeichert.</div>'
}
load();
