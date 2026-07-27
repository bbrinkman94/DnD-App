/**
 * "What waited at the shrine" — the one combat encounter.
 *
 * Original creatures with original numbers: nothing here is copied from a
 * published stat block.  Balanced around Corvin plus two allies, and beatable
 * by talking, by freezing, by stabbing, or by keeping everyone standing.
 */

import type { ActorAttack, ZoneData, ZoneId } from '@/combat/types';

export const ZONES: Record<ZoneId, ZoneData> = {
  front: {
    id: 'front',
    name: 'The Road',
    description: 'Open ground between the shrine and the trees. Everything can reach you here.',
    neighbours: ['cover', 'high', 'rear'],
    acBonus: 0,
    offenceBonus: 0,
    position: [0, 0, 1.2],
  },
  cover: {
    id: 'cover',
    name: 'Fallen Cart',
    description: 'Splintered boards and a broken axle. Harder to hit behind them.',
    neighbours: ['front', 'rear'],
    acBonus: 2,
    offenceBonus: 0,
    position: [-3.4, 0, 0.4],
  },
  high: {
    id: 'high',
    name: 'Shrine Steps',
    description: 'Three worn steps and a broken statue. You can see — and be seen — from here.',
    neighbours: ['front'],
    acBonus: 0,
    offenceBonus: 1,
    position: [3.2, 0.65, -1.1],
  },
  rear: {
    id: 'rear',
    name: 'Behind the Stones',
    description: 'The far side of the boundary wall. Nothing reaches you without crossing open ground.',
    neighbours: ['front', 'cover'],
    acBonus: 1,
    offenceBonus: -1,
    position: [-0.6, 0, 4.2],
  },
};

export const ZONE_ORDER: ZoneId[] = ['high', 'front', 'cover', 'rear'];

export interface EnemyTemplate {
  id: string;
  name: string;
  kind: 'wolf' | 'shade';
  maxHp: number;
  ac: number;
  initiativeMod: number;
  saves: { wis: number; con: number; dex: number };
  attack: ActorAttack;
  zone: ZoneId;
  accent: string;
  mockKey: string;
  /** Shown in the target preview panel. */
  read: string;
}

export const ENEMIES: EnemyTemplate[] = [
  {
    id: 'wolf-a',
    name: 'Mist-Touched Wolf',
    kind: 'wolf',
    maxHp: 9,
    ac: 12,
    initiativeMod: 3,
    saves: { wis: 0, con: 2, dex: 3 },
    attack: {
      name: 'Cold Bite',
      bonus: 4,
      dice: 1,
      sides: 6,
      damageBonus: 1,
      type: 'piercing',
      reach: 'melee',
      flavour: 'It closes without sound. The fog closes with it.',
    },
    zone: 'front',
    accent: '#8fa9c8',
    mockKey: 'wolf',
    read: 'Fast, brittle, and far too quiet. Its breath does not steam.',
  },
  {
    id: 'wolf-b',
    name: 'Mist-Touched Wolf',
    kind: 'wolf',
    maxHp: 9,
    ac: 12,
    initiativeMod: 3,
    saves: { wis: 0, con: 2, dex: 3 },
    attack: {
      name: 'Cold Bite',
      bonus: 4,
      dice: 1,
      sides: 6,
      damageBonus: 1,
      type: 'piercing',
      reach: 'melee',
      flavour: 'Its eyes hold no light at all, not even yours.',
    },
    zone: 'front',
    accent: '#8fa9c8',
    mockKey: 'wolf',
    read: 'The second one circles. It has done this before.',
  },
  {
    id: 'shade',
    name: 'The Grey Petitioner',
    kind: 'shade',
    maxHp: 17,
    ac: 13,
    initiativeMod: 1,
    saves: { wis: 3, con: 1, dex: 1 },
    attack: {
      name: 'Grasping Cold',
      bonus: 5,
      dice: 1,
      sides: 8,
      damageBonus: 0,
      type: 'necrotic',
      reach: 'ranged',
      flavour: 'It reaches from further away than it is standing.',
    },
    zone: 'high',
    accent: '#7b4bb0',
    mockKey: 'shade',
    read: 'Something that knelt here so long it forgot how to stand. It is listening to the medallion.',
  },
];

export const ALLY_TEMPLATES = {
  nell: {
    maxHp: 12,
    ac: 14,
    initiativeMod: 3,
    saves: { wis: 1, con: 1, dex: 3 },
    zone: 'cover' as ZoneId,
    attack: {
      name: 'Sling Stone',
      bonus: 4,
      dice: 1,
      sides: 6,
      damageBonus: 2,
      type: 'bludgeoning',
      reach: 'ranged' as const,
      flavour: 'She does not aim so much as decide.',
    },
  },
  ansbeth: {
    maxHp: 16,
    ac: 16,
    initiativeMod: 0,
    saves: { wis: 2, con: 3, dex: 0 },
    zone: 'front' as ZoneId,
    attack: {
      name: 'Guard Sword',
      bonus: 4,
      dice: 1,
      sides: 8,
      damageBonus: 2,
      type: 'slashing',
      reach: 'melee' as const,
      flavour: 'Four years of not drawing it have not made her slower.',
    },
  },
};

/** Corvin's own combat stats come from the sheet; only his zone lives here. */
export const CORVIN_START_ZONE: ZoneId = 'front';
