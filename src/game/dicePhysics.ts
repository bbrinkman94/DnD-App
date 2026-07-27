/**
 * A small rigid-body simulation for exactly one object: the d20.
 *
 * Why not a general physics engine?  The die has one job — tumble convincingly
 * inside a leather tray and come to rest showing a number that was decided by
 * `dice.ts` before it was thrown.  A dedicated integrator gives us that
 * guarantee, runs deterministically from a seed (so tests and the `?seed=` mode
 * reproduce a throw exactly), needs no WASM, and adds nothing to the bundle.
 *
 * The throw is genuinely simulated: gravity, restitution, tangential friction,
 * angular drag and tray walls.  Only the final ~0.35s is *steered*, blending the
 * die's own resting orientation into the one that shows the intended face.  On
 * screen that reads as the die settling; mathematically it is a short slerp.
 */

import { D20_FACE_FOR_NUMBER, D20_FACE_NORMALS, type Vec3 } from './d20Geometry';
import { createRng, type Rng } from './rng';

export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

export const QUAT_IDENTITY: Quat = { x: 0, y: 0, z: 0, w: 1 };

export function quatMultiply(a: Quat, b: Quat): Quat {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  };
}

export function quatNormalize(q: Quat): Quat {
  const len = Math.hypot(q.x, q.y, q.z, q.w) || 1;
  return { x: q.x / len, y: q.y / len, z: q.z / len, w: q.w / len };
}

export function quatRotate(q: Quat, v: Vec3): Vec3 {
  const { x, y, z, w } = q;
  const ix = w * v.x + y * v.z - z * v.y;
  const iy = w * v.y + z * v.x - x * v.z;
  const iz = w * v.z + x * v.y - y * v.x;
  const iw = -x * v.x - y * v.y - z * v.z;
  return {
    x: ix * w + iw * -x + iy * -z - iz * -y,
    y: iy * w + iw * -y + iz * -x - ix * -z,
    z: iz * w + iw * -z + ix * -y - iy * -x,
  };
}

export function quatSlerp(a: Quat, b: Quat, t: number): Quat {
  let cos = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
  let end = b;
  if (cos < 0) {
    cos = -cos;
    end = { x: -b.x, y: -b.y, z: -b.z, w: -b.w };
  }
  if (cos > 0.9995) {
    return quatNormalize({
      x: a.x + (end.x - a.x) * t,
      y: a.y + (end.y - a.y) * t,
      z: a.z + (end.z - a.z) * t,
      w: a.w + (end.w - a.w) * t,
    });
  }
  const theta = Math.acos(cos);
  const sin = Math.sin(theta);
  const wa = Math.sin((1 - t) * theta) / sin;
  const wb = Math.sin(t * theta) / sin;
  return {
    x: a.x * wa + end.x * wb,
    y: a.y * wa + end.y * wb,
    z: a.z * wa + end.z * wb,
    w: a.w * wa + end.w * wb,
  };
}

