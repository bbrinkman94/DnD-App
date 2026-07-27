# The Threshold — A Corvin Vaelthorne Prologue

A browser-based 3D gothic-horror vertical slice: about twenty minutes with
**Corvin Vaelthorne**, level-one chthonic tiefling bard, on the night a merchant
hires him to walk east.

Atmospheric exploration, branching dialogue that sounds like him, D&D-style
ability checks on a physically simulated d20, one compact turn-based encounter,
and a medallion called *Die Schwelle* that has been getting colder for two weeks.

Everything runs in the browser. There is no backend, no API key, no database and
no account. Every model, texture, sound and note of music is generated at
runtime by the code in this repository — there are no downloaded assets at all.

---

## Play it locally

You need Node 18+ and nothing else.

```bash
npm install
npm run dev
```

Open the address Vite prints (usually `http://localhost:5173`). Click once
anywhere first — browsers do not allow sound before a real gesture, and so
neither does this.

## Build and preview the production version

```bash
npm run build      # -> dist/
npm run preview    # serves dist/ at http://localhost:4173
```

## Check everything at once

```bash
npm run verify     # typecheck, then tests, then the production build
```

---

## Controls

| Input | Does |
| --- | --- |
| `W A S D` / arrow keys | Move Corvin |
| `E` | Interact with whatever is glowing nearby |
| `Space` / `Enter` | Advance dialogue, confirm a roll |
| `1`–`9` | Choose a dialogue response |
| `M` | Take out the medallion (again to put it away) |
| `Esc` | Menu; also steps back out of the medallion |
| Mouse | Click any choice, action, target or button |

The whole experience is playable with the keyboard alone, or with the mouse
alone.

---

## Deployment

The build output is a plain static `dist/` folder. Pick whichever host you like.

### GitHub Pages (already configured)

`.github/workflows/deploy.yml` builds and publishes on every push to the default
branch. To turn it on:

1. Push this repository to GitHub.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. Push to `main` (or run the workflow manually from the Actions tab).

The workflow sets `VITE_BASE=/<repository-name>/` for you, so the site works from
a project sub-path. Nothing else needs changing. If you serve it from a custom
domain or a user page (`username.github.io`), set `VITE_BASE=/` in the workflow
instead.

### Vercel

Import the repository; the settings in `vercel.json` are picked up automatically.
If you prefer to fill the form in by hand:

- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`

### Cloudflare Pages

- Build command: `npm run build`
- Build output directory: `dist`
- Node version: 18 or newer (set `NODE_VERSION=18` if the default is older)

### Netlify

`netlify.toml` is included: build `npm run build`, publish `dist`.

### Any other static host

```bash
npm run build
# then upload the contents of dist/ anywhere that serves static files
```

If your host serves the site from a sub-path, build with that path:

```bash
VITE_BASE=/my-sub-path/ npm run build
```

---

## Settings and accessibility

Everything below persists to LocalStorage and survives both a reload and
"restart experience":

- Master / music / effects volume, and a mute switch
- Quality preset (Low / Medium / High) — Low disables shadows, wet-ground
  reflection and postprocessing without changing the composition
- Text size (three steps), high contrast, reduced motion, screen shake
- Skip dice animation (the number is still rolled — only the throw is skipped)
- Subtitles for non-speech sounds

Reduced motion and high contrast are pre-selected automatically if your operating
system asks for them. Focus outlines are visible everywhere, dialogue is a real
keyboard list, and the interface is designed for 1366×768 first.

## Saving

One LocalStorage key, written at every meaningful beat: the chapter, Corvin's
condition, his resources, the medallion, every clue, every companion's opinion of
him, and every major choice. **Continue** appears on the title screen only when a
valid save exists. A damaged or hand-edited save is treated as "no save" rather
than crashing.

## Console commands

Open the browser console and type `threshold.help()`:

```
threshold.resetSave()          erase the save and return to the title
threshold.chapter('shrine')    jump to a chapter
threshold.seed('anything')     pin every future roll to a seed
threshold.chill(1, 3)          force the medallion state
threshold.combat()             start the encounter immediately
threshold.state()              dump the current run
```

Adding `?seed=whatever` to the URL pins the dice from the moment the page loads,
which makes a run reproducible.

## Optional: browser smoke test

Playwright is an optional dev dependency and nothing else depends on it.

```bash
npm run build
npx vite preview --port 4173 &
node scripts/smoke.mjs
```

It walks the title screen, dialogue, a skill check, the encounter, the menus, the
ending and a reload, writes screenshots to `smoke-shots/`, and exits non-zero if
the browser logged a single console error. If the bundled Chromium sits somewhere
unusual, point at it with `CHROMIUM_PATH=/path/to/chrome`.

## Tests

```bash
npm run test
```

Covers dice mathematics, criticals, advantage, the d20 simulation landing on
every requested face across many seeds, skill-check resolution, spell slots,
Bardic Inspiration, damage and healing, turn order, encounter balance across
different play styles, dialogue conditions and effects, dialogue-tree integrity,
and save serialisation, migration and corruption handling.

---

## Documents

- [`CLAUDE.md`](CLAUDE.md) — how to work in this repository, and the character
  facts that must stay consistent
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — how the pieces fit, and why
- [`CHECKLIST.md`](CHECKLIST.md) — the implementation checklist, ticked
- [`CREDITS.md`](CREDITS.md) — attribution and originality statement

## About the legacy app

`legacy/tracker/` is the German D&D companion/tracker that previously lived at
the repository root. It has been moved, not deleted, and still has its own
`package.json`; nothing in this project builds or imports it.

## Copyright

A personal, fan-made work. It admires gothic tabletop horror — mist, a valley
nobody leaves, a castle in the lightning — but every character, line, location,
creature and number in it is original. No published prose, map, illustration,
encounter text or complete stat block is reproduced. Not affiliated with or
endorsed by any tabletop publisher.
