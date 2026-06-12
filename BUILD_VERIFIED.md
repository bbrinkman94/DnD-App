# Build verification

Checks attempted in this environment on 2026-06-12:

```bash
tsc --allowJs --jsx react-jsx --noEmit --skipLibCheck --module ESNext --target ES2022 src/App.jsx src/main.jsx src/levelup.jsx vite.config.js
```

Result: passed as a JSX/JavaScript parse check.

```bash
npm install
```

Result: blocked in this environment by a registry `403 Forbidden` response. The repository keeps pinned stable dependency versions, uses Vite 4 to avoid StackBlitz/WebContainer Rolldown WASM issues, and provides a `start` script so browser environments like StackBlitz do not need to resolve floating `latest` versions.

```bash
npm run build
```

Result: could not run here because `vite` is not installed without the blocked dependency install. After `npm install` succeeds on your machine or in StackBlitz, run `npm run build` again.
