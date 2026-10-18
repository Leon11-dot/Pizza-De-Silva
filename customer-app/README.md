# Pizza De Silva – Kunden-App (Android und iOS)

Separates Kunden-App-Projekt, **nicht** die Admin-App. React Native / Expo als gemeinsame Grundlage für Android und iPhone.

## Stand
- Native App-Hülle mit eigenem Namen, Startbildschirm, Zurück-Navigation und Offline-Fehleranzeige.
- Die bestehende Online-Bestellseite https://www.pizzadesilva.de/ wird eingebettet.
- Externe Links und Zahlungsanbieter öffnen außerhalb der App; Zahlungsabläufe müssen auf beiden Plattformen getestet werden.
- Noch **keine** nativen Push-Benachrichtigungen oder Live-Order-Tracking-SDKs integriert.
- Noch **keine** APK/IPA gebaut, getestet oder in Stores eingereicht.

## Lokale Entwicklung
```sh
cd customer-app
npm install
npx expo start
```

## Android APK mit EAS
```sh
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```
Ein Expo-Konto und ein EAS-Projekt sind dafür erforderlich. Den erzeugten APK-Link nach erfolgreichem Build öffnen.

## iOS
```sh
eas build --platform ios --profile production
```
Für iOS-Geräte und App Store wird ein Apple Developer Account, Signierung und TestFlight/App-Store-Review benötigt. Eine reine Website-Hülle kann bei der App-Store-Prüfung abgelehnt werden; vor Einreichung native Mehrwertfunktionen ergänzen.

## Vor Veröffentlichung
1. App-Icons/Splash-Screen erstellen und als Expo-Assets einbinden.
2. Kundenbestellungen und externe Zahlungswege testen.
3. Datenschutz, Impressum, Support und Store-Metadaten prüfen.
4. Authentifizierte Kunden-Push-Benachrichtigungen serverseitig aufbauen und testen.
5. Android- und iOS-Gerätetests sowie Freigaben durchführen.
