import { describe, expect, it } from 'vitest';
import { D20_FACE_FOR_NUMBER, D20_FACE_NORMALS, D20_FACE_NUMBERS, D20_FACES, D20_VERTICES } from './d20Geometry';
import { DiceSim, faceShowing, quatFromUnitVectors, quatRotate } from './dicePhysics';

describe('d20 geometry', () => {
  it('has 12 unit vertices and 20 faces', () => {
    expect(D20_VERTICES).toHaveLength(12);
    expect(D20_FACES).toHaveLength(20);
    D20_VERTICES.forEach((v) => expect(Math.hypot(v.x, v.y, v.z)).toBeCloseTo(1, 6));
  });

  it('numbers every face from 1 to 20 exactly once', () => {
    expect([...D20_FACE_NUMBERS].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 20 }, (_, i) => i + 1),
    );
  });

  it('puts opposite faces on numbers that sum to 21', () => {
    D20_FACE_NORMALS.forEach((n, i) => {
      const opposite = D20_FACE_NORMALS.findIndex(
        (m) => Math.abs(n.x + m.x) < 1e-6 && Math.abs(n.y + m.y) < 1e-6 && Math.abs(n.z + m.z) < 1e-6,
      );
      expect(opposite).toBeGreaterThanOrEqual(0);
      expect(D20_FACE_NUMBERS[i] + D20_FACE_NUMBERS[opposite]).toBe(21);
    });
  });

  it('maps numbers back to their face index', () => {
    for (let n = 1; n <= 20; n++) {
      expect(D20_FACE_NUMBERS[D20_FACE_FOR_NUMBER[n]]).toBe(n);
    }
  });
});

describe('quaternion helpers', () => {
  it('rotates one unit vector onto another', () => {
    const from = { x: 0.3, y: -0.9, z: 0.31 };
    const len = Math.hypot(from.x, from.y, from.z);
    const unit = { x: from.x / len, y: from.y / len, z: from.z / len };
    const q = quatFromUnitVectors(unit, { x: 0, y: 1, z: 0 });
    const rotated = quatRotate(q, unit);
    expect(rotated.y).toBeCloseTo(1, 5);
  });

  it('handles the antipodal case without producing NaN', () => {
    const q = quatFromUnitVectors({ x: 0, y: -1, z: 0 }, { x: 0, y: 1, z: 0 });
    const rotated = quatRotate(q, { x: 0, y: -1, z: 0 });
    expect(Number.isNaN(rotated.y)).toBe(false);
    expect(rotated.y).toBeCloseTo(1, 5);
  });
});

describe('dice simulation', () => {
  it('settles on the requested number for every face and many seeds', () => {
    for (let target = 1; target <= 20; target++) {
      for (const seed of [1, 7, 512, 90210]) {
        const sim = new DiceSim({ targetNumber: target, seed });
        const frame = sim.runToRest();
        expect(frame.settled).toBe(true);
        expect(D20_FACE_NUMBERS[faceShowing(frame.rotation)]).toBe(target);
      }
    }
  });

  it('is reproducible from a seed', () => {
    const a = new DiceSim({ targetNumber: 13, seed: 4242 }).runToRest();
    const b = new DiceSim({ targetNumber: 13, seed: 4242 }).runToRest();
    expect(b.position).toEqual(a.position);
    expect(b.rotation).toEqual(a.rotation);
  });

  it('produces different throws for different seeds', () => {
    const a = new DiceSim({ targetNumber: 13, seed: 1 }).runToRest();
    const b = new DiceSim({ targetNumber: 13, seed: 2 }).runToRest();
    expect(b.position).not.toEqual(a.position);
  });

  it('stays inside the tray and above the floor', () => {
    const sim = new DiceSim({ targetNumber: 9, seed: 31337, trayRadius: 1.15, dieRadius: 0.26 });
    for (let i = 0; i < 400; i++) {
      const frame = sim.step(1 / 60);
      expect(frame.position.y).toBeGreaterThanOrEqual(0.2);
      expect(Math.abs(frame.position.x)).toBeLessThanOrEqual(1.16);
      expect(Math.abs(frame.position.z)).toBeLessThanOrEqual(1.16);
      if (frame.settled) break;
    }
  });

  it('reports impacts so audio and shake can react to real bounces', () => {
    const sim = new DiceSim({ targetNumber: 20, seed: 808 });
    let impacts = 0;
    for (let i = 0; i < 600; i++) {
      const frame = sim.step(1 / 60);
      impacts += frame.impacts.length;
      frame.impacts.forEach((impact) => {
        expect(impact.strength).toBeGreaterThan(0);
        expect(impact.strength).toBeLessThanOrEqual(1);
      });
      if (frame.settled) break;
    }
    expect(impacts).toBeGreaterThan(0);
  });

  it('always terminates, even with hostile parameters', () => {
    const sim = new DiceSim({ targetNumber: 4, seed: 5, restitution: 0.95, maxDuration: 2 });
    const frame = sim.runToRest(2000);
    expect(frame.settled).toBe(true);
  });
});
