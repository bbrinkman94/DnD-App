# Extraction notes

Source file: `DnD Tracker (offline).html`

What changed:
- Extracted the inline React app into `src/App.jsx`.
- Extracted the SRD level-up/backup helper script into `src/levelup.jsx`.
- Moved the CSS into `src/styles.css`.
- Replaced bundled browser globals with npm dependencies: `react`, `react-dom`, `vite`, `pdf-lib`.
- Removed embedded font binaries from the output project.

Original bundled assets detected:
- React development build
- ReactDOM development build
- Babel standalone
- pdf-lib UMD build
- app helper script
- embedded font files

Potential follow-up for Codex:
- Split `src/App.jsx` into smaller components.
- Replace `window.*` helper compatibility with direct imports.
- Add lightweight tests for parsing dice/damage strings and level-up calculations.
