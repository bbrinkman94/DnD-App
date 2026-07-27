/**
 * The shell.
 *
 * Owns the three phases (title, playing, credits), keeps the settings wired to
 * the document and the audio bus, unlocks sound on the first real gesture, and
 * stops doing work when the tab is hidden.
 */

import { Canvas } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { audio } from '@/audio/engine';
import { CombatUI } from '@/components/CombatUI';
import { Cursor } from '@/components/Cursor';
import { DialogueOverlay } from '@/components/DialogueOverlay';
import { DiceOverlay } from '@/components/DiceOverlay';
import { Hud, Subtitles, Toasts } from '@/components/Hud';
import { ChapterCard, Credits, Finale, LoadingScreen, MedallionInspect } from '@/components/Interstitials';
import { Menus } from '@/components/Menus';
import { TitleScreen } from '@/components/TitleScreen';
import { QUALITY_PROFILES, useSettings } from '@/game/settings';
import { installDebugApi } from '@/game/debug';
import { initialiseFromStorage, useGame } from '@/game/store';
import { SceneRouter } from '@/scenes/SceneRouter';

export function App(): JSX.Element {
  const phase = useGame((s) => s.phase);
  const settings = useSettings();

  /* --- boot ------------------------------------------------------------- */
  useEffect(() => {
    initialiseFromStorage();
    installDebugApi();
  }, []);

  /* --- settings -> document + audio ------------------------------------- */
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.text = settings.textSize;
    root.dataset.contrast = settings.highContrast ? 'high' : 'normal';
    root.dataset.motion = settings.reducedMotion ? 'reduced' : 'full';
    audio.setVolumes({
      master: settings.masterVolume,
      music: settings.musicVolume,
      sfx: settings.sfxVolume,
      muted: settings.muted,
    });
  }, [settings]);

  /* --- audio only after a real gesture ---------------------------------- */
  useEffect(() => {
    const unlock = (): void => {
      audio.unlock();
      audio.setVolumes({
        master: useSettings.getState().masterVolume,
        music: useSettings.getState().musicVolume,
        sfx: useSettings.getState().sfxVolume,
        muted: useSettings.getState().muted,
      });
      // Re-apply whatever the current screen asked for before sound existed.
      if (useGame.getState().phase === 'title') {
        audio.setAmbience('title');
        audio.setMusic('title');
      }
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  /* --- non-speech subtitles -------------------------------------------- */
  useEffect(() => {
    audio.onSubtitle((text) => {
      if (useSettings.getState().subtitles) useGame.getState().showSubtitle(text);
    });
    return () => audio.onSubtitle(null);
  }, []);

  /* --- stop working while hidden --------------------------------------- */
  useEffect(() => {
    const onVisibility = (): void => audio.setSuspended(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  /* --- the medallion is always one key away ----------------------------- */
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.code !== 'KeyM') return;
      const state = useGame.getState();
      if (state.phase !== 'playing' || state.dice || state.menu) return;
      event.preventDefault();
      state.inspectMedallion(!state.medallionInspect);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app">
      {phase === 'playing' && <GameView />}
      {phase === 'title' && <TitleScreen />}
      {phase === 'credits' && <Credits />}

      <Menus />
      <LoadingScreen />
      <Cursor />
    </div>
  );
}

function GameView(): JSX.Element {
  const quality = QUALITY_PROFILES[useSettings((s) => s.quality)];
  const tick = useGame((s) => s.tick);
  const last = useRef(performance.now());

  /* Play time, and a periodic autosave that does not fight the scene. */
  useEffect(() => {
    let raf = 0;
    const loop = (): void => {
      const now = performance.now();
      const delta = Math.min(0.25, (now - last.current) / 1000);
      last.current = now;
      if (!document.hidden) tick(delta);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [tick]);

  return (
    <>
      <div className="stage">
        <Canvas
          shadows={quality.shadows}
          dpr={quality.dpr}
          frameloop="always"
          gl={{ antialias: quality.postprocessing, powerPreference: 'high-performance', stencil: false }}
          camera={{ position: [0, 4, 8], fov: 48, near: 0.1, far: 160 }}
        >
          <SceneRouter />
        </Canvas>
      </div>

      <div className="overlay">
        <Hud />
        <DialogueOverlay />
        <CombatUI />
        <DiceOverlay />
        <MedallionInspect />
        <ChapterCard />
        <Finale />
        <Toasts />
        <Subtitles />
      </div>
    </>
  );
}
