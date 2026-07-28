/**
 * Combat resolution.
 *
 * Every function takes a state and returns a new one, together with log lines
 * and events.  The renderer is a pure consumer: it never decides an outcome, it
 * only plays what the engine already decided.  That is what makes the physical
 * d20 honest — the number exists before the die is thrown.
 */

import { CORVIN } from '@/data/corvin';
import { abilityModifier } from '@/data/abilities';
import { CHARACTERS, type CompanionId } from '@/data/characters';
import { COMMAND_WORDS, MOCKERY_LINES, SPELLS, type CommandWordId, type SpellId } from '@/data/spells';
import { ALLY_TEMPLATES, CORVIN_START_ZONE, ENEMIES, ZONES } from '@/data/encounter';
import { resolveAttack, rollD20, rollDamage, rollDice, rollDie, sum } from '@/game/dice';
import { createRng, type Rng } from '@/game/rng';
import { totalSlots } from '@/game/save';
import type {
  Actor,
  CombatEvent,
  CombatState,
  LogEntry,
  PlayerAction,
  RollRecord,
  Status,
  StatusId,
  ZoneId,
} from './types';

export interface CombatSetup {
  seed: number;
  corvinHp: number;
  slotsUsed: number;
  inspirationUsed: number;
  allies: CompanionId[];
}

const STATUS_LABEL: Record<StatusId, string> = {
  rattled: 'Rattled',
  frostbound: 'Frostbound',
  shaken: 'Shaken',
  fleeing: 'Fleeing',
  commanded: 'Commanded',
  prone: 'Prone',
  inspired: 'Inspired',
  braced: 'Braced',
  weakened: 'Weakened',
};

export function createCombat(setup: CombatSetup): CombatState {
  const rng = createRng(setup.seed);
  const actors: Record<string, Actor> = {};

  actors.corvin = {
    id: 'corvin',
    name: CORVIN.name.split(' ')[0],
    side: 'ally',
    kind: 'corvin',
    hp: Math.max(1, setup.corvinHp),
    maxHp: CORVIN.maxHp,
    ac: CORVIN.armorClass,
    initiativeMod: CORVIN.initiative,
    initiative: 0,
    zone: CORVIN_START_ZONE,
    attack: {
      name: CORVIN.weapons[0].name,
      bonus: CORVIN.weapons[0].attackBonus,
      dice: CORVIN.weapons[0].damageDice,
      sides: CORVIN.weapons[0].damageSides,
      damageBonus: CORVIN.weapons[0].damageBonus,
      type: CORVIN.weapons[0].damageType,
      reach: 'melee',
      flavour: 'He would honestly rather not.',
    },
    saves: {
      wis: abilityModifier(CORVIN.abilities.wis),
      con: abilityModifier(CORVIN.abilities.con),
      dex: abilityModifier(CORVIN.abilities.dex) + CORVIN.proficiencyBonus,
    },
    statuses: [],
    downed: false,
    dead: false,
    accent: CHARACTERS.corvin.palette.accent,
    mockKey: 'generic',
  };

  for (const id of setup.allies) {
    const template = ALLY_TEMPLATES[id];
    actors[id] = {
      id,
      name: CHARACTERS[id].name.split(' ')[0],
      side: 'ally',
      kind: 'companion',
      hp: template.maxHp,
      maxHp: template.maxHp,
      ac: template.ac,
      initiativeMod: template.initiativeMod,
      initiative: 0,
      zone: template.zone,
      attack: { ...template.attack },
      saves: { ...template.saves },
      statuses: [],
      downed: false,
      dead: false,
      accent: CHARACTERS[id].palette.accent,
      mockKey: 'generic',
    };
  }

  for (const template of ENEMIES) {
    actors[template.id] = {
      id: template.id,
      name: template.name,
      side: 'enemy',
      kind: template.kind,
      hp: template.maxHp,
      maxHp: template.maxHp,
      ac: template.ac,
      initiativeMod: template.initiativeMod,
      initiative: 0,
      zone: template.zone,
      attack: { ...template.attack },
      saves: { ...template.saves },
      statuses: [],
      downed: false,
      dead: false,
      accent: template.accent,
      mockKey: template.mockKey,
    };
  }

  for (const actor of Object.values(actors)) {
    actor.initiative = rollDie(20, rng) + actor.initiativeMod;
  }

  const order = Object.values(actors)
    .sort((a, b) => b.initiative - a.initiative || b.initiativeMod - a.initiativeMod || a.id.localeCompare(b.id))
    .map((a) => a.id);

  const state: CombatState = {
    round: 1,
    order,
    turnIndex: 0,
    actors,
    budget: { action: true, bonus: true, move: true },
    log: [],
    logCounter: 0,
    outcome: 'ongoing',
    seed: setup.seed,
    resources: { slotsUsed: setup.slotsUsed, inspirationUsed: setup.inspirationUsed },
    eventCounter: 0,
    events: [],
  };

  pushLog(state, 'corvin', 'Initiative. The fog stops moving, which is worse.', 'neutral');
  for (const id of order) {
    const actor = actors[id];
    pushLog(state, id, `${actor.name} acts on ${actor.initiative}.`, 'neutral');
  }
  return state;
}

