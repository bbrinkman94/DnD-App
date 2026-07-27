import { describe, expect, it } from 'vitest';
import { CORVIN } from '@/data/corvin';
import {
  CHAPTER_ORDER,
  SAVE_KEY,
  LEGACY_SAVE_KEY,
  SAVE_VERSION,
  clearSave,
  createRunState,
  deserializeSave,
  hasSave,
  readSave,
  sanitizeRun,
  serializeSave,
  totalSlots,
  writeSave,
} from './save';

describe('a fresh run', () => {
  it('starts at the inn, unhurt, with everything unspent', () => {
    const run = createRunState();
    expect(run.chapter).toBe('inn');
    expect(run.hp).toBe(CORVIN.maxHp);
    expect(run.slotsUsed).toBe(0);
    expect(run.inspirationUsed).toBe(0);
    expect(run.medallionChill).toBe(0);
    expect(run.medallionStage).toBe(0);
    expect(run.completed).toBe(false);
    expect(run.clues).toEqual([]);
    expect(run.companions.nell.met).toBe(false);
    expect(run.companions.ansbeth.disposition).toBe(0);
  });
});

describe('round tripping', () => {
  it('survives serialise -> deserialise unchanged', () => {
    const run = createRunState();
    run.chapter = 'shrine';
    run.hp = 4;
    run.slotsUsed = 1;
    run.clues = ['emrik-lying', 'fog-directs'];
    run.flags = { performed: true, gold: 60, wine: 'refused' };
    run.companions.nell = { met: true, disposition: 3, recruited: true };
    run.medallionChill = 0.85;
    run.medallionStage = 2;
    run.choices = [{ chapter: 'inn', label: 'Refused the wine' }];

    const envelope = deserializeSave(serializeSave(run, false));
    expect(envelope).not.toBeNull();
    expect(envelope!.version).toBe(SAVE_VERSION);
    expect(envelope!.run).toEqual(run);
  });

  it('remembers that the experience was finished', () => {
    const envelope = deserializeSave(serializeSave(createRunState(), true));
    expect(envelope!.everCompleted).toBe(true);
  });

  it('infers everCompleted from a completed run', () => {
    const run = createRunState();
    run.completed = true;
    expect(deserializeSave(serializeSave(run, false))!.everCompleted).toBe(true);
  });
});

describe('invalid and hostile saves', () => {
  it('treats null, empty and non-JSON as no save', () => {
    expect(deserializeSave(null)).toBeNull();
    expect(deserializeSave('')).toBeNull();
    expect(deserializeSave('not json at all')).toBeNull();
    expect(deserializeSave('[1,2,3]')).toBeNull();
    expect(deserializeSave('"a string"')).toBeNull();
  });

  it('rebuilds a usable run from garbage fields instead of throwing', () => {
    const run = sanitizeRun({
      chapter: 'the moon',
      hp: 'lots',
      slotsUsed: -9,
      inspirationUsed: 999,
      medallionChill: 7,
      medallionStage: -3,
      flags: { good: true, bad: { nested: 1 }, count: 3 },
      clues: ['a', 'a', 42, null, 'b'],
      companions: { nell: 'no', ansbeth: { met: true, disposition: 99 } },
      choices: [{ chapter: 'inn', label: 'kept' }, { chapter: 'nowhere', label: 'dropped' }, 'junk'],
      completed: 'yes',
    });

    expect(CHAPTER_ORDER).toContain(run.chapter);
    expect(run.hp).toBe(CORVIN.maxHp);
    expect(run.slotsUsed).toBe(0);
    expect(run.inspirationUsed).toBe(CORVIN.bardicInspiration.uses);
    expect(run.medallionChill).toBe(1);
    expect(run.medallionStage).toBe(0);
    expect(run.flags).toEqual({ good: true, count: 3 });
    expect(run.clues).toEqual(['a', 'b']);
    expect(run.companions.nell).toEqual({ met: false, disposition: 0, recruited: false });
    expect(run.companions.ansbeth.disposition).toBe(5);
    expect(run.choices).toEqual([{ chapter: 'inn', label: 'kept' }]);
    expect(run.completed).toBe(false);
  });

  it('never lets resources exceed what the sheet allows', () => {
    const run = sanitizeRun({ slotsUsed: 50, inspirationUsed: 50, hp: 5000 });
    expect(run.slotsUsed).toBe(totalSlots());
    expect(run.inspirationUsed).toBe(CORVIN.bardicInspiration.uses);
    expect(run.hp).toBe(CORVIN.maxHp);
  });

  it('accepts a bare run object written by an early build', () => {
    const bare = JSON.stringify({ chapter: 'road', hp: 7, clues: ['nell-road'] });
    const envelope = deserializeSave(bare);
    expect(envelope!.run.chapter).toBe('road');
    expect(envelope!.run.hp).toBe(7);
    expect(envelope!.run.clues).toEqual(['nell-road']);
  });
});

describe('migration', () => {
  it('reads a v1 envelope, where the run was called progress', () => {
    const v1 = JSON.stringify({
      version: 1,
      savedAt: 1700000000000,
      progress: { chapter: 'shrine', hp: 6, medallionChill: 0.9 },
      everCompleted: false,
    });
    const envelope = deserializeSave(v1);
    expect(envelope!.version).toBe(SAVE_VERSION);
    expect(envelope!.run.chapter).toBe('shrine');
    expect(envelope!.run.hp).toBe(6);
  });

  it('invents a medallion stage for v1 saves that were already very cold', () => {
    const v1 = JSON.stringify({ version: 1, progress: { medallionChill: 0.95 } });
    expect(deserializeSave(v1)!.run.medallionStage).toBe(2);
  });

  it('leaves a cool v1 save at stage zero', () => {
    const v1 = JSON.stringify({ version: 1, progress: { medallionChill: 0.2 } });
    expect(deserializeSave(v1)!.run.medallionStage).toBe(0);
  });

  it('migrates a legacy key into the current one and removes it', () => {
    localStorage.setItem(LEGACY_SAVE_KEY, JSON.stringify({ version: 1, progress: { chapter: 'gate' } }));
    const envelope = readSave();
    expect(envelope!.run.chapter).toBe('gate');
    expect(localStorage.getItem(LEGACY_SAVE_KEY)).toBeNull();
    expect(localStorage.getItem(SAVE_KEY)).not.toBeNull();
  });
});

describe('localStorage lifecycle', () => {
  it('writes, reads and clears', () => {
    expect(hasSave()).toBe(false);
    const run = createRunState();
    run.chapter = 'encounter';
    expect(writeSave(run, false)).toBe(true);
    expect(hasSave()).toBe(true);
    expect(readSave()!.run.chapter).toBe('encounter');
    clearSave();
    expect(hasSave()).toBe(false);
    expect(readSave()).toBeNull();
  });

  it('reports no save when the stored value is corrupt', () => {
    localStorage.setItem(SAVE_KEY, '{ this is not "json"');
    expect(readSave()).toBeNull();
    expect(hasSave()).toBe(false);
  });

  it('overwrites rather than accumulating', () => {
    writeSave({ ...createRunState(), chapter: 'road' }, false);
    writeSave({ ...createRunState(), chapter: 'gate' }, false);
    expect(readSave()!.run.chapter).toBe('gate');
  });
});
