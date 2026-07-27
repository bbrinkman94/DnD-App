/**
 * The title screen.
 *
 * The medallion hangs in the dark with a candle reflected in its glass, and
 * frost creeps across it as the pointer approaches Begin.  Once the experience
 * has been finished the plate changes: the frost never fully clears again, and
 * the medallion remembers.
 */

import { useCallback, useEffect, useState } from 'react';
import { audio } from '@/audio/engine';
import { useGame } from '@/game/store';
import { MedallionCanvas } from './Medallion';

export function TitleScreen(): JSX.Element {
  const hasSave = useGame((s) => s.hasSaveFile);
  const everCompleted = useGame((s) => s.everCompleted);
  const startNewGame = useGame((s) => s.startNewGame);
  const continueGame = useGame((s) => s.continueGame);
  const setMenu = useGame((s) => s.setMenu);
  const [hover, setHover] = useState(0);

  useEffect(() => {
    audio.setAmbience('title');
    audio.setMusic('title');
  }, []);

  const chill = Math.min(1, (everCompleted ? 0.35 : 0.05) + hover);

  const begin = useCallback(() => {
    audio.play('door');
    startNewGame();
  }, [startNewGame]);

  return (
    <div className="title">
      <div className="title__medallion">
        <MedallionCanvas chill={chill} stage={everCompleted ? 3 : 0} spin={0.18} />
      </div>

      <div className="title__panel">
        <span className="title__over">A Corvin Vaelthorne Prologue</span>
        <h1 className="title__name">The Threshold</h1>
        <p className="title__sub">
          Die Schwelle has been growing cold for two weeks, and nobody has asked it why.
        </p>

        {everCompleted && (
          <p className="title__returned">
            You have been through once. The glass has not cleared since.
          </p>
        )}

        <nav className="title__menu" aria-label="Main menu">
          <button
            className="btn btn--primary"
            onMouseEnter={() => {
              setHover(0.55);
              audio.play('ui-hover');
            }}
            onFocus={() => setHover(0.22)}
            onMouseLeave={() => setHover(0)}
            onBlur={() => setHover(0)}
            onClick={begin}
            autoFocus
          >
            Begin
          </button>
          <button className="btn" disabled={!hasSave} onClick={continueGame}>
            Continue{hasSave ? '' : ' — no save'}
          </button>
          <button className="btn" onClick={() => setMenu('settings')}>
            Settings
          </button>
          <button className="btn" onClick={() => setMenu('controls')}>
            Controls
          </button>
          <button className="btn btn--ghost" onClick={() => setMenu('credits')}>
            Credits
          </button>
        </nav>

        <p className="title__footer">
          A fan-made prologue. Original characters, text, music and art. Not affiliated with, or endorsed by, the
          publishers of any tabletop setting it admires.
        </p>
      </div>
    </div>
  );
}
