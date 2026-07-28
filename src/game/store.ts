/**
 * The single game store.
 *
 * Holds the persisted run, the transient presentation state (which dialogue
 * node, which dice roll, which camera cue) and the combat session.  Rules live
 * in `dialogue/engine.ts`, `combat/engine.ts` and `game/checks.ts`; this file
 * only sequences them and decides when to save.
 */

import { create } from 'zustand';
import { audio, type AmbienceId, type MusicCue, type SfxId } from '@/audio/engine';
import { createCombat, currentActor, performPlayerAction, runAiTurn } from '@/combat/engine';
import type { CombatEvent, CombatState, PlayerAction } from '@/combat/types';
import type { CompanionId } from '@/data/characters';
import { CORVIN } from '@/data/corvin';
import { applyEffects, getNode, prepareChoices, type Signal } from '@/dialogue/engine';
import { TREES } from '@/dialogue/trees';
import type { CameraCue, DialogueChoice, DialogueTree, Effect } from '@/dialogue/types';
import { performCheck, type ModifierPart, type ResolvedCheck } from './checks';
import { rng, seedAmbientRng } from './rng';
import {
  CHAPTER_ORDER,
  clearSave,
  createRunState,
  readSave,
  writeSave,
  type ChapterId,
  type FlagValue,
  type RunState,
} from './save';
import { useSettings } from './settings';

export type Phase = 'title' | 'playing' | 'credits';
export type Mode = 'explore' | 'dialogue' | 'combat' | 'cinematic';
export type MenuTab = null | 'pause' | 'settings' | 'controls' | 'credits' | 'character' | 'journal';

export interface DiceRequest {
  id: number;
  label: string;
  dc: number;
  revealDc: boolean;
  parts: ModifierPart[];
  modifier: number;
  natural: number;
  total: number;
  success: boolean;
  outcome: ResolvedCheck['outcome'];
  seed: number;
  status: 'rolling' | 'settled';
  successNode: string;
  failureNode: string;
  skill: string;
}

export interface DialogueSession {
  treeId: string;
  nodeId: string;
  lineIndex: number;
  /** Set while a check is pending so the panel can dim. */
  waitingOnDice: boolean;
}

export interface ChapterSummary {
  chapter: ChapterId;
  nextChapter: ChapterId | null;
  lines: string[];
}

export interface Toast {
  id: number;
  text: string;
  kind: 'clue' | 'save' | 'info';
}

interface GameStore {
  run: RunState;
  everCompleted: boolean;
  hasSaveFile: boolean;
  phase: Phase;
  mode: Mode;
  menu: MenuTab;
  loading: { active: boolean; progress: number; label: string };
  dialogue: DialogueSession | null;
  dice: DiceRequest | null;
  combat: CombatState | null;
  combatBusy: boolean;
  chapterSummary: ChapterSummary | null;
  cameraCue: CameraCue;
  interaction: { id: string; label: string } | null;
  subtitle: { id: number; text: string } | null;
  toasts: Toast[];
  /** Bumped whenever the medallion should visibly react. */
  medallionPulse: number;
  medallionInspect: boolean;
  /** The last beat: "The Threshold will open." shown before the credits. */
  finale: boolean;
  shake: number;
  counter: number;

  // lifecycle
  startNewGame(): void;
  continueGame(): void;
  returnToTitle(): void;
  restartChapter(): void;
  eraseSave(): void;
  saveNow(): void;
  tick(delta: number): void;

  // world
  setChapter(chapter: ChapterId): void;
  setMode(mode: Mode): void;
  setMenu(menu: MenuTab): void;
  setLoading(active: boolean, progress?: number, label?: string): void;
  setInteraction(interaction: { id: string; label: string } | null): void;
  setCamera(cue: CameraCue): void;
  pushToast(text: string, kind?: Toast['kind']): void;
  addShake(amount: number): void;
  showSubtitle(text: string): void;
  showFinale(): void;
  rollCredits(): void;

