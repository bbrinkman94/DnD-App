import { describe, expect, it } from 'vitest';
import { abilityModifier, formatModifier, SKILL_KEYS } from '@/data/abilities';
import { CORVIN, CORVIN_TRAITS, corvinAbilityMod } from '@/data/corvin';
import { modifierBreakdown, performCheck, savingThrowModifier, skillModifier, totalModifier } from './checks';
import { createRng } from './rng';
import { DEFAULT_SETTINGS, sanitizeSettings } from './settings';

const context = { medallionChill: 0, hasPerformed: false };

describe('the sheet', () => {
  it('derives modifiers that agree with the written skill values', () => {
    expect(corvinAbilityMod('cha')).toBe(3);
    expect(corvinAbilityMod('dex')).toBe(2);
    expect(corvinAbilityMod('str')).toBe(-1);
    // Deception is CHA +3 plus expertise-flavoured sheet value of +5.
    expect(skillModifier('deception')).toBe(5);
    expect(skillModifier('persuasion')).toBe(3);
    expect(skillModifier('stealth')).toBe(2);
  });

  it('falls back to the ability modifier for skills the sheet does not list', () => {
    expect(CORVIN.skills.perception).toBeUndefined();
    expect(skillModifier('perception')).toBe(abilityModifier(CORVIN.abilities.wis));
    expect(skillModifier('arcana')).toBe(abilityModifier(CORVIN.abilities.int));
  });

  it('has a modifier for every skill the slice can ask for', () => {
    for (const skill of SKILL_KEYS) {
      expect(Number.isFinite(skillModifier(skill))).toBe(true);
    }
  });

  it('adds proficiency to DEX and CHA saves only', () => {
    expect(savingThrowModifier('dex')).toBe(2 + CORVIN.proficiencyBonus);
    expect(savingThrowModifier('cha')).toBe(3 + CORVIN.proficiencyBonus);
    expect(savingThrowModifier('wis')).toBe(0);
    expect(savingThrowModifier('str')).toBe(-1);
  });

  it('agrees with passive Perception on the sheet', () => {
    expect(10 + skillModifier('perception')).toBe(CORVIN.passivePerception);
  });
});

describe('situational modifiers', () => {
  it('adds chthonic sensitivity only to tagged Perception checks', () => {
    const tagged = totalModifier(
      { skill: 'perception', dc: 12, label: 'x', tags: ['chthonic'] },
      context,
    );
    const plain = totalModifier({ skill: 'perception', dc: 12, label: 'x' }, context);
    expect(tagged - plain).toBe(CORVIN_TRAITS.chthonicSensitivity);
  });

  it('does not apply chthonic sensitivity to other skills', () => {
    const tagged = totalModifier({ skill: 'deception', dc: 12, label: 'x', tags: ['chthonic'] }, context);
    expect(tagged).toBe(skillModifier('deception'));
  });

  it('only lets the medallion help Arcana once it is cold enough', () => {
    const request = { skill: 'arcana' as const, dc: 12, label: 'x', tags: ['medallion' as const] };
    const cold = totalModifier(request, { medallionChill: 0.9 });
    const warm = totalModifier(request, { medallionChill: 0.1 });
    expect(cold - warm).toBe(CORVIN_TRAITS.medallionAttunement.bonus);
  });

  it('gives a small bonus once the room has already heard him play', () => {
    const request = { skill: 'persuasion' as const, dc: 12, label: 'x', tags: ['performance-aided' as const] };
    expect(totalModifier(request, { medallionChill: 0, hasPerformed: true })).toBe(
      totalModifier(request, { medallionChill: 0, hasPerformed: false }) + 1,
    );
  });

  it('itemises every part so the roll breakdown can show them', () => {
    const parts = modifierBreakdown(
      { skill: 'perception', dc: 12, label: 'x', tags: ['chthonic'] },
      { medallionChill: 0 },
    );
    expect(parts).toHaveLength(2);
    expect(parts[1].label).toMatch(/chthonic/i);
    expect(parts.reduce((a, p) => a + p.value, 0)).toBe(
      skillModifier('perception') + CORVIN_TRAITS.chthonicSensitivity,
    );
  });
});

describe('performing a check', () => {
  it('applies the itemised modifier to the roll', () => {
    const result = performCheck({ skill: 'deception', dc: 15, label: 'x' }, context, { forceNatural: 12 });
    expect(result.roll.natural).toBe(12);
    expect(result.roll.total).toBe(12 + 5);
    expect(result.success).toBe(true);
    expect(result.margin).toBe(2);
  });

  it('reports critical outcomes for presentation', () => {
    expect(performCheck({ skill: 'stealth', dc: 30, label: 'x' }, context, { forceNatural: 20 }).outcome).toBe(
      'critical-success',
    );
    expect(performCheck({ skill: 'deception', dc: 2, label: 'x' }, context, { forceNatural: 1 }).outcome).toBe(
      'critical-failure',
    );
  });

  it('honours advantage declared on the request', () => {
    const result = performCheck(
      { skill: 'stealth', dc: 12, label: 'x', advantage: true },
      context,
      { rng: createRng(5) },
    );
    expect(result.roll.advantage).toBe(true);
    expect(result.roll.faces).toHaveLength(2);
  });

  it('is reproducible under a seeded rng', () => {
    const a = performCheck({ skill: 'persuasion', dc: 13, label: 'x' }, context, { rng: createRng(99) });
    const b = performCheck({ skill: 'persuasion', dc: 13, label: 'x' }, context, { rng: createRng(99) });
    expect(b.roll.natural).toBe(a.roll.natural);
    expect(b.success).toBe(a.success);
  });
});

describe('formatting', () => {
  it('signs modifiers for display', () => {
    expect(formatModifier(3)).toBe('+3');
    expect(formatModifier(0)).toBe('+0');
    expect(formatModifier(-2)).toBe('−2');
  });
});

describe('settings sanitising', () => {
  it('keeps sensible values and repairs the rest', () => {
    const settings = sanitizeSettings({
      masterVolume: 0.42,
      musicVolume: 9,
      sfxVolume: -3,
      quality: 'ultra' as never,
      textSize: 'huge' as never,
      reducedMotion: 'yes' as never,
      cameraSensitivity: 99,
    });
    expect(settings.masterVolume).toBe(0.42);
    expect(settings.musicVolume).toBe(1);
    expect(settings.sfxVolume).toBe(0);
    expect(settings.quality).toBe(DEFAULT_SETTINGS.quality);
    expect(settings.textSize).toBe(DEFAULT_SETTINGS.textSize);
    expect(settings.reducedMotion).toBe(DEFAULT_SETTINGS.reducedMotion);
    expect(settings.cameraSensitivity).toBe(2);
  });

  it('fills in everything that is missing', () => {
    expect(sanitizeSettings({})).toEqual(DEFAULT_SETTINGS);
  });
});
