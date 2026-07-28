/**
 * Every interaction the player is meant to find must be physically reachable.
 *
 * This exists because it was not: the collision circle standing in for the inn
 * held the player 2.2 m from a front door with a 2.1 m interaction radius, so
 * the "Open the door" prompt could never appear and Chapter One could not be
 * entered at all. Ten centimetres, and the game did not start.
 */

import { describe, expect, it } from 'vitest';
import { ALL_AREAS, INN_OUTSIDE, type AreaLayout } from './layout';
import { checkArea, closestApproach, resolvePosition } from './reachability';

describe('position resolution', () => {
  it('clamps to the area bounds', () => {
    const bounds = { minX: -2, maxX: 2, minZ: -2, maxZ: 2 };
    expect(resolvePosition(99, 0, bounds, [])).toEqual({ x: 2, z: 0 });
    expect(resolvePosition(-99, -99, bounds, [])).toEqual({ x: -2, z: -2 });
  });

  it('pushes out of an obstacle to exactly its radius', () => {
    const bounds = { minX: -9, maxX: 9, minZ: -9, maxZ: 9 };
    const at = resolvePosition(0.5, 0, bounds, [{ x: 0, z: 0, radius: 3 }]);
    expect(Math.hypot(at.x, at.z)).toBeCloseTo(3, 5);
  });

  it('leaves a position outside every obstacle alone', () => {
    const bounds = { minX: -9, maxX: 9, minZ: -9, maxZ: 9 };
    expect(resolvePosition(5, 5, bounds, [{ x: 0, z: 0, radius: 3 }])).toEqual({ x: 5, z: 5 });
  });
});

describe('every scene interaction is reachable', () => {
  it.each(ALL_AREAS.map((area) => [area.name, area] as [string, AreaLayout]))(
    '%s',
    (_name, area) => {
      const failures = checkArea(area).filter((report) => !report.reachable);
      expect(
        failures.map(
          (f) =>
            `"${f.id}" is unreachable: closest approach ${f.distance.toFixed(2)}m, ` +
            `interaction radius ${f.radius}m (short by ${(-f.margin).toFixed(2)}m)`,
        ),
      ).toEqual([]);
    },
  );

  it('leaves a workable margin, not a hairline, on every point', () => {
    const tight = ALL_AREAS.flatMap((area) =>
      checkArea(area)
        .filter((report) => report.margin < 0.3)
        .map((report) => `${area.name}/${report.id}: ${report.margin.toFixed(2)}m`),
    );
    // A point the player can only touch from one exact pixel is a bug waiting
    // to be re-introduced by a nudge to any nearby number.
    expect(tight).toEqual([]);
  });
});

describe('the inn door specifically', () => {
  it('can be reached from where the player starts walking', () => {
    const door = INN_OUTSIDE.points.door;
    const { distance } = closestApproach(door, INN_OUTSIDE.bounds, INN_OUTSIDE.obstacles);
    expect(distance).toBeLessThan(door.radius);
  });

  it('is approached by walking north, the direction the scene points him', () => {
    const start = resolvePosition(
      INN_OUTSIDE.start[0],
      INN_OUTSIDE.start[1],
      INN_OUTSIDE.bounds,
      INN_OUTSIDE.obstacles,
    );
    const door = INN_OUTSIDE.points.door;
    // Walking straight forward (decreasing z) from the start must arrive.
    const arrival = resolvePosition(start.x, INN_OUTSIDE.bounds.minZ, INN_OUTSIDE.bounds, INN_OUTSIDE.obstacles);
    const distance = Math.hypot(arrival.x - door.position[0], arrival.z - door.position[2]);
    expect(distance).toBeLessThanOrEqual(door.radius);
  });
});
