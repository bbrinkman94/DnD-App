/**
 * Compact positional combat model.
 *
 * Not a 5e engine: four readable zones, one action + one bonus action + one
 * move per turn, and only the mechanics the encounter actually uses.
 */

import type { CommandWordId, SpellId } from '@/data/spells';

export type ZoneId = 'front' | 'cover' | 'rear' | 'high';

export interface ZoneData {
  id: ZoneId;
  name: string;
  description: string;
  neighbours: ZoneId[];
  /** Bonus to the occupant's AC. */
  acBonus: number;
  /** Bonus to the occupant's attack rolls and spell save DC. */
  offenceBonus: number;
  /** World position of the zone marker, for the 3D scene. */
  position: [number, number, number];
}

export type StatusId =
  | 'rattled'
  | 'frostbound'
  | 'shaken'
  | 'fleeing'
  | 'commanded'
  | 'prone'
  | 'inspired'
  | 'braced'
  | 'weakened';

export interface Status {
  id: StatusId;
  label: string;
  /** Rounds left; ticked at the end of the bearer's turn. */
  rounds: number;
  /** Inspiration carries the die size it will contribute. */
  die?: number;
  commandWord?: CommandWordId;
}

export type ActorKind = 'corvin' | 'companion' | 'wolf' | 'shade';
export type Side = 'ally' | 'enemy';

export interface ActorAttack {
  name: string;
  bonus: number;
  dice: number;
  sides: number;
  damageBonus: number;
  type: string;
  reach: 'melee' | 'ranged';
  flavour: string;
}

export interface Actor {
  id: string;
  name: string;
  side: Side;
  kind: ActorKind;
  hp: number;
  maxHp: number;
  ac: number;
  initiativeMod: number;
  initiative: number;
  zone: ZoneId;
  attack: ActorAttack;
  saves: { wis: number; con: number; dex: number };
  statuses: Status[];
  downed: boolean;
  /** Enemies are removed at 0 HP; allies go down and can be revived. */
  dead: boolean;
  accent: string;
  /** Mockery lines keyed by kind. */
  mockKey: string;
}

export interface TurnBudget {
  action: boolean;
  bonus: boolean;
  move: boolean;
}

export interface LogEntry {
  id: number;
  round: number;
  actorId: string;
  text: string;
  tone: 'neutral' | 'good' | 'bad' | 'critical' | 'spell';
  /** Expanded roll breakdown, shown inline in the log. */
  detail?: string;
}

export type CombatOutcome = 'ongoing' | 'victory' | 'defeat';

export interface CombatState {
  round: number;
  order: string[];
  turnIndex: number;
  actors: Record<string, Actor>;
  budget: TurnBudget;
  log: LogEntry[];
  logCounter: number;
  outcome: CombatOutcome;
  seed: number;
  /** Mirrors the run's resources so combat can spend and report them back. */
  resources: { slotsUsed: number; inspirationUsed: number };
  /** Increments whenever anything visual should react. */
  eventCounter: number;
  events: CombatEvent[];
}

export interface RollRecord {
  label: string;
  natural: number;
  modifier: number;
  bonusDie?: { label: string; sides: number; value: number };
  total: number;
  dc?: number;
  success: boolean;
  critical: 'success' | 'failure' | null;
}

export type CombatEvent =
  | { kind: 'roll'; actorId: string; roll: RollRecord }
  | { kind: 'attack'; actorId: string; targetId: string; hit: boolean; critical: boolean }
  | { kind: 'spell'; actorId: string; targetId?: string; spell: SpellId; success: boolean }
  | { kind: 'damage'; targetId: string; amount: number; damageType: string }
  | { kind: 'heal'; targetId: string; amount: number }
  | { kind: 'down'; targetId: string }
  | { kind: 'revive'; targetId: string }
  | { kind: 'move'; actorId: string; from: ZoneId; to: ZoneId }
  | { kind: 'inspire'; actorId: string; targetId: string }
  | { kind: 'status'; targetId: string; status: StatusId }
  | { kind: 'outcome'; outcome: CombatOutcome };

export type PlayerAction =
  | { kind: 'attack'; weaponId: string; targetId: string }
  | { kind: 'spell'; spellId: SpellId; targetId?: string; commandWord?: CommandWordId }
  | { kind: 'inspire'; targetId: string }
  | { kind: 'move'; to: ZoneId }
  | { kind: 'defend' }
  | { kind: 'endTurn' };
