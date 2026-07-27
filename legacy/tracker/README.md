# DnD Tracker

Eine lokale DnD Companion App für Charakterbogen, Kampf, Gegner, Würfel, Notizen, Inventar, Party und Zauber.

## Für dich als Nicht-Programmierer

Du musst zum Starten nur diese Befehle im Projektordner ausführen:

```bash
npm install
npm run dev
```

Danach öffnest du die Adresse, die Vite im Terminal anzeigt, meistens `http://localhost:5173`.

## Build testen

```bash
npm run build
npm run preview
```

## Projektstruktur

```text
index.html          # HTML-Einstiegspunkt für Vite
package.json        # npm-Scripts und Abhängigkeiten
src/main.jsx        # startet React
src/App.jsx         # Haupt-App mit Screens und App-Logik
src/levelup.jsx     # Level-Up-Assistent und Backup-Leiste
src/styles.css      # Styling der App
```

## Daten

Die App speichert deine Daten lokal im Browser über `localStorage`. Nutze die Backup-Schaltfläche in der Seitenleiste, bevor du größere Änderungen testest oder den Browser wechselst.
