/**
 * The roll, presented.
 *
 * The die is thrown; the modifier is itemised beside it; the difficulty class is
 * only revealed once the die has stopped, so the throw is still a throw.  A
 * natural twenty and a natural one get their own treatment.
 */

import { useCallback, useEffect } from 'react';
import { SKILL_LABEL, formatModifier, type SkillKey } from '@/data/abilities';
import { useGame } from '@/game/store';
import { DiceTray } from './DiceTray';

const VERDICT: Record<string, string> = {
  'critical-success': 'A twenty. Of course it is.',
  success: 'Success',
  failure: 'Failure',
  'critical-failure': 'A one. The room noticed.',
};

const FLAVOUR: Record<string, string> = {
  'critical-success': 'He does not look surprised. He never does. That is the trick.',
  success: 'It lands. He lets a half-beat pass before he uses it.',
  failure: 'Not this time — but a failed line is still a line.',
  'critical-failure': 'Somewhere behind his ribs, something cold finds this funny.',
};

export function DiceOverlay(): JSX.Element | null {
  const dice = useGame((s) => s.dice);
  const settle = useGame((s) => s.settleDice);
  const confirm = useGame((s) => s.confirmDice);

  const onSettle = useCallback(() => settle(), [settle]);

  useEffect(() => {
    if (!dice) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.code === 'Space' || event.code === 'Enter' || event.code === 'Escape') {
        event.preventDefault();
        confirm();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dice, confirm]);

  if (!dice) return null;
  const settled = dice.status === 'settled';

  return (
    <div className="dice" role="dialog" aria-live="assertive" aria-label="Ability check">
      <div className="dice__panel">
        <p className="dice__skill">{SKILL_LABEL[dice.skill as SkillKey]} check</p>
        <h2 className="dice__label">{dice.label}</h2>

        <div className="dice__tray">
          <DiceTray seed={dice.seed} target={dice.natural} onSettle={onSettle} accent="#a08bd0" />
        </div>

        <div className="dice__breakdown">
          <div className="dice__part dice__part--natural">
            <span className="eyebrow">d20</span>
            <b>{settled ? dice.natural : '—'}</b>
          </div>
          {dice.parts.map((part) => (
            <div className="dice__part" key={part.label}>
              <span className="eyebrow">{part.label}</span>
              <b>{formatModifier(part.value)}</b>
            </div>
          ))}
          <div className="dice__part dice__part--total">
            <span className="eyebrow">Total</span>
            <b>{settled ? dice.total : '—'}</b>
          </div>
          <div className="dice__part dice__part--dc">
            <span className="eyebrow">DC</span>
            <b>{dice.revealDc ? dice.dc : '?'}</b>
          </div>
        </div>

        {settled && (
          <>
            <p className="dice__verdict" data-outcome={dice.outcome}>
              {VERDICT[dice.outcome]}
            </p>
            <p className="dice__flavour">{FLAVOUR[dice.outcome]}</p>
          </>
        )}

        <button className="btn btn--primary" onClick={confirm} autoFocus>
          {settled ? 'Continue' : 'Skip the throw'}
        </button>
      </div>
    </div>
  );
}
