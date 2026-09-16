window.PDS_CONFIG = {
  "restaurantName": "Pizza De Silva",
  "currency": "EUR",
  "autoCancelMinutes": 5,
  "openingHoursText": "Öffnungszeiten bitte im Adminbereich eintragen",
  "deliveryMinimum": 15,
  "deliveryFee": 1,
  "supabaseUrl": "https://rsxviwsmymlrwgphydae.supabase.co",
  "supabaseAnonKey": "sb_publishable_yx83QUnyM5VD6wW8QGrRAA_4aMWXeuZ",
  "adminEmail": ""
};

// Lieferkosten-Fix nach der Haupt-App laden. Neue Versionsnummer verhindert alten Browser-Cache.
window.addEventListener('load', function(){
  const s=document.createElement('script');
  s.src='pds-promo-lieferkosten-20260915.js?v=20260916-1100';
  s.async=false;
  document.body.appendChild(s);
});
