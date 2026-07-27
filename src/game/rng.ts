/**
 * Seedable random source.
 *
 * Every roll in the game goes through an `Rng` instance.  In normal play the
 * instance is seeded from `Date.now()`; in tests (and in the URL-flag
 * deterministic mode) it is seeded explicitly, which makes dice, saving throws,
 * enemy AI and loot all reproducible.
 */

export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  /** Current internal state — used to persist a run's randomness in saves. */
  state(): number;
}

/** mulberry32: tiny, fast, good enough for dice, fully deterministic. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => items[Math.floor(next() * items.length)],
    state: () => a >>> 0,
  };
}

/** Hash an arbitrary string into a seed, so `?seed=inn-crit` works. */
export function seedFromString(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * The process-wide roll source.  Replaceable so a test — or the `?seed=` flag —
 * can pin every subsequent roll.
 */
let ambient: Rng = createRng((Date.now() ^ 0x9e3779b9) >>> 0);

export function setAmbientRng(rng: Rng): void {
  ambient = rng;
}

export function seedAmbientRng(seed: number | string): void {
  ambient = createRng(typeof seed === 'string' ? seedFromString(seed) : seed);
}

export function rng(): Rng {
  return ambient;
}
