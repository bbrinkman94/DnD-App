import { describe, expect, it } from 'vitest';
import { CORVIN } from '@/data/corvin';
import { totalSlots } from '@/game/save';
import {
  createCombat,
  currentActor,
  effectiveAc,
  endTurn,
  hasStatus,
  livingEnemies,
  performPlayerAction,
  runAiTurn,
  zonesAdjacent,
} from './engine';
import type { CombatState } from './types';

function newFight(seed = 1234): CombatState {
  return createCombat({ seed, corvinHp: CORVIN.maxHp, slotsUsed: 0, inspirationUsed: 0, allies: ['nell', 'ansbeth'] });
}

/** Advance until it is Corvin's turn again (or the fight ends). */
function toCorvinTurn(state: CombatState, limit = 60): CombatState {
  let s = state;
  let guard = 0;
  while (s.outcome === 'ongoing' && currentActor(s).id !== 'corvin' && guard++ < limit) {
    s = runAiTurn(s).state;
  }
  return s;
}

describe('combat setup', () => {
  it('puts everyone in the initiative order exactly once', () => {
    const state = newFight();
    expect(state.order).toHaveLength(6);
    expect(new Set(state.order).size).toBe(6);
    expect(Object.keys(state.actors).sort()).toEqual(
      ['ansbeth', 'corvin', 'nell', 'shade', 'wolf-a', 'wolf-b'].sort(),
    );
  });

  it('sorts initiative from highest to lowest', () => {
    const state = newFight(99);
    const values = state.order.map((id) => state.actors[id].initiative);
    expect([...values].sort((a, b) => b - a)).toEqual(values);
  });

  it('is reproducible from its seed', () => {
    expect(newFight(7).order).toEqual(newFight(7).order);
  });

  it('starts Corvin with the sheet values', () => {
    const corvin = newFight().actors.corvin;
    expect(corvin.maxHp).toBe(CORVIN.maxHp);
    expect(corvin.ac).toBe(CORVIN.armorClass);
    expect(corvin.initiativeMod).toBe(CORVIN.initiative);
  });
});

describe('zones', () => {
  it('knows its own adjacency', () => {
    expect(zonesAdjacent('front', 'cover')).toBe(true);
    expect(zonesAdjacent('high', 'rear')).toBe(false);
    expect(zonesAdjacent('rear', 'rear')).toBe(true);
  });

  it('gives cover an AC bonus', () => {
    const state = newFight();
    const inCover = { ...state.actors['wolf-b'], zone: 'cover' as const };
    const inOpen = { ...state.actors['wolf-b'], zone: 'front' as const };
    expect(effectiveAc(inCover, 'melee')).toBeGreaterThan(effectiveAc(inOpen, 'melee'));
  });
});

describe('resources', () => {
  it('spends a spell slot for a levelled spell and not for a cantrip', () => {
    let state = toCorvinTurn(newFight(5));
    const before = state.resources.slotsUsed;
    state = performPlayerAction(state, {
      kind: 'spell',
      spellId: 'viciousMockery',
      targetId: livingEnemies(state)[0].id,
    }).state;
    expect(state.resources.slotsUsed).toBe(before);

    state = { ...state, budget: { action: true, bonus: true, move: true } };
    state = performPlayerAction(state, {
      kind: 'spell',
      spellId: 'dissonantWhispers',
      targetId: livingEnemies(state)[0].id,
    }).state;
    expect(state.resources.slotsUsed).toBe(before + 1);
  });

  it('refuses to cast a levelled spell with no slots left', () => {
    let state = toCorvinTurn(newFight(5));
    state = { ...state, resources: { ...state.resources, slotsUsed: totalSlots() } };
    const result = performPlayerAction(state, {
      kind: 'spell',
      spellId: 'command',
      targetId: livingEnemies(state)[0].id,
      commandWord: 'halt',
    });
    expect(result.state.resources.slotsUsed).toBe(totalSlots());
    expect(result.state.budget.action).toBe(true);
  });

  it('spends one action per turn', () => {
    let state = toCorvinTurn(newFight(11));
    const target = livingEnemies(state)[0].id;
    state = performPlayerAction(state, { kind: 'spell', spellId: 'viciousMockery', targetId: target }).state;
    expect(state.budget.action).toBe(false);
    const logLength = state.log.length;
    state = performPlayerAction(state, { kind: 'spell', spellId: 'frostgrip', targetId: target }).state;
    expect(state.log.length).toBe(logLength);
  });

  it('treats Healing Word as a bonus action, leaving the action free', () => {
    let state = toCorvinTurn(newFight(3));
    state.actors.ansbeth.hp = 4;
    state = performPlayerAction(state, { kind: 'spell', spellId: 'healingWord', targetId: 'ansbeth' }).state;
    expect(state.budget.bonus).toBe(false);
    expect(state.budget.action).toBe(true);
    expect(state.actors.ansbeth.hp).toBeGreaterThan(4);
  });
});

