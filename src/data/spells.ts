/**
 * Corvin's playable magic.
 *
 * `enabled: false` entries are intentionally shipped but inert — they are the
 * spells that were considered for the sheet and may return.  They appear in the
 * grimoire UI as greyed configuration entries and are never offered in combat.
 */

export type SpellId =
  | 'viciousMockery'
  | 'message'
  | 'frostgrip'
  | 'thaumaturgy'
  | 'healingWord'
  | 'command'
  | 'dissonantWhispers'
  | 'disguiseSelf'
  | 'detectMagic';

export type SpellKind = 'attack' | 'save' | 'heal' | 'utility';
export type ActionCost = 'action' | 'bonus' | 'none';

export interface SpellData {
  id: SpellId;
  name: string;
  level: number;
  kind: SpellKind;
  cost: ActionCost;
  /** Which resource is consumed. Cantrips are free. */
  usesSlot: boolean;
  enabled: boolean;
  /** Colour signature for VFX / UI accents. */
  accent: string;
  save?: { ability: 'wis' | 'cha' | 'con' | 'dex'; onSuccess: 'half' | 'none' };
  damage?: { dice: number; sides: number; type: string };
  heal?: { dice: number; sides: number; bonusFromAbility: 'cha' };
  status?: string;
  combat: boolean;
  blurb: string;
  /** Shown on hover in combat — the intent, not a damage guarantee. */
  intent: string;
}

export const SPELLS: Record<SpellId, SpellData> = {
  viciousMockery: {
    id: 'viciousMockery',
    name: 'Vicious Mockery',
    level: 0,
    kind: 'save',
    cost: 'action',
    usesSlot: false,
    enabled: true,
    accent: '#a06bd4',
    save: { ability: 'wis', onSuccess: 'none' },
    damage: { dice: 1, sides: 4, type: 'psychic' },
    status: 'rattled',
    combat: true,
    blurb: 'A cutting line, delivered with perfect timing. The insult lands somewhere behind the eyes.',
    intent: '1d4 psychic on a failed WIS save, and the target swings wide on its next attack.',
  },
  message: {
    id: 'message',
    name: 'Message',
    level: 0,
    kind: 'utility',
    cost: 'action',
    usesSlot: false,
    enabled: true,
    accent: '#8fa9c8',
    combat: false,
    blurb: 'A thread of sound only one other ear can find.',
    intent: 'Speak privately with someone across the room — or across the fog.',
  },
  frostgrip: {
    id: 'frostgrip',
    name: 'Frostgrip',
    level: 0,
    kind: 'save',
    cost: 'action',
    usesSlot: false,
    enabled: true,
    accent: '#9fd4e6',
    save: { ability: 'con', onSuccess: 'none' },
    damage: { dice: 1, sides: 6, type: 'cold' },
    status: 'frostbound',
    combat: true,
    blurb: 'Black ice threads under the skin. It is not weather. It never was.',
    intent: '1d6 cold on a failed CON save; blackened ice slows the target for a turn.',
  },
  thaumaturgy: {
    id: 'thaumaturgy',
    name: 'Thaumaturgy',
    level: 0,
    kind: 'utility',
    cost: 'action',
    usesSlot: false,
    enabled: true,
    accent: '#e0a659',
    status: 'shaken',
    combat: true,
    blurb: 'Three times the voice. Flames leaning away from him. A shutter that opens by itself.',
    intent: 'Theatre as a weapon: the nearest enemy loses its nerve and its next roll suffers.',
  },
  healingWord: {
    id: 'healingWord',
    name: 'Healing Word',
    level: 1,
    kind: 'heal',
    cost: 'bonus',
    usesSlot: true,
    enabled: true,
    accent: '#d8c88a',
    heal: { dice: 1, sides: 4, bonusFromAbility: 'cha' },
    combat: true,
    blurb: 'Half a verse, spoken like an argument against dying.',
    intent: 'Bonus action. 1d4 + CHA healing at range, and it wakes the fallen.',
  },
  command: {
    id: 'command',
    name: 'Command',
    level: 1,
    kind: 'save',
    cost: 'action',
    usesSlot: true,
    enabled: true,
    accent: '#c85a72',
    save: { ability: 'wis', onSuccess: 'none' },
    status: 'commanded',
    combat: true,
    blurb: 'One word, in a voice that expects to be obeyed.',
    intent: 'Choose Halt, Flee, Kneel or Drop. On a failed WIS save, the target does exactly that.',
  },
  dissonantWhispers: {
    id: 'dissonantWhispers',
    name: 'Dissonant Whispers',
    level: 1,
    kind: 'save',
    cost: 'action',
    usesSlot: true,
    enabled: true,
    accent: '#7b4bb0',
    save: { ability: 'wis', onSuccess: 'half' },
    damage: { dice: 3, sides: 6, type: 'psychic' },
    status: 'fleeing',
    combat: true,
    blurb: 'He says something the room is not meant to hear. The target hears all of it.',
    intent: '3d6 psychic (half on a save). On a failure it turns and runs from him.',
  },
  disguiseSelf: {
    id: 'disguiseSelf',
    name: 'Disguise Self',
    level: 1,
    kind: 'utility',
    cost: 'action',
    usesSlot: true,
    enabled: false,
    accent: '#8e8296',
    combat: false,
    blurb: 'Considered, not prepared. Corvin has other faces; tonight he wears his own.',
    intent: 'Not prepared for this journey.',
  },
  detectMagic: {
    id: 'detectMagic',
    name: 'Detect Magic',
    level: 1,
    kind: 'utility',
    cost: 'action',
    usesSlot: true,
    enabled: false,
    accent: '#8e8296',
    combat: false,
    blurb: 'Considered, not prepared. The medallion has been doing this job for him, unasked.',
    intent: 'Not prepared for this journey.',
  },
};

export const SPELL_LIST: SpellData[] = Object.values(SPELLS);

export const COMBAT_SPELLS: SpellData[] = SPELL_LIST.filter((s) => s.enabled && s.combat);

/** Command words the player may choose. Each has its own failure choreography. */
export const COMMAND_WORDS = [
  { id: 'halt', word: 'Halt', effect: 'The target loses its action.' },
  { id: 'flee', word: 'Flee', effect: 'The target retreats to the rear and cannot attack.' },
  { id: 'kneel', word: 'Kneel', effect: 'The target drops prone; attacks against it are easier.' },
  { id: 'drop', word: 'Drop', effect: 'The target releases its weapon and strikes weakly.' },
] as const;

export type CommandWordId = (typeof COMMAND_WORDS)[number]['id'];

/** Context-sensitive mockery lines, so the cantrip never repeats itself. */
export const MOCKERY_LINES: Record<string, string[]> = {
  wolf: [
    '"Something bred you badly, and then the fog finished the job."',
    '"You have your mother\'s eyes. She wanted them back."',
    '"You are not even a good wolf. You are a rumour with teeth."',
  ],
  shade: [
    '"You were somebody once. Nobody remembers which somebody."',
    '"All that grief and you still could not learn a second trick."',
    '"You are a draught in the shape of a man. I have closed doors on better."',
  ],
  generic: [
    '"I have played for worse audiences. Fewer of them had claws."',
    '"Do keep trying. It is the only interesting thing about you."',
    '"You are working so hard. It shows. That is the tragedy."',
  ],
};