/* ---------------------------------------------------------------- helpers */

function clone(state: CombatState): CombatState {
  const actors: Record<string, Actor> = {};
  for (const [id, actor] of Object.entries(state.actors)) {
    actors[id] = { ...actor, statuses: actor.statuses.map((s) => ({ ...s })) };
  }
  return { ...state, actors, log: [...state.log], events: [], budget: { ...state.budget } };
}

function pushLog(
  state: CombatState,
  actorId: string,
  text: string,
  tone: LogEntry['tone'],
  detail?: string,
): void {
  state.logCounter += 1;
  state.log.push({ id: state.logCounter, round: state.round, actorId, text, tone, detail });
  if (state.log.length > 80) state.log.splice(0, state.log.length - 80);
}

function emit(state: CombatState, event: CombatEvent): void {
  state.events.push(event);
  state.eventCounter += 1;
}

export function currentActor(state: CombatState): Actor {
  return state.actors[state.order[state.turnIndex]];
}

export function livingEnemies(state: CombatState): Actor[] {
  return Object.values(state.actors).filter((a) => a.side === 'enemy' && !a.dead);
}

export function livingAllies(state: CombatState): Actor[] {
  return Object.values(state.actors).filter((a) => a.side === 'ally' && !a.dead);
}

export function hasStatus(actor: Actor, id: StatusId): boolean {
  return actor.statuses.some((s) => s.id === id);
}

function addStatus(state: CombatState, actor: Actor, status: Status): void {
  const existing = actor.statuses.findIndex((s) => s.id === status.id);
  if (existing >= 0) actor.statuses[existing] = status;
  else actor.statuses.push(status);
  emit(state, { kind: 'status', targetId: actor.id, status: status.id });
}

export function zonesAdjacent(a: ZoneId, b: ZoneId): boolean {
  return a === b || ZONES[a].neighbours.includes(b);
}

/** AC including cover, prone and the like. */
export function effectiveAc(actor: Actor, attackerReach: 'melee' | 'ranged'): number {
  let ac = actor.ac + ZONES[actor.zone].acBonus;
  if (hasStatus(actor, 'prone')) ac += attackerReach === 'melee' ? -2 : 2;
  if (hasStatus(actor, 'braced')) ac += 2;
  return ac;
}

export function attackModifier(actor: Actor): number {
  let bonus = actor.attack.bonus + ZONES[actor.zone].offenceBonus;
  if (hasStatus(actor, 'rattled')) bonus -= 3;
  if (hasStatus(actor, 'shaken')) bonus -= 2;
  if (hasStatus(actor, 'weakened')) bonus -= 2;
  if (hasStatus(actor, 'prone')) bonus -= 2;
  return bonus;
}

export function spellSaveDc(actor: Actor): number {
  return CORVIN.spellSaveDc + ZONES[actor.zone].offenceBonus;
}

/** Can this actor be reached by that attack right now? */
export function canTarget(attacker: Actor, target: Actor): boolean {
  if (target.dead) return false;
  if (attacker.attack.reach === 'ranged') return true;
  return zonesAdjacent(attacker.zone, target.zone);
}

function consumeInspiration(actor: Actor): Status | undefined {
  const index = actor.statuses.findIndex((s) => s.id === 'inspired');
  if (index < 0) return undefined;
  const [status] = actor.statuses.splice(index, 1);
  return status;
}

