/**
 * Exploration: input, movement, collision and interaction proximity.
 *
 * Deliberately simple and deliberately responsive — movement is direct, with a
 * short acceleration ramp and no floaty inertia.  Collision is circle-against-
 * circle plus a rectangular bound, which is all a hand-authored diorama needs.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useReducer, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { audio, type SfxId } from '@/audio/engine';
import { useGame } from '@/game/store';

export interface Obstacle {
  x: number;
  z: number;
  radius: number;
}

export interface Interactable {
  id: string;
  position: [number, number, number];
  radius?: number;
  label: string;
  /** Hidden until the condition passes. */
  available?: () => boolean;
  /** Marks the interaction as spent once used. */
  once?: boolean;
  onInteract: () => void;
}

export interface ExplorationOptions {
  start: [number, number];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  obstacles?: Obstacle[];
  interactables: Interactable[];
  footstep?: SfxId;
  speed?: number;
  /** Yaw of the scene's camera, so W always means "away from the camera". */
  cameraYaw?: number;
}

export interface ExplorationState {
  position: MutableRefObject<THREE.Vector3>;
  facing: MutableRefObject<number>;
  moving: MutableRefObject<boolean>;
  lookTarget: MutableRefObject<THREE.Vector3 | null>;
  nearest: MutableRefObject<Interactable | null>;
  used: MutableRefObject<Set<string>>;
  /** Midpoint between Corvin and whoever he is talking to; null while exploring. */
  focus: MutableRefObject<THREE.Vector3 | null>;
  interact: () => void;
}

