PIZZA DE SILVA – WEBSITE V3

Neu in dieser Version:
- Shop-Einstellungen: geöffnet/geschlossen, Öffnungszeiten, Liefergebiet, Mindestbestellwert, Liefergebühr
- backend.js: funktioniert lokal als Vorschau und kann ohne Umbau auf Supabase umschalten
- Statusseite fragt die Bestellung regelmäßig ab
- Adminpanel nutzt denselben Backend-Adapter
- PWA/Service Worker vorbereitet
- einzelne Salatbilder aus dem gewünschten Aluschalen-Design
- automatische Stornierung
- Lieferzeit und kompletter Bestellstatus
- Supabase-SQL vorbereitet

VORSCHAU:
1. ZIP entpacken.
2. index.html öffnen.
3. admin.html in zweitem Tab öffnen.
4. Vorschaupasswort: desilva
5. Im Admin „Ton aktivieren“ drücken.
6. settings.html für Shop-Einstellungen öffnen.

LIVEBETRIEB:
1. Supabase-Projekt erstellen.
2. supabase-schema.sql im SQL Editor ausführen.
3. In config.js supabaseUrl und supabaseAnonKey eintragen.
4. Danach Hosting/Domain verbinden.
5. Vor öffentlichem Start muss der Admin-Login mit Supabase Auth abgesichert werden.
6. Zahlungsanbieter und rechtliche Pflichtangaben ergänzen.

Hinweis:
Der Vorschau-Login ist absichtlich nur für lokale Tests. Er darf nicht als Live-Adminschutz verwendet werden.


V4 DESIGN:
- kräftige Pizza-De-Silva-Farben (Bordeauxrot, Gold, Creme)
- große Hero-Fläche mit echten Essensbildern
- Bestseller-Bereich
- farbige Infokarten
- deutlich kräftigere Produktkarten und Warenkorb
- farbiges Adminpanel


LIVE-SUPABASE VERBUNDEN:
Project URL: https://rsxviwsmymlrwgphydae.supabase.co
Publishable Key ist in config.js eingetragen.
Kundenbestellungen werden jetzt über Supabase gespeichert.
Bestellstatus wird mit einem zufälligen Status-Token geschützt.
Adminbereich nutzt Supabase Auth (E-Mail + Passwort).

NOCH OFFEN:
- Admin-Benutzer in Supabase Auth anlegen und E-Mail in admin_users freischalten.
- Projekt auf GitHub/Render veröffentlichen.
- Domain pizzadesilva.de auf das neue Hosting umstellen.
- Online-Zahlungsanbieter anbinden.