function makeRoll(
  label: string,
  modifier: number,
  rng: Rng,
  options: { dc?: number; advantage?: boolean; disadvantage?: boolean } = {},
): { record: RollRecord; natural: number; total: number } {
  const roll = rollD20(modifier, { rng, advantage: options.advantage, disadvantage: options.disadvantage });
  const success =
    options.dc === undefined
      ? true
      : roll.criticalSuccess
        ? true
        : roll.criticalFailure
          ? false
          : roll.total >= options.dc;
  return {
    natural: roll.natural,
    total: roll.total,
    record: {
      label,
      natural: roll.natural,
      modifier,
      total: roll.total,
      dc: options.dc,
      success,
      critical: roll.criticalSuccess ? 'success' : roll.criticalFailure ? 'failure' : null,
    },
  };
}

function applyDamage(state: CombatState, target: Actor, amount: number, type: string): void {
  target.hp = Math.max(0, target.hp - amount);
  emit(state, { kind: 'damage', targetId: target.id, amount, damageType: type });
  if (target.hp > 0) return;

  if (target.side === 'enemy') {
    target.dead = true;
    target.downed = true;
    pushLog(state, target.id, `${target.name} comes apart into wet air.`, 'good');
    emit(state, { kind: 'down', targetId: target.id });
  } else if (target.id === 'corvin') {
    target.downed = true;
    pushLog(state, 'corvin', 'Corvin goes down. The medallion is very, very cold.', 'bad');
    emit(state, { kind: 'down', targetId: 'corvin' });
  } else {
    target.downed = true;
    pushLog(state, target.id, `${target.name} drops and does not get up.`, 'bad');
    emit(state, { kind: 'down', targetId: target.id });
  }
}

function healActor(state: CombatState, target: Actor, amount: number): void {
  const wasDown = target.downed;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  target.downed = target.hp <= 0;
  emit(state, { kind: 'heal', targetId: target.id, amount });
  if (wasDown && !target.downed) {
    emit(state, { kind: 'revive', targetId: target.id });
    pushLog(state, target.id, `${target.name} comes back up, swearing.`, 'good');
  }
}

function checkOutcome(state: CombatState): void {
  if (state.outcome !== 'ongoing') return;
  if (livingEnemies(state).length === 0) {
    state.outcome = 'victory';
    emit(state, { kind: 'outcome', outcome: 'victory' });
    pushLog(state, 'corvin', 'Silence. The kind that is listening.', 'good');
    return;
  }
  const corvin = state.actors.corvin;
  if (corvin.downed) {
    state.outcome = 'defeat';
    emit(state, { kind: 'outcome', outcome: 'defeat' });
    pushLog(state, 'corvin', 'The road goes dark before he finishes the line.', 'bad');
  }
}

/* --------------------------------------------------------------- actions */

export interface ActionResult {
  state: CombatState;
  events: CombatEvent[];
}

