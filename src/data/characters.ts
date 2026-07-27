/**
 * The cast. All original.
 *
 * Colours here drive both the 3D character construction and the dialogue
 * portrait plates, so a character always looks like themselves.
 */

export type CharacterId = 'corvin' | 'emrik' | 'nell' | 'ansbeth' | 'tovin' | 'voice' | 'narrator';
export type CompanionId = 'nell' | 'ansbeth';

export interface CharacterData {
  id: CharacterId;
  name: string;
  title: string;
  /** Two-tone plate colours for the dialogue portrait. */
  palette: { base: string; accent: string; ink: string };
  /** Body build used by the procedural character rig. */
  build: 'slender' | 'small' | 'broad' | 'stooped' | 'formless';
  height: number;
  blurb: string;
}

export const CHARACTERS: Record<CharacterId, CharacterData> = {
  corvin: {
    id: 'corvin',
    name: 'Corvin Vaelthorne',
    title: 'Wanderer, bard, unreliable narrator of his own life',
    palette: { base: '#2b1620', accent: '#8d2f42', ink: '#e8dfe6' },
    build: 'slender',
    height: 1.78,
    blurb: 'Dusky red skin, backward-curving horns, a smile he keeps like a lockpick.',
  },
  emrik: {
    id: 'emrik',
    name: 'Emrik Waldenfels',
    title: 'Merchant, of a sort',
    palette: { base: '#241c14', accent: '#b08340', ink: '#efe4cf' },
    build: 'broad',
    height: 1.74,
    blurb: 'Expensive coat, cheap nerves. His rings are turned inward, as if hiding a crest.',
  },
  nell: {
    id: 'nell',
    name: 'Nell Grubbin',
    title: 'Halfling scout, professional pessimist',
    palette: { base: '#1e2419', accent: '#7f9b5e', ink: '#e6ecd9' },
    build: 'small',
    height: 1.06,
    blurb: 'Reads roads the way other people read faces. Has never once been wrong about weather.',
  },
  ansbeth: {
    id: 'ansbeth',
    name: 'Ansbeth Cray',
    title: 'Caravan guard, lapsed something',
    palette: { base: '#1b1d24', accent: '#9aa7bd', ink: '#e8ecf5' },
    build: 'broad',
    height: 1.81,
    blurb: 'A scorched sunburst pin she has neither removed nor polished in four years.',
  },
  tovin: {
    id: 'tovin',
    name: 'Tovin',
    title: 'Keeps the inn, keeps his mouth shut',
    palette: { base: '#221a18', accent: '#8a6a4a', ink: '#e9ddd0' },
    build: 'stooped',
    height: 1.7,
    blurb: 'Wipes the same clean glass whenever the door is watched.',
  },
  voice: {
    id: 'voice',
    name: 'The Voice in the Mist',
    title: '',
    palette: { base: '#120c18', accent: '#6f4bab', ink: '#d8ccf0' },
    build: 'formless',
    height: 0,
    blurb: 'It knows the name. It has known it for some time.',
  },
  narrator: {
    id: 'narrator',
    name: '',
    title: '',
    palette: { base: '#0d0b10', accent: '#4a4356', ink: '#c9c2d4' },
    build: 'formless',
    height: 0,
    blurb: '',
  },
};

export const COMPANION_IDS: CompanionId[] = ['nell', 'ansbeth'];

/** Disposition thresholds used by dialogue conditions and the ending summary. */
export const DISPOSITION = {
  min: -3,
  max: 5,
  warm: 2,
  cold: -1,
} as const;
