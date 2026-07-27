/**
 * The palette, in one place.
 *
 * Black, anthracite, dark wine, desaturated violet, cold silver, faint amber.
 * Scenes are allowed to tint these, never to invent new hues — that is what
 * keeps an illustrated storybook looking like one book.
 */

export const PALETTE = {
  black: '#08070a',
  anthracite: '#1a1a20',
  slate: '#2a2b33',
  stone: '#3a3a42',
  wine: '#5c1f2c',
  wineLight: '#8d2f42',
  violet: '#6f4bab',
  violetPale: '#a08bd0',
  silver: '#b9bec9',
  silverCold: '#d6dde8',
  amber: '#e0a659',
  amberDeep: '#a86a28',
  frost: '#9fd4e6',
  frostDeep: '#4d7f95',
  timber: '#3b2b21',
  timberLight: '#5a4231',
  mud: '#241d18',
  moss: '#2c3327',
  parchment: '#d8cbb0',
  bone: '#c9c2ae',
} as const;

/** Scene-level fog and light recipes, so every location has a written look. */
export const SCENE_LOOKS = {
  title: { fog: PALETTE.black, fogNear: 3, fogFar: 16, ambient: 0.12, ambientColor: PALETTE.violet },
  'inn-outside': { fog: '#16161f', fogNear: 8, fogFar: 52, ambient: 0.42, ambientColor: '#5b6684' },
  'inn-inside': { fog: '#120e0d', fogNear: 5, fogFar: 30, ambient: 0.44, ambientColor: '#6b5236' },
  road: { fog: '#171820', fogNear: 5, fogFar: 38, ambient: 0.34, ambientColor: '#565c74' },
  shrine: { fog: '#141520', fogNear: 4, fogFar: 34, ambient: 0.32, ambientColor: '#54546e' },
  gate: { fog: '#0d0c14', fogNear: 4, fogFar: 42, ambient: 0.3, ambientColor: '#645682' },
} as const;

export type SceneLookId = keyof typeof SCENE_LOOKS;