export function performPlayerAction(state: CombatState, action: PlayerAction): ActionResult {
  const next = clone(state);
  const rng = createRng(next.seed + next.logCounter * 7919 + next.round * 104729);
  const corvin = next.actors.corvin;
  if (next.outcome !== 'ongoing' || currentActor(next).id !== 'corvin') {
    return { state: next, events: [] };
  }

  switch (action.kind) {
    case 'move': {
      if (!next.budget.move || !zonesAdjacent(corvin.zone, action.to) || corvin.zone === action.to) break;
      const from = corvin.zone;
      corvin.zone = action.to;
      next.budget.move = false;
      emit(next, { kind: 'move', actorId: 'corvin', from, to: action.to });
      pushLog(next, 'corvin', `Corvin moves to ${ZONES[action.to].name}.`, 'neutral');
      break;
    }
    case 'attack': {
      if (!next.budget.action) break;
      const weapon = CORVIN.weapons.find((w) => w.id === action.weaponId) ?? CORVIN.weapons[0];
      const target = next.actors[action.targetId];
      if (!target || target.dead) break;
      const isMelee = weapon.reach === 'melee';
      if (isMelee && !zonesAdjacent(corvin.zone, target.zone)) break;
      next.budget.action = false;

      const modifier = weapon.attackBonus + ZONES[corvin.zone].offenceBonus - (hasStatus(corvin, 'shaken') ? 2 : 0);
      const inspiration = consumeInspiration(corvin);
      const { record, total } = makeRoll(`${weapon.name} attack`, modifier, rng, {
        dc: effectiveAc(target, isMelee ? 'melee' : 'ranged'),
      });
      if (inspiration?.die) {
        const value = rollDie(inspiration.die, rng);
        record.bonusDie = { label: 'Bardic Inspiration', sides: inspiration.die, value };
        record.total = total + value;
        record.success =
          record.critical === 'success'
            ? true
            : record.critical === 'failure'
              ? false
              : record.total >= (record.dc ?? 0);
      }
      emit(next, { kind: 'roll', actorId: 'corvin', roll: record });

      const attack = resolveAttack(
        { ...rollD20(0, { forceNatural: record.natural }), modifier, total: record.total },
        record.dc ?? target.ac,
      );
      emit(next, { kind: 'attack', actorId: 'corvin', targetId: target.id, hit: attack.hit, critical: attack.critical });

      if (attack.hit) {
        const damage = rollDamage(weapon.damageDice, weapon.damageSides, weapon.damageBonus, weapon.damageType, {
          critical: attack.critical,
          rng,
        });
        applyDamage(next, target, damage.total, damage.type);
        pushLog(
          next,
          'corvin',
          attack.critical
            ? `The rapier finds the seam. ${damage.total} ${damage.type}.`
            : `${weapon.name} lands on ${target.name} for ${damage.total}.`,
          attack.critical ? 'critical' : 'good',
          `d20 ${record.natural} + ${modifier} = ${record.total} vs AC ${record.dc}`,
        );
      } else {
        pushLog(next, 'corvin', `The ${weapon.name.toLowerCase()} goes through fog and nothing else.`, 'bad', `d20 ${record.natural} + ${modifier} = ${record.total} vs AC ${record.dc}`);
      }
      break;
    }
    case 'spell': {
      const spell = SPELLS[action.spellId];
      if (!spell || !spell.enabled) break;
      const usesBonus = spell.cost === 'bonus';
      if (usesBonus ? !next.budget.bonus : !next.budget.action) break;
      if (spell.usesSlot && next.resources.slotsUsed >= totalSlots()) break;

      const target = action.targetId ? next.actors[action.targetId] : undefined;
      if (spell.kind !== 'utility' && !target) break;
      if (target && target.dead && spell.kind !== 'heal') break;

      if (usesBonus) next.budget.bonus = false;
      else next.budget.action = false;
      if (spell.usesSlot) next.resources.slotsUsed += 1;

      castSpell(next, rng, action.spellId, target, action.commandWord);
      break;
    }
    case 'inspire': {
      if (!next.budget.bonus) break;
      if (next.resources.inspirationUsed >= CORVIN.bardicInspiration.uses) break;
      const target = next.actors[action.targetId];
      // Corvin cannot inspire himself: the whole point is that he lifts others.
      if (!target || target.id === 'corvin' || target.side !== 'ally' || target.dead) break;
      next.budget.bonus = false;
      next.resources.inspirationUsed += 1;
      addStatus(next, target, {
        id: 'inspired',
        label: STATUS_LABEL.inspired,
        rounds: 10,
        die: CORVIN.bardicInspiration.die,
      });
      emit(next, { kind: 'inspire', actorId: 'corvin', targetId: target.id });
      pushLog(
        next,
        'corvin',
        `Four bars of something old. ${target.name} straightens: d${CORVIN.bardicInspiration.die} on their next roll.`,
        'spell',
      );
      break;
    }
    case 'defend': {
      if (!next.budget.action) break;
      next.budget.action = false;
      addStatus(next, corvin, { id: 'braced', label: STATUS_LABEL.braced, rounds: 2 });
      pushLog(
        next,
        'corvin',
        'Corvin sets his feet and watches the fog instead of the wolves. +2 AC until his next turn.',
        'neutral',
      );
      break;
    }
    case 'endTurn':
      return endTurn(next);
  }

  checkOutcome(next);
  return { state: next, events: next.events };
}

