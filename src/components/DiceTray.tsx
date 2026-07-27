/**
 * The physical d20.
 *
 * The number was decided before the die left his hand (see `game/dice.ts`); the
 * simulation in `game/dicePhysics.ts` then throws a real rigid body into a
 * leather tray, bounces it off the walls, and steers only the final settle so
 * the face that comes up is the one the rules already chose.  Impacts drive the
 * audio and the shake, so what you hear is what actually happened.
 */

import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { audio } from '@/audio/engine';
import { DiceSim, type Quat } from '@/game/dicePhysics';
import { useGame } from '@/game/store';
import { useSettings } from '@/game/settings';
import { createD20Geometry } from '@/three/d20Mesh';
import { d20Atlas } from '@/three/textures';

function Die({
  seed,
  target,
  onSettle,
  instant,
}: {
  seed: number;
  target: number;
  onSettle: () => void;
  instant: boolean;
}): JSX.Element {
  const mesh = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => createD20Geometry(0.26), []);
  const map = useMemo(() => d20Atlas(), []);
  const sim = useMemo(() => new DiceSim({ targetNumber: target, seed }), [target, seed]);
  const settled = useRef(false);

  useEffect(() => {
    if (!instant) return;
    const frame = sim.runToRest();
    if (mesh.current) {
      mesh.current.position.set(frame.position.x, frame.position.y, frame.position.z);
      applyQuat(mesh.current, frame.rotation);
    }
    settled.current = true;
  }, [instant, sim]);

  useFrame((_, delta) => {
    if (instant || settled.current || !mesh.current) return;
    const frame = sim.step(delta);
    mesh.current.position.set(frame.position.x, frame.position.y, frame.position.z);
    applyQuat(mesh.current, frame.rotation);
    for (const impact of frame.impacts) {
      audio.play('dice-impact', { gain: 0.35 + impact.strength * 0.65 });
      if (impact.strength > 0.45) useGame.getState().addShake(impact.strength * 0.12);
    }
    if (frame.settled) {
      settled.current = true;
      onSettle();
    }
  });

  return (
    <mesh ref={mesh} geometry={geometry} castShadow>
      <meshStandardMaterial map={map} metalness={0.45} roughness={0.42} flatShading />
    </mesh>
  );
}

function applyQuat(object: THREE.Object3D, q: Quat): void {
  object.quaternion.set(q.x, q.y, q.z, q.w);
}

function Tray(): JSX.Element {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2.4, 2.4]} />
        <meshStandardMaterial color="#241a1d" roughness={0.95} />
      </mesh>
      {[
        [0, 1.2],
        [0, -1.2],
      ].map(([x, z], i) => (
        <mesh key={`z${i}`} position={[x, 0.16, z]} receiveShadow>
          <boxGeometry args={[2.5, 0.32, 0.12]} />
          <meshStandardMaterial color="#160f11" roughness={0.9} />
        </mesh>
      ))}
      {[
        [1.2, 0],
        [-1.2, 0],
      ].map(([x, z], i) => (
        <mesh key={`x${i}`} position={[x, 0.16, z]} receiveShadow>
          <boxGeometry args={[0.12, 0.32, 2.5]} />
          <meshStandardMaterial color="#160f11" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

export function DiceTray({
  seed,
  target,
  onSettle,
  accent = '#b9bec9',
}: {
  seed: number;
  target: number;
  onSettle: () => void;
  accent?: string;
}): JSX.Element {
  const skipAnimation = useSettings((s) => s.skipDiceAnimation);
  const reducedMotion = useSettings((s) => s.reducedMotion);
  const instant = skipAnimation || reducedMotion;
  const [dpr] = useState<[number, number]>([1, 1.6]);

  return (
    <Canvas
      dpr={dpr}
      shadows
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 2.5, 2.5], fov: 38 }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.5} color="#8f95a8" />
      <directionalLight position={[2, 5, 3]} intensity={1.5} color="#e0d8c8" castShadow shadow-mapSize={[512, 512]} />
      <pointLight position={[-1.5, 1.4, -1]} color={accent} intensity={2.2} distance={6} />
      <Tray />
      <Die seed={seed} target={target} onSettle={onSettle} instant={instant} />
    </Canvas>
  );
}
