# StackBlitz starten

Diese App ist für StackBlitz vorbereitet.

## Wenn StackBlitz bei "Installing dependencies" hängen bleibt

1. Warte zuerst 2–3 Minuten.
2. Wenn sich nichts ändert, klicke ins Terminal und drücke `Ctrl + C`.
3. Öffne über das Plus-Symbol ein neues Terminal.
4. Führe die Befehle einzeln aus:

```bash
npm install
```

```bash
npm run start
```

## Warum gibt es `npm run start`?

StackBlitz erwartet bei vielen Projekten einen `start`-Befehl. Dieser startet dieselbe Vite-App wie `npm run dev`.

## Wenn du einen Rolldown-/WASI-/Atomic-Access-Fehler siehst

Der Fehler sieht ungefähr so aus:

```text
[rolldown] Downloading ... on WebContainer
RangeError: Invalid atomic access index
```

Das kommt von einer zu neuen Vite/Rolldown-Kombination in StackBlitz, nicht von deinem DnD-Code. Dieses Projekt pinnt Vite deshalb auf eine ältere, bewährte Version. Setze die StackBlitz-Installation einmal sauber zurück:

```bash
rm -rf node_modules package-lock.json
```

```bash
npm install
```

```bash
npm run start
```

Alternativ kannst du alles in einem Befehl ausführen:

```bash
npm run stackblitz:reset
```

## Wenn es weiterhin hängt

- Seite einmal hart neu laden.
- Projekt erneut über `https://stackblitz.com/github/<user>/<repo>` öffnen.
- Browser-Cache für StackBlitz/WebContainer leeren.
- Falls ein Arbeitslaptop npm/CDN-Zugriffe blockiert, über ein anderes Netzwerk testen oder das Projekt später über Netlify/Vercel deployen.
