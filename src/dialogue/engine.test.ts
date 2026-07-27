import { describe, expect, it } from 'vitest';
import { CORVIN } from '@/data/corvin';
import { createRunState, totalSlots, type RunState } from '@/game/save';
import { applyEffects, evaluateCondition, prepareChoices, slotsRemaining, validateTree } from './engine';
import { TREE_LIST, TREES } from './trees';
import type { DialogueNode } from './types';

const run = (patch: Partial<RunState> = {}): RunState => ({ ...createRunState(), ...patch });

describe('conditions', () => {
  it('reads boolean and valued flags', () => {
    const state = run({ flags: { performed: true, gold: 60, wine: 'refused' } });
    expect(evaluateCondition({ kind: 'flag', key: 'performed' }, state)).toBe(true);
    expect(evaluateCondition({ kind: 'flag', key: 'gold' }, state)).toBe(true);
    expect(evaluateCondition({ kind: 'flag', key: 'wine', equals: 'refused' }, state)).toBe(true);
    expect(evaluateCondition({ kind: 'flag', key: 'wine', equals: 'drank' }, state)).toBe(false);
    expect(evaluateCondition({ kind: 'flag', key: 'missing' }, state)).toBe(false);
  });

  it('checks clues, chapters and disposition', () => {
    const state = run({
      clues: ['emrik-lying'],
      chapter: 'road',
      companions: { nell: { met: true, disposition: 3, recruited: true }, ansbeth: { met: false, disposition: -2, recruited: false } },
    });
    expect(evaluateCondition({ kind: 'clue', id: 'emrik-lying' }, state)).toBe(true);
    expect(evaluateCondition({ kind: 'clue', id: 'nope' }, state)).toBe(false);
    expect(evaluateCondition({ kind: 'chapter', is: 'road' }, state)).toBe(true);
    expect(evaluateCondition({ kind: 'disposition', companion: 'nell', atLeast: 2 }, state)).toBe(true);
    expect(evaluateCondition({ kind: 'disposition', companion: 'ansbeth', atLeast: 0 }, state)).toBe(false);
  });

  it('knows which languages and tools Corvin actually has', () => {
    const state = run();
    expect(evaluateCondition({ kind: 'language', id: 'Draconic' }, state)).toBe(true);
    expect(evaluateCondition({ kind: 'language', id: 'Halfling' }, state)).toBe(true);
    expect(evaluateCondition({ kind: 'language', id: 'Elvish' }, state)).toBe(false);
    expect(evaluateCondition({ kind: 'tool', id: 'thieves' }, state)).toBe(true);
    expect(evaluateCondition({ kind: 'tool', id: 'smith' }, state)).toBe(false);
  });

  it('gates levelled spells on remaining slots but never cantrips', () => {
    const empty = run({ slotsUsed: totalSlots() });
    expect(evaluateCondition({ kind: 'spell', id: 'dissonantWhispers' }, empty)).toBe(false);
    expect(evaluateCondition({ kind: 'spell', id: 'viciousMockery' }, empty)).toBe(true);
  });

  it('never offers the disabled configuration spells', () => {
    expect(evaluateCondition({ kind: 'spell', id: 'disguiseSelf' }, run())).toBe(false);
    expect(evaluateCondition({ kind: 'spell', id: 'detectMagic' }, run())).toBe(false);
  });

  it('composes with not / all / any', () => {
    const state = run({ clues: ['a'] });
    expect(evaluateCondition({ kind: 'not', of: { kind: 'clue', id: 'a' } }, state)).toBe(false);
    expect(
      evaluateCondition({ kind: 'all', of: [{ kind: 'clue', id: 'a' }, { kind: 'chapter', is: 'inn' }] }, state),
    ).toBe(true);
    expect(
      evaluateCondition({ kind: 'any', of: [{ kind: 'clue', id: 'z' }, { kind: 'chapter', is: 'inn' }] }, state),
    ).toBe(true);
  });

  it('tracks how cold the medallion is', () => {
    expect(evaluateCondition({ kind: 'medallion', atLeast: 0.5 }, run({ medallionChill: 0.6 }))).toBe(true);
    expect(evaluateCondition({ kind: 'medallion', atLeast: 0.5 }, run({ medallionChill: 0.2 }))).toBe(false);
  });
});

describe('choice preparation', () => {
  const node: DialogueNode = {
    id: 'test',
    lines: [],
    choices: [
      { id: 'always', text: 'always', next: 'a' },
      { id: 'draconic', text: 'draconic', requires: { kind: 'language', id: 'Draconic' }, next: 'a' },
      { id: 'elvish', text: 'elvish', requires: { kind: 'language', id: 'Elvish' }, lockedReason: 'No Elvish', next: 'a' },
      { id: 'hidden', text: 'hidden', requires: { kind: 'clue', id: 'nope' }, hideWhenLocked: true, next: 'a' },
      { id: 'spell', text: 'spell', spell: 'command', next: 'a' },
    ],
  };

  it('shows locked choices with a reason and hides the ones marked hidden', () => {
    const prepared = prepareChoices(node, run());
    expect(prepared.map((c) => c.id)).toEqual(['always', 'draconic', 'elvish', 'spell']);
    expect(prepared.find((c) => c.id === 'elvish')?.available).toBe(false);
    expect(prepared.find((c) => c.id === 'elvish')?.locked).toBe('No Elvish');
    expect(prepared.find((c) => c.id === 'draconic')?.available).toBe(true);
  });

  it('locks a spell choice when the slots are gone', () => {
    const prepared = prepareChoices(node, run({ slotsUsed: totalSlots() }));
    const spell = prepared.find((c) => c.id === 'spell');
    expect(spell?.available).toBe(false);
    expect(spell?.locked).toMatch(/slot/i);
  });
});

