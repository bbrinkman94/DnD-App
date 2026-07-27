/**
 * One camera, many jobs.
 *
 * Exploration uses an elevated diorama framing that keeps Corvin readable.
 * Dialogue, dice, spells, the medallion and the big reveals each get their own
 * rig, and every transition is a smooth damped move from wherever the camera
 * already was — the player never loses their bearings, because the camera never
 * cuts.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import type { CameraCue } from '@/dialogue/types';
import { useGame } from '@/game/store';
import { useSettings } from '@/game/settings';

export interface CameraRigProps {
  target: MutableRefObject<THREE.Vector3>;
  /** Base yaw of the scene, in radians. */
  yaw?: number;
  /** Distance/height of the exploration framing. */
  distance?: number;
  elevation?: number;
  /** Where dialogue should look, when it is not the player. */
  focus?: MutableRefObject<THREE.Vector3 | null>;
}

interface Rig {
  offset: [number, number, number];
  lookHeight: number;
  fov: number;
  roll?: number;
}

const RIGS: Record<CameraCue, Rig> = {
  default: { offset: [0.4, 2.85, 4.6], lookHeight: 1.2, fov: 46 },
  wide: { offset: [2.2, 4.2, 7.4], lookHeight: 1.2, fov: 52 },
  'two-shot': { offset: [1.6, 2.0, 3.3], lookHeight: 0.92, fov: 40 },
  'over-shoulder': { offset: [0.9, 1.9, 2.2], lookHeight: 1.05, fov: 38 },
  closeup: { offset: [0.6, 1.78, 1.7], lookHeight: 1.22, fov: 34 },
  medallion: { offset: [0.3, 1.5, 1.05], lookHeight: 1.14, fov: 28 },
  whisper: { offset: [-0.65, 1.72, 1.45], lookHeight: 1.18, fov: 31, roll: 0.045 },
  reveal: { offset: [0, 1.25, 7.4], lookHeight: 2.6, fov: 58 },
  combat: { offset: [5.4, 3.9, 6.6], lookHeight: 0.9, fov: 42 },
};

export function CameraRig({ target, yaw = 0, distance = 1, elevation = 1, focus }: CameraRigProps): JSX.Element {
  const { camera } = useThree();
  const cue = useGame((s) => s.cameraCue);
  const shake = useGame((s) => s.shake);
  const reducedMotion = useSettings((s) => s.reducedMotion);

  const desired = useMemo(() => new THREE.Vector3(), []);
  const lookAt = useMemo(() => new THREE.Vector3(), []);
  const current = useRef(new THREE.Vector3(0, 4, 8));
  const currentLook = useRef(new THREE.Vector3());
  const noise = useRef(0);

  useFrame((state, delta) => {
    const dt = Math.min(0.05, delta);
    const rig = RIGS[cue] ?? RIGS.default;
    const t = state.clock.elapsedTime;

    const [ox, oy, oz] = rig.offset;
    const scaledX = ox * (cue === 'default' || cue === 'wide' ? distance : 1);
    const scaledZ = oz * (cue === 'default' || cue === 'wide' ? distance : 1);
    const scaledY = oy * (cue === 'default' || cue === 'wide' ? elevation : 1);

    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const rotatedX = scaledX * cos - scaledZ * sin;
    const rotatedZ = scaledX * sin + scaledZ * cos;

    const anchor = focus?.current ?? target.current;
    desired.set(anchor.x + rotatedX, anchor.y + scaledY, anchor.z + rotatedZ);
    lookAt.set(anchor.x, anchor.y + rig.lookHeight, anchor.z);

    // A very slow handheld drift keeps the frame alive without being seasick.
    if (!reducedMotion) {
      desired.x += Math.sin(t * 0.23) * 0.035;
      desired.y += Math.sin(t * 0.31 + 1.4) * 0.022;
    }

    const ease = Math.min(1, dt * (cue === 'default' ? 3.4 : 2.6));
    current.current.lerp(desired, ease);
    currentLook.current.lerp(lookAt, Math.min(1, dt * 4.2));

    camera.position.copy(current.current);
    camera.lookAt(currentLook.current);
    camera.rotation.z += rig.roll ?? 0;

    if (shake > 0.001 && !reducedMotion) {
      noise.current += dt * 40;
      const amount = shake * 0.16;
      camera.position.x += Math.sin(noise.current * 1.7) * amount;
      camera.position.y += Math.sin(noise.current * 2.3 + 1) * amount;
      camera.rotation.z += Math.sin(noise.current * 1.1) * amount * 0.25;
    }

    const perspective = camera as THREE.PerspectiveCamera;
    if (perspective.isPerspectiveCamera) {
      const targetFov = rig.fov;
      if (Math.abs(perspective.fov - targetFov) > 0.05) {
        perspective.fov += (targetFov - perspective.fov) * Math.min(1, dt * 3.4);
        perspective.updateProjectionMatrix();
      }
    }
  });

  return <></>;
}
