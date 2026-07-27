/**
 * A small console API.
 *
 * Open the browser console and type `threshold.help()`.  This is the documented
 * way to wipe a save, jump to a chapter or pin the dice to a seed — no build
 * flags, no hidden key combinations, and nothing here can be reached by
 * accident during normal play.
 */

import { clearSave, CHAPTER_ORDER, type ChapterId } from './save';
import { seedAmbientRng } from './rng';
import { useGame } from './store';
import { useSettings } from './settings';

export interface ThresholdDebugApi {
  help(): void;
  resetSave(): void;
  chapter(id: ChapterId): void;
  seed(value: string | number): void;
  give(clue: string): void;
  chill(value: number, stage?: number): void;
  combat(): void;
  state(): unknown;
  settings(): unknown;
}

export function installDebugApi(): void {
  const api: ThresholdDebugApi = {
    help: () => {
      /* eslint-disable no-console */
      console.info(
        [
          'The Threshold — console commands',
          '  threshold.resetSave()            erase the save and return to the title',
          `  threshold.chapter(id)            jump to a chapter: ${CHAPTER_ORDER.join(', ')}`,
          '  threshold.seed("anything")       pin every future roll to a seed',
          '  threshold.chill(0..1, stage)     force the medallion state (stage 0-3)',
          '  threshold.give("clue-id")        add a clue to the journal',
          '  threshold.combat()               start the encounter immediately',
          '  threshold.state()                dump the current run',
          '  threshold.settings()             dump the current settings',
        ].join('\n'),
      );
      /* eslint-enable no-console */
    },
    resetSave: () => useGame.getState().eraseSave(),
    chapter: (id) => {
      const state = useGame.getState();
      if (state.phase !== 'playing') state.startNewGame();
      state.setChapter(id);
    },
    seed: (value) => seedAmbientRng(value),
    give: (clue) => useGame.getState().addClue(clue),
    chill: (value, stage) => useGame.getState().setMedallion(value, stage),
    combat: () => useGame.getState().beginCombat(),
    state: () => useGame.getState().run,
    settings: () => useSettings.getState(),
  };

  (window as unknown as { threshold: ThresholdDebugApi }).threshold = api;
  // Also expose the raw stores so the smoke test (and curious players) can drive
  // the game without simulating twenty seconds of walking.
  (window as unknown as { thresholdStores: unknown }).thresholdStores = { useGame, useSettings, clearSave };
}
