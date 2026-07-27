# Extraction notes

Source file: `DnD Tracker (offline).html`

Current state:
- The app now uses a normal Vite + React project structure.
- `index.html` loads `src/main.jsx`.
- `src/main.jsx` renders React and imports styles.
- `src/App.jsx` contains the extracted main app.
- `src/levelup.jsx` provides a working lightweight level-up modal and backup bar.
- `src/styles.css` contains baseline styling for the extracted UI.

Potential follow-up:
- Split `src/App.jsx` into smaller screen and component files.
- Add tests for dice parsing, damage parsing, imports, and level-up calculations.
- Expand DnD-specific features after the build stays stable.
