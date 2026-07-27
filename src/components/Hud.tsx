/**
 * The heads-up layer: where Corvin stands, what he has left, and how cold the
 * medallion has become.  It stays out of the way — three small clusters and a
 * prompt — because the fog is the interface.
 */

import { useEffect, useState } from 'react';
import { CORVIN } from '@/data/corvin';
import { CHAPTER_TITLES, totalSlots } from '@/game/save';
import { useGame } from '@/game/store';
import { MedallionCanvas } from './Medallion';

export function Hud(): JSX.Element {
  const run = useGame((s) => s.run);
  const interaction = useGame((s) => s.interaction);
  const mode = useGame((s) => s.mode);
  const inspect = useGame((s) => s.inspectMedallion);
  const pulse = useGame((s) => s.medallionPulse);
  const chapter = CHAPTER_TITLES[run.chapter];

  const [pulsing, setPulsing] = useState(false);
  useEffect(() => {
    if (pulse === 0) return;
    setPulsing(true);
    const timer = window.setTimeout(() => setPulsing(false), 2400);
    return () => window.clearTimeout(timer);
  }, [pulse]);

  const slots = totalSlots();

  return (
    <div className="hud" aria-live="polite">
      <div
        className="frost-veil"
        style={{ opacity: Math.pow(run.medallionChill, 1.6) * 0.9 }}
        aria-hidden="true"
      />

      <div className="hud__top">
        <div className="chapter-tag">
          {chapter.index}
          <strong>{chapter.title}</strong>
        </div>

        <div className="hud__right">
          <div className="vitals">
            <span title={`Hit points: ${run.hp} of ${CORVIN.maxHp}`}>
              <span className="eyebrow">HP</span>
              <span className="vitals__pips">
                {Array.from({ length: CORVIN.maxHp }).map((_, i) => (
                  <i key={i} className={`pip ${i < run.hp ? 'pip--full' : ''}`} />
                ))}
              </span>
            </span>
            <span title={`Spell slots: ${slots - run.slotsUsed} of ${slots}`}>
              <span className="eyebrow">Slots</span>
              <span className="vitals__pips">
                {Array.from({ length: slots }).map((_, i) => (
                  <i key={i} className={`pip pip--slot ${i < slots - run.slotsUsed ? 'pip--full' : ''}`} />
                ))}
              </span>
            </span>
            <span title={`Bardic Inspiration: ${CORVIN.bardicInspiration.uses - run.inspirationUsed} left`}>
              <span className="eyebrow">Insp</span>
              <span className="vitals__pips">
                {Array.from({ length: CORVIN.bardicInspiration.uses }).map((_, i) => (
                  <i
                    key={i}
                    className={`pip pip--insp ${
                      i < CORVIN.bardicInspiration.uses - run.inspirationUsed ? 'pip--full' : ''
                    }`}
                  />
                ))}
              </span>
            </span>
          </div>

          <button
            className="medallion-badge"
            data-chill={run.medallionChill > 0.6 ? 'high' : 'low'}
            onClick={() => inspect(true)}
            title="Die Schwelle — inspect (M)"
            aria-label={`Die Schwelle. ${describeChill(run.medallionChill)}`}
          >
            <MedallionCanvas chill={run.medallionChill} stage={run.medallionStage} spin={0.5} />
            {pulsing && <span className="medallion-badge__pulse" />}
          </button>
        </div>
      </div>

      {interaction && mode === 'explore' && (
        <div className="hud__prompt">
          <span className="key-cap">E</span>
          <span>{interaction.label}</span>
        </div>
      )}

      {mode === 'explore' && (
        <div className="hud__hint">
          <span>
            <span className="key-cap">W</span>
            <span className="key-cap">A</span>
            <span className="key-cap">S</span>
            <span className="key-cap">D</span> move
          </span>
          <span>
            <span className="key-cap">E</span> interact
          </span>
          <span>
            <span className="key-cap">M</span> medallion
          </span>
          <span>
            <span className="key-cap">Esc</span> menu
          </span>
        </div>
      )}
    </div>
  );
}

export function describeChill(chill: number): string {
  if (chill < 0.15) return 'Cool, the way old silver is cool.';
  if (chill < 0.35) return 'Colder than the room.';
  if (chill < 0.6) return 'Cold enough to notice through a shirt.';
  if (chill < 0.85) return 'Cold enough to hurt.';
  return 'It is not cold any more. It is taking heat.';
}

export function Toasts(): JSX.Element {
  const toasts = useGame((s) => s.toasts);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast" data-kind={toast.kind}>
          {toast.text}
        </div>
      ))}
    </div>
  );
}

export function Subtitles(): JSX.Element | null {
  const subtitle = useGame((s) => s.subtitle);
  if (!subtitle) return null;
  return (
    <div className="subtitles" role="status">
      {subtitle.text}
    </div>
  );
}
