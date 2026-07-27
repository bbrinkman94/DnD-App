# DnD Tracker

## Goal
Keep this app simple, local-first, and easy to run in a browser. It is a DnD companion/tracker extracted from a bundled offline HTML file into a Vite + React project.

## Commands
- Install: `npm install`
- Dev server: `npm run dev`
- Production build: `npm run build`
- Preview build: `npm run preview`

## Architecture
- `src/main.jsx` is the app entrypoint.
- `src/App.jsx` contains the main UI and most application logic.
- `src/levelup.jsx` provides the level-up modal, backup bar, and helper functions.
- `src/styles.css` contains app styling.

## Editing rules
- Do not move persistent data away from `localStorage` unless the task explicitly asks for it.
- Preserve existing German UI wording unless the task asks for copy changes.
- Before changing data structures, add a small migration path so existing saved browser data still loads.
- Keep the app usable offline after dependencies are installed; do not add server-only features for core gameplay tracking.
- Prefer small, focused components over one huge rewrite.
- Do not add telemetry, accounts, ads, analytics, or remote storage without explicit approval.

## Checks before finishing
- Run `npm run build` when dependencies are available.
- Manually smoke-test: app loads, navigation works, dice roll works, backup export/import buttons still render, and PDF import does not throw before selecting a file.
