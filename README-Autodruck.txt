
PIZZA DE SILVA – A4 AUTODRUCK FÜR BROTHER HL-L2350DW

Ablauf:
1. Bestellung kommt online an.
2. Im Admin-Panel Lieferzeit wählen.
3. Auf „Annehmen“ klicken.
4. Das PowerShell-Skript erkennt die angenommene Bestellung.
5. A4-Bestellblatt wird erzeugt und automatisch an den Brother HL-L2350DW geschickt.
6. In Supabase wird die Bestellung als „printed“ markiert, damit sie nicht doppelt gedruckt wird.

WICHTIG:
- Der Brother HL-L2350DW muss in Windows installiert sein.
- Der Windows-Druckername muss exakt „Brother HL-L2350DW“ sein oder im Skript angepasst werden.
- Für sicheren Hintergrundzugriff benötigt das Druckskript einen Supabase Admin/Service-Key.
  Diesen Key NICHT in die Webseite eintragen und NICHT öffentlich auf GitHub hochladen.
- Microsoft Edge wird für die A4-PDF-Erzeugung verwendet.
- Für den zuverlässigsten stillen PDF-Druck kann optional SumatraPDF installiert werden.
  Ohne SumatraPDF versucht das Skript Windows „PrintTo“.

Dateien:
- PizzaDeSilva-Autodruck.ps1
- Autodruck-installieren.ps1

EMPFOHLEN:
Den Supabase Admin/Service-Key später als Windows-Umgebungsvariable oder geschützte lokale Konfigurationsdatei speichern,
statt ihn dauerhaft direkt in das Skript zu schreiben.
