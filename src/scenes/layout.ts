/**
 * Where the player can stand, and where the things they can touch are.
 *
 * This lives apart from the scene components for one reason: it is the data a
 * test can check.  An interaction point that no reachable standing position can
 * get close enough to is invisible to the player — the prompt simply never
 * appears — and that is not something a type checker or a render test notices.
 * `reachablePoints` in `reachability.ts` walks these numbers and proves every
 * point can actually be reached.
 *
 * Scenes import positions and radii from here; labels, conditions and effects
 * stay with the scene, where they read as story rather than geometry.
 */

import type { Obstacle } from './exploration';

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface LayoutPoint {
  position: [number, number, number];
  radius: number;
}

export interface AreaLayout {
  /** Human name, used in test failures. */
  name: string;
  start: [number, number];
  bounds: Bounds;
  obstacles: Obstacle[];
  points: Record<string, LayoutPoint>;
}

/**
 * Outside the inn, at sunset, in the rain.
 *
 * The inn is a wide building, so the front of it is a *bound* rather than a
 * collision circle: a circle big enough to block the eleven-metre facade also
 * pushed the player back out of reach of his own front door.
 */
export const INN_OUTSIDE: AreaLayout = {
  name: 'inn (outside)',
  start: [0, 4.5],
  bounds: { minX: -7, maxX: 7, minZ: -3.2, maxZ: 9 },
  obstacles: [],
  points: {
    door: { position: [0, 1, -3.2], radius: 2.4 },
    sign: { position: [3.2, 1.6, -2.4], radius: 1.8 },
  },
};

export const INN_INSIDE: AreaLayout = {
  name: 'inn (taproom)',
  start: [0, 3.6],
  bounds: { minX: -4.6, maxX: 5.0, minZ: -3.6, maxZ: 4.8 },
  obstacles: [
    { x: -2.6, z: -2.1, radius: 1.0 }, // Emrik's table
    { x: 2.8, z: -1.1, radius: 0.85 }, // Nell's table
    { x: 2.2, z: 1.9, radius: 0.85 }, // Ansbeth's stool
    { x: -3.9, z: 3.0, radius: 1.2 }, // the bar
    { x: -0.2, z: -3.9, radius: 1.1 }, // the hearth
  ],
  points: {
    emrik: { position: [-2.6, 0.9, -1.4], radius: 1.7 },
    nell: { position: [2.8, 0.9, -0.4], radius: 1.6 },
    ansbeth: { position: [2.2, 0.9, 2.6], radius: 1.6 },
    tovin: { position: [-3.4, 1.1, 2.4], radius: 1.7 },
    lockbox: { position: [-4.4, 0.8, 3.2], radius: 1.6 },
    stool: { position: [0.4, 0.7, 2.9], radius: 1.5 },
    window: { position: [4.6, 1.4, -2.2], radius: 1.8 },
    hearth: { position: [-0.2, 0.7, -3.5], radius: 1.8 },
    seat: { position: [-1.0, 0.6, 1.4], radius: 1.4 },
    medallion: { position: [-1.0, 1.2, 0.2], radius: 1.2 },
    leave: { position: [0, 1, 4.6], radius: 1.8 },
  },
};

export const ROAD_START_Z = 10;
export const ROAD_END_Z = -30;

export const ROAD: AreaLayout = {
  name: 'the road east',
  start: [0, ROAD_START_Z],
  bounds: { minX: -6, maxX: 6, minZ: ROAD_END_Z - 1, maxZ: ROAD_START_Z + 2 },
  obstacles: [],
  points: {
    medallion: { position: [1.6, 1.2, 2.0], radius: 2.0 },
    tracks: { position: [-2.2, 0.4, -4.0], radius: 2.0 },
    stone: { position: [2.6, 0.5, -13.0], radius: 2.2 },
  },
};

export const SHRINE: AreaLayout = {
  name: 'the broken shrine',
  start: [0, 7],
  bounds: { minX: -8, maxX: 8, minZ: -6, maxZ: 9 },
  obstacles: [
    { x: 0, z: -2.6, radius: 2.0 }, // the shrine steps and altar
    { x: -3.4, z: 0.4, radius: 1.3 }, // the fallen cart
  ],
  points: {
    arrive: { position: [0, 1.2, 5.5], radius: 3.2 },
    body: { position: [-4.6, 0.8, -1.2], radius: 2.0 },
    carving: { position: [1.6, 0.8, -2.2], radius: 2.0 },
    box: { position: [0, 1.2, -3.0], radius: 2.2 },
    medallion: { position: [-3.0, 1.2, 0.8], radius: 1.6 },
    treeline: { position: [5.6, 1.2, -4.6], radius: 2.8 },
  },
};

export const GATE: AreaLayout = {
  name: 'beyond the gate',
  start: [0, 8],
  bounds: { minX: -7, maxX: 7, minZ: -3.5, maxZ: 10 },
  obstacles: [],
  points: {
    pillars: { position: [0, 1.4, -4], radius: 3.4 },
    medallion: { position: [2.2, 1.2, 1.4], radius: 1.8 },
    behind: { position: [0, 1.0, 7.5], radius: 2.6 },
  },
};

export const ALL_AREAS: AreaLayout[] = [INN_OUTSIDE, INN_INSIDE, ROAD, SHRINE, GATE];
