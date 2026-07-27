/**
 * The things that come between: the loading plate, the end-of-chapter summary,
 * the medallion inspection, and the credits.
 */

import { useEffect, useState } from 'react';
import { audio } from '@/audio/engine';
import { CHAPTER_TITLES } from '@/game/save';
import { useGame } from '@/game/store';
import { describeChill } from './Hud';
import { MedallionCanvas } from './Medallion';

const LOADING_LINES = [
  'The road east is four days long, and has been three for some time.',
  'Nobody in the valley remembers naming the inn.',
  'Die Schwelle has been cold since a fortnight last Tuesday.',
  'He sits where he can see the room and the door.',
  'Ancestry is not destiny.',
];

export function LoadingScreen(): JSX.Element | null {
  const loading = useGame((s) => s.loading);
  const [line] = useState(() => LOADING_LINES[Math.floor(Math.random() * LOADING_LINES.length)]);
  if (!loading.active) return null;
  return (
    <div className="loading" role="status" aria-live="polite">
      <div className="loading__inner">
        <p className="eyebrow">{loading.label || 'Opening'}</p>
        <p className="loading__line">{line}</p>
        <div className="loading__bar">
          <span style={{ width: `${Math.round(loading.progress * 100)}%` }} />
        </div>
      </div>
    </div>
  );
}

export function ChapterCard(): JSX.Element | null {
  const summary = useGame((s) => s.chapterSummary);
  const dismiss = useGame((s) => s.dismissChapterSummary);

  useEffect(() => {
    if (!summary) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.code === 'Enter' || event.code === 'Space') {
        event.preventDefault();
        dismiss();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [summary, dismiss]);

  if (!summary) return null;
  const chapter = CHAPTER_TITLES[summary.chapter];
  const next = summary.nextChapter ? CHAPTER_TITLES[summary.nextChapter] : null;

  return (
    <div className="chapter-card">
      <div className="chapter-card__inner">
        <p className="chapter-card__index">{chapter.index} — closed</p>
        <h2 className="chapter-card__title">{chapter.title}</h2>
        <ul className="chapter-card__lines">
          {summary.lines.length === 0 ? (
            <li style={{ animationDelay: '120ms' }}>He kept his own counsel, which is also a decision.</li>
          ) : (
            summary.lines.map((line, index) => (
              <li key={index} style={{ animationDelay: `${140 + index * 220}ms` }}>
                {line}
              </li>
            ))
          )}
        </ul>
        {next && <p className="chapter-card__index">Next — {next.index}: {next.title}</p>}
        <div className="modal__actions" style={{ justifyContent: 'center' }}>
          <button className="btn btn--primary" onClick={dismiss} autoFocus>
            {next ? 'Go on' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MedallionInspect(): JSX.Element | null {
  const open = useGame((s) => s.medallionInspect);
  const close = useGame((s) => s.inspectMedallion);
  const run = useGame((s) => s.run);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.code === 'Escape' || event.code === 'KeyM' || event.code === 'Enter') {
        event.preventDefault();
        close(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="inspect" role="dialog" aria-label="Die Schwelle">
      <div className="inspect__canvas">
        <MedallionCanvas chill={run.medallionChill} stage={run.medallionStage} spin={0.14} />
      </div>
      <div className="inspect__caption">
        <p>{describeStage(run.medallionStage, run.medallionChill)}</p>
        <p className="eyebrow">{describeChill(run.medallionChill)}</p>
        <button className="btn" onClick={() => close(false)} autoFocus>
          Put it away (Esc)
        </button>
      </div>
    </div>
  );
}

function describeStage(stage: number, chill: number): string {
  if (stage >= 3) return 'A hand. Flat against the glass, from the inside, holding still because it has been asked to.';
  if (stage >= 2) return 'A fingerprint, forming in the fog under the glass. It is not his. He has checked.';
  if (stage >= 1) return 'The glass has fogged from the inside, which glass does not do.';
  if (chill > 0.3) return 'Blackened silver, a closed door under three stars, and colder than the room deserves.';
  return 'A small oval of blackened silver, heavier than it looks. Four generations of thumbs have worn the door nearly flat.';
}

/** The last card, between the vanished road and the credits. */
export function Finale(): JSX.Element | null {
  const finale = useGame((s) => s.finale);
  const rollCredits = useGame((s) => s.rollCredits);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!finale) return;
    audio.setMusic('none');
    audio.play('medallion-freeze');
    const reveal = window.setTimeout(() => setShown(true), 1600);
    const onKey = (event: KeyboardEvent): void => {
      if (event.code === 'Enter' || event.code === 'Space') rollCredits();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(reveal);
      window.removeEventListener('keydown', onKey);
    };
  }, [finale, rollCredits]);

  if (!finale) return null;

  return (
    <div className="chapter-card">
      <div className="chapter-card__inner">
        <p className="chapter-card__index">There is no road at all</p>
        <h2 className="chapter-card__title" style={{ letterSpacing: '0.08em' }}>
          The Threshold will open.
        </h2>
        {shown && (
          <div className="modal__actions" style={{ justifyContent: 'center' }}>
            <button className="btn btn--primary" onClick={rollCredits} autoFocus>
              But not yet
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function Credits(): JSX.Element {
  const returnToTitle = useGame((s) => s.returnToTitle);

  useEffect(() => {
    audio.setAmbience('none');
    audio.setMusic('credits');
    const timer = window.setTimeout(() => audio.play('lute-broken'), 2600);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="credits">
      <div className="credits__scroll">
        <p className="credits__title">The Threshold</p>
        <p>A Corvin Vaelthorne Prologue</p>

        <h2>The Threshold will open.</h2>
        <p>But not yet.</p>

        <h2>Cast</h2>
        <p>Corvin Vaelthorne — bard, wanderer, unreliable narrator of his own life</p>
        <p>Nell Grubbin — scout, professional pessimist</p>
        <p>Ansbeth Cray — caravan guard, lapsed something</p>
        <p>Emrik Waldenfels — merchant, of a sort</p>
        <p>Tovin — keeps the inn, keeps his mouth shut</p>
        <p>The Grey Petitioner — knelt too long</p>
        <p>The Voice in the Mist — knew the name already</p>

        <h2>Made with</h2>
        <p>React · TypeScript · Vite · three.js · React Three Fiber · drei · postprocessing · Zustand · Vitest</p>

        <h2>Art</h2>
        <p>All geometry generated at runtime from primitives.</p>
        <p>All textures painted procedurally into a canvas.</p>
        <p>No imported models, no image files, no web fonts.</p>

        <h2>Music &amp; sound</h2>
        <p>Synthesised in the browser with the Web Audio API.</p>
        <p>Corvin&rsquo;s motif — five notes in D Phrygian, plucked on a Karplus–Strong string.</p>
        <p>The broken version you are listening to is the same five notes, one string flat.</p>

        <h2>Originality</h2>
        <p>Characters, dialogue, locations, creatures and encounter numbers are original.</p>
        <p>No published prose, map, illustration or stat block is reproduced.</p>
        <p>A personal fan-made work, admiring gothic tabletop horror from a respectful distance.</p>

        <h2>Thank you for listening.</h2>
        <p>— C. V.</p>
      </div>
      <button className="btn credits__skip" onClick={returnToTitle}>
        Return to the title
      </button>
    </div>
  );
}
