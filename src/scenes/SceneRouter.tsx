/**
 * Which chapter is on stage.
 *
 * Each scene is a lazy chunk, so opening the inn does not also download the
 * shrine.  A short loading plate covers the swap and doubles as a breath
 * between chapters.
 */

import { Suspense, lazy, useEffect } from 'react';
import { useGame } from '@/game/store';

const InnScene = lazy(() => import('./InnScene').then((m) => ({ default: m.InnScene })));
const RoadScene = lazy(() => import('./RoadScene').then((m) => ({ default: m.RoadScene })));
const ShrineScene = lazy(() => import('./ShrineScene').then((m) => ({ default: m.ShrineScene })));
const GateScene = lazy(() => import('./GateScene').then((m) => ({ default: m.GateScene })));

function Loader(): JSX.Element {
  const setLoading = useGame((s) => s.setLoading);
  useEffect(() => {
    setLoading(true, 0.35, 'Opening');
    let progress = 0.35;
    const timer = window.setInterval(() => {
      progress = Math.min(0.92, progress + 0.08);
      setLoading(true, progress, 'Opening');
    }, 160);
    return () => {
      window.clearInterval(timer);
      setLoading(false, 1, '');
    };
  }, [setLoading]);
  return <></>;
}

export function SceneRouter(): JSX.Element {
  const chapter = useGame((s) => s.run.chapter);

  return (
    <Suspense fallback={<Loader />}>
      {chapter === 'inn' && <InnScene />}
      {chapter === 'road' && <RoadScene />}
      {(chapter === 'shrine' || chapter === 'encounter') && <ShrineScene />}
      {chapter === 'gate' && <GateScene />}
    </Suspense>
  );
}