  // run mutation
  setFlag(key: string, value?: FlagValue): void;
  hasFlag(key: string): boolean;
  addClue(id: string, label?: string): void;
  adjustDisposition(companion: CompanionId, delta: number): void;
  setMedallion(chill: number, stage?: number): void;
  pulseMedallion(): void;
  inspectMedallion(open: boolean): void;
  applyEffectList(effects: Effect[] | undefined): void;

  // dialogue
  startDialogue(treeId: string): void;
  advanceLine(): void;
  chooseChoice(choice: DialogueChoice): void;
  endDialogue(): void;
  currentTree(): DialogueTree | null;

  // dice
  settleDice(): void;
  confirmDice(): void;

  // combat
  beginCombat(): void;
  submitCombatAction(action: PlayerAction): void;
  advanceCombat(): void;
  finishCombat(): void;
  retryCombat(): void;

  // chapter flow
  showChapterSummary(summary: ChapterSummary): void;
  dismissChapterSummary(): void;
  playSfx(id: SfxId): void;
  setAmbience(id: AmbienceId): void;
  setMusic(cue: MusicCue): void;
}

const CLUE_LABELS: Record<string, string> = {
  'emrik-lying': 'Emrik is lying about the cargo',
  'watcher-outside': 'Someone watched the inn from the rain',
  'draconic-box': 'Draconic script on the strongbox',
  'ansbeth-order': "Ansbeth's pin belongs to the Order of the Pure Flame",
  'nell-road': 'Nell says the eastern road changed last winter',
  'fog-directs': 'The fog is steering travellers, not hiding them',
  'courier-seal': "The dead courier carries Emrik's own seal",
  'draconic-warning': 'A Draconic warning carved at the shrine',
  'medallion-fingerprint': 'A fingerprint formed inside the glass',
  'shrine-box': 'The sealed box under the altar stone',
  'voice-knows-name': 'The Voice in the Mist knows his name',
};

let toastCounter = 0;
/** Play time accumulates here and is flushed into the run once a second. */
let playTimeAccumulator = 0;