function castSpell(
  state: CombatState,
  rng: Rng,
  spellId: SpellId,
  target: Actor | undefined,
  commandWord?: CommandWordId,
): void {
  const spell = SPELLS[spellId];
  const corvin = state.actors.corvin;
  const dc = spellSaveDc(corvin);

  if (spell.kind === 'heal' && target) {
    const heal = spell.heal!;
    const amount =
      sum(rollDice(heal.dice, heal.sides, rng)) + abilityModifier(CORVIN.abilities[heal.bonusFromAbility]);
    healActor(state, target, amount);
    emit(state, { kind: 'spell', actorId: 'corvin', spell: spellId, targetId: target.id, success: true });
    pushLog(state, 'corvin', `"Not tonight." ${target.name} recovers ${amount}.`, 'spell');
    return;
  }

  if (spellId === 'thaumaturgy') {
    const candidates = livingEnemies(state);
    const victim = target ?? candidates[0];
    if (!victim) return;
    addStatus(state, victim, { id: 'shaken', label: STATUS_LABEL.shaken, rounds: 2 });
    emit(state, { kind: 'spell', actorId: 'corvin', spell: spellId, targetId: victim.id, success: true });
    pushLog(
      state,
      'corvin',
      `His voice arrives from three directions. ${victim.name} flinches from the wrong one.`,
      'spell',
    );
    return;
  }

  if (!target) return;
  const saveAbility = spell.save?.ability ?? 'wis';
  const saveMod = target.saves[saveAbility as 'wis' | 'con' | 'dex'] ?? 0;
  const { record } = makeRoll(`${target.name} ${saveAbility.toUpperCase()} save`, saveMod, rng, {
    dc,
    disadvantage: hasStatus(target, 'frostbound'),
  });
  emit(state, { kind: 'roll', actorId: target.id, roll: record });
  const saved = record.success;
  emit(state, { kind: 'spell', actorId: 'corvin', spell: spellId, targetId: target.id, success: !saved });

  if (spellId === 'viciousMockery') {
    const line = MOCKERY_LINES[target.mockKey] ?? MOCKERY_LINES.generic;
    const chosen = line[(state.logCounter + state.round) % line.length];
    if (!saved) {
      const damage = rollDamage(spell.damage!.dice, spell.damage!.sides, 0, spell.damage!.type, { rng });
      applyDamage(state, target, damage.total, damage.type);
      addStatus(state, target, { id: 'rattled', label: STATUS_LABEL.rattled, rounds: 2 });
      pushLog(state, 'corvin', `${chosen} — ${damage.total} psychic, and it swings wide next turn.`, 'spell', saveDetail(record));
    } else {
      pushLog(state, 'corvin', `${chosen} It does not understand the words. Only the tone.`, 'neutral', saveDetail(record));
    }
    return;
  }

  if (spellId === 'frostgrip') {
    if (!saved) {
      const damage = rollDamage(spell.damage!.dice, spell.damage!.sides, 0, spell.damage!.type, { rng });
      applyDamage(state, target, damage.total, damage.type);
      addStatus(state, target, { id: 'frostbound', label: STATUS_LABEL.frostbound, rounds: 2 });
      pushLog(state, 'corvin', `Black ice climbs ${target.name}. ${damage.total} cold, and it slows.`, 'spell', saveDetail(record));
    } else {
      pushLog(state, 'corvin', `The frost crawls up and finds nothing to hold.`, 'neutral', saveDetail(record));
    }
    return;
  }

  if (spellId === 'dissonantWhispers') {
    const damage = rollDamage(spell.damage!.dice, spell.damage!.sides, 0, spell.damage!.type, { rng });
    const amount = saved ? Math.floor(damage.total / 2) : damage.total;
    applyDamage(state, target, amount, damage.type);
    if (!saved) {
      addStatus(state, target, { id: 'fleeing', label: STATUS_LABEL.fleeing, rounds: 1 });
      pushLog(
        state,
        'corvin',
        `He says something quietly. ${target.name} hears all of it and runs — ${amount} psychic.`,
        'spell',
        saveDetail(record),
      );
    } else {
      pushLog(state, 'corvin', `It holds, barely. ${amount} psychic, and it will not look at him.`, 'spell', saveDetail(record));
    }
    return;
  }

  if (spellId === 'command') {
    const word = COMMAND_WORDS.find((w) => w.id === commandWord) ?? COMMAND_WORDS[0];
    if (!saved) {
      switch (word.id) {
        case 'halt':
          addStatus(state, target, { id: 'commanded', label: 'Halted', rounds: 1, commandWord: 'halt' });
          break;
        case 'flee':
          addStatus(state, target, { id: 'fleeing', label: STATUS_LABEL.fleeing, rounds: 1, commandWord: 'flee' });
          break;
        case 'kneel':
          addStatus(state, target, { id: 'prone', label: STATUS_LABEL.prone, rounds: 2, commandWord: 'kneel' });
          break;
        case 'drop':
          addStatus(state, target, { id: 'weakened', label: STATUS_LABEL.weakened, rounds: 2, commandWord: 'drop' });
          break;
      }
      pushLog(state, 'corvin', `"${word.word}." ${target.name} obeys before it decides not to.`, 'spell', saveDetail(record));
    } else {
      pushLog(state, 'corvin', `"${word.word}." The word lands and slides off.`, 'neutral', saveDetail(record));
    }
  }
}

