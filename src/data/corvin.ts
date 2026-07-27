/**
 * Corvin Vaelthorne — the tabletop sheet, verbatim.
 *
 * EDIT HERE, NOWHERE ELSE.  Components and combat code read from this file;
 * no ability score, modifier, damage die or spell slot count is written inline
 * anywhere in the codebase.
 */

import { abilityModifier, type AbilityKey, type SkillKey } from './abilities';

export interface WeaponData {
  id: string;
  name: string;
  /** Sheet value for the attack roll. */
  attackBonus: number;
  damageDice: number;
  damageSides: number;
  damageBonus: number;
  damageType: string;
  /** Narrative reach: 'melee' weapons need the target in an adjacent zone. */
  reach: 'melee' | 'thrown';
  description: string;
}

export interface CorvinSheet {
  name: string;
  level: number;
  species: string;
  characterClass: string;
  background: string;
  alignment: string;
  abilities: Record<AbilityKey, number>;
  proficiencyBonus: number;
  maxHp: number;
  armorClass: number;
  initiative: number;
  /** Metres per turn of movement (the sheet is metric). */
  speed: number;
  passivePerception: number;
  spellSaveDc: number;
  spellAttackBonus: number;
  bardicInspiration: { die: number; uses: number };
  spellSlots: { level: number; count: number }[];
  /** Totals straight off the sheet.  Unlisted skills fall back to ability mod. */
  skills: Partial<Record<SkillKey, number>>;
  savingThrowProficiencies: AbilityKey[];
  languages: string[];
  tools: string[];
  instruments: { id: string; name: string; primary: boolean }[];
  weapons: WeaponData[];
  ideal: string;
  fear: string;
}

export const CORVIN: CorvinSheet = {
  name: 'Corvin Vaelthorne',
  level: 1,
  species: 'Chthonic Tiefling',
  characterClass: 'Bard',
  background: 'Wanderer (Outlander)',
  alignment: 'Chaotic Good',
  abilities: { str: 8, dex: 15, con: 14, int: 10, wis: 10, cha: 17 },
  proficiencyBonus: 2,
  maxHp: 10,
  armorClass: 13,
  initiative: 2,
  speed: 9,
  passivePerception: 10,
  spellSaveDc: 13,
  spellAttackBonus: 5,
  bardicInspiration: { die: 6, uses: 3 },
  spellSlots: [{ level: 1, count: 2 }],
  skills: {
    deception: 5,
    performance: 3,
    intimidation: 3,
    persuasion: 3,
    acrobatics: 2,
    sleightOfHand: 2,
    stealth: 2,
  },
  savingThrowProficiencies: ['dex', 'cha'],
  languages: ['Common', 'Halfling', 'Draconic'],
  tools: ["Thieves' tools", 'Dice set'],
  instruments: [
    { id: 'lute', name: 'Lute', primary: true },
    { id: 'panflute', name: 'Pan flute', primary: false },
    { id: 'horn', name: 'Horn', primary: false },
  ],
  weapons: [
    {
      id: 'rapier',
      name: 'Rapier',
      attackBonus: 4,
      damageDice: 1,
      damageSides: 8,
      damageBonus: 2,
      damageType: 'piercing',
      reach: 'melee',
      description: 'A narrow duelling blade, worn at the hip. A last argument, not a first one.',
    },
    {
      id: 'dagger',
      name: 'Dagger',
      attackBonus: 4,
      damageDice: 1,
      damageSides: 4,
      damageBonus: 2,
      damageType: 'piercing',
      reach: 'thrown',
      description: 'One of two. Thrown, mostly, and rarely returned.',
    },
  ],
  ideal: 'Ancestry is not destiny.',
  fear: 'That the voices are not warning him. That they are calling him home.',
};

/** Modifier for an ability, derived — never hand-written. */
export function corvinAbilityMod(key: AbilityKey): number {
  return abilityModifier(CORVIN.abilities[key]);
}

/**
 * Situational bonuses that are part of *Corvin*, not part of the sheet's skill
 * list: his chthonic sensitivity to death and shadow, and the medallion's help
 * when it is already reacting.  Kept here so checks stay data-driven.
 */
export const CORVIN_TRAITS = {
  /** Applies to Perception checks tagged `chthonic` (death, cold, shadow, whispers). */
  chthonicSensitivity: 2,
  /** Applies to Arcana checks while Die Schwelle is at or above this chill level. */
  medallionAttunement: { bonus: 2, requiresChill: 0.35 },
} as const;