export const useGame = create<GameStore>((set, get) => ({
  run: createRunState(),
  everCompleted: false,
  hasSaveFile: false,
  phase: 'title',
  mode: 'explore',
  menu: null,
  loading: { active: false, progress: 0, label: '' },
  dialogue: null,
  dice: null,
  combat: null,
  combatBusy: false,
  chapterSummary: null,
  cameraCue: 'default',
  interaction: null,
  subtitle: null,
  toasts: [],
  medallionPulse: 0,
  medallionInspect: false,
  finale: false,
  shake: 0,
  counter: 0,

  /* ------------------------------------------------------------ lifecycle */

  startNewGame: () => {
    set({
      run: createRunState(),
      phase: 'playing',
      mode: 'explore',
      menu: null,
      dialogue: null,
      dice: null,
      combat: null,
      chapterSummary: null,
      cameraCue: 'default',
    });
    get().saveNow();
  },

  continueGame: () => {
    const envelope = readSave();
    if (!envelope) {
      get().startNewGame();
      return;
    }
    set({
      run: envelope.run,
      everCompleted: envelope.everCompleted,
      phase: 'playing',
      mode: 'explore',
      menu: null,
      dialogue: null,
      dice: null,
      combat: null,
      chapterSummary: null,
    });
  },

  returnToTitle: () => {
    get().saveNow();
    set({ phase: 'title', menu: null, dialogue: null, dice: null, combat: null, mode: 'explore' });
  },

  restartChapter: () => {
    const { run } = get();
    const fresh = createRunState();
    set({
      run: {
        ...fresh,
        chapter: run.chapter,
        flags: run.flags,
        clues: run.clues,
        companions: run.companions,
        choices: run.choices,
        medallionChill: run.medallionChill,
        medallionStage: run.medallionStage,
      },
      mode: 'explore',
      menu: null,
      dialogue: null,
      dice: null,
      combat: null,
      chapterSummary: null,
    });
    get().saveNow();
  },

  eraseSave: () => {
    clearSave();
    set({ hasSaveFile: false, everCompleted: false, run: createRunState(), phase: 'title', menu: null });
  },

  saveNow: () => {
    const { run, everCompleted } = get();
    const written = writeSave(run, everCompleted || run.completed);
    if (written) {
      set({ hasSaveFile: true });
      get().pushToast('Progress saved', 'save');
    }
  },

  tick: (delta) => {
    if (get().phase !== 'playing') return;
    playTimeAccumulator += delta;
    const { shake } = get();
    const patch: Partial<GameStore> = {};
    if (shake > 0) patch.shake = Math.max(0, shake - delta * 2.5);
    if (playTimeAccumulator >= 1) {
      const { run } = get();
      patch.run = { ...run, playSeconds: run.playSeconds + playTimeAccumulator };
      playTimeAccumulator = 0;
    }
    if (Object.keys(patch).length > 0) set(patch);
  },

  /* ---------------------------------------------------------------- world */

  setChapter: (chapter) => {
    const { run } = get();
    if (run.chapter === chapter) return;
    // Changing chapter always ends whatever was on stage: no combat, dialogue
    // or overlay can survive a scene change.
    set({
      run: { ...run, chapter, checkpoint: 'start' },
      cameraCue: 'default',
      combat: null,
      combatBusy: false,
      dialogue: null,
      dice: null,
      mode: 'explore',
      interaction: null,
    });
    get().saveNow();
  },

  setMode: (mode) => set({ mode }),
  setMenu: (menu) => set({ menu }),
  setLoading: (active, progress = 0, label = '') => set({ loading: { active, progress, label } }),
  setInteraction: (interaction) => set({ interaction }),
  setCamera: (cameraCue) => set({ cameraCue }),

  pushToast: (text, kind = 'info') => {
    toastCounter += 1;
    const toast = { id: toastCounter, text, kind };
    set({ toasts: [...get().toasts.slice(-3), toast] });
    window.setTimeout(() => {
      set({ toasts: get().toasts.filter((t) => t.id !== toast.id) });
    }, 3200);
  },

  addShake: (amount) => {
    if (!useSettings.getState().screenShake) return;
    set({ shake: Math.min(1, get().shake + amount) });
  },

  showSubtitle: (text) => {
    set({ subtitle: { id: get().counter + 1, text }, counter: get().counter + 1 });
    window.setTimeout(() => {
      if (get().subtitle?.text === text) set({ subtitle: null });
    }, 2600);
  },

  /* ------------------------------------------------------------------ run */

  setFlag: (key, value = true) => {
    const { run } = get();
    set({ run: { ...run, flags: { ...run.flags, [key]: value } } });
  },

  hasFlag: (key) => {
    const value = get().run.flags[key];
    return value === true || (typeof value === 'number' && value > 0);
  },

  addClue: (id, label) => {
    const { run } = get();
    if (run.clues.includes(id)) return;
    set({ run: { ...run, clues: [...run.clues, id] } });
    get().pushToast(label ?? CLUE_LABELS[id] ?? 'Something noted', 'clue');
  },

  adjustDisposition: (companion, delta) => {
    const { run } = get();
    const current = run.companions[companion];
    set({
      run: {
        ...run,
        companions: {
          ...run.companions,
          [companion]: { ...current, disposition: Math.max(-3, Math.min(5, current.disposition + delta)) },
        },
      },
    });
  },

  setMedallion: (chill, stage) => {
    const { run } = get();
    const nextStage = stage === undefined ? run.medallionStage : Math.max(run.medallionStage, stage);
    if (Math.abs(run.medallionChill - chill) < 0.001 && nextStage === run.medallionStage) return;
    set({ run: { ...run, medallionChill: Math.max(0, Math.min(1, chill)), medallionStage: nextStage } });
  },

  pulseMedallion: () => {
    set({ medallionPulse: get().medallionPulse + 1 });
    audio.play('medallion-pulse');
  },

  inspectMedallion: (open) => {
    set({ medallionInspect: open, cameraCue: open ? 'medallion' : 'default' });
    if (open) audio.play('medallion-pulse', { gain: 0.7 });
  },

  applyEffectList: (effects) => {
    if (!effects || effects.length === 0) return;
    const before = get().run;
    const { run, signals } = applyEffects(before, effects);
    const newClues = run.clues.filter((c) => !before.clues.includes(c));
    set({ run });
    newClues.forEach((id) => get().pushToast(CLUE_LABELS[id] ?? 'Something noted', 'clue'));
    handleSignals(signals, get, before.chapter);
  },

  /* ------------------------------------------------------------- dialogue */

  startDialogue: (treeId) => {
    const tree = TREES[treeId];
    if (!tree) return;
    const node = getNode(tree, tree.start);
    set({
      dialogue: { treeId, nodeId: tree.start, lineIndex: 0, waitingOnDice: false },
      mode: 'dialogue',
      menu: null,
      cameraCue: node.camera ?? 'two-shot',
    });
    get().applyEffectList(node.onEnter);
    audio.play('ui-select', { gain: 0.4 });
  },

  advanceLine: () => {
    const { dialogue } = get();
    if (!dialogue || dialogue.waitingOnDice) return;
    const tree = TREES[dialogue.treeId];
    const node = getNode(tree, dialogue.nodeId);

    if (dialogue.lineIndex < node.lines.length - 1) {
      const nextIndex = dialogue.lineIndex + 1;
      const line = node.lines[nextIndex];
      set({
        dialogue: { ...dialogue, lineIndex: nextIndex },
        cameraCue: line.camera ?? node.camera ?? get().cameraCue,
      });
      if (line.sfx) audio.play(line.sfx as SfxId);
      if (line.soundSubtitle) get().showSubtitle(line.soundSubtitle);
      return;
    }

    const choices = prepareChoices(node, get().run);
    if (choices.length > 0) return; // wait for the player
    if (node.next) {
      gotoNode(set, get, tree, node.next);
      return;
    }
    get().endDialogue();
  },

  chooseChoice: (choice) => {
    const { dialogue } = get();
    if (!dialogue) return;
    const tree = TREES[dialogue.treeId];
    audio.play('ui-select');

    if (choice.check) {
      const settings = useSettings.getState();
      const result = performCheck(choice.check, {
        medallionChill: get().run.medallionChill,
        hasPerformed: get().hasFlag('performed'),
      });
      const request: DiceRequest = {
        id: get().counter + 1,
        label: choice.check.label,
        dc: choice.check.dc,
        revealDc: false,
        parts: result.parts,
        modifier: result.parts.reduce((a, p) => a + p.value, 0),
        natural: result.roll.natural,
        total: result.roll.total,
        success: result.success,
        outcome: result.outcome,
        seed: rng().int(1, 1_000_000),
        status: settings.skipDiceAnimation || settings.reducedMotion ? 'settled' : 'rolling',
        successNode: choice.check.success,
        failureNode: choice.check.failure,
        skill: choice.check.skill,
      };
      set({
        counter: get().counter + 1,
        dice: request,
        dialogue: { ...dialogue, waitingOnDice: true },
        cameraCue: 'closeup',
      });
      get().applyEffectList(choice.effects);
      if (request.status === 'rolling') audio.play('dice-throw');
      else get().settleDice();
      return;
    }

    if (choice.spell) {
      const spell = choice.spell;
      get().applyEffectList([{ kind: 'sfx', id: spellSfx(spell) }]);
    }
    get().applyEffectList(choice.effects);
    if (choice.next) gotoNode(set, get, tree, choice.next);
    else get().endDialogue();
  },

  endDialogue: () => {
    // A transition inside the closing dialogue may have put the chapter card
    // (or the finale) on screen; do not drop back to exploration under it.
    const cinematic = get().chapterSummary !== null || get().finale;
    set({ dialogue: null, mode: cinematic ? 'cinematic' : 'explore', cameraCue: 'default' });
    get().saveNow();
  },

  currentTree: () => {
    const { dialogue } = get();
    return dialogue ? (TREES[dialogue.treeId] ?? null) : null;
  },

  /* ------------------------------------------------------------------ dice */

  settleDice: () => {
    const { dice } = get();
    if (!dice || dice.status === 'settled') return;
    set({ dice: { ...dice, status: 'settled', revealDc: true } });
    audio.play('dice-settle');
    if (dice.outcome === 'critical-success') {
      audio.play('crit');
      get().addShake(0.35);
    } else if (dice.outcome === 'critical-failure') {
      audio.play('fumble');
      get().addShake(0.2);
    }
  },

  confirmDice: () => {
    const { dice, dialogue } = get();
    if (!dice) return;
    if (dice.status !== 'settled') {
      get().settleDice();
      return;
    }
    const target = dice.success ? dice.successNode : dice.failureNode;
    set({ dice: null, cameraCue: 'two-shot' });
    if (dialogue) {
      const tree = TREES[dialogue.treeId];
      set({ dialogue: { ...dialogue, waitingOnDice: false } });
      gotoNode(set, get, tree, target);
    }
  },

  /* ---------------------------------------------------------------- combat */

  beginCombat: () => {
    const { run } = get();
    // Both companions fight regardless of whether Corvin bothered to talk to
    // them in the inn: they signed Emrik's contract independently, and they
    // have been walking beside him for two chapters.
    const allies: CompanionId[] = ['nell', 'ansbeth'];
    const state = createCombat({
      seed: rng().int(1, 1_000_000),
      corvinHp: run.hp,
      slotsUsed: run.slotsUsed,
      inspirationUsed: run.inspirationUsed,
      allies,
    });
    set({ combat: state, mode: 'combat', dialogue: null, cameraCue: 'combat', combatBusy: false });
    audio.setMusic('combat');
  },

  submitCombatAction: (action) => {
    const { combat } = get();
    if (!combat || get().combatBusy) return;
    const result = performPlayerAction(combat, action);
    set({ combat: result.state });
    reactToCombatEvents(result.events, get);
    if (result.state.outcome !== 'ongoing') {
      window.setTimeout(() => get().finishCombat(), 1400);
      return;
    }
    if (currentActor(result.state).id !== 'corvin') {
      set({ combatBusy: true });
      window.setTimeout(() => get().advanceCombat(), 700);
    }
  },

  advanceCombat: () => {
    const { combat } = get();
    if (!combat) return;
    if (get().menu !== null) {
      // Paused: hold the AI turn and check back in.
      window.setTimeout(() => get().advanceCombat(), 600);
      return;
    }
    if (combat.outcome !== 'ongoing') {
      get().finishCombat();
      return;
    }
    if (currentActor(combat).id === 'corvin') {
      set({ combatBusy: false });
      return;
    }
    const result = runAiTurn(combat);
    set({ combat: result.state });
    reactToCombatEvents(result.events, get);
    if (result.state.outcome !== 'ongoing') {
      window.setTimeout(() => get().finishCombat(), 1400);
      return;
    }
    window.setTimeout(() => get().advanceCombat(), 800);
  },

  finishCombat: () => {
    const { combat, run } = get();
    if (!combat) return;
    audio.setMusic('none');
    if (combat.outcome === 'defeat') {
      set({ combatBusy: true });
      return; // the defeat panel offers a retry
    }
    set({
      run: {
        ...run,
        hp: Math.max(1, combat.actors.corvin.hp),
        slotsUsed: combat.resources.slotsUsed,
        inspirationUsed: combat.resources.inspirationUsed,
        flags: {
          ...run.flags,
          'combat-won': true,
          'nell-down': combat.actors.nell?.downed === true,
          'ansbeth-down': combat.actors.ansbeth?.downed === true,
        },
      },
      combat: null,
      mode: 'explore',
      combatBusy: false,
    });
    get().saveNow();
    get().startDialogue('encounter-after');
  },

  retryCombat: () => {
    const { run } = get();
    set({ run: { ...run, hp: CORVIN.maxHp, slotsUsed: 0, inspirationUsed: 0 }, combat: null, combatBusy: false });
    get().beginCombat();
  },

  /* --------------------------------------------------------------- chapter */

  showChapterSummary: (summary) => set({ chapterSummary: summary, mode: 'cinematic' }),

  dismissChapterSummary: () => {
    const summary = get().chapterSummary;
    set({ chapterSummary: null, mode: 'explore' });
    if (summary?.nextChapter) {
      get().setChapter(summary.nextChapter);
    }
  },

  showFinale: () => set({ finale: true, mode: 'cinematic', dialogue: null }),

  rollCredits: () => {
    const { run } = get();
    set({ finale: false, phase: 'credits', everCompleted: true, run: { ...run, completed: true } });
    writeSave({ ...run, completed: true }, true);
  },

  playSfx: (id) => audio.play(id),
  setAmbience: (id) => audio.setAmbience(id),
  setMusic: (cue) => audio.setMusic(cue),
}));