describe('bardic inspiration', () => {
  it('can be given to an ally and is limited by uses', () => {
    let state = toCorvinTurn(newFight(21));
    state = performPlayerAction(state, { kind: 'inspire', targetId: 'ansbeth' }).state;
    expect(hasStatus(state.actors.ansbeth, 'inspired')).toBe(true);
    expect(state.resources.inspirationUsed).toBe(1);
  });

  it('cannot be used on Corvin himself', () => {
    let state = toCorvinTurn(newFight(21));
    state = performPlayerAction(state, { kind: 'inspire', targetId: 'corvin' }).state;
    expect(hasStatus(state.actors.corvin, 'inspired')).toBe(false);
    expect(state.resources.inspirationUsed).toBe(0);
  });

  it("runs out after the sheet's number of uses", () => {
    let state = toCorvinTurn(newFight(21));
    state = { ...state, resources: { ...state.resources, inspirationUsed: CORVIN.bardicInspiration.uses } };
    state = performPlayerAction(state, { kind: 'inspire', targetId: 'nell' }).state;
    expect(hasStatus(state.actors.nell, 'inspired')).toBe(false);
  });

  it("is consumed by the ally's next attack roll and shows up in the breakdown", () => {
    let state = toCorvinTurn(newFight(2024));
    state = performPlayerAction(state, { kind: 'inspire', targetId: 'ansbeth' }).state;
    state = performPlayerAction(state, { kind: 'endTurn' }).state;

    let guard = 0;
    while (state.outcome === 'ongoing' && currentActor(state).id !== 'ansbeth' && guard++ < 20) {
      state = runAiTurn(state).state;
    }
    const result = runAiTurn(state);
    const rolls = result.events.filter((e) => e.kind === 'roll');
    expect(hasStatus(result.state.actors.ansbeth, 'inspired')).toBe(false);
    expect(rolls.some((e) => e.kind === 'roll' && e.roll.bonusDie)).toBe(true);
  });
});

describe('healing and downed allies', () => {
  it('brings a downed ally back up', () => {
    let state = toCorvinTurn(newFight(77));
    state.actors.nell.hp = 0;
    state.actors.nell.downed = true;
    state = performPlayerAction(state, { kind: 'spell', spellId: 'healingWord', targetId: 'nell' }).state;
    expect(state.actors.nell.downed).toBe(false);
    expect(state.actors.nell.hp).toBeGreaterThan(0);
  });

  it('never heals above maximum', () => {
    let state = toCorvinTurn(newFight(78));
    state.actors.ansbeth.hp = state.actors.ansbeth.maxHp - 1;
    state = performPlayerAction(state, { kind: 'spell', spellId: 'healingWord', targetId: 'ansbeth' }).state;
    expect(state.actors.ansbeth.hp).toBe(state.actors.ansbeth.maxHp);
  });
});

describe('turn order', () => {
  it('advances through the order and increments the round', () => {
    let state = newFight(404);
    const first = state.order[0];
    for (let i = 0; i < state.order.length; i++) {
      state = endTurn(state).state;
    }
    expect(state.round).toBe(2);
    expect(currentActor(state).id).toBe(first);
  });

  it('resets the action budget at the start of each turn', () => {
    let state = toCorvinTurn(newFight(9));
    state = performPlayerAction(state, { kind: 'defend' }).state;
    expect(state.budget.action).toBe(false);
    state = performPlayerAction(state, { kind: 'endTurn' }).state;
    expect(state.budget).toEqual({ action: true, bonus: true, move: true });
  });

  it('skips dead enemies', () => {
    let state = newFight(55);
    state.actors['wolf-a'].dead = true;
    state.actors['wolf-a'].hp = 0;
    for (let i = 0; i < 10; i++) {
      state = endTurn(state).state;
      expect(currentActor(state).id).not.toBe('wolf-a');
    }
  });
});

