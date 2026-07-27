# Architecture

How The Threshold is put together, and why it is put together that way.

## The shape of it

```
index.html
  └── src/main.tsx
        └── App.tsx                     phases: title | playing | credits
              ├── <Canvas>              one WebGL context for the world
              │     └── SceneRouter     lazy chapter chunks
              │           └── Inn / Road / Shrine / Gate
              │                 ├── SceneAtmosphere   fog + key light per location
              │                 ├── CameraRig         one camera, eight framings
              │                 ├── props / cast      generated geometry
              │                 └── PostFx            bloom, vignette, aberration, grain
              └── overlay               HUD, dialogue, dice, combat, menus (plain DOM)
```

Two more WebGL contexts exist, deliberately small and deliberately separate: the
**dice tray** and the **medallion**. Both are self-contained canvases that can be
shown over any scene, or on the title screen, without touching the world.

## Layering

The project has three layers and one rule: **the layer below never knows about
the layer above.**

1. **Data** (`src/data/`) — plain objects. Corvin's sheet, spells, the cast, the
   encounter, the zones. No logic, no imports from anywhere else except types.
2. **Engines** (`src/game/`, `src/dialogue/engine.ts`, `src/combat/engine.ts`) —
   pure functions over that data. They take state, return new state plus a list
   of *signals* or *events* describing what happened. No React, no DOM, no audio.
3. **Presentation** (`src/components/`, `src/scenes/`, `src/audio/`) — reads
   state, plays events, sends intents back.

The store (`src/game/store.ts`) is the seam. It calls engines, applies their
results, and turns their signals into sound, camera cues and scene changes.

Why: everything that can be got wrong — a modifier, a slot, an initiative order,
a dialogue condition — lives in a function that a test can call directly. 87
tests do exactly that, and none of them need a browser.

## The d20

This is the piece with the most opinion in it.

**The number is decided before the die is thrown.** `game/dice.ts` rolls a
seeded d20, itemises the modifier, compares against the DC and produces a result.
Only then does `game/dicePhysics.ts` start a simulation.

`DiceSim` is a purpose-built rigid-body integrator for exactly one object:
gravity, restitution, tangential friction, angular drag, four tray walls. It
tumbles honestly and reports every impact (used for audio gain and camera shake).
When it comes to rest — or after a hard time limit, so nothing can hang — it
spends 0.36 s slerping from its own resting orientation into the one that shows
the intended face. On screen that reads as the die settling. Mathematically it is
a short blend.

`game/d20Geometry.ts` is the single source of truth for the solid: twelve
vertices, twenty faces, twenty outward normals, and a numbering that puts
opposite faces on numbers summing to 21. `three/d20Mesh.ts` builds the mesh from
that same table and gives each triangle the atlas cell carrying its printed
number. Face index, physical normal and painted number therefore cannot drift
apart — a test asserts it for all twenty faces across four seeds each.

**Why not a physics engine?** `@react-three/rapier` was the obvious candidate and
was rejected on purpose: steering a settle is awkward against a general solver,
WASM adds a payload and a load-order dependency, and none of it can run inside
`vitest` without a browser. A 200-line integrator gives a genuinely simulated
throw, exact determinism from a seed, a testable settle, and zero bytes of
dependency. The trade is that it simulates one die in one tray, which is all this
experience needs.

## Dialogue

Trees are data (`src/dialogue/trees/*.ts`). A node has lines and optionally
choices; a choice may carry a condition, a spell, a skill check, effects and a
destination.

- `evaluateCondition` answers *may Corvin say this* — flags, clues, disposition,
  languages, tools, spell slots, medallion chill, chapter, and boolean
  combinators.
- `prepareChoices` returns choices with an availability flag and a reason.
  Unavailable choices stay **visible and locked** by default, because seeing the
  door you cannot open is part of playing an observant character.
- `applyEffects` returns a new run state and a list of signals (`sfx`, `music`,
  `chapter`, `startCombat`, `endChapter`, `ending`). It never acts.
