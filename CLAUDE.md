# CLAUDE.md — working notes for this repository

## What this is

**The Threshold: A Corvin Vaelthorne Prologue.** A browser-based 3D gothic-horror
vertical slice, 15–25 minutes long, starring one specific tabletop character. It
is a *finished small thing*, not the first slice of a large thing: five chapters,
one combat encounter, one mystery, one cliffhanger.

The repository root is this project. `legacy/tracker/` holds the previous German
D&D companion app that used to live at the root — it is untouched, still has its
own `package.json`, and is not part of this build.

## Stack

Vite · TypeScript (strict) · React 18 · three.js via React Three Fiber ·
`@react-three/drei` · `@react-three/postprocessing` · Zustand · Vitest.

No backend, no API keys, no database, no auth. Everything runs as static files.

## Commands

```bash
npm install
npm run dev         # dev server on 0.0.0.0:5173
npm run typecheck   # tsc -b --force
npm run test        # vitest run
npm run build       # tsc -b && vite build  -> dist/
npm run preview     # serve dist/
npm run verify      # typecheck + test + build, in that order
node scripts/smoke.mjs   # optional Playwright walkthrough (see README)
```

## Architecture

| Path | Holds |
| --- | --- |
| `src/data/` | Corvin's sheet, spells, cast, encounter. **All tunable numbers live here.** |
| `src/game/` | rng, dice maths, d20 geometry, dice physics, checks, save, settings, store, debug API |
| `src/dialogue/` | types, pure engine, and the dialogue trees per chapter |
| `src/combat/` | combat types, engine (rules + AI), balance tests |
| `src/characters/` | the procedural character rig and the dressed cast |
| `src/scenes/` | the four playable scenes, camera rig, atmosphere, props, exploration |
| `src/scenes/layout.ts` | **where the player may stand and what they may touch** — bounds, obstacles and interaction points, kept as data so `reachability.test.ts` can prove every point is actually reachable |
| `src/components/` | all interface: title, HUD, dialogue, dice, combat, menus, medallion |
| `src/audio/` | the Web Audio synthesis engine and Corvin's motif |
| `src/three/` | palette, procedural textures, d20 mesh builder |
| `src/styles/` | `theme.css` (identity, custom properties) and `ui.css` (layout) |
| `public/assets/` | favicon only — everything else is generated at runtime |

Rules of the codebase:

1. **Data files are authoritative.** If a number appears in a component, it is a
   bug. Ability scores, damage dice, DCs, HP, AC, spell slots, disposition
   thresholds and encounter statistics all come from `src/data/`.
2. **Engines are pure.** `dialogue/engine.ts` and `combat/engine.ts` take state
   and return new state plus signals/events. They never touch React, audio or
   the DOM. That is what makes them testable.
3. **The store sequences, it does not decide.** `game/store.ts` calls the
   engines and plays their results.
4. **The die is a presentation.** `game/dice.ts` decides the number first;
   `game/dicePhysics.ts` throws a real rigid body and steers only the last 0.36s
   of the settle so the correct face lands up. Never invert that order.
5. **No third-party assets.** No models, no images, no audio files, no web fonts,
   no CDN. Geometry is built from primitives, textures are painted into a canvas,
   sound is synthesised.

## Character facts that must stay consistent

- Corvin Vaelthorne. Level 1 chthonic tiefling bard, Wanderer background,
  Chaotic Good with grey edges. **Not** secretly evil, never a traitor.
- STR 8 · DEX 15 · CON 14 · INT 10 · WIS 10 · CHA 17. Prof +2. HP 10. AC 13.
  Init +2. Speed 9 m. Passive Perception 10. Spell save DC 13. Spell attack +5.
  Bardic Inspiration d6 ×3. Two level-one slots.
- Skills off the sheet: Deception +5, Performance +3, Intimidation +3,
  Persuasion +3, Acrobatics +2, Sleight of Hand +2, Stealth +2. Saves: DEX, CHA.
- Rapier +4, 1d8+2 piercing. Two daggers +4, 1d4+2 piercing. The rapier is his
  fallback, never his opening move.
- Cantrips: Vicious Mockery, Message, Frostgrip, Thaumaturgy. Level one: Healing
  Word, Command, Dissonant Whispers. Disguise Self and Detect Magic ship
  **disabled** in `spells.ts` and must stay that way unless asked.
- Languages: Common, Halfling, Draconic. Tools: thieves' tools, dice set.
  Instruments: lute (primary), pan flute, horn.
- Appearance: slender, elegant, fine features, knowing smile, faint shadows under
  the eyes, dark hair, **backward-curving** horns, dusky red skin, reddish-violet
  eyes, dark travelling cloak, worn gothic clothes, rapier at the hip, lute on his
  back, medallion visible. Clearly a tiefling, never a caricature.
- Ideal: *Ancestry is not destiny.* Fear: that the voices are calling, not warning.
- Voice: charming, witty, theatrical **under control**, observant, melancholic
  underneath, black humour used sparingly. He listens before he speaks and sits
  where he can see the door.
- Die Schwelle: small oval blackened-silver medallion, closed door under three
  stars, milky glass centre. Goes cold near recent death and strong magic.
  Stages: 0 nothing · 1 the glass fogs · 2 a fingerprint · 3 a hand, from the
  inside. It is never a quest compass.

## Quality standards

- No placeholder art, no capsule Corvin, no "TODO" in shipped paths.
- 1366×768 must work before anything larger.
- Keyboard-only play must work end to end; focus states must be visible.
- No console errors. `npm run verify` must pass before a commit.
- Frame budget: medium preset targets a normal laptop. Postprocessing stays at
  bloom + vignette + chromatic aberration + film grain, nothing more.

## Browser-only constraint

Everything must be doable from a hosted browser session: no local installs, no
Blender/Unity, no native binaries, no asset pipeline. If a feature needs a tool
that cannot run in this environment, find a procedural way to do it instead.

## Testing requirements

`npm run test` covers: dice maths, modifiers, criticals, check resolution,
advantage/disadvantage, the dice simulation landing on every face from many
seeds, spell-slot spending, Bardic Inspiration (including that Corvin cannot
inspire himself), damage and healing, turn order, combat balance across
strategies, dialogue conditions and effects, tree link validation, save
serialisation, migration and corrupt-save handling.

Add a test with every rule change. If a rule cannot be tested, it is in the wrong
file.

**Spatial rule:** an interaction point the player cannot physically stand near is
invisible — the prompt never appears and the chapter cannot be finished. Movement
bounds, collision circles and interaction radii therefore live in
`src/scenes/layout.ts` as data, and `reachability.test.ts` replays the movement
resolution over a grid to prove every point is reachable with at least 0.3 m of
slack. Never inline those numbers back into a scene component.

## Copyright

Fan-made and original. It may reference broad gothic-setting furniture (mist,
Barovia-flavoured dread) but reproduces **no** published prose, map, artwork,
encounter text or complete stat block.
