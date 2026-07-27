/**
 * Skill-check resolution for Corvin.
 *
 * Modifiers come from the sheet in `data/corvin.ts` plus a small, explicit set
 * of situational traits — nothing is hard-coded at the call site.  Dialogue and
 * world interactions declare *what* is being attempted; this module decides the
 * number.
 */

import { abilityModifier, SKILL_ABILITY, SKILL_LABEL, type AbilityKey, type SkillKey } from '@/data/abilities';
import { CORVIN, CORVIN_TRAITS } from '@/data/corvin';
import { resolveCheck, rollD20, type CheckResult, type RollOptions } from './dice';

/** Tags let a check opt into Corvin's peculiarities without special-casing code. */
export type CheckTag = 'chthonic' | 'medallion' | 'performance-aided';

export interface CheckRequest {
  skill: SkillKey;
  dc: number;
  /** Short line shown above the dice tray, e.g. "Read the room". */
  label: string;
  tags?: CheckTag[];
  advantage?: boolean;
  disadvantage?: boolean;
}

export interface ModifierPart {
  label: string;
  value: number;
}

export interface CheckContext {
  /** 0..1 — how cold Die Schwelle currently is. */
  medallionChill: number;
  /** Set when Corvin has already played in this scene. */
  hasPerformed?: boolean;
}

/** Base modifier for a skill: sheet value if listed, otherwise the ability mod. */
export function skillModifier(skill: SkillKey): number {
  const sheetValue = CORVIN.skills[skill];
  if (sheetValue !== undefined) return sheetValue;
  return abilityModifier(CORVIN.abilities[SKILL_ABILITY[skill]]);
}

export function savingThrowModifier(ability: AbilityKey): number {
  const base = abilityModifier(CORVIN.abilities[ability]);
  return CORVIN.savingThrowProficiencies.includes(ability) ? base + CORVIN.proficiencyBonus : base;
}

/**
 * Every part of the modifier, itemised, because the roll breakdown UI shows
 * them one by one.
 */
export function modifierBreakdown(request: CheckRequest, context: CheckContext): ModifierPart[] {
  const parts: ModifierPart[] = [];
  const base = skillModifier(request.skill);
  const sheetValue = CORVIN.skills[request.skill];
  parts.push({
    label: sheetValue !== undefined ? SKILL_LABEL[request.skill] : `${SKILL_LABEL[request.skill]} (ability)`,
    value: base,
  });

  const tags = request.tags ?? [];
  if (tags.includes('chthonic') && request.skill === 'perception') {
    parts.push({ label: 'Chthonic sensitivity', value: CORVIN_TRAITS.chthonicSensitivity });
  }
  if (
    tags.includes('medallion') &&
    request.skill === 'arcana' &&
    context.medallionChill >= CORVIN_TRAITS.medallionAttunement.requiresChill
  ) {
    parts.push({ label: 'Die Schwelle, listening', value: CORVIN_TRAITS.medallionAttunement.bonus });
  }
  if (tags.includes('performance-aided') && context.hasPerformed) {
    parts.push({ label: 'The room already likes him', value: 1 });
  }
  return parts;
}

export function totalModifier(request: CheckRequest, context: CheckContext): number {
  return modifierBreakdown(request, context).reduce((a, p) => a + p.value, 0);
}

export interface ResolvedCheck extends CheckResult {
  request: CheckRequest;
  parts: ModifierPart[];
}

export function performCheck(
  request: CheckRequest,
  context: CheckContext,
  options: RollOptions = {},
): ResolvedCheck {
  const parts = modifierBreakdown(request, context);
  const modifier = parts.reduce((a, p) => a + p.value, 0);
  const roll = rollD20(modifier, {
    ...options,
    advantage: options.advantage ?? request.advantage,
    disadvantage: options.disadvantage ?? request.disadvantage,
  });
  return { ...resolveCheck(roll, request.dc), request, parts };
}
