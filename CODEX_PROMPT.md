# DnD Tracker — Codex-ready React project

This project was extracted from a single bundled/offline HTML file and converted into an editable Vite + React app.

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

- `src/App.jsx` — main DnD tracker UI and app logic.
- `src/levelup.jsx` — SRD 5e level-up helper, backup bar, and related helper components exposed on `window` for compatibility with the original app.
- `src/styles.css` — extracted app styling.
- `src/main.jsx` — Vite entrypoint; wires React, `pdf-lib`, default tweak settings, styles, and helper modules.
- `AGENTS.md` — instructions Codex should read before editing.

## Notes

The original file bundled React, ReactDOM, Babel, pdf-lib, app code, CSS, and fonts into one HTML document. This version uses normal npm dependencies instead, so Codex can edit the code cleanly.

Font binaries from the bundle are not included. The stylesheet imports Google Fonts and falls back to system fonts if unavailable.

Data is stored in `localStorage`, like the original offline app. Export backups from inside the app before major edits.
