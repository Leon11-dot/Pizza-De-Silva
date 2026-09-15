window.PDS_CONFIG = {
  "restaurantName": "Pizza De Silva",
  "currency": "EUR",
  "autoCancelMinutes": 5,
  "openingHoursText": "Öffnungszeiten bitte im Adminbereich eintragen",
  "deliveryMinimum": 0,
  "deliveryFee": 0,
  "supabaseUrl": "https://rsxviwsmymlrwgphydae.supabase.co",
  "supabaseAnonKey": "sb_publishable_yx83QUnyM5VD6wW8QGrRAA_4aMWXeuZ",
  "adminEmail": ""
};

// Lädt den aktuellen Pizza-De-Silva Preis-/Aktionsfix erst nach der Haupt-App,
// damit bestehende Funktionen sicher überschrieben werden können.
window.addEventListener('load', function(){
  const s=document.createElement('script');
  s.src='pds-promo-lieferkosten-20260915.js?v=20260915-2226';
  s.async=false;
  document.body.appendChild(s);
});
