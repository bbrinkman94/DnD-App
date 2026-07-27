/**
 * Combat interface.
 *
 * Pick an action, then a target. Every button states its cost, every target
 * states what it will take to hit, and every roll the engine makes is shown —
 * including the enemy's saving throws.
 */

import { useEffect, useMemo, useState } from 'react';
import { CORVIN } from '@/data/corvin';
import { COMBAT_SPELLS, COMMAND_WORDS, SPELLS, type CommandWordId, type SpellId } from '@/data/spells';
import { ENEMIES, ZONES, ZONE_ORDER } from '@/data/encounter';
import { currentActor, describeTargetPreview, zonesAdjacent } from '@/combat/engine';
import type { PlayerAction, RollRecord, ZoneId } from '@/combat/types';
import { totalSlots } from '@/game/save';
import { useGame } from '@/game/store';

type Pending =
  | { kind: 'attack'; weaponId: string }
  | { kind: 'spell'; spellId: SpellId; commandWord?: CommandWordId }
  | { kind: 'inspire' }
  | null;

export function CombatUI(): JSX.Element | null {
  const combat = useGame((s) => s.combat);
  const busy = useGame((s) => s.combatBusy);
  const submit = useGame((s) => s.submitCombatAction);
  const retry = useGame((s) => s.retryCombat);
  const finish = useGame((s) => s.finishCombat);
  const [pending, setPending] = useState<Pending>(null);
  const [preview, setPreview] = useState('');
  const [lastRoll, setLastRoll] = useState<{ label: string; record: RollRecord } | null>(null);

  const events = combat?.events ?? [];
  useEffect(() => {
    const roll = [...events].reverse().find((e) => e.kind === 'roll');
    if (roll && roll.kind === 'roll') {
      setLastRoll({ label: combat?.actors[roll.actorId]?.name ?? '', record: roll.roll });
      const timer = window.setTimeout(() => setLastRoll(null), 2600);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [events, combat]);

  useEffect(() => {
    setPending(null);
  }, [combat?.turnIndex, combat?.round]);

  const enemyReads = useMemo(() => Object.fromEntries(ENEMIES.map((e) => [e.id, e.read])), []);

  if (!combat) return null;

  const active = currentActor(combat);
  const corvin = combat.actors.corvin;
  const isPlayerTurn = active.id === 'corvin' && combat.outcome === 'ongoing' && !busy;
  const slotsLeft = totalSlots() - combat.resources.slotsUsed;
  const inspirationLeft = CORVIN.bardicInspiration.uses - combat.resources.inspirationUsed;

  const act = (action: PlayerAction): void => {
    submit(action);
    setPending(null);
    setPreview('');
  };

  const targetsFor = (pendingAction: Pending): string[] => {
    if (!pendingAction) return [];
    if (pendingAction.kind === 'inspire') {
      return Object.values(combat.actors)
        .filter((a) => a.side === 'ally' && a.id !== 'corvin' && !a.dead)
        .map((a) => a.id);
    }
    if (pendingAction.kind === 'attack') {
      const weapon = CORVIN.weapons.find((w) => w.id === pendingAction.weaponId);
      return Object.values(combat.actors)
        .filter(
          (a) =>
            a.side === 'enemy' &&
            !a.dead &&
            (weapon?.reach === 'thrown' || zonesAdjacent(corvin.zone, a.zone)),
        )
        .map((a) => a.id);
    }
    const spell = SPELLS[pendingAction.spellId];
    if (spell.kind === 'heal') {
      return Object.values(combat.actors)
        .filter((a) => a.side === 'ally' && !a.dead)
        .map((a) => a.id);
    }
    return Object.values(combat.actors)
      .filter((a) => a.side === 'enemy' && !a.dead)
      .map((a) => a.id);
  };

  const targets = targetsFor(pending);

  return (
    <div className="combat">
      <div className="combat__order">
        <span className="eyebrow" style={{ marginRight: '0.4rem' }}>
          Round {combat.round}
        </span>
        {combat.order.map((id) => {
          const actor = combat.actors[id];
          return (
            <div
              key={id}
              className="turn-chip"
              data-active={active.id === id}
              data-side={actor.side}
              data-down={actor.downed || actor.dead}
              title={`${actor.name} — initiative ${actor.initiative}, AC ${actor.ac}`}
            >
              <span>{actor.name}</span>
              <span className="hp-bar">
                <span style={{ width: `${Math.max(0, (actor.hp / actor.maxHp) * 100)}%` }} />
              </span>
              {actor.statuses.length > 0 && (
                <span className="eyebrow">{actor.statuses.map((s) => s.label).join(' · ')}</span>
              )}
            </div>
          );
        })}
      </div>

      {lastRoll && (
        <div className="roll-flash" data-success={lastRoll.record.success}>
          <span>{lastRoll.label}</span>
          <span className="eyebrow">{lastRoll.record.label}</span>
          <b>{lastRoll.record.natural}</b>
          <span>
            {lastRoll.record.modifier >= 0 ? '+' : '−'}
            {Math.abs(lastRoll.record.modifier)}
            {lastRoll.record.bonusDie ? ` + d${lastRoll.record.bonusDie.sides}(${lastRoll.record.bonusDie.value})` : ''} ={' '}
            <b>{lastRoll.record.total}</b>
            {lastRoll.record.dc !== undefined ? ` vs ${lastRoll.record.dc}` : ''}
          </span>
        </div>
      )}

      <div className="combat__bottom">
        <div className="actions">
          <div className="actions__row">
            {CORVIN.weapons.map((weapon) => (
              <button
                key={weapon.id}
                className="action-btn"
                data-selected={pending?.kind === 'attack' && pending.weaponId === weapon.id}
                disabled={!isPlayerTurn || !combat.budget.action}
                onMouseEnter={() => setPreview(weapon.description)}
                onFocus={() => setPreview(weapon.description)}
                onClick={() => setPending({ kind: 'attack', weaponId: weapon.id })}
              >
                {weapon.name}
                <small>
                  Action · {formatAttack(weapon.attackBonus)} · {weapon.damageDice}d{weapon.damageSides}+
                  {weapon.damageBonus}
                </small>
              </button>
            ))}

            {COMBAT_SPELLS.map((spell) => {
              const disabled =
                !isPlayerTurn ||
                (spell.cost === 'bonus' ? !combat.budget.bonus : !combat.budget.action) ||
                (spell.usesSlot && slotsLeft <= 0);
              return (
                <button
                  key={spell.id}
                  className="action-btn"
                  data-selected={pending?.kind === 'spell' && pending.spellId === spell.id}
                  disabled={disabled}
                  onMouseEnter={() => setPreview(spell.intent)}
                  onFocus={() => setPreview(spell.intent)}
                  onClick={() => {
                    if (spell.id === 'thaumaturgy') {
                      act({ kind: 'spell', spellId: spell.id });
                      return;
                    }
                    setPending({ kind: 'spell', spellId: spell.id });
                  }}
                >
                  {spell.name}
                  <small>
                    {spell.cost === 'bonus' ? 'Bonus' : 'Action'}
                    {spell.usesSlot ? ` · slot (${slotsLeft} left)` : ' · cantrip'}
                  </small>
                </button>
              );
            })}

            <button
              className="action-btn"
              data-selected={pending?.kind === 'inspire'}
              disabled={!isPlayerTurn || !combat.budget.bonus || inspirationLeft <= 0}
              onMouseEnter={() =>
                setPreview(
                  `Bardic Inspiration: an ally adds d${CORVIN.bardicInspiration.die} to their next roll. Corvin cannot inspire himself.`,
                )
              }
              onFocus={() => setPreview('Bardic Inspiration — for someone else.')}
              onClick={() => setPending({ kind: 'inspire' })}
            >
              Bardic Inspiration
              <small>Bonus · {inspirationLeft} left</small>
            </button>

            <button
              className="action-btn"
              disabled={!isPlayerTurn || !combat.budget.action}
              onMouseEnter={() => setPreview('Set your feet and watch the fog. +2 AC until your next turn.')}
              onClick={() => act({ kind: 'defend' })}
            >
              Brace
              <small>Action · +2 AC</small>
            </button>
          </div>

          {pending?.kind === 'spell' && pending.spellId === 'command' && (
            <div className="targets">
              <span className="eyebrow">Word:</span>
              {COMMAND_WORDS.map((word) => (
                <button
                  key={word.id}
                  className="target-btn"
                  data-selected={pending.commandWord === word.id}
                  onMouseEnter={() => setPreview(word.effect)}
                  onClick={() => setPending({ ...pending, commandWord: word.id })}
                >
                  {word.word}
                </button>
              ))}
            </div>
          )}

          <div className="targets">
            <span className="eyebrow">Move:</span>
            {ZONE_ORDER.map((zone) => (
              <button
                key={zone}
                className="target-btn"
                disabled={
                  !isPlayerTurn || !combat.budget.move || zone === corvin.zone || !zonesAdjacent(corvin.zone, zone)
                }
                onMouseEnter={() => setPreview(ZONES[zone as ZoneId].description)}
                onClick={() => act({ kind: 'move', to: zone })}
              >
                {ZONES[zone as ZoneId].name}
                {zone === corvin.zone ? ' (here)' : ''}
              </button>
            ))}
            <button className="target-btn" disabled={!isPlayerTurn} onClick={() => act({ kind: 'endTurn' })}>
              End turn
            </button>
          </div>

          {pending && targets.length > 0 && (
            <div className="targets">
              <span className="eyebrow">Target:</span>
              {targets.map((id) => {
                const actor = combat.actors[id];
                return (
                  <button
                    key={id}
                    className="target-btn"
                    onMouseEnter={() =>
                      setPreview(
                        `${actor.name} — ${describeTargetPreview(combat, 'corvin', id)}${
                          enemyReads[id] ? `. ${enemyReads[id]}` : ''
                        }`,
                      )
                    }
                    onClick={() => {
                      if (pending.kind === 'attack') act({ kind: 'attack', weaponId: pending.weaponId, targetId: id });
                      else if (pending.kind === 'inspire') act({ kind: 'inspire', targetId: id });
                      else
                        act({
                          kind: 'spell',
                          spellId: pending.spellId,
                          targetId: id,
                          commandWord: pending.commandWord ?? 'halt',
                        });
                    }}
                  >
                    {actor.name} · {actor.hp}/{actor.maxHp}
                  </button>
                );
              })}
              <button className="target-btn" onClick={() => setPending(null)}>
                Cancel
              </button>
            </div>
          )}

          <p className="preview">
            {preview ||
              (isPlayerTurn
                ? 'His turn. He would rather talk, but the wolves have not offered.'
                : `${active.name} is acting…`)}
          </p>
        </div>

        <div className="log" role="log" aria-live="polite">
          {[...combat.log]
            .slice(-14)
            .reverse()
            .map((entry) => (
              <div key={entry.id} className="log__entry" data-tone={entry.tone}>
                {entry.text}
                {entry.detail && <span className="log__detail">{entry.detail}</span>}
              </div>
            ))}
        </div>
      </div>

      {combat.outcome !== 'ongoing' && (
        <div className="combat__result">
          <div className="modal__panel" style={{ textAlign: 'center', maxWidth: '32rem' }}>
            <h2 className="modal__title">{combat.outcome === 'victory' ? 'It stops.' : 'The road goes dark.'}</h2>
            <p style={{ fontStyle: 'italic', color: 'var(--ink-dim)' }}>
              {combat.outcome === 'victory'
                ? 'What is left of them goes into the fog, and the fog does not take it far.'
                : 'He does not finish the line. Somewhere very close, something is disappointed — and patient.'}
            </p>
            <div className="modal__actions" style={{ justifyContent: 'center' }}>
              {combat.outcome === 'victory' ? (
                <button className="btn btn--primary" onClick={finish} autoFocus>
                  Stand up
                </button>
              ) : (
                <button className="btn btn--primary" onClick={retry} autoFocus>
                  Try it again
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatAttack(bonus: number): string {
  return `${bonus >= 0 ? '+' : '−'}${Math.abs(bonus)} to hit`;
}
