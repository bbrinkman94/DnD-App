# DnD Tracker — Vite + React Projekt

Dieses Projekt wurde aus einer gebündelten Offline-HTML-Datei in ein normales Vite + React Projekt überführt.

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL Vite prints, usually `http://localhost:5173`.

## Build

```bash
npm run build
npm run preview
```

## Project map

- `index.html` — Vite HTML entrypoint.
- `src/main.jsx` — React entrypoint.
- `src/App.jsx` — main DnD tracker UI and app logic.
- `src/levelup.jsx` — level-up helper, backup bar, and related helper functions.
- `src/styles.css` — app styling.
- `AGENTS.md` — instructions Codex should read before editing.

## Notes

Data is stored in `localStorage`, like the original offline app. Export backups from inside the app before major edits.
