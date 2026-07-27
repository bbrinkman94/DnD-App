/**
 * Dice mathematics.
 *
 * The 3D die is a *presentation* of these numbers, never their source: the
 * result is decided here first, then the physics simulation is steered to land
 * on it.  That keeps outcomes reliable (and testable) while the die on screen
 * really does tumble.
 */

import { rng as ambientRng, type Rng } from './rng';

export interface BonusDie {
  label: string;
  sides: number;
  value: number;
}

export interface D20Roll {
  /** The raw d20 face, before anything is added. */
  natural: number;
  /** Both faces when rolled with advantage/disadvantage, else just the one. */
  faces: number[];
  modifier: number;
  bonusDice: BonusDie[];
  total: number;
  advantage: boolean;
  disadvantage: boolean;
  criticalSuccess: boolean;
  criticalFailure: boolean;
}

export interface RollOptions {
  advantage?: boolean;
  disadvantage?: boolean;
  rng?: Rng;
  /** Force the natural face. Used by the seeded/deterministic test mode. */
  forceNatural?: number;
}

export function rollDie(sides: number, rng: Rng = ambientRng()): number {
  return rng.int(1, sides);
}

export function rollDice(count: number, sides: number, rng: Rng = ambientRng()): number[] {
  return Array.from({ length: count }, () => rollDie(sides, rng));
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function rollD20(modifier: number, options: RollOptions = {}): D20Roll {
  const rng = options.rng ?? ambientRng();
  const advantage = !!options.advantage && !options.disadvantage;
  const disadvantage = !!options.disadvantage && !options.advantage;

  const faces =
    options.forceNatural !== undefined
      ? [clampFace(options.forceNatural)]
      : advantage || disadvantage
        ? [rollDie(20, rng), rollDie(20, rng)]
        : [rollDie(20, rng)];

  const natural = advantage ? Math.max(...faces) : disadvantage ? Math.min(...faces) : faces[0];

  return {
    natural,
    faces,
    modifier,
    bonusDice: [],
    total: natural + modifier,
    advantage,
    disadvantage,
    criticalSuccess: natural === 20,
    criticalFailure: natural === 1,
  };
}

function clampFace(value: number): number {
  return Math.min(20, Math.max(1, Math.round(value)));
}

/**
 * Bardic Inspiration is added *after* the d20 is seen — that is the whole point
 * of the ability, and the reason the inspiration die gets its own roll on screen.
 */
export function applyBonusDie(roll: D20Roll, label: string, sides: number, rng: Rng = ambientRng()): D20Roll {
  const value = rollDie(sides, rng);
  const bonusDice = [...roll.bonusDice, { label, sides, value }];
  return {
    ...roll,
    bonusDice,
    total: roll.natural + roll.modifier + sum(bonusDice.map((d) => d.value)),
  };
}

export interface CheckResult {
  roll: D20Roll;
  dc: number;
  success: boolean;
  /** How far over or under the DC — drives "fail forward" severity. */
  margin: number;
  /** Natural 20 / natural 1 override the arithmetic for presentation. */
  outcome: 'critical-success' | 'success' | 'failure' | 'critical-failure';
}

/**
 * Skill checks: a natural 20 always reads as a critical success and a natural 1
 * as a critical failure for *presentation and narrative branching*, while the
 * arithmetic still decides plain success or failure.
 */
export function resolveCheck(roll: D20Roll, dc: number): CheckResult {
  const success = roll.criticalSuccess ? true : roll.criticalFailure ? false : roll.total >= dc;
  return {
    roll,
    dc,
    success,
    margin: roll.total - dc,
    outcome: roll.criticalSuccess
      ? 'critical-success'
      : roll.criticalFailure
        ? 'critical-failure'
        : success
          ? 'success'
          : 'failure',
  };
}

/** Attack rolls: a natural 20 hits and doubles the damage dice. */
export interface AttackResult {
  roll: D20Roll;
  targetAc: number;
  hit: boolean;
  critical: boolean;
}

export function resolveAttack(roll: D20Roll, targetAc: number): AttackResult {
  return {
    roll,
    targetAc,
    hit: roll.criticalSuccess ? true : roll.criticalFailure ? false : roll.total >= targetAc,
    critical: roll.criticalSuccess,
  };
}

export interface DamageRoll {
  dice: number[];
  bonus: number;
  total: number;
  critical: boolean;
  type: string;
}

export function rollDamage(
  count: number,
  sides: number,
  bonus: number,
  type: string,
  options: { critical?: boolean; rng?: Rng } = {},
): DamageRoll {
  const rng = options.rng ?? ambientRng();
  const critical = !!options.critical;
  const dice = rollDice(critical ? count * 2 : count, sides, rng);
  return {
    dice,
    bonus,
    total: Math.max(0, sum(dice) + bonus),
    critical,
    type,
  };
}

/** "1d8 + 2" — used in tooltips and the combat log. */
export function formatDamageDice(count: number, sides: number, bonus: number): string {
  const base = `${count}d${sides}`;
  if (bonus === 0) return base;
  return `${base} ${bonus > 0 ? '+' : '−'} ${Math.abs(bonus)}`;
}
