/**
 * Ability / skill vocabulary for the slice.
 *
 * Deliberately small: only the abilities and skills the prologue actually
 * exercises are modelled.  Everything numeric lives in `corvin.ts` so the
 * tabletop sheet stays the single source of truth.
 */

export const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
export type AbilityKey = (typeof ABILITY_KEYS)[number];

export const ABILITY_LABEL: Record<AbilityKey, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

export const SKILL_KEYS = [
  'deception',
  'performance',
  'intimidation',
  'persuasion',
  'acrobatics',
  'sleightOfHand',
  'stealth',
  'perception',
  'arcana',
] as const;
export type SkillKey = (typeof SKILL_KEYS)[number];

export const SKILL_LABEL: Record<SkillKey, string> = {
  deception: 'Deception',
  performance: 'Performance',
  intimidation: 'Intimidation',
  persuasion: 'Persuasion',
  acrobatics: 'Acrobatics',
  sleightOfHand: 'Sleight of Hand',
  stealth: 'Stealth',
  perception: 'Perception',
  arcana: 'Arcana',
};

export const SKILL_ABILITY: Record<SkillKey, AbilityKey> = {
  deception: 'cha',
  performance: 'cha',
  intimidation: 'cha',
  persuasion: 'cha',
  acrobatics: 'dex',
  sleightOfHand: 'dex',
  stealth: 'dex',
  perception: 'wis',
  arcana: 'int',
};

/** Ability score -> modifier, the 5e way. */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** "+3" / "-1" / "+0" — used everywhere in the UI. */
export function formatModifier(value: number): string {
  return `${value >= 0 ? '+' : '−'}${Math.abs(value)}`;
}
