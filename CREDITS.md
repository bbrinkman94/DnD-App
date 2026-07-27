# Credits &amp; attribution

**The Threshold: A Corvin Vaelthorne Prologue.** A personal, fan-made,
non-commercial browser experience.

## Written and built by

Bastian Brinkman, with Claude Code as lead engineer/designer on the
implementation. Every line of dialogue, every character, every location and every
encounter number in this project is original to it.

## Assets

There are none. That is not a shortcut — it is the constraint the project was
built under, and it is why the whole thing is a few hundred kilobytes.

| Thing | Where it comes from |
| --- | --- |
| Characters, creatures, props, ruins, the d20 | Geometry generated at runtime from three.js primitives (`src/characters/`, `src/scenes/props.tsx`, `src/three/d20Mesh.ts`) |
| Wood, stone, ground, parchment, frost, the medallion face, the fingerprint, the handprint, the die's numbers | Painted procedurally into a `<canvas>` at load (`src/three/textures.ts`) |
| Ambience, footsteps, fire, doors, dice impacts, wolves, spells, UI | Synthesised with the Web Audio API (`src/audio/engine.ts`) |
| Music | Corvin's five-note motif, plucked on a Karplus–Strong string, four arrangements (`src/audio/motif.ts`) |
| Typography | The system serif and humanist sans stacks (Iowan Old Style / Palatino / Georgia; Optima / Segoe UI / Gill Sans). No web fonts are downloaded. |
| Icon | An original SVG in `public/assets/ui/favicon.svg` |

No third-party model, image, sample, font or shader is bundled, hotlinked or
downloaded at runtime. No CDN is contacted. The application makes no network
requests after the initial page load.

## Software

Open-source libraries used, with thanks:

| Library | Licence |
| --- | --- |
| [React](https://react.dev) | MIT |
| [three.js](https://threejs.org) | MIT |
| [React Three Fiber](https://github.com/pmndrs/react-three-fiber) | MIT |
| [@react-three/drei](https://github.com/pmndrs/drei) | MIT |
| [@react-three/postprocessing](https://github.com/pmndrs/react-postprocessing) and [postprocessing](https://github.com/pmndrs/postprocessing) | MIT / Zlib |
| [Zustand](https://github.com/pmndrs/zustand) | MIT |
| [Vite](https://vitejs.dev) | MIT |
| [TypeScript](https://www.typescriptlang.org) | Apache-2.0 |
| [Vitest](https://vitest.dev) | MIT |
| [Playwright](https://playwright.dev) (optional, dev only) | Apache-2.0 |

## Originality statement

The Threshold is an admirer of gothic tabletop horror — mist that will not let
you leave, a valley with one road, a silhouette on a ridge during lightning. It
is not a reproduction of any of it.

Specifically, this project contains **no**:

- prose, boxed text or read-aloud text from any published adventure
- official maps, floor plans or reproductions of them
- official illustrations, logos, trade dress or typefaces
- published encounter text or complete stat blocks
- scraped or unlicensed fan assets

The rules vocabulary it uses — ability scores, a d20, proficiency, saving
throws, spell slots — is game mechanics, not protected expression, and it is
implemented from scratch here in a deliberately reduced form.

Corvin Vaelthorne, Nell Grubbin, Ansbeth Cray, Emrik Waldenfels, Tovin, the Grey
Petitioner, the Voice in the Mist, Die Schwelle, the Order of the Pure Flame, the
nameless inn and the broken toll-shrine are original creations of this project.

Not affiliated with, sponsored by, or endorsed by any tabletop roleplaying
publisher.

## Licence

The code is available for personal, non-commercial use. The characters, writing
and setting details belong to their author.