function saveDetail(record: RollRecord): string {
  return `${record.label}: d20 ${record.natural} + ${record.modifier} = ${record.total} vs DC ${record.dc}`;
}

/* ------------------------------------------------------------------ turns */

export function endTurn(state: CombatState): ActionResult {
  const next = state.events.length === 0 ? clone(state) : state;
  const actor = currentActor(next);
  tickStatuses(actor);

  next.turnIndex += 1;
  if (next.turnIndex >= next.order.length) {
    next.turnIndex = 0;
    next.round += 1;
  }
  // Skip anyone who is out of the fight.
  let guard = 0;
  while (guard < next.order.length * 2) {
    const candidate = next.actors[next.order[next.turnIndex]];
    if (!candidate.dead && !(candidate.side === 'ally' && candidate.downed)) break;
    if (candidate.side === 'ally' && candidate.downed && candidate.id !== 'corvin') break; // downed allies still tick
    next.turnIndex += 1;
    if (next.turnIndex >= next.order.length) {
      next.turnIndex = 0;
      next.round += 1;
    }
    guard += 1;
  }
  next.budget = { action: true, bonus: true, move: true };
  checkOutcome(next);
  return { state: next, events: next.events };
}

function tickStatuses(actor: Actor): void {
  actor.statuses = actor.statuses
    .map((s) => (s.id === 'inspired' ? s : { ...s, rounds: s.rounds - 1 }))
    .filter((s) => s.rounds > 0);
}

/* --------------------------------------------------------------- ai turns */

