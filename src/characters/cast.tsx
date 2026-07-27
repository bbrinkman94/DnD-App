/**
 * The cast, dressed.
 *
 * Each character is the shared `Figure` rig with its own palette, build and
 * props.  Corvin is the only one carrying all four signatures at once: horns,
 * cloak, rapier and Die Schwelle.
 */

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Figure, type FigureAction, type FigurePalette } from './Figure';

export const CORVIN_PALETTE: FigurePalette = {
  skin: '#93454f',
  cloth: '#2a1a22',
  clothDark: '#160f14',
  accent: '#5c1f2c',
  trim: '#9aa0ac',
  hair: '#181117',
  eye: '#b4559a',
};

const NELL_PALETTE: FigurePalette = {
  skin: '#c49a74',
  cloth: '#2f3a2a',
  clothDark: '#1c2319',
  accent: '#5c6b45',
  trim: '#8c8578',
  hair: '#4a3322',
};

const ANSBETH_PALETTE: FigurePalette = {
  skin: '#b98d72',
  cloth: '#242832',
  clothDark: '#15181f',
  accent: '#3d4657',
  trim: '#9aa7bd',
  hair: '#2c2723',
};

const EMRIK_PALETTE: FigurePalette = {
  skin: '#c19a79',
  cloth: '#2e241a',
  clothDark: '#1c1610',
  accent: '#6b4f24',
  trim: '#b08340',
  hair: '#3a2e22',
};

const TOVIN_PALETTE: FigurePalette = {
  skin: '#b08a6c',
  cloth: '#2c231f',
  clothDark: '#191310',
  accent: '#4a382c',
  trim: '#7a6450',
  hair: '#514236',
};

export interface CastProps {
  action?: FigureAction;
  lookAt?: THREE.Vector3 | null;
  phase?: number;
}

export function Corvin({
  action = 'idle',
  lookAt = null,
  chill = 0,
  lute = 'back',
  castColor = '#a08bd0',
}: CastProps & { chill?: number; lute?: 'back' | 'hands' | null; castColor?: string }): JSX.Element {
  return (
    <group>
      {/* Corvin carries his own lighting. In a world this dark, the protagonist
          has to stay readable wherever the fog puts him. */}
      <pointLight position={[0.6, 2.3, 1.4]} color="#c8d2e6" intensity={2.6} distance={5.5} decay={2} />
      <pointLight position={[-0.9, 1.5, -1.5]} color="#8d2f42" intensity={1.5} distance={4.5} decay={2} />
      <Figure
      palette={CORVIN_PALETTE}
      build="slender"
      height={1.78}
      horns
      cloak
      rapier
      medallion
      lute={lute}
      action={action}
      lookAt={lookAt}
      chill={chill}
      castColor={castColor}
      />
    </group>
  );
}

export function Nell({ action = 'idle', lookAt = null, phase = 1.7 }: CastProps): JSX.Element {
  return (
    <Figure palette={NELL_PALETTE} build="small" height={1.06} cloak action={action} lookAt={lookAt} phase={phase} />
  );
}

export function Ansbeth({ action = 'idle', lookAt = null, phase = 3.1 }: CastProps): JSX.Element {
  return (
    <Figure
      palette={ANSBETH_PALETTE}
      build="broad"
      height={1.81}
      cloak
      rapier
      action={action}
      lookAt={lookAt}
      phase={phase}
    />
  );
}

export function Emrik({ action = 'idle', lookAt = null, phase = 0.6 }: CastProps): JSX.Element {
  return <Figure palette={EMRIK_PALETTE} build="broad" height={1.74} action={action} lookAt={lookAt} phase={phase} />;
}

export function Tovin({ action = 'idle', lookAt = null, phase = 2.4 }: CastProps): JSX.Element {
  return (
    <Figure palette={TOVIN_PALETTE} build="stooped" height={1.7} action={action} lookAt={lookAt} phase={phase} />
  );
}

/* --------------------------------------------------------------- creatures */