describe('effects', () => {
  it('does not mutate the state it is given', () => {
    const before = run();
    const after = applyEffects(before, [{ kind: 'flag', key: 'x', value: true }]);
    expect(before.flags.x).toBeUndefined();
    expect(after.run.flags.x).toBe(true);
  });

  it('adds clues without duplicating them', () => {
    let state = run();
    state = applyEffects(state, [{ kind: 'clue', id: 'a' }]).run;
    state = applyEffects(state, [{ kind: 'clue', id: 'a' }]).run;
    expect(state.clues).toEqual(['a']);
  });

  it('clamps disposition, hit points, chill and resources', () => {
    let state = run();
    state = applyEffects(state, Array.from({ length: 12 }, () => ({ kind: 'disposition' as const, companion: 'nell' as const, delta: 1 }))).run;
    expect(state.companions.nell.disposition).toBe(5);

    state = applyEffects(state, [{ kind: 'damage', amount: 999 }]).run;
    expect(state.hp).toBe(0);
    state = applyEffects(state, [{ kind: 'heal', amount: 999 }]).run;
    expect(state.hp).toBe(CORVIN.maxHp);

    state = applyEffects(state, [{ kind: 'medallionChill', delta: 5 }]).run;
    expect(state.medallionChill).toBe(1);

    state = applyEffects(state, Array.from({ length: 9 }, () => ({ kind: 'spendSlot' as const }))).run;
    expect(state.slotsUsed).toBe(totalSlots());
    expect(slotsRemaining(state)).toBe(0);

    state = applyEffects(state, Array.from({ length: 9 }, () => ({ kind: 'useInspiration' as const }))).run;
    expect(state.inspirationUsed).toBe(CORVIN.bardicInspiration.uses);
  });

  it('only ever raises the medallion stage', () => {
    let state = run({ medallionStage: 2 });
    state = applyEffects(state, [{ kind: 'medallionStage', to: 1 }]).run;
    expect(state.medallionStage).toBe(2);
    state = applyEffects(state, [{ kind: 'medallionStage', to: 3 }]).run;
    expect(state.medallionStage).toBe(3);
  });

  it('emits signals for the app layer instead of acting itself', () => {
    const { signals } = applyEffects(run(), [
      { kind: 'sfx', id: 'door' },
      { kind: 'startCombat' },
      { kind: 'chapter', to: 'road' },
      { kind: 'ending' },
    ]);
    expect(signals.map((s) => s.kind)).toEqual(['sfx', 'startCombat', 'chapter', 'ending']);
  });

  it('records choices against the chapter they were made in', () => {
    const { run: after } = applyEffects(run({ chapter: 'shrine' }), [{ kind: 'choice', label: 'did a thing' }]);
    expect(after.choices).toEqual([{ chapter: 'shrine', label: 'did a thing' }]);
  });

  it('marks the run completed on the ending effect', () => {
    expect(applyEffects(run(), [{ kind: 'ending' }]).run.completed).toBe(true);
  });
});

describe('shipped dialogue trees', () => {
  it('have no dangling links or dead ends', () => {
    const problems = TREE_LIST.flatMap((tree) => validateTree(tree));
    expect(problems).toEqual([]);
  });

  it('are all registered under their own id', () => {
    for (const tree of TREE_LIST) expect(TREES[tree.id]).toBe(tree);
  });

  it('cover every chapter of the slice', () => {
    for (const id of ['inn-emrik', 'road-open', 'shrine-arrive', 'encounter-after', 'gate-arrive']) {
      expect(TREES[id]).toBeDefined();
    }
  });

  it('reach a check whose failure leads somewhere other than the success node', () => {
    const checks = TREE_LIST.flatMap((tree) =>
      Object.values(tree.nodes).flatMap((node) => (node.choices ?? []).filter((c) => c.check)),
    );
    expect(checks.length).toBeGreaterThan(8);
    for (const choice of checks) {
      expect(choice.check!.success).not.toBe(choice.check!.failure);
      expect(choice.check!.dc).toBeGreaterThanOrEqual(8);
      expect(choice.check!.dc).toBeLessThanOrEqual(20);
    }
  });

  it('offer silence as a real option in several places', () => {
    const silent = TREE_LIST.flatMap((tree) =>
      Object.values(tree.nodes).flatMap((node) => (node.choices ?? []).filter((c) => c.tone === 'silent')),
    );
    expect(silent.length).toBeGreaterThanOrEqual(6);
  });
});
