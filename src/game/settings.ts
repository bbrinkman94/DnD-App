/**
 * Player settings — persisted separately from the save game so that
 * accessibility choices survive "restart experience".
 */

import { create } from 'zustand';

export type QualityPreset = 'low' | 'medium' | 'high';
export type TextSize = 'small' | 'normal' | 'large';

export interface Settings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  quality: QualityPreset;
  reducedMotion: boolean;
  highContrast: boolean;
  screenShake: boolean;
  skipDiceAnimation: boolean;
  subtitles: boolean;
  textSize: TextSize;
  invertY: boolean;
  cameraSensitivity: number;
}

export const DEFAULT_SETTINGS: Settings = {
  masterVolume: 0.8,
  musicVolume: 0.6,
  sfxVolume: 0.85,
  muted: false,
  quality: 'medium',
  reducedMotion: false,
  highContrast: false,
  screenShake: true,
  skipDiceAnimation: false,
  subtitles: true,
  textSize: 'normal',
  invertY: false,
  cameraSensitivity: 1,
};

export const SETTINGS_KEY = 'threshold.settings.v1';

function detectSystemPreferences(): Partial<Settings> {
  if (typeof window === 'undefined' || !window.matchMedia) return {};
  const out: Partial<Settings> = {};
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    out.reducedMotion = true;
    out.screenShake = false;
  }
  if (window.matchMedia('(prefers-contrast: more)').matches) out.highContrast = true;
  return out;
}

export function loadSettings(): Settings {
  const base: Settings = { ...DEFAULT_SETTINGS, ...detectSystemPreferences() };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return base;
    return sanitizeSettings({ ...base, ...(parsed as Partial<Settings>) });
  } catch {
    return base;
  }
}

/** Defensive: a hand-edited or half-written localStorage entry must not break the game. */
export function sanitizeSettings(input: Partial<Settings>): Settings {
  const clamp01 = (value: unknown, fallback: number): number =>
    typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
  const bool = (value: unknown, fallback: boolean): boolean =>
    typeof value === 'boolean' ? value : fallback;
  const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
    typeof value === 'string' && (options as readonly string[]).includes(value) ? (value as T) : fallback;

  return {
    masterVolume: clamp01(input.masterVolume, DEFAULT_SETTINGS.masterVolume),
    musicVolume: clamp01(input.musicVolume, DEFAULT_SETTINGS.musicVolume),
    sfxVolume: clamp01(input.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
    muted: bool(input.muted, DEFAULT_SETTINGS.muted),
    quality: oneOf(input.quality, ['low', 'medium', 'high'] as const, DEFAULT_SETTINGS.quality),
    reducedMotion: bool(input.reducedMotion, DEFAULT_SETTINGS.reducedMotion),
    highContrast: bool(input.highContrast, DEFAULT_SETTINGS.highContrast),
    screenShake: bool(input.screenShake, DEFAULT_SETTINGS.screenShake),
    skipDiceAnimation: bool(input.skipDiceAnimation, DEFAULT_SETTINGS.skipDiceAnimation),
    subtitles: bool(input.subtitles, DEFAULT_SETTINGS.subtitles),
    textSize: oneOf(input.textSize, ['small', 'normal', 'large'] as const, DEFAULT_SETTINGS.textSize),
    invertY: bool(input.invertY, DEFAULT_SETTINGS.invertY),
    cameraSensitivity:
      typeof input.cameraSensitivity === 'number' && Number.isFinite(input.cameraSensitivity)
        ? Math.min(2, Math.max(0.3, input.cameraSensitivity))
        : DEFAULT_SETTINGS.cameraSensitivity,
  };
}

export function persistSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable (private mode) — settings simply do not persist */
  }
}

interface SettingsStore extends Settings {
  set<K extends keyof Settings>(key: K, value: Settings[K]): void;
  reset(): void;
}

export const useSettings = create<SettingsStore>((set, get) => ({
  ...loadSettings(),
  set: (key, value) => {
    set({ [key]: value } as unknown as Partial<SettingsStore>);
    const { set: _s, reset: _r, ...rest } = get();
    persistSettings(rest as Settings);
  },
  reset: () => {
    set({ ...DEFAULT_SETTINGS });
    persistSettings(DEFAULT_SETTINGS);
  },
}));

/** Numeric knobs each quality preset drives. Read by the renderer and scenes. */
export const QUALITY_PROFILES: Record<
  QualityPreset,
  {
    dpr: [number, number];
    shadowMapSize: number;
    shadows: boolean;
    particles: number;
    treeCount: number;
    postprocessing: boolean;
    fogDetail: number;
  }
> = {
  low: {
    dpr: [0.7, 1],
    shadowMapSize: 512,
    shadows: false,
    particles: 60,
    treeCount: 90,
    postprocessing: false,
    fogDetail: 0.5,
  },
  medium: {
    dpr: [0.85, 1.4],
    shadowMapSize: 1024,
    shadows: true,
    particles: 160,
    treeCount: 190,
    postprocessing: true,
    fogDetail: 1,
  },
  high: {
    dpr: [1, 2],
    shadowMapSize: 2048,
    shadows: true,
    particles: 320,
    treeCount: 320,
    postprocessing: true,
    fogDetail: 1.5,
  },
};