export function MistWolf({
  hurt = 0,
  dead = false,
  phase = 0,
}: {
  hurt?: number;
  dead?: boolean;
  phase?: number;
}): JSX.Element {
  const group = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime + phase;
    if (group.current) {
      group.current.position.y = dead ? -0.35 : Math.sin(t * 2.2) * 0.015;
      group.current.rotation.z += ((dead ? 1.3 : 0) - group.current.rotation.z) * Math.min(1, delta * 3);
      group.current.rotation.x += (hurt * 0.3 - group.current.rotation.x) * Math.min(1, delta * 8);
    }
    if (head.current && !dead) {
      head.current.rotation.y = Math.sin(t * 0.9) * 0.35;
      head.current.rotation.x = Math.sin(t * 1.4) * 0.06;
    }
  });

  const fur = <meshStandardMaterial color="#3a3f48" flatShading roughness={0.92} />;

  return (
    <group ref={group}>
      {/* body */}
      <mesh position={[0, 0.52, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[0.19, 0.5, 2, 6]} />
        {fur}
      </mesh>
      {/* haunches */}
      <mesh position={[0, 0.55, -0.32]} castShadow>
        <icosahedronGeometry args={[0.22, 0]} />
        {fur}
      </mesh>
      {/* head */}
      <group ref={head} position={[0, 0.6, 0.42]}>
        <mesh castShadow>
          <icosahedronGeometry args={[0.15, 0]} />
          {fur}
        </mesh>
        <mesh position={[0, -0.03, 0.14]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.07, 0.2, 5]} />
          {fur}
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.07, 0.13, -0.02]} rotation={[0, 0, side * 0.2]}>
            <coneGeometry args={[0.04, 0.11, 4]} />
            {fur}
          </mesh>
        ))}
        {[-1, 1].map((side) => (
          <mesh key={`eye${side}`} position={[side * 0.06, 0.03, 0.1]}>
            <sphereGeometry args={[0.022, 8, 6]} />
            <meshStandardMaterial color="#0a0d10" emissive="#9fd4e6" emissiveIntensity={dead ? 0 : 1.1} />
          </mesh>
        ))}
      </group>
      {/* legs */}
      {[
        [-0.12, 0.28],
        [0.12, 0.28],
        [-0.12, -0.3],
        [0.12, -0.3],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.26, z]} castShadow>
          <capsuleGeometry args={[0.042, 0.34, 2, 5]} />
          {fur}
        </mesh>
      ))}
      {/* the mist it carries with it */}
      <mesh position={[0, 0.22, 0]} scale={[1.3, 0.7, 1.5]}>
        <sphereGeometry args={[0.42, 10, 8]} />
        <meshBasicMaterial color="#8fa9c8" transparent opacity={dead ? 0.015 : 0.035} depthWrite={false} />
      </mesh>
      <pointLight position={[0, 0.6, 0.5]} color="#9fd4e6" intensity={dead ? 0 : 0.35} distance={2.2} decay={2} />
    </group>
  );
}

export function Shade({ hurt = 0, dead = false }: { hurt?: number; dead?: boolean }): JSX.Element {
  const group = useRef<THREE.Group>(null);
  const mantle = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (group.current) {
      group.current.position.y = 0.06 + Math.sin(t * 0.8) * 0.05;
      group.current.rotation.y = Math.sin(t * 0.24) * 0.2;
      group.current.scale.setScalar(dead ? Math.max(0.01, group.current.scale.x - delta * 1.6) : 1);
    }
    if (mantle.current) {
      mantle.current.rotation.y = t * 0.3;
      mantle.current.scale.x = 1 + Math.sin(t * 1.3) * 0.05;
      mantle.current.scale.z = 1 + Math.cos(t * 1.1) * 0.05;
    }
    if (material.current) {
      material.current.opacity = 0.55 + Math.sin(t * 2.1) * 0.08 - hurt * 0.2;
    }
  });

  return (
    <group ref={group}>
      {/* kneeling shape, robed, no face */}
      <mesh ref={mantle} position={[0, 0.55, 0]} castShadow>
        <coneGeometry args={[0.42, 1.25, 7, 1, true]} />
        <meshStandardMaterial
          ref={material}
          color="#2a2436"
          emissive="#6f4bab"
          emissiveIntensity={0.35}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          flatShading
        />
      </mesh>
      <mesh position={[0, 1.12, 0]}>
        <icosahedronGeometry args={[0.15, 0]} />
        <meshStandardMaterial color="#171320" emissive="#7b4bb0" emissiveIntensity={0.5} flatShading transparent opacity={0.75} />
      </mesh>
      {/* the hollow where a face should be */}
      <mesh position={[0, 1.12, 0.11]}>
        <sphereGeometry args={[0.07, 8, 6]} />
        <meshBasicMaterial color="#05040a" />
      </mesh>
      <pointLight position={[0, 0.9, 0]} color="#7b4bb0" intensity={dead ? 0 : 1.4} distance={4.5} decay={2} />
    </group>
  );
}
