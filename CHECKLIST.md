# Implementation checklist

Ticked when built, tested and visible in the running app.

## Milestones

- [x] 1 — Project foundation, browser preview, TypeScript strict, Vitest
- [x] 2 — Scene and state architecture (store, save, settings, scene router)
- [x] 3 — Inn vertical slice (exterior, taproom, cast, seven interactions)
- [x] 4 — Dialogue and dice systems (data-driven trees, physical d20)
- [x] 5 — Forest and shrine environments
- [x] 6 — Combat
- [x] 7 — Ending, finale card, credits
- [x] 8 — Audio and visual polish
- [x] 9 — Accessibility and settings
- [x] 10 — Testing, optimisation, deployment configuration

## Corvin

- [x] Sheet centralised in `src/data/corvin.ts`, nothing duplicated in components
- [x] Abilities, proficiency, HP, AC, initiative, speed, save DC, spell attack
- [x] Skills off the sheet; Perception and Arcana derived, with his own traits
- [x] Rapier and daggers, with the rapier framed as the fallback
- [x] Bardic Inspiration d6 ×3, allies only
- [x] Vicious Mockery — several context lines, psychic ripple, disadvantage
- [x] Message — private conversation, whisper treatment, spatial UI
- [x] Frostgrip — pale frost, blackened ice, chthonic rather than elemental
- [x] Thaumaturgy — amplified voice, flames leaning, a shutter opening itself
- [x] Healing Word — bonus action, revives a downed ally
- [x] Command — four words, save, distinct success and failure choreography
- [x] Dissonant Whispers — signature moment, whispers, distortion, violet
- [x] Disguise Self and Detect Magic shipped as disabled configuration entries
- [x] Common, Halfling, Draconic — Halfling and Draconic both open content
- [x] Thieves' tools open a box in Chapter One and another in Chapter Three
- [x] Two instruments visible; the lute is worn, held and played
- [x] Procedural 3D Corvin: horns, dusky skin, violet eyes, cloak, rapier, lute,
      medallion — not a capsule, not a stock knight
- [x] Animation set: breathe, look around, walk, hold/play lute, cast, strike,
      take damage, dialogue gestures

## Die Schwelle

- [x] Dedicated system: chill 0–1 and stage 0–3, on the run state
- [x] Gradual frost on the object and in screen space
- [x] Sound pulse and a HUD badge that reacts
- [x] Close-up inspection (`M`) with staged descriptions
- [x] Different reaction strengths per chapter and per event
- [x] Fingerprint in Chapter Two; unprecedented handprint at the ending
- [x] Never a quest marker or compass

## Experience

- [x] Animated title screen: medallion in darkness, candle in the glass, frost
      forming as the pointer approaches Begin
- [x] Begin / Continue / Settings / Controls / Credits
- [x] Chapter One — sunset, wet road, the inn, Emrik, two companions, the
      innkeeper, performing, eavesdropping, a locked box, the watcher, the wine,
      a seat facing the door
- [x] At least one optional check and one fail-forward outcome (there are eleven
      checks, and every one of them fails forward)
- [x] Chapter Two — birdsong stops, the path narrows, trees lean, fog arrives,
      tracks, the medallion cools, the road behind changes, two wolf calls
- [x] Chapter Two cinematic: the fingerprint forming inside the glass
- [x] Chapter Three — original broken shrine, struggle, dead traveller, Draconic
      warning, sealed box, evidence the fog steers people, something stalking
- [x] Chapter Three choices: investigate, comfort, search, unlock, leave, address
      the presence, draw it out with performance or deception
- [x] Chapter Four — one compact encounter, three enemies, two allies, four zones
- [x] Chapter Five — fog parts, road gone, pillars, still forest, coldest
      reaction yet, handprint, the Voice, one moment of control, the vanished
      road, "The Threshold will open.", credits over a broken lute string

## Systems

- [x] Data-driven dialogue: speakers, portraits/3D focus, conditions, checks,
      inventory and spell conditions, previous choices, disposition,
      fail-forward, auto-advance, keyboard and mouse
- [x] Choices written in Corvin's voice; silence offered as a real option
- [x] Physical d20: tumbling, tray, readable result, separate modifier, DC
      revealed at the right moment, critical and natural-one presentation,
      skip option, reduced-motion path, seeded deterministic mode
- [x] Combat: initiative, zones, action, bonus action, spell slots, inspiration,
      damage, healing, statuses, enemy saves, ally AI, enemy AI, target previews,
      visible roll breakdowns, combat log
- [x] Encounter winnable several ways; a companion can fall; retry on defeat
- [x] Cinematic camera for dialogue, medallion, dice, spells, combat, reveals
- [x] Audio: forest, rain, inn murmur, fire, footsteps, lute, whispers, wolves,
      spells, medallion, dice, UI — all synthesised, none before a gesture
- [x] Corvin's motif in four arrangements, including the broken credits version

## Interface and accessibility

- [x] Responsive down to a narrow window; designed at 1366×768
- [x] Full keyboard navigation and visible focus states
- [x] Subtitles for non-speech sounds
- [x] Text size, reduced motion, high contrast, screen-shake toggle
- [x] Skip dice animation
- [x] Pause menu, controls screen, character sheet, journal
- [x] Autosave indicator, LocalStorage save and settings
- [x] Restart chapter, restart experience, erase save
- [x] Custom cursor that opens over anything interactive

## Performance

- [x] Quality presets: Low, Medium, High
- [x] Instanced trees and particles
- [x] Shadow-map size, DPR and postprocessing driven by the preset
- [x] Lazy chapter chunks
- [x] Audio and the play-time loop pause when the tab is hidden
- [x] No asset downloads at all; total transfer well under a megabyte gzipped

## Polish details (target was ten; these are done)

1. [x] Animated title screen with a reactive medallion
2. [x] Loading progress plate between chapters
3. [x] Smooth scene and camera transitions, never a cut
4. [x] Candle flicker driving the light around it
5. [x] Wet-ground reflection (drei reflector on medium/high)
6. [x] Fog that reacts to the player's position along the road
7. [x] Trees moving subtly, and leaning inward as things worsen
8. [x] Corvin turning his head toward nearby points of interest
9. [x] Lute strings moving while he plays
10. [x] Cloak secondary motion, always a beat behind the body
11. [x] Contextual footsteps: wood, mud, stone
12. [x] Medallion frost spreading dynamically, in world and screen space
13. [x] Dialogue camera framing the midpoint of the conversation
14. [x] Physical d20 impacts driving audio gain and camera shake
15. [x] Critical-roll and natural-one presentation
16. [x] Spell-specific colour, sound and light treatment
17. [x] Enemy hit reactions and death dissolves
18. [x] Companion reactions and disposition
19. [x] Branching end-of-chapter summary
20. [x] Environmental storytelling (the nameless sign, the turning wheel, the
        boundary stone turned face down, the fire leaning away from the window)
21. [x] Custom cursor
22. [x] Purposeful menu transitions
23. [x] Credits with full attribution
24. [x] Hidden optional interactions (play to the watcher in the rain; the
        Draconic reply on the strongbox; sing for the dead courier)
25. [x] Post-completion title-screen change — the glass never clears again

## Verification

- [x] `npm run typecheck` clean
- [x] `npm run test` — 87 tests passing
- [x] `npm run build` succeeds
- [x] `node scripts/smoke.mjs` — full walkthrough, zero console errors
- [x] Manual smoke: new game, continue, dialogue, successful check, failed
      check, combat victory, combat defeat and retry, settings, save/reload,
      credits, narrow window