describe('movement', () => {
  it('allows one move to an adjacent zone per turn', () => {
    let state = toCorvinTurn(newFight(66));
    state.actors.corvin.zone = 'front';
    state = performPlayerAction(state, { kind: 'move', to: 'cover' }).state;
    expect(state.actors.corvin.zone).toBe('cover');
    expect(state.budget.move).toBe(false);
    state = performPlayerAction(state, { kind: 'move', to: 'front' }).state;
    expect(state.actors.corvin.zone).toBe('cover');
  });

  it('refuses a move to a non-adjacent zone', () => {
    let state = toCorvinTurn(newFight(67));
    state.actors.corvin.zone = 'high';
    state = performPlayerAction(state, { kind: 'move', to: 'rear' }).state;
    expect(state.actors.corvin.zone).toBe('high');
  });
});

describe('spell effects', () => {
  it('applies a status when the target fails its save', () => {
    // Search seeds until the shade fails — the point is that a failure applies the status.
    let applied = false;
    for (let seed = 1; seed < 40 && !applied; seed++) {
      let state = toCorvinTurn(newFight(seed));
      if (currentActor(state).id !== 'corvin') continue;
      state = performPlayerAction(state, { kind: 'spell', spellId: 'frostgrip', targetId: 'shade' }).state;
      applied = hasStatus(state.actors.shade, 'frostbound');
    }
    expect(applied).toBe(true);
  });

  it('deals at least half damage with Dissonant Whispers even on a successful save', () => {
    let state = toCorvinTurn(newFight(31));
    const before = state.actors.shade.hp;
    state = performPlayerAction(state, { kind: 'spell', spellId: 'dissonantWhispers', targetId: 'shade' }).state;
    expect(state.actors.shade.hp).toBeLessThan(before);
  });

  it('rattles a target with Vicious Mockery or leaves it untouched, never crashes', () => {
    for (let seed = 1; seed < 12; seed++) {
      let state = toCorvinTurn(newFight(seed));
      if (currentActor(state).id !== 'corvin') continue;
      const result = performPlayerAction(state, {
        kind: 'spell',
        spellId: 'viciousMockery',
        targetId: 'wolf-a',
      });
      expect(result.state.actors['wolf-a'].hp).toBeLessThanOrEqual(result.state.actors['wolf-a'].maxHp);
    }
  });

  it('emits a visible roll for every enemy saving throw', () => {
    const state = toCorvinTurn(newFight(88));
    const result = performPlayerAction(state, { kind: 'spell', spellId: 'command', targetId: 'wolf-a', commandWord: 'kneel' });
    expect(result.events.some((e) => e.kind === 'roll' && e.roll.dc !== undefined)).toBe(true);
  });
});

describe('a whole fight', () => {
  it('reaches an outcome when Corvin only ever attacks', () => {
    let state = newFight(4242);
    let guard = 0;
    while (state.outcome === 'ongoing' && guard++ < 400) {
      if (currentActor(state).id === 'corvin') {
        const target = livingEnemies(state).find((e) => zonesAdjacent(state.actors.corvin.zone, e.zone));
        if (target) {
          state = performPlayerAction(state, { kind: 'attack', weaponId: 'rapier', targetId: target.id }).state;
        } else {
          const enemy = livingEnemies(state)[0];
          state = performPlayerAction(state, { kind: 'move', to: enemy.zone }).state;
          state = performPlayerAction(state, { kind: 'spell', spellId: 'viciousMockery', targetId: enemy.id }).state;
        }
        state = performPlayerAction(state, { kind: 'endTurn' }).state;
      } else {
        state = runAiTurn(state).state;
      }
    }
    expect(['victory', 'defeat']).toContain(state.outcome);
  });

  it('can be won with magic alone across several seeds', () => {
    let victories = 0;
    for (const seed of [11, 202, 3003, 40404, 5]) {
      let state = newFight(seed);
      let guard = 0;
      while (state.outcome === 'ongoing' && guard++ < 400) {
        if (currentActor(state).id === 'corvin') {
          const enemy = livingEnemies(state).sort((a, b) => a.hp - b.hp)[0];
          const downedAlly = livingAlliesDown(state);
          if (downedAlly && state.resources.slotsUsed < totalSlots()) {
            state = performPlayerAction(state, { kind: 'spell', spellId: 'healingWord', targetId: downedAlly }).state;
          }
          state = performPlayerAction(state, { kind: 'spell', spellId: 'frostgrip', targetId: enemy.id }).state;
          state = performPlayerAction(state, { kind: 'endTurn' }).state;
        } else {
          state = runAiTurn(state).state;
        }
      }
      if (state.outcome === 'victory') victories++;
    }
    expect(victories).toBeGreaterThan(0);
  });
});

function livingAlliesDown(state: CombatState): string | undefined {
  return Object.values(state.actors).find((a) => a.side === 'ally' && a.downed && a.id !== 'corvin')?.id;
}
