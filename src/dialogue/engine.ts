/**
 * Dialogue evaluation — pure, synchronous, testable.
 *
 * `evaluateCondition` decides whether a line is available; `applyEffects`
 * returns a *new* run state plus a list of signals (sound cues, chapter
 * transitions, combat start) for the app layer to act on.  Nothing here touches
 * React, audio or the DOM.
 */

import { CORVIN } from '@/data/corvin';
import { SPELLS } from '@/data/spells';
import { DISPOSITION } from '@/data/characters';
import { totalSlots, type RunState } from '@/game/save';
import type { Condition, DialogueChoice, DialogueNode, DialogueTree, Effect } from './types';

export function evaluateCondition(condition: Condition, run: RunState): boolean {
  switch (condition.kind) {
    case 'flag': {
      const value = run.flags[condition.key];
      if (condition.equals === undefined) return value === true || (typeof value === 'number' && value > 0);
      return value === condition.equals;
    }
    case 'clue':
      return run.clues.includes(condition.id);
    case 'disposition':
      return run.companions[condition.companion].disposition >= condition.atLeast;
    case 'spell': {
      const spell = SPELLS[condition.id];
      if (!spell || !spell.enabled) return false;
      if (spell.usesSlot) return slotsRemaining(run) > 0;
      return true;
    }
    case 'language':
      return CORVIN.languages.some((l) => l.toLowerCase() === condition.id.toLowerCase());
    case 'tool':
      return CORVIN.tools.some((t) => t.toLowerCase().includes(condition.id.toLowerCase()));
    case 'slots':
      return slotsRemaining(run) >= condition.atLeast;
    case 'inspiration':
      return inspirationRemaining(run) >= condition.atLeast;
    case 'medallion':
      return run.medallionChill >= condition.atLeast;
    case 'chapter':
      return run.chapter === condition.is;
    case 'not':
      return !evaluateCondition(condition.of, run);
    case 'all':
      return condition.of.every((c) => evaluateCondition(c, run));
    case 'any':
      return condition.of.some((c) => evaluateCondition(c, run));
    default:
      return false;
  }
}

export function slotsRemaining(run: RunState): number {
  return Math.max(0, totalSlots() - run.slotsUsed);
}

export function inspirationRemaining(run: RunState): number {
  return Math.max(0, CORVIN.bardicInspiration.uses - run.inspirationUsed);
}

export interface PreparedChoice extends DialogueChoice {
  available: boolean;
  /** Reason shown on a locked choice, e.g. "No spell slots left". */
  locked?: string;
}

/**
 * Locked choices stay visible by default: seeing the door you cannot open is
 * part of the character.  `hideWhenLocked` removes the ones that would spoil.
 */
export function prepareChoices(node: DialogueNode, run: RunState): PreparedChoice[] {
  const out: PreparedChoice[] = [];
  for (const choice of node.choices ?? []) {
    let available = choice.requires ? evaluateCondition(choice.requires, run) : true;
    let locked = available ? undefined : (choice.lockedReason ?? 'Not available');

    if (available && choice.spell) {
      const spell = SPELLS[choice.spell];
      if (!spell.enabled) {
        available = false;
        locked = 'Not prepared';
      } else if (spell.usesSlot && slotsRemaining(run) <= 0) {
        available = false;
        locked = 'No spell slots remaining';
      }
    }
    if (!available && choice.hideWhenLocked) continue;
    out.push({ ...choice, available, locked });
  }
  return out;
}

export type Signal =
  | { kind: 'sfx'; id: string }
  | { kind: 'music'; cue: string }
  | { kind: 'chapter'; to: RunState['chapter'] }
  | { kind: 'startCombat' }
  | { kind: 'endChapter' }
  | { kind: 'ending' };

