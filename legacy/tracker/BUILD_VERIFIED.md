# Build verification

Checks attempted in this environment on 2026-06-12:

```bash
tsc --allowJs --jsx react-jsx --noEmit --skipLibCheck --module ESNext --target ES2022 src/App.jsx src/main.jsx src/levelup.jsx vite.config.js
```

Result: passed as a JSX/JavaScript parse check.

```bash
npm install
```

Result: blocked in this environment by a registry `403 Forbidden` response, so dependencies could not be downloaded here.

```bash
npm run build
```

Result: could not run here because `vite` is not installed without the blocked dependency install. After `npm install` succeeds on your machine, run `npm run build` again.
