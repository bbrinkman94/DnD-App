import { describe, expect, it } from 'vitest';
import { createRng, seedFromString } from './rng';
import {
  applyBonusDie,
  formatDamageDice,
  resolveAttack,
  resolveCheck,
  rollD20,
  rollDamage,
  rollDice,
  sum,
} from './dice';

describe('rng', () => {
  it('is deterministic for a given seed', () => {
    const a = createRng(1234);
    const b = createRng(1234);
    const seqA = Array.from({ length: 20 }, () => a.int(1, 20));
    const seqB = Array.from({ length: 20 }, () => b.int(1, 20));
    expect(seqA).toEqual(seqB);
  });

  it('produces different streams for different seeds', () => {
    const a = Array.from({ length: 20 }, ((r) => () => r.int(1, 20))(createRng(1)));
    const b = Array.from({ length: 20 }, ((r) => () => r.int(1, 20))(createRng(2)));
    expect(a).not.toEqual(b);
  });

  it('stays inside the requested range', () => {
    const r = createRng(seedFromString('the-threshold'));
    for (let i = 0; i < 5000; i++) {
      const value = r.int(1, 20);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(20);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it('eventually rolls every face of a d20', () => {
    const r = createRng(99);
    const seen = new Set<number>();
    for (let i = 0; i < 4000; i++) seen.add(r.int(1, 20));
    expect(seen.size).toBe(20);
  });
});

describe('d20 rolls', () => {
  it('adds the modifier to the natural roll', () => {
    const roll = rollD20(5, { forceNatural: 11 });
    expect(roll.natural).toBe(11);
    expect(roll.total).toBe(16);
    expect(roll.criticalSuccess).toBe(false);
    expect(roll.criticalFailure).toBe(false);
  });

  it('flags natural 20 and natural 1', () => {
    expect(rollD20(0, { forceNatural: 20 }).criticalSuccess).toBe(true);
    expect(rollD20(0, { forceNatural: 1 }).criticalFailure).toBe(true);
  });

  it('clamps a forced face into 1..20', () => {
    expect(rollD20(0, { forceNatural: 47 }).natural).toBe(20);
    expect(rollD20(0, { forceNatural: -3 }).natural).toBe(1);
  });

  it('takes the higher of two faces with advantage', () => {
    const rng = createRng(7);
    const roll = rollD20(2, { advantage: true, rng });
    expect(roll.faces).toHaveLength(2);
    expect(roll.natural).toBe(Math.max(...roll.faces));
    expect(roll.total).toBe(roll.natural + 2);
  });

  it('takes the lower of two faces with disadvantage', () => {
    const rng = createRng(7);
    const roll = rollD20(0, { disadvantage: true, rng });
    expect(roll.natural).toBe(Math.min(...roll.faces));
  });

  it('ignores advantage when disadvantage is also present', () => {
    const roll = rollD20(0, { advantage: true, disadvantage: true, rng: createRng(3) });
    expect(roll.advantage).toBe(false);
    expect(roll.disadvantage).toBe(false);
    expect(roll.faces).toHaveLength(1);
  });
});

describe('bardic inspiration die', () => {
  it('is added on top of an already-rolled d20', () => {
    const base = rollD20(3, { forceNatural: 9 });
    const boosted = applyBonusDie(base, 'Bardic Inspiration', 6, createRng(11));
    expect(boosted.bonusDice).toHaveLength(1);
    const die = boosted.bonusDice[0];
    expect(die.value).toBeGreaterThanOrEqual(1);
    expect(die.value).toBeLessThanOrEqual(6);
    expect(boosted.total).toBe(9 + 3 + die.value);
    expect(base.total).toBe(12); // original roll is untouched
  });

  it('stacks multiple bonus dice arithmetically', () => {
    let roll = rollD20(0, { forceNatural: 10 });
    roll = applyBonusDie(roll, 'Inspiration', 6, createRng(1));
    roll = applyBonusDie(roll, 'Guidance', 4, createRng(2));
    const bonusTotal = sum(roll.bonusDice.map((d) => d.value));
    expect(roll.total).toBe(10 + bonusTotal);
  });
});

describe('check resolution', () => {
  it('succeeds when the total meets the DC', () => {
    const result = resolveCheck(rollD20(5, { forceNatural: 10 }), 15);
    expect(result.success).toBe(true);
    expect(result.margin).toBe(0);
    expect(result.outcome).toBe('success');
  });

  it('fails just under the DC and reports the margin', () => {
    const result = resolveCheck(rollD20(2, { forceNatural: 10 }), 15);
    expect(result.success).toBe(false);
    expect(result.margin).toBe(-3);
    expect(result.outcome).toBe('failure');
  });

  it('treats a natural 20 as success even against an impossible DC', () => {
    const result = resolveCheck(rollD20(0, { forceNatural: 20 }), 30);
    expect(result.success).toBe(true);
    expect(result.outcome).toBe('critical-success');
  });

  it('treats a natural 1 as failure even with a huge modifier', () => {
    const result = resolveCheck(rollD20(20, { forceNatural: 1 }), 5);
    expect(result.success).toBe(false);
    expect(result.outcome).toBe('critical-failure');
  });
});

describe('attacks and damage', () => {
  it('hits when the total meets AC', () => {
    expect(resolveAttack(rollD20(4, { forceNatural: 9 }), 13).hit).toBe(true);
    expect(resolveAttack(rollD20(4, { forceNatural: 8 }), 13).hit).toBe(false);
  });

  it('always hits on a natural 20 and marks it critical', () => {
    const result = resolveAttack(rollD20(0, { forceNatural: 20 }), 25);
    expect(result.hit).toBe(true);
    expect(result.critical).toBe(true);
  });

  it('always misses on a natural 1', () => {
    expect(resolveAttack(rollD20(15, { forceNatural: 1 }), 5).hit).toBe(false);
  });

  it('doubles the dice on a critical, not the flat bonus', () => {
    const normal = rollDamage(1, 8, 2, 'piercing', { rng: createRng(5) });
    const crit = rollDamage(1, 8, 2, 'piercing', { critical: true, rng: createRng(5) });
    expect(normal.dice).toHaveLength(1);
    expect(crit.dice).toHaveLength(2);
    expect(crit.total).toBe(sum(crit.dice) + 2);
  });

  it('never deals negative damage', () => {
    const result = rollDamage(1, 4, -20, 'psychic', { rng: createRng(3) });
    expect(result.total).toBe(0);
  });

  it('rolls the requested number of dice within range', () => {
    const dice = rollDice(3, 6, createRng(42));
    expect(dice).toHaveLength(3);
    dice.forEach((d) => {
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(6);
    });
  });

  it('formats dice notation for the UI', () => {
    expect(formatDamageDice(1, 8, 2)).toBe('1d8 + 2');
    expect(formatDamageDice(3, 6, 0)).toBe('3d6');
    expect(formatDamageDice(1, 4, -1)).toBe('1d4 − 1');
  });
});