export interface EffectResult {
  run: RunState;
  signals: Signal[];
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export function applyEffects(run: RunState, effects: Effect[] | undefined): EffectResult {
  if (!effects || effects.length === 0) return { run, signals: [] };

  const next: RunState = {
    ...run,
    flags: { ...run.flags },
    clues: [...run.clues],
    companions: { ...run.companions },
    choices: [...run.choices],
  };
  const signals: Signal[] = [];

  for (const effect of effects) {
    switch (effect.kind) {
      case 'flag':
        next.flags[effect.key] = effect.value;
        break;
      case 'clue':
        if (!next.clues.includes(effect.id)) next.clues.push(effect.id);
        break;
      case 'disposition': {
        const current = next.companions[effect.companion];
        next.companions[effect.companion] = {
          ...current,
          disposition: clamp(current.disposition + effect.delta, DISPOSITION.min, DISPOSITION.max),
        };
        break;
      }
      case 'recruit': {
        const current = next.companions[effect.companion];
        next.companions[effect.companion] = { ...current, met: true, recruited: true };
        break;
      }
      case 'medallionChill':
        next.medallionChill = clamp(
          effect.to !== undefined ? effect.to : next.medallionChill + (effect.delta ?? 0),
          0,
          1,
        );
        break;
      case 'medallionStage':
        next.medallionStage = clamp(Math.max(next.medallionStage, effect.to), 0, 3);
        break;
      case 'spendSlot':
        next.slotsUsed = clamp(next.slotsUsed + 1, 0, totalSlots());
        break;
      case 'useInspiration':
        next.inspirationUsed = clamp(next.inspirationUsed + 1, 0, CORVIN.bardicInspiration.uses);
        break;
      case 'damage':
        next.hp = clamp(next.hp - effect.amount, 0, CORVIN.maxHp);
        break;
      case 'heal':
        next.hp = clamp(next.hp + effect.amount, 0, CORVIN.maxHp);
        break;
      case 'choice':
        next.choices.push({ chapter: next.chapter, label: effect.label });
        break;
      case 'chapter':
        next.chapter = effect.to;
        next.checkpoint = 'start';
        signals.push({ kind: 'chapter', to: effect.to });
        break;
      case 'sfx':
        signals.push({ kind: 'sfx', id: effect.id });
        break;
      case 'music':
        signals.push({ kind: 'music', cue: effect.cue });
        break;
      case 'startCombat':
        signals.push({ kind: 'startCombat' });
        break;
      case 'endChapter':
        signals.push({ kind: 'endChapter' });
        break;
      case 'ending':
        next.completed = true;
        signals.push({ kind: 'ending' });
        break;
    }
  }
  return { run: next, signals };
}

export function getNode(tree: DialogueTree, nodeId: string): DialogueNode {
  const node = tree.nodes[nodeId];
  if (!node) {
    throw new Error(`Dialogue node "${nodeId}" missing from tree "${tree.id}"`);
  }
  return node;
}

/**
 * Development guard: every `next`, `check.success` and `check.failure` target
 * must exist.  Run by the test suite over every shipped tree.
 */
export function validateTree(tree: DialogueTree): string[] {
  const problems: string[] = [];
  const known = new Set(Object.keys(tree.nodes));
  if (!known.has(tree.start)) problems.push(`${tree.id}: start node "${tree.start}" missing`);

  const checkTarget = (target: string | undefined, where: string): void => {
    if (target && !known.has(target)) problems.push(`${tree.id}: ${where} -> "${target}" missing`);
  };

  for (const node of Object.values(tree.nodes)) {
    checkTarget(node.next, `node ${node.id}.next`);
    const terminal = node.end === true;
    if (!terminal && !node.next && (node.choices ?? []).length === 0) {
      problems.push(`${tree.id}: node ${node.id} is a dead end (no next, no choices, not end)`);
    }
    for (const choice of node.choices ?? []) {
      checkTarget(choice.next, `choice ${node.id}/${choice.id}.next`);
      if (choice.check) {
        checkTarget(choice.check.success, `choice ${node.id}/${choice.id}.check.success`);
        checkTarget(choice.check.failure, `choice ${node.id}/${choice.id}.check.failure`);
      }
      if (!choice.next && !choice.check) {
        problems.push(`${tree.id}: choice ${node.id}/${choice.id} goes nowhere`);
      }
    }
  }
  return problems;
}
