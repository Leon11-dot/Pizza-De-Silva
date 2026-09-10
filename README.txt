Pizza De Silva – SumUp nur bezahlt

1. app.js und backend.js in GitHub hochladen und vorhandene Dateien ersetzen.
2. Render automatisch deployen lassen.
3. Bei Kartenzahlung wird keine Bestellung vor Zahlung gespeichert.
4. Nur wenn SumUp serverseitig PAID bestätigt, wird die Bestellung in orders angelegt und erscheint im Admin.
5. FAILED / EXPIRED / unvollständig erscheinen nicht als Bestellung.

Supabase wurde bereits vorbereitet: pending_card_orders, create-sumup-checkout und verify-sumup-payment.
