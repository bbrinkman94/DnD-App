/**
 * Encounter balance is a design decision, so it gets a test.
 *
 * These sweeps play the fight many times with different strategies and assert
 * the shape we want: winnable several ways, losable if you ignore your allies,
 * and short enough to stay inside a 15–25 minute slice.
 */

import { describe, expect, it } from 'vitest';
import { totalSlots } from '@/game/save';
import { createCombat, currentActor, livingEnemies, performPlayerAction, runAiTurn, zonesAdjacent } from './engine';
import type { CombatState } from './types';

type Strategy = (state: CombatState) => CombatState;

function play(seed: number, strategy: Strategy): CombatState {
  let state = createCombat({ seed, corvinHp: 10, slotsUsed: 0, inspirationUsed: 0, allies: ['nell', 'ansbeth'] });
  let guard = 0;
  while (state.outcome === 'ongoing' && guard++ < 300) {
    state = currentActor(state).id === 'corvin' ? strategy(state) : runAiTurn(state).state;
  }
  return state;
}

const downedAlly = (state: CombatState): string | undefined =>
  Object.values(state.actors).find((a) => a.side === 'ally' && a.downed && a.id !== 'corvin')?.id;

const caster: Strategy = (state) => {
  let s = state;
  const down = downedAlly(s);
  if (down && s.resources.slotsUsed < totalSlots()) {
    s = performPlayerAction(s, { kind: 'spell', spellId: 'healingWord', targetId: down }).state;
  } else if (s.resources.inspirationUsed < 3) {
    s = performPlayerAction(s, { kind: 'inspire', targetId: 'ansbeth' }).state;
  }
  const enemy = livingEnemies(s).sort((a, b) => a.hp - b.hp)[0];
  if (enemy) {
    s =
      s.resources.slotsUsed < totalSlots() && enemy.hp > 6
        ? performPlayerAction(s, { kind: 'spell', spellId: 'dissonantWhispers', targetId: enemy.id }).state
        : performPlayerAction(s, { kind: 'spell', spellId: 'viciousMockery', targetId: enemy.id }).state;
  }
  return performPlayerAction(s, { kind: 'endTurn' }).state;
};

const duellist: Strategy = (state) => {
  let s = state;
  const reachable = livingEnemies(s).filter((e) => zonesAdjacent(s.actors.corvin.zone, e.zone));
  if (reachable.length > 0) {
    s = performPlayerAction(s, { kind: 'attack', weaponId: 'rapier', targetId: reachable.sort((a, b) => a.hp - b.hp)[0].id }).state;
  } else {
    const enemy = livingEnemies(s)[0];
    if (enemy) s = performPlayerAction(s, { kind: 'move', to: enemy.zone }).state;
  }
  return performPlayerAction(s, { kind: 'endTurn' }).state;
};

const idler: Strategy = (state) => performPlayerAction(state, { kind: 'endTurn' }).state;

function winRate(strategy: Strategy, seeds = 80): number {
  let wins = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    if (play(seed * 13, strategy).outcome === 'victory') wins++;
  }
  return wins / seeds;
}

describe('encounter balance', () => {
  it('is comfortably winnable by playing Corvin as a caster and healer', () => {
    expect(winRate(caster)).toBeGreaterThan(0.6);
  });

  it('is also winnable with the rapier, if less reliably', () => {
    expect(winRate(duellist)).toBeGreaterThan(0.35);
  });

  it('can be lost, so the retry path matters', () => {
    expect(winRate(idler, 40)).toBeLessThan(0.75);
  });

  it('always terminates and never ends ongoing', () => {
    for (const seed of [1, 42, 777, 9001]) {
      const state = play(seed, caster);
      expect(state.outcome).not.toBe('ongoing');
      expect(state.round).toBeLessThan(25);
    }
  });
});
