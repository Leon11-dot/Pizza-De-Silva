# Pizza De Silva

Eigene Online-Bestellwebseite für Pizza De Silva.

## Deployment auf Render
- Service Type: Static Site
- Build Command: `echo "No build required"`
- Publish Directory: `.`
- Alternativ `render.yaml` als Blueprint verwenden.

## Wichtige Dateien
- `index.html` – Kundenseite
- `admin.html` – Bestellzentrale
- `settings.html` – Shop-Einstellungen
- `status.html` – Bestellstatus
- `config.js` – Supabase-Projektverbindung
- `printer/` – lokaler A4-Autodruck für Brother HL-L2350DW

## Sicherheit
Keinen Supabase Service-Role/Admin-Key in dieses GitHub-Repository hochladen.
Der Browser darf nur den Publishable Key enthalten.
