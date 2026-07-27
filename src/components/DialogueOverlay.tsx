/**
 * Dialogue.
 *
 * Lines advance on click, Space or Enter; choices are a real keyboard list with
 * number shortcuts.  Locked choices stay visible with the reason — seeing the
 * door you cannot open is part of playing a bard who notices everything.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { CHARACTERS } from '@/data/characters';
import { SKILL_LABEL } from '@/data/abilities';
import { SPELLS } from '@/data/spells';
import { prepareChoices } from '@/dialogue/engine';
import { TREES } from '@/dialogue/trees';
import { useGame } from '@/game/store';
import { useSettings } from '@/game/settings';

export function DialogueOverlay(): JSX.Element | null {
  const dialogue = useGame((s) => s.dialogue);
  const run = useGame((s) => s.run);
  const advance = useGame((s) => s.advanceLine);
  const choose = useGame((s) => s.chooseChoice);
  const dice = useGame((s) => s.dice);
  const reducedMotion = useSettings((s) => s.reducedMotion);
  const listRef = useRef<HTMLUListElement>(null);
  const autoTimer = useRef<number | null>(null);

  const tree = dialogue ? TREES[dialogue.treeId] : null;
  const node = tree && dialogue ? tree.nodes[dialogue.nodeId] : null;
  const line = node?.lines[dialogue?.lineIndex ?? 0] ?? null;
  const lastLine = node ? (dialogue?.lineIndex ?? 0) >= node.lines.length - 1 : false;

  const choices = useMemo(
    () => (node && lastLine ? prepareChoices(node, run) : []),
    [node, lastLine, run],
  );

  // Cinematic lines advance themselves; everything else waits for the player.
  useEffect(() => {
    if (autoTimer.current) window.clearTimeout(autoTimer.current);
    if (!line?.auto || !dialogue || dialogue.waitingOnDice || (lastLine && choices.length > 0)) return;
    const duration = Math.min(9000, 1800 + line.text.length * (reducedMotion ? 22 : 34));
    autoTimer.current = window.setTimeout(() => advance(), duration);
    return () => {
      if (autoTimer.current) window.clearTimeout(autoTimer.current);
    };
  }, [line, dialogue, lastLine, choices.length, advance, reducedMotion]);

  const handleAdvance = useCallback(() => {
    if (!dialogue || dialogue.waitingOnDice || choices.length > 0) return;
    advance();
  }, [advance, dialogue, choices.length]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (!dialogue || dice) return;
      if (event.code === 'Space' || event.code === 'Enter') {
        const active = document.activeElement as HTMLElement | null;
        if (active?.classList.contains('choice')) return;
        event.preventDefault();
        handleAdvance();
        return;
      }
      const index = Number(event.key) - 1;
      if (Number.isInteger(index) && index >= 0 && index < choices.length) {
        const choice = choices[index];
        if (choice.available) {
          event.preventDefault();
          choose(choice);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialogue, dice, choices, choose, handleAdvance]);

  useEffect(() => {
    if (choices.length > 0) {
      const first = listRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)');
      first?.focus();
    }
  }, [choices.length, dialogue?.nodeId]);

  if (!dialogue || !node || !line) return null;

  const speaker = CHARACTERS[line.speaker];
  const isNarration = line.speaker === 'narrator';

  return (
    <div className="dialogue" data-waiting={dialogue.waitingOnDice}>
      <div
        className="dialogue__panel"
        onClick={handleAdvance}
        role={choices.length === 0 ? 'button' : undefined}
        tabIndex={-1}
      >
        {!isNarration && (
          <div className="dialogue__speaker">
            <span className="dialogue__name" style={{ color: speaker.palette.accent }}>
              {speaker.name}
            </span>
            {speaker.title && <span className="dialogue__title">{speaker.title}</span>}
          </div>
        )}
        <p
          className="dialogue__text"
          data-narration={isNarration}
          data-whisper={line.whisper === true}
        >
          {line.text}
        </p>
        {choices.length === 0 && !dialogue.waitingOnDice && (
          <span className="dialogue__more">{lastLine ? 'continue ▸' : 'more ▸'}</span>
        )}
      </div>

      {choices.length > 0 && !dialogue.waitingOnDice && (
        <ul className="choices" ref={listRef}>
          {choices.map((choice, index) => {
            const spell = choice.spell ? SPELLS[choice.spell] : null;
            return (
              <li key={choice.id}>
                <button
                  className="choice"
                  data-tone={choice.tone ?? 'plain'}
                  disabled={!choice.available}
                  onClick={() => choose(choice)}
                >
                  <span>
                    <span className="eyebrow" style={{ marginRight: '0.5rem' }}>
                      {index + 1}
                    </span>
                    {choice.text}
                  </span>
                  {(choice.check || spell || choice.hint || choice.locked) && (
                    <span className="choice__meta">
                      {choice.check && (
                        <span className="tag tag--check">{SKILL_LABEL[choice.check.skill]}</span>
                      )}
                      {spell && <span className="tag tag--spell">{spell.name}</span>}
                      {choice.locked && <span className="tag tag--locked">{choice.locked}</span>}
                      {choice.hint && <span className="choice__hint">{choice.hint}</span>}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