export function runAiTurn(state: CombatState): ActionResult {
  const next = clone(state);
  const actor = currentActor(next);
  const rng = createRng(next.seed + next.logCounter * 31337 + next.round * 7);

  if (next.outcome !== 'ongoing' || actor.id === 'corvin') return { state: next, events: [] };

  if (actor.dead) return endTurn(next);

  if (actor.side === 'ally' && actor.downed) {
    pushLog(next, actor.id, `${actor.name} is down. Someone should do something about that.`, 'bad');
    return endTurn(next);
  }

  if (hasStatus(actor, 'commanded')) {
    pushLog(next, actor.id, `${actor.name} stands exactly where it was told to stand.`, 'spell');
    return endTurn(next);
  }

  if (hasStatus(actor, 'fleeing')) {
    const retreat = actor.side === 'enemy' ? 'rear' : 'cover';
    if (actor.zone !== retreat && zonesAdjacent(actor.zone, retreat as ZoneId)) {
      const from = actor.zone;
      actor.zone = retreat as ZoneId;
      emit(next, { kind: 'move', actorId: actor.id, from, to: actor.zone });
    }
    pushLog(next, actor.id, `${actor.name} puts distance between itself and whatever he just said.`, 'spell');
    return endTurn(next);
  }

  const enemiesOf = actor.side === 'enemy' ? livingAllies(next).filter((a) => !a.downed) : livingEnemies(next);
  if (enemiesOf.length === 0) {
    checkOutcome(next);
    return endTurn(next);
  }

  // The shade does not open with violence. It kneels, and the fog leans in.
  if (actor.kind === 'shade' && next.round === 1) {
    const victim = enemiesOf.sort((a, b) => b.maxHp - a.maxHp)[0];
    addStatus(next, victim, { id: 'shaken', label: 'Shaken', rounds: 2 });
    pushLog(
      next,
      actor.id,
      `The Grey Petitioner kneels and says a name that is almost ${victim.name}'s.`,
      'bad',
    );
    return endTurn(next);
  }

  const reachable = enemiesOf.filter((t) => canTarget(actor, t));
  let target = reachable.sort((a, b) => threat(actor, b) - threat(actor, a))[0];

  if (!target) {
    const wanted = enemiesOf.sort((a, b) => threat(actor, b) - threat(actor, a))[0];
    const step = ZONES[actor.zone].neighbours.find((z) => zonesAdjacent(z, wanted.zone)) ?? wanted.zone;
    if (zonesAdjacent(actor.zone, step)) {
      const from = actor.zone;
      actor.zone = step;
      emit(next, { kind: 'move', actorId: actor.id, from, to: step });
      pushLog(next, actor.id, `${actor.name} closes to ${ZONES[step].name}.`, 'neutral');
    }
    target = enemiesOf
      .filter((t) => canTarget(actor, t))
      .sort((a, b) => threat(actor, b) - threat(actor, a))[0];
    if (!target) return endTurn(next);
  }

  const inspiration = consumeInspiration(actor);
  const modifier = attackModifier(actor);
  const { record } = makeRoll(`${actor.attack.name}`, modifier, rng, {
    dc: effectiveAc(target, actor.attack.reach),
  });
  if (inspiration?.die) {
    const value = rollDie(inspiration.die, rng);
    record.bonusDie = { label: 'Bardic Inspiration', sides: inspiration.die, value };
    record.total += value;
    record.success =
      record.critical === 'success'
        ? true
        : record.critical === 'failure'
          ? false
          : record.total >= (record.dc ?? 0);
  }
  emit(next, { kind: 'roll', actorId: actor.id, roll: record });

  const hit = record.critical === 'success' ? true : record.critical === 'failure' ? false : record.success;
  emit(next, {
    kind: 'attack',
    actorId: actor.id,
    targetId: target.id,
    hit,
    critical: record.critical === 'success',
  });

  if (hit) {
    const damage = rollDamage(
      actor.attack.dice,
      actor.attack.sides,
      actor.attack.damageBonus,
      actor.attack.type,
      { critical: record.critical === 'success', rng },
    );
    applyDamage(next, target, damage.total, damage.type);
    pushLog(
      next,
      actor.id,
      `${actor.name} hits ${target.name} for ${damage.total} ${damage.type}.`,
      actor.side === 'enemy' ? 'bad' : 'good',
      `${record.label}: d20 ${record.natural} + ${record.modifier} = ${record.total} vs AC ${record.dc}`,
    );
  } else {
    pushLog(
      next,
      actor.id,
      `${actor.name} misses ${target.name}.`,
      'neutral',
      `${record.label}: d20 ${record.natural} + ${record.modifier} = ${record.total} vs AC ${record.dc}`,
    );
  }

  checkOutcome(next);
  if (next.outcome !== 'ongoing') return { state: next, events: next.events };
  return endTurn(next);
}

/**
 * Who an AI actor wants to hit.
 *
 * Beasts fight what is in their teeth — the armoured guard in front of them —
 * and only reach past her when nothing else is close.  The shade is a different
 * problem: it is not hunting, it is *drawn*, and what it is drawn to is the
 * medallion around Corvin's neck.  That asymmetry is the encounter's whole
 * texture, so it lives in one readable function.
 */
function threat(actor: Actor, target: Actor): number {
  let score = 0;
  if (actor.zone === target.zone) score += 6;
  else if (zonesAdjacent(actor.zone, target.zone)) score += 2;
  score += (1 - target.hp / target.maxHp) * 3;

  if (actor.side === 'enemy') {
    if (target.kind === 'companion') score += 2.5;
    if (target.kind === 'corvin') score += actor.kind === 'shade' ? 3 : -2.5;
  }
  return score;
}

/** Preview text for the hovered action — intent, never a damage promise. */
export function describeTargetPreview(state: CombatState, actorId: string, targetId: string): string {
  const actor = state.actors[actorId];
  const target = state.actors[targetId];
  if (!actor || !target) return '';
  const ac = effectiveAc(target, actor.attack.reach);
  const cover = ZONES[target.zone].acBonus > 0 ? ` (+${ZONES[target.zone].acBonus} from ${ZONES[target.zone].name})` : '';
  return `AC ${ac}${cover} · ${target.hp}/${target.maxHp} HP`;
}