/* ------------------------------------------------------------------ helpers */

type Getter = () => GameStore;
type Setter = (partial: Partial<GameStore>) => void;

function gotoNode(set: Setter, get: Getter, tree: DialogueTree, nodeId: string): void {
  const node = getNode(tree, nodeId);
  set({
    dialogue: { treeId: tree.id, nodeId, lineIndex: 0, waitingOnDice: false },
    cameraCue: node.camera ?? node.lines[0]?.camera ?? 'two-shot',
  });
  get().applyEffectList(node.onEnter);
  const first = node.lines[0];
  if (first?.sfx) audio.play(first.sfx as SfxId);
  if (first?.soundSubtitle) get().showSubtitle(first.soundSubtitle);
  if (node.end && node.lines.length === 0) get().endDialogue();
}

function handleSignals(signals: Signal[], get: Getter, beforeChapter?: ChapterId): void {
  for (const signal of signals) {
    switch (signal.kind) {
      case 'sfx':
        audio.play(signal.id as SfxId);
        break;
      case 'music':
        audio.setMusic(signal.cue as MusicCue);
        break;
      case 'chapter':
        get().saveNow();
        break;
      case 'startCombat':
        get().beginCombat();
        break;
      case 'endChapter': {
        // The chapter being closed is the one we were in BEFORE this effect
        // list ran — a `chapter` effect in the same list has usually already
        // advanced run.chapter, and summarising the new chapter would both
        // mislabel the card and (via dismiss) skip a chapter entirely.
        const run = get().run;
        const closing = beforeChapter ?? run.chapter;
        const index = CHAPTER_ORDER.indexOf(closing);
        const next = run.chapter !== closing ? run.chapter : (CHAPTER_ORDER[index + 1] ?? null);
        get().showChapterSummary({
          chapter: closing,
          nextChapter: next,
          lines: run.choices.filter((c) => c.chapter === closing).map((c) => c.label),
        });
        break;
      }
      case 'ending':
        get().saveNow();
        break;
    }
  }
}

