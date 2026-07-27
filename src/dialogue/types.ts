/**
 * Dialogue data model.
 *
 * Trees are plain data (see `src/dialogue/trees/`), evaluated by the pure
 * functions in `engine.ts`.  No component ever reaches into a tree directly.
 */

import type { CompanionId, CharacterId } from '@/data/characters';
import type { CommandWordId, SpellId } from '@/data/spells';
import type { CheckRequest } from '@/game/checks';
import type { ChapterId, FlagValue } from '@/game/save';

export type Condition =
  | { kind: 'flag'; key: string; equals?: FlagValue }
  | { kind: 'clue'; id: string }
  | { kind: 'disposition'; companion: CompanionId; atLeast: number }
  | { kind: 'spell'; id: SpellId }
  | { kind: 'language'; id: string }
  | { kind: 'tool'; id: string }
  | { kind: 'slots'; atLeast: number }
  | { kind: 'inspiration'; atLeast: number }
  | { kind: 'medallion'; atLeast: number }
  | { kind: 'chapter'; is: ChapterId }
  | { kind: 'not'; of: Condition }
  | { kind: 'all'; of: Condition[] }
  | { kind: 'any'; of: Condition[] };

export type Effect =
  | { kind: 'flag'; key: string; value: FlagValue }
  | { kind: 'clue'; id: string }
  | { kind: 'disposition'; companion: CompanionId; delta: number }
  | { kind: 'medallionChill'; to?: number; delta?: number }
  | { kind: 'medallionStage'; to: number }
  | { kind: 'spendSlot' }
  | { kind: 'useInspiration' }
  | { kind: 'damage'; amount: number }
  | { kind: 'heal'; amount: number }
  | { kind: 'choice'; label: string }
  | { kind: 'sfx'; id: string }
  | { kind: 'music'; cue: string }
  | { kind: 'recruit'; companion: CompanionId }
  | { kind: 'chapter'; to: ChapterId }
  | { kind: 'startCombat' }
  | { kind: 'endChapter' }
  | { kind: 'ending' };

/** How the camera should frame a node. Scenes map these to actual rigs. */
export type CameraCue =
  | 'default'
  | 'closeup'
  | 'over-shoulder'
  | 'two-shot'
  | 'wide'
  | 'medallion'
  | 'whisper'
  | 'reveal'
  | 'combat';

export interface DialogueLine {
  speaker: CharacterId;
  text: string;
  /** Cinematic lines advance themselves after a beat. */
  auto?: boolean;
  camera?: CameraCue;
  /** Non-speech sound worth subtitling, e.g. "(a shutter opens by itself)". */
  soundSubtitle?: string;
  sfx?: string;
  /** Whisper lines get the spatial/warped treatment. */
  whisper?: boolean;
}

export type ChoiceTone =
  | 'sincere'
  | 'charming'
  | 'deceptive'
  | 'dry'
  | 'intimidating'
  | 'silent'
  | 'arcane'
  | 'plain';

export interface DialogueChoice {
  id: string;
  text: string;
  /** Small italic clue under the line — never a mechanical spoiler of the DC. */
  hint?: string;
  tone?: ChoiceTone;
  requires?: Condition;
  /** When false (default) an unmet choice is shown locked, not hidden. */
  hideWhenLocked?: boolean;
  lockedReason?: string;
  check?: CheckRequest & { success: string; failure: string };
  spell?: SpellId;
  commandWord?: CommandWordId;
  effects?: Effect[];
  next?: string;
}

export interface DialogueNode {
  id: string;
  lines: DialogueLine[];
  onEnter?: Effect[];
  choices?: DialogueChoice[];
  /** Used when there are no choices. */
  next?: string;
  /** Ends the conversation and hands control back to exploration. */
  end?: boolean;
  camera?: CameraCue;
}

export interface DialogueTree {
  id: string;
  start: string;
  nodes: Record<string, DialogueNode>;
}