- `validateTree` walks every link. The test suite runs it over every shipped tree
  so a typo in a node id fails CI rather than the player.

Skill checks are fail-forward by construction: a check names *two* destination
nodes, and the failure node is required to be different from the success node.
Failing the Perception check on Emrik's hands does not delete the scene — it
gives you the medallion going cold instead, which is worse and better.

## Combat

Four readable zones (`front`, `cover`, `rear`, `high`) with an adjacency graph,
AC and offence modifiers, and world positions the scene uses to place everyone.
Each turn is one action, one bonus action, one move.

The engine exposes `performPlayerAction`, `runAiTurn` and `endTurn`; each returns
a new state plus events. Events carry roll records — including every enemy saving
throw — so the interface can show the arithmetic instead of asserting outcomes.

Targeting AI lives in one function, `threat()`, because the encounter's whole
texture is one asymmetry: the wolves fight what is in their teeth (the armoured
guard), while the shade is *drawn* to the medallion around Corvin's neck. Moving
to cover changes who the shade prefers, which is the tactical lesson the
encounter teaches.

`combat/balance.test.ts` plays the fight eighty times per strategy and asserts
the shape: comfortably winnable as a caster/healer, winnable but riskier with the
rapier, losable if you ignore your allies, always terminating.

## The medallion

One component (`components/Medallion.tsx`) rendered at three sizes: the title
screen, a 62-pixel HUD badge and a full-screen inspection. Its entire state is
two numbers on the run — `medallionChill` (0…1) and `medallionStage` (0–3) — so
it cannot get out of sync with itself.

Chill drives: the frost overlay on the object, a screen-space frost vignette in
the HUD, the strength of the cold rim light on Corvin, the chromatic-aberration
amount in the postprocessing chain, and an Arcana bonus in `game/checks.ts`.
Stage drives what is behind the glass: nothing, fog, a fingerprint, a hand.

Chill only ever rises. That is deliberate — the player is supposed to learn to
dislike the HUD badge.

## Rendering and performance

- One `<Canvas>` for the world; scenes are lazy chunks so the inn does not also
  download the shrine.
- Trees and particles are instanced; the tree count, particle count, shadow-map
  size, device pixel ratio and whether postprocessing runs at all come from
  `QUALITY_PROFILES` in `game/settings.ts`.
- The wet ground uses drei's reflector on medium/high and a plain textured
  material on low — same composition, different cost.
- Postprocessing is four passes and stops there.
- Audio suspends and the play-time loop pauses when the tab is hidden.
- Every texture is memoised in `three/textures.ts`; a canvas is painted once per
  session, never per frame.

## Audio

`audio/engine.ts` is a small synthesiser. Ambience is filtered noise beds with
slow LFOs; one-shots are oscillator and noise envelopes; the lute is a
Karplus–Strong string rendered into a buffer once per pitch and cached.

Corvin's motif (`audio/motif.ts`) is five notes in D Phrygian with four
treatments: warm on the lute in the inn, thin and slow on the road, sharpened and
detuned during Dissonant Whispers, and broken over the credits with one string a
semitone flat. It is the same array of notes every time.

Nothing starts before `unlock()`, which only runs from a real pointer or key
event.

## Saving

`game/save.ts` owns one key and one versioned envelope. `sanitizeRun` rebuilds a
valid run from arbitrary parsed JSON, clamping every number and dropping anything
it does not recognise; `deserializeSave` additionally accepts the older v1
envelope and a bare run object from an early build. Nothing in the load path
throws — a corrupt save reads as "no save", and the title screen simply does not
offer Continue.

## What is deliberately absent

- No general-purpose engine, entity system or scene graph abstraction. Four
  scenes did not need one.
- No grid, no line of sight, no opportunity attacks, no death saves. The
  encounter is four zones and one asymmetry.
- No asset pipeline, because there are no assets.
- No routing, no state persistence library, no CSS framework.
