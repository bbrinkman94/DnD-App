/**
 * Save / load.
 *
 * One LocalStorage key, one versioned envelope, one migration path.  Anything
 * unreadable is treated as "no save" rather than crashing the title screen —
 * a corrupt save must never lock the player out of their own game.
 */

import { COMPANION_IDS, type CompanionId } from '@/data/characters';
import { CORVIN } from '@/data/corvin';

export type ChapterId = 'inn' | 'road' | 'shrine' | 'encounter' | 'gate';

export const CHAPTER_ORDER: ChapterId[] = ['inn', 'road', 'shrine', 'encounter', 'gate'];

export const CHAPTER_TITLES: Record<ChapterId, { index: string; title: string }> = {
  inn: { index: 'Chapter One', title: 'The Nameless Inn' },
  road: { index: 'Chapter Two', title: 'The Road and the Mist' },
  shrine: { index: 'Chapter Three', title: 'The Broken Shrine' },
  encounter: { index: 'Chapter Four', title: 'The Encounter' },
  gate: { index: 'Chapter Five', title: 'Beyond the Gate' },
};

export type FlagValue = boolean | number | string;

export interface CompanionState {
  met: boolean;
  disposition: number;
  recruited: boolean;
}

export interface RunState {
  chapter: ChapterId;
  /** Where inside the chapter we resume from. */
  checkpoint: string;
  hp: number;
  slotsUsed: number;
  inspirationUsed: number;
  flags: Record<string, FlagValue>;
  clues: string[];
  companions: Record<CompanionId, CompanionState>;
  medallionChill: number;
  /** 0 none, 1 fogging, 2 fingerprint, 3 handprint from inside. */
  medallionStage: number;
  choices: { chapter: ChapterId; label: string }[];
  completed: boolean;
  playSeconds: number;
}

export interface SaveEnvelope {
  version: number;
  savedAt: number;
  run: RunState;
  /** Set once the player has reached the credits — the title screen changes. */
  everCompleted: boolean;
}

export const SAVE_KEY = 'threshold.save.v2';
/** v1 lived here during early development; migrated on read, then removed. */
export const LEGACY_SAVE_KEY = 'threshold.save.v1';
export const SAVE_VERSION = 2;

export function createRunState(): RunState {
  return {
    chapter: 'inn',
    checkpoint: 'start',
    hp: CORVIN.maxHp,
    slotsUsed: 0,
    inspirationUsed: 0,
    flags: {},
    clues: [],
    companions: Object.fromEntries(
      COMPANION_IDS.map((id) => [id, { met: false, disposition: 0, recruited: false }]),
    ) as Record<CompanionId, CompanionState>,
    medallionChill: 0,
    medallionStage: 0,
    choices: [],
    completed: false,
    playSeconds: 0,
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Turn arbitrary parsed JSON into a valid RunState, keeping whatever is sane and
 * defaulting the rest.  Never throws.
 */
export function sanitizeRun(input: unknown): RunState {
  const base = createRunState();
  if (!isRecord(input)) return base;

  const chapter = CHAPTER_ORDER.includes(input.chapter as ChapterId)
    ? (input.chapter as ChapterId)
    : base.chapter;

  const flags: Record<string, FlagValue> = {};
  if (isRecord(input.flags)) {
    for (const [key, value] of Object.entries(input.flags)) {
      if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
        flags[key] = value;
      }
    }
  }

  const companions = { ...base.companions };
  if (isRecord(input.companions)) {
    for (const id of COMPANION_IDS) {
      const entry = input.companions[id];
      if (!isRecord(entry)) continue;
      companions[id] = {
        met: entry.met === true,
        recruited: entry.recruited === true,
        disposition: clampNumber(entry.disposition, -3, 5, 0),
      };
    }
  }

  const choices = Array.isArray(input.choices)
    ? input.choices
        .filter(
          (c): c is { chapter: ChapterId; label: string } =>
            isRecord(c) &&
            typeof c.label === 'string' &&
            CHAPTER_ORDER.includes(c.chapter as ChapterId),
        )
        .slice(0, 60)
    : [];

  return {
    chapter,
    checkpoint: typeof input.checkpoint === 'string' ? input.checkpoint : base.checkpoint,
    hp: clampNumber(input.hp, 0, CORVIN.maxHp, CORVIN.maxHp),
    slotsUsed: clampNumber(input.slotsUsed, 0, totalSlots(), 0),
    inspirationUsed: clampNumber(input.inspirationUsed, 0, CORVIN.bardicInspiration.uses, 0),
    flags,
    clues: Array.isArray(input.clues)
      ? Array.from(new Set(input.clues.filter((c): c is string => typeof c === 'string'))).slice(0, 60)
      : [],
    companions,
    medallionChill: clampNumber(input.medallionChill, 0, 1, 0),
    medallionStage: clampNumber(input.medallionStage, 0, 3, 0),
    choices,
    completed: input.completed === true,
    playSeconds: clampNumber(input.playSeconds, 0, 1e7, 0),
  };
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function totalSlots(): number {
  return CORVIN.spellSlots.reduce((a, s) => a + s.count, 0);
}

export function serializeSave(run: RunState, everCompleted: boolean): string {
  const envelope: SaveEnvelope = {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    run,
    everCompleted,
  };
  return JSON.stringify(envelope);
}

/**
 * Accepts current-version envelopes, v1 envelopes (migrated), and even a bare
 * run object written by a very early build.
 */
export function deserializeSave(raw: string | null): SaveEnvelope | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;

  // v1 -> v2: `progress` was renamed to `run`, and `medallionStage` did not exist.
  const runSource = isRecord(parsed.run) ? parsed.run : isRecord(parsed.progress) ? parsed.progress : parsed;
  const run = sanitizeRun(runSource);
  if (run.medallionStage === 0 && run.medallionChill > 0.66) run.medallionStage = 2;

  return {
    version: SAVE_VERSION,
    savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
    run,
    everCompleted: parsed.everCompleted === true || run.completed,
  };
}

export function writeSave(run: RunState, everCompleted: boolean): boolean {
  try {
    localStorage.setItem(SAVE_KEY, serializeSave(run, everCompleted));
    return true;
  } catch {
    return false;
  }
}

export function readSave(): SaveEnvelope | null {
  try {
    const current = deserializeSave(localStorage.getItem(SAVE_KEY));
    if (current) return current;
    const legacy = deserializeSave(localStorage.getItem(LEGACY_SAVE_KEY));
    if (legacy) {
      localStorage.setItem(SAVE_KEY, serializeSave(legacy.run, legacy.everCompleted));
      localStorage.removeItem(LEGACY_SAVE_KEY);
      return legacy;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(LEGACY_SAVE_KEY);
  } catch {
    /* ignore */
  }
}

export function hasSave(): boolean {
  return readSave() !== null;
}
