/**
 * Store sequencing tests.
 *
 * Regression coverage for the chapter-transition flow: a dialogue choice that
 * carries both a `chapter` effect and an `endChapter` effect must summarise the
 * chapter that just CLOSED, not the one just opened — getting this wrong once
 * skipped Chapter Two entirely.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { TREES } from '@/dialogue/trees';
import { useGame } from './store';

function freshGame(): void {
  useGame.getState().startNewGame();
}

/** Walk the current dialogue node to its last line so choices become active. */
function drainLines(): void {
  for (let i = 0; i < 20; i++) {
    const { dialogue } = useGame.getState();
    if (!dialogue) return;
    const node = TREES[dialogue.treeId].nodes[dialogue.nodeId];
    if (dialogue.lineIndex >= node.lines.length - 1) return;
    useGame.getState().advanceLine();
  }
}

beforeEach(() => {
  localStorage.clear();
  freshGame();
});

describe('leaving the inn', () => {
  it('summarises Chapter One and moves to the road — not past it', () => {
    const state = useGame.getState();
    state.startDialogue('inn-depart');
    drainLines();

    const tree = TREES['inn-depart'];
    const choice = tree.nodes.open.choices!.find((c) => c.id === 'go')!;
    useGame.getState().chooseChoice(choice);

    const summary = useGame.getState().chapterSummary;
    expect(summary).not.toBeNull();
    expect(summary!.chapter).toBe('inn');
    expect(summary!.nextChapter).toBe('road');
    // The choice made in the inn appears on the inn's summary card.
    expect(summary!.lines).toContain('Signed on and left before dawn');
    // The run has already moved on underneath the card.
    expect(useGame.getState().run.chapter).toBe('road');
    // The card is up: mode must be cinematic even though the dialogue closed.
    expect(useGame.getState().mode).toBe('cinematic');

    useGame.getState().dismissChapterSummary();
    expect(useGame.getState().run.chapter).toBe('road');
    expect(useGame.getState().chapterSummary).toBeNull();
    expect(useGame.getState().mode).toBe('explore');
  });
});

describe('the road howl transition', () => {
  it('plays its lines before the chapter turns over', () => {
    useGame.getState().setChapter('road');
    useGame.getState().startDialogue('road-howl');

    // While the lines are on screen, we are still on the road.
    expect(useGame.getState().run.chapter).toBe('road');
    expect(useGame.getState().chapterSummary).toBeNull();

    drainLines();
    useGame.getState().advanceLine(); // past the last line -> terminal node

    expect(useGame.getState().run.chapter).toBe('shrine');
    const summary = useGame.getState().chapterSummary;
    expect(summary!.chapter).toBe('road');
    expect(summary!.nextChapter).toBe('shrine');
  });
});

describe('after the encounter', () => {
  it('closes the shrine chapter and opens the gate', () => {
    useGame.getState().setChapter('shrine');
    useGame.getState().startDialogue('encounter-after');
    drainLines();

    const tree = TREES['encounter-after'];
    const quiet = tree.nodes.open.choices!.find((c) => c.id === 'quiet')!;
    useGame.getState().chooseChoice(quiet); // -> gate node, lines, then terminal
    drainLines();
    useGame.getState().advanceLine();

    expect(useGame.getState().run.chapter).toBe('gate');
    const summary = useGame.getState().chapterSummary;
    expect(summary!.chapter).toBe('shrine');
    expect(summary!.nextChapter).toBe('gate');
  });
});

describe('combat pause and companions', () => {
  it('always fields both companions, however unsociable Corvin was in the inn', () => {
    useGame.getState().beginCombat();
    const combat = useGame.getState().combat!;
    expect(combat.actors.nell).toBeDefined();
    expect(combat.actors.ansbeth).toBeDefined();
    useGame.getState().returnToTitle();
  });

  it('erasing the save also closes the menu', () => {
    useGame.getState().setMenu('pause');
    useGame.getState().eraseSave();
    expect(useGame.getState().menu).toBeNull();
    expect(useGame.getState().phase).toBe('title');
  });
});