const KEY_MAP: Record<string, [number, number]> = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export function useExploration(options: ExplorationOptions): ExplorationState {
  const { camera } = useThree();
  const mode = useGame((s) => s.mode);
  const menu = useGame((s) => s.menu);
  const setInteraction = useGame((s) => s.setInteraction);

  const position = useRef(new THREE.Vector3(options.start[0], 0, options.start[1]));
  const velocity = useRef(new THREE.Vector3());
  const facing = useRef(Math.PI);
  const moving = useRef(false);
  const lookTarget = useRef<THREE.Vector3 | null>(null);
  const nearest = useRef<Interactable | null>(null);
  const used = useRef<Set<string>>(new Set());
  const keys = useRef<Set<string>>(new Set());
  const stepTimer = useRef(0);
  // Scenes derive Corvin's animation from `moving` at render time, so a start
  // or stop must trigger one re-render (interaction changes already do).
  const [, bumpRender] = useReducer((x: number) => x + 1, 0);
  const focus = useRef<THREE.Vector3 | null>(null);
  const conversation = useRef<THREE.Vector3 | null>(null);

  const yaw = options.cameraYaw ?? 0;
  const speed = options.speed ?? 2.7;
  const obstacles = useMemo(() => options.obstacles ?? [], [options.obstacles]);

  useEffect(() => {
    const down = (event: KeyboardEvent): void => {
      if (KEY_MAP[event.code]) {
        keys.current.add(event.code);
        event.preventDefault();
      }
    };
    const up = (event: KeyboardEvent): void => {
      keys.current.delete(event.code);
    };
    const blur = (): void => keys.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  const interact = useCallback(() => {
    const target = nearest.current;
    if (!target) return;
    if (target.once) used.current.add(target.id);
    conversation.current = new THREE.Vector3(...target.position);
    audio.play('ui-select');
    target.onInteract();
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(0.05, delta);
    const frozen = mode !== 'explore' || menu !== null;

    let inputX = 0;
    let inputZ = 0;
    if (!frozen) {
      keys.current.forEach((code) => {
        const vector = KEY_MAP[code];
        if (vector) {
          inputX += vector[0];
          inputZ += vector[1];
        }
      });
    }

    const length = Math.hypot(inputX, inputZ);
    if (length > 0) {
      inputX /= length;
      inputZ /= length;
      // Rotate the input into the camera's frame.
      const cos = Math.cos(yaw);
      const sin = Math.sin(yaw);
      const worldX = inputX * cos - inputZ * sin;
      const worldZ = inputX * sin + inputZ * cos;
      velocity.current.x += (worldX * speed - velocity.current.x) * Math.min(1, dt * 12);
      velocity.current.z += (worldZ * speed - velocity.current.z) * Math.min(1, dt * 12);
      facing.current = Math.atan2(velocity.current.x, velocity.current.z);
    } else {
      velocity.current.x *= 1 - Math.min(1, dt * 14);
      velocity.current.z *= 1 - Math.min(1, dt * 14);
    }

    const nextX = position.current.x + velocity.current.x * dt;
    const nextZ = position.current.z + velocity.current.z * dt;
    position.current.x = THREE.MathUtils.clamp(nextX, options.bounds.minX, options.bounds.maxX);
    position.current.z = THREE.MathUtils.clamp(nextZ, options.bounds.minZ, options.bounds.maxZ);

    // Push out of obstacles.
    for (const obstacle of obstacles) {
      const dx = position.current.x - obstacle.x;
      const dz = position.current.z - obstacle.z;
      const distance = Math.hypot(dx, dz);
      if (distance < obstacle.radius && distance > 1e-4) {
        const push = (obstacle.radius - distance) / distance;
        position.current.x += dx * push;
        position.current.z += dz * push;
      }
    }

    const speedNow = Math.hypot(velocity.current.x, velocity.current.z);
    const nowMoving = speedNow > 0.35;
    if (nowMoving !== moving.current) {
      moving.current = nowMoving;
      bumpRender();
    }

    if (moving.current && options.footstep) {
      stepTimer.current -= dt * (speedNow / speed);
      if (stepTimer.current <= 0) {
        stepTimer.current = 0.42;
        audio.play(options.footstep, { gain: 0.55 });
      }
    }

    // Nearest available interactable.
    let best: Interactable | null = null;
    let bestDistance = Infinity;
    for (const item of options.interactables) {
      if (item.once && used.current.has(item.id)) continue;
      if (item.available && !item.available()) continue;
      const dx = item.position[0] - position.current.x;
      const dz = item.position[2] - position.current.z;
      const distance = Math.hypot(dx, dz);
      if (distance < (item.radius ?? 1.9) && distance < bestDistance) {
        best = item;
        bestDistance = distance;
      }
    }
    if (best?.id !== nearest.current?.id) {
      nearest.current = best;
      setInteraction(best ? { id: best.id, label: best.label } : null);
      if (best) audio.play('ui-hover', { gain: 0.5 });
    }
    if (frozen && nearest.current) {
      // Keep the prompt, but do not let it fire.
    }

    // Corvin looks toward whatever is interesting nearby.
    lookTarget.current = best ? new THREE.Vector3(...best.position) : null;

    // Dialogue framing: sit the camera on the midpoint of the conversation, so
    // both people are in shot instead of the back of Corvin's cloak.
    if (mode === 'dialogue' && conversation.current) {
      const mid = new THREE.Vector3()
        .copy(position.current)
        .add(conversation.current)
        .multiplyScalar(0.5);
      mid.y = 0;
      focus.current = mid;
    } else if (mode === 'explore') {
      focus.current = null;
      conversation.current = null;
    }

    void camera;
  });

  useEffect(() => () => setInteraction(null), [setInteraction]);

  return { position, facing, moving, lookTarget, nearest, used, focus, interact };
}

/** Shared keyboard handler for the interaction key. */
export function useInteractionKey(interact: () => void): void {
  const mode = useGame((s) => s.mode);
  const menu = useGame((s) => s.menu);
  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if (event.code !== 'KeyE' && event.code !== 'Space' && event.code !== 'Enter') return;
      if (mode !== 'explore' || menu !== null) return;
      const active = document.activeElement;
      if (active && (active.tagName === 'BUTTON' || active.tagName === 'INPUT' || active.tagName === 'SELECT')) return;
      event.preventDefault();
      interact();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [interact, mode, menu]);
}