/** Shortest-arc quaternion taking unit vector `from` onto unit vector `to`. */
export function quatFromUnitVectors(from: Vec3, to: Vec3): Quat {
  const dot = from.x * to.x + from.y * to.y + from.z * to.z;
  if (dot > 0.999999) return { ...QUAT_IDENTITY };
  if (dot < -0.999999) {
    // 180°: any perpendicular axis will do.
    const axis =
      Math.abs(from.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
    const cx = from.y * axis.z - from.z * axis.y;
    const cy = from.z * axis.x - from.x * axis.z;
    const cz = from.x * axis.y - from.y * axis.x;
    return quatNormalize({ x: cx, y: cy, z: cz, w: 0 });
  }
  const cx = from.y * to.z - from.z * to.y;
  const cy = from.z * to.x - from.x * to.z;
  const cz = from.x * to.y - from.y * to.x;
  return quatNormalize({ x: cx, y: cy, z: cz, w: 1 + dot });
}

export interface DiceImpact {
  /** Simulation time of the impact, seconds. */
  time: number;
  /** 0..1 — how hard, for audio gain and camera shake. */
  strength: number;
  surface: 'floor' | 'wall';
}

export interface DiceFrame {
  position: Vec3;
  rotation: Quat;
  settled: boolean;
  /** Fires exactly once per bounce; the renderer drains this each frame. */
  impacts: DiceImpact[];
}

export interface DiceSimOptions {
  targetNumber: number;
  seed: number;
  /** Half-extent of the square tray. */
  trayRadius?: number;
  dieRadius?: number;
  gravity?: number;
  restitution?: number;
  /** Simulation seconds after which we force the settle, so nothing hangs. */
  maxDuration?: number;
}

const UP: Vec3 = { x: 0, y: 1, z: 0 };

export class DiceSim {
  readonly targetNumber: number;
  private readonly trayRadius: number;
  private readonly dieRadius: number;
  private readonly gravity: number;
  private readonly restitution: number;
  private readonly maxDuration: number;
  private readonly rng: Rng;

  private pos: Vec3;
  private vel: Vec3;
  private rot: Quat;
  private spin: Vec3;
  private time = 0;
  private restTimer = 0;
  private aligning = false;
  private alignT = 0;
  private alignFrom: Quat = { ...QUAT_IDENTITY };
  private alignTo: Quat = { ...QUAT_IDENTITY };
  private impacts: DiceImpact[] = [];
  settled = false;

  constructor(options: DiceSimOptions) {
    this.targetNumber = Math.min(20, Math.max(1, Math.round(options.targetNumber)));
    this.trayRadius = options.trayRadius ?? 1.15;
    this.dieRadius = options.dieRadius ?? 0.26;
    this.gravity = options.gravity ?? -13.5;
    this.restitution = options.restitution ?? 0.42;
    this.maxDuration = options.maxDuration ?? 4.5;
    this.rng = createRng(options.seed);

    const r = this.rng;
    this.pos = {
      x: -this.trayRadius * 0.55 + r.next() * 0.2,
      y: 1.5 + r.next() * 0.35,
      z: -this.trayRadius * 0.35 + r.next() * 0.2,
    };
    this.vel = { x: 2.4 + r.next() * 1.6, y: 0.4 + r.next() * 0.5, z: 1.2 + r.next() * 1.4 };
    this.spin = {
      x: (r.next() - 0.5) * 34,
      y: (r.next() - 0.5) * 34,
      z: (r.next() - 0.5) * 34,
    };
    this.rot = quatNormalize({
      x: r.next() - 0.5,
      y: r.next() - 0.5,
      z: r.next() - 0.5,
      w: r.next() - 0.5,
    });
  }

  /** Advance the simulation. `dt` is clamped internally; call once per frame. */
  step(dt: number): DiceFrame {
    const h = Math.min(0.033, Math.max(0.001, dt));
    this.time += h;

    if (!this.aligning) {
      this.integrate(h);
      const slow =
        Math.hypot(this.vel.x, this.vel.y, this.vel.z) < 0.55 &&
        Math.hypot(this.spin.x, this.spin.y, this.spin.z) < 2.6 &&
        this.pos.y < this.dieRadius * 1.35;
      this.restTimer = slow ? this.restTimer + h : 0;
      if (this.restTimer > 0.18 || this.time > this.maxDuration) this.beginAlignment();
    } else {
      this.alignT = Math.min(1, this.alignT + h / 0.36);
      const e = easeOutCubic(this.alignT);
      this.rot = quatSlerp(this.alignFrom, this.alignTo, e);
      this.pos = {
        x: this.pos.x,
        y: this.dieRadius * (1 + 0.12 * Math.sin(this.alignT * Math.PI) * (1 - e)),
        z: this.pos.z,
      };
      if (this.alignT >= 1) this.settled = true;
    }

    const impacts = this.impacts;
    this.impacts = [];
    return { position: { ...this.pos }, rotation: { ...this.rot }, settled: this.settled, impacts };
  }

  /** Run to completion without rendering — used by tests. */
  runToRest(maxSteps = 1200): DiceFrame {
    let frame = this.step(1 / 60);
    let steps = 1;
    while (!frame.settled && steps < maxSteps) {
      frame = this.step(1 / 60);
      steps++;
    }
    return frame;
  }

  /** Which number the die is currently showing. */
  currentFace(): number {
    let best = -Infinity;
    let bestIndex = 0;
    for (let i = 0; i < D20_FACE_NORMALS.length; i++) {
      const up = quatRotate(this.rot, D20_FACE_NORMALS[i]).y;
      if (up > best) {
        best = up;
        bestIndex = i;
      }
    }
    return bestIndex;
  }

  private integrate(h: number): void {
    this.vel.y += this.gravity * h;
    this.pos.x += this.vel.x * h;
    this.pos.y += this.vel.y * h;
    this.pos.z += this.vel.z * h;

    // Orientation: treat `spin` as a world-space angular velocity vector.
    const omega = Math.hypot(this.spin.x, this.spin.y, this.spin.z);
    if (omega > 1e-5) {
      const angle = omega * h;
      const s = Math.sin(angle / 2) / omega;
      const dq: Quat = {
        x: this.spin.x * s,
        y: this.spin.y * s,
        z: this.spin.z * s,
        w: Math.cos(angle / 2),
      };
      this.rot = quatNormalize(quatMultiply(dq, this.rot));
    }

    // Floor.
    if (this.pos.y < this.dieRadius) {
      const impactSpeed = Math.abs(this.vel.y);
      this.pos.y = this.dieRadius;
      if (this.vel.y < 0) {
        this.vel.y = -this.vel.y * this.restitution;
        if (this.vel.y < 0.35) this.vel.y = 0;
        this.vel.x *= 0.74;
        this.vel.z *= 0.74;
        this.spin.x *= 0.66;
        this.spin.y *= 0.72;
        this.spin.z *= 0.66;
        if (impactSpeed > 0.5) {
          this.impacts.push({
            time: this.time,
            strength: Math.min(1, impactSpeed / 7),
            surface: 'floor',
          });
        }
      }
    }

    // Tray walls.
    for (const axis of ['x', 'z'] as const) {
      const limit = this.trayRadius - this.dieRadius;
      if (this.pos[axis] > limit || this.pos[axis] < -limit) {
        const speed = Math.abs(this.vel[axis]);
        this.pos[axis] = Math.sign(this.pos[axis]) * limit;
        this.vel[axis] = -this.vel[axis] * this.restitution;
        this.spin.y += (this.rng.next() - 0.5) * 6;
        if (speed > 0.5) {
          this.impacts.push({ time: this.time, strength: Math.min(1, speed / 6), surface: 'wall' });
        }
      }
    }

    // Rolling friction + angular drag.
    const grounded = this.pos.y <= this.dieRadius + 1e-3;
    const linearDrag = grounded ? 1.9 : 0.12;
    const angularDrag = grounded ? 3.1 : 0.35;
    this.vel.x -= this.vel.x * Math.min(1, linearDrag * h);
    this.vel.z -= this.vel.z * Math.min(1, linearDrag * h);
    this.spin.x -= this.spin.x * Math.min(1, angularDrag * h);
    this.spin.y -= this.spin.y * Math.min(1, angularDrag * h);
    this.spin.z -= this.spin.z * Math.min(1, angularDrag * h);
  }

  /**
   * Blend into the orientation that shows `targetNumber`, keeping the die's
   * current yaw so it looks like it simply toppled onto that face.
   */
  private beginAlignment(): void {
    const faceIndex = D20_FACE_FOR_NUMBER[this.targetNumber];
    const normal = D20_FACE_NORMALS[faceIndex];
    const worldNormal = quatRotate(this.rot, normal);
    const correction = quatFromUnitVectors(normalizeVec(worldNormal), UP);
    this.alignFrom = this.rot;
    this.alignTo = quatNormalize(quatMultiply(correction, this.rot));
    this.aligning = true;
    this.alignT = 0;
    this.vel = { x: 0, y: 0, z: 0 };
    this.spin = { x: 0, y: 0, z: 0 };
  }
}

function normalizeVec(a: Vec3): Vec3 {
  const len = Math.hypot(a.x, a.y, a.z) || 1;
  return { x: a.x / len, y: a.y / len, z: a.z / len };
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** The number a settled simulation is showing, read off its orientation. */
export function faceShowing(rotation: Quat): number {
  let best = -Infinity;
  let bestIndex = 0;
  for (let i = 0; i < D20_FACE_NORMALS.length; i++) {
    const up = quatRotate(rotation, D20_FACE_NORMALS[i]).y;
    if (up > best) {
      best = up;
      bestIndex = i;
    }
  }
  return bestIndex;
}
