/**
 * Can the player actually stand near that?
 *
 * Movement clamps to the area bounds and then pushes out of every obstacle
 * circle, exactly as `useExploration` does each frame.  This module replays
 * that resolution over a grid of sample positions so a test can prove each
 * interaction point is within reach of somewhere the player can legally be.
 */

import type { Obstacle } from './exploration';
import type { AreaLayout, Bounds, LayoutPoint } from './layout';

/** The same clamp-then-push resolution the movement loop performs. */
export function resolvePosition(
  x: number,
  z: number,
  bounds: Bounds,
  obstacles: Obstacle[],
): { x: number; z: number } {
  let px = Math.min(bounds.maxX, Math.max(bounds.minX, x));
  let pz = Math.min(bounds.maxZ, Math.max(bounds.minZ, z));
  for (const obstacle of obstacles) {
    const dx = px - obstacle.x;
    const dz = pz - obstacle.z;
    const distance = Math.hypot(dx, dz);
    if (distance < obstacle.radius && distance > 1e-4) {
      const push = (obstacle.radius - distance) / distance;
      px += dx * push;
      pz += dz * push;
    }
  }
  return { x: px, z: pz };
}

/** How close the player can get to a point, and where from. */
export function closestApproach(
  point: LayoutPoint,
  bounds: Bounds,
  obstacles: Obstacle[],
  step = 0.1,
): { distance: number; from: { x: number; z: number } } {
  let best = Infinity;
  let from = { x: 0, z: 0 };
  for (let x = bounds.minX; x <= bounds.maxX + 1e-6; x += step) {
    for (let z = bounds.minZ; z <= bounds.maxZ + 1e-6; z += step) {
      const at = resolvePosition(x, z, bounds, obstacles);
      const distance = Math.hypot(at.x - point.position[0], at.z - point.position[2]);
      if (distance < best) {
        best = distance;
        from = at;
      }
    }
  }
  return { distance: best, from };
}

export interface ReachabilityReport {
  id: string;
  reachable: boolean;
  /** How close the player can get, in metres. */
  distance: number;
  radius: number;
  /** Positive means slack; negative is how far short the player falls. */
  margin: number;
}

/** Check every interaction point in an area. */
export function checkArea(area: AreaLayout, step = 0.1): ReachabilityReport[] {
  return Object.entries(area.points).map(([id, point]) => {
    const { distance } = closestApproach(point, area.bounds, area.obstacles, step);
    return {
      id,
      reachable: distance <= point.radius,
      distance,
      radius: point.radius,
      margin: point.radius - distance,
    };
  });
}
