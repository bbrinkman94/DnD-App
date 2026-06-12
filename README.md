# DnD Tracker

Eine lokale DnD Companion App für Charakterbogen, Kampf, Gegner, Würfel, Notizen, Inventar, Party und Zauber.

## Für dich als Nicht-Programmierer

### Direkt im Browser mit StackBlitz

Wenn du auf einem Arbeitslaptop nichts installieren darfst, öffne das GitHub-Projekt in StackBlitz. Wenn die automatische Installation mehrere Minuten hängt:

1. Brich das laufende Terminal mit `Ctrl + C` ab.
2. Öffne ein neues Terminal in StackBlitz.
3. Starte nacheinander:

```bash
npm install
```

```bash
npm run start
```

StackBlitz öffnet danach rechts die Browser-Vorschau. Wenn nicht, nutze den Port-/Preview-Button in StackBlitz.

Wenn du einen Fehler mit `[rolldown]`, `WASI` oder `Invalid atomic access index` siehst, setze die StackBlitz-Installation zurück:

```bash
rm -rf node_modules package-lock.json
npm install
npm run start
```

### Lokal auf einem eigenen Rechner

Wenn du Node.js installieren darfst, starte im Projektordner:

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