function spellSfx(spell: string): SfxId {
  switch (spell) {
    case 'frostgrip':
      return 'spell-frost';
    case 'dissonantWhispers':
    case 'viciousMockery':
      return 'spell-psychic';
    case 'command':
      return 'spell-command';
    case 'healingWord':
      return 'spell-heal';
    case 'thaumaturgy':
      return 'spell-thaumaturgy';
    case 'message':
      return 'whisper';
    default:
      return 'ui-select';
  }
}

function reactToCombatEvents(events: CombatEvent[], get: Getter): void {
  for (const event of events) {
    switch (event.kind) {
      case 'attack':
        audio.play(event.hit ? (event.critical ? 'hit-heavy' : 'hit') : 'ui-hover');
        if (event.critical) get().addShake(0.4);
        break;
      case 'spell':
        audio.play(spellSfx(event.spell));
        break;
      case 'damage':
        get().addShake(Math.min(0.3, event.amount * 0.02));
        break;
      case 'heal':
        audio.play('spell-heal');
        break;
      case 'down':
        audio.play('down');
        get().addShake(0.5);
        break;
      case 'inspire':
        audio.play('inspire');
        break;
    }
  }
}

/** Read the save index once at boot so the title screen knows about Continue. */
export function initialiseFromStorage(): void {
  const envelope = readSave();
  useGame.setState({
    hasSaveFile: envelope !== null,
    everCompleted: envelope?.everCompleted ?? false,
  });
  const params = new URLSearchParams(window.location.search);
  const seed = params.get('seed');
  if (seed) seedAmbientRng(seed);
}
