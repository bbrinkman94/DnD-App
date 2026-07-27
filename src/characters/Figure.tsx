/**
 * The character rig.
 *
 * Every person in The Threshold is built here out of primitives — faceted,
 * flat-shaded, layered like a paper stage figure — and animated procedurally.
 * There are no imported models, no skeletons and no animation files: breathing,
 * looking, walking, casting, striking, flinching and playing are all written as
 * functions of time, which keeps the whole cast under a few kilobytes.
 */

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

export type FigureAction = 'idle' | 'walk' | 'talk' | 'cast' | 'attack' | 'hurt' | 'play' | 'down' | 'kneel';
export type FigureBuild = 'slender' | 'small' | 'broad' | 'stooped';

export interface FigurePalette {
  skin: string;
  cloth: string;
  clothDark: string;
  accent: string;
  trim: string;
  hair: string;
  eye?: string;
}

export interface FigureProps {
  palette: FigurePalette;
  build?: FigureBuild;
  height?: number;
  horns?: boolean;
  cloak?: boolean;
  lute?: 'back' | 'hands' | null;
  rapier?: boolean;
  medallion?: boolean;
  action?: FigureAction;
  /** World point the head and eyes should turn toward. */
  lookAt?: THREE.Vector3 | null;
  /** 0..1 — used by Corvin so the medallion frost creeps up his chest. */
  chill?: number;
  /** Random offset so a crowd does not breathe in unison. */
  phase?: number;
  castColor?: string;
}

const BUILDS: Record<FigureBuild, { shoulder: number; waist: number; leg: number; torso: number; stoop: number }> = {
  slender: { shoulder: 0.2, waist: 0.15, leg: 0.46, torso: 0.42, stoop: 0.02 },
  small: { shoulder: 0.17, waist: 0.15, leg: 0.3, torso: 0.32, stoop: 0.0 },
  broad: { shoulder: 0.26, waist: 0.2, leg: 0.48, torso: 0.44, stoop: 0.0 },
  stooped: { shoulder: 0.21, waist: 0.19, leg: 0.42, torso: 0.4, stoop: 0.16 },
};

/** A backward-curving horn, swept and tapered. */
function useHornGeometry(): THREE.BufferGeometry {
  return useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.02, 0.09, -0.04),
      new THREE.Vector3(0.03, 0.15, -0.13),
      new THREE.Vector3(0.02, 0.16, -0.23),
    ]);
    return new THREE.TubeGeometry(curve, 10, 0.033, 6, false);
  }, []);
}

/** A cloak: a curved sheet that hangs from the shoulders and sways. */
function useCloakGeometry(width: number, length: number): THREE.BufferGeometry {
  return useMemo(() => {
    const geometry = new THREE.PlaneGeometry(width, length, 6, 8);
    const position = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const y = position.getY(i);
      // Curve it around the body and flare it toward the hem.
      const t = (y + length / 2) / length; // 0 at hem, 1 at collar
      const wrap = (x / (width / 2)) * (0.95 - t * 0.35);
      // Wrap it round the back, pull the hem in, and let it fall unevenly.
      position.setZ(i, -Math.sin(Math.abs(wrap)) * 0.22 - (1 - t) * 0.05);
      position.setX(i, x * (0.62 + t * 0.5));
      position.setY(i, y - (1 - t) * Math.abs(x / (width / 2)) * 0.06);
    }
    geometry.computeVertexNormals();
    return geometry;
  }, [width, length]);
}

export function Figure({
  palette,
  build = 'slender',
  height = 1.78,
  horns = false,
  cloak = false,
  lute = null,
  rapier = false,
  medallion = false,
  action = 'idle',
  lookAt = null,
  chill = 0,
  phase = 0,
  castColor = '#a08bd0',
}: FigureProps): JSX.Element {
  const dims = BUILDS[build];
  const scale = height / 1.78;

  const root = useRef<THREE.Group>(null);
  const hips = useRef<THREE.Group>(null);
  const chest = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const foreL = useRef<THREE.Group>(null);
  const foreR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const cloakRef = useRef<THREE.Group>(null);
  const castLight = useRef<THREE.PointLight>(null);
  const frostRef = useRef<THREE.MeshStandardMaterial>(null);

  const hornGeometry = useHornGeometry();
  const cloakGeometry = useCloakGeometry(dims.shoulder * 3.2, dims.torso + dims.leg * 0.62);

  const lookTarget = useMemo(() => new THREE.Vector3(), []);
  const clock = useRef(0);
  const actionTime = useRef(0);
  const lastAction = useRef<FigureAction>(action);

  useFrame((_, delta) => {
    const dt = Math.min(0.05, delta);
    clock.current += dt;
    if (lastAction.current !== action) {
      lastAction.current = action;
      actionTime.current = 0;
    }
    actionTime.current += dt;

    const t = clock.current + phase;
    const breath = Math.sin(t * 1.3) * 0.5 + 0.5;

    // --- torso: breathing, and a small constant unease
    if (chest.current) {
      chest.current.position.y = dims.leg + breath * 0.012;
      chest.current.rotation.x = dims.stoop + Math.sin(t * 0.7) * 0.012;
      chest.current.rotation.z = Math.sin(t * 0.41) * 0.014;
    }

    // --- head: look toward a point, with a slow idle scan when there is none
    if (head.current) {
      let yaw = Math.sin(t * 0.33) * 0.28;
      let pitch = Math.sin(t * 0.27 + 1.1) * 0.06;
      if (lookAt && root.current) {
        root.current.getWorldPosition(lookTarget);
        const dx = lookAt.x - lookTarget.x;
        const dz = lookAt.z - lookTarget.z;
        const worldYaw = Math.atan2(dx, dz);
        yaw = THREE.MathUtils.clamp(worldYaw - root.current.rotation.y, -1.1, 1.1);
        pitch = THREE.MathUtils.clamp((lookAt.y - (lookTarget.y + height * 0.9)) * 0.5, -0.35, 0.35);
      }
      head.current.rotation.y += (yaw - head.current.rotation.y) * Math.min(1, dt * 4);
      head.current.rotation.x += (pitch - head.current.rotation.x) * Math.min(1, dt * 4);
    }

    // --- limbs per action
    const a = actionTime.current;
    let armSwing = Math.sin(t * 1.1) * 0.05;
    let legSwing = 0;
    let armLift = 0;
    let armRLift = 0;
    let leanZ = 0;

    switch (action) {
      case 'walk': {
        const stride = Math.sin(t * 6.4);
        legSwing = stride * 0.55;
        armSwing = -stride * 0.4;
        if (hips.current) hips.current.position.y = Math.abs(Math.sin(t * 6.4)) * 0.03;
        break;
      }
      case 'talk':
        armSwing = Math.sin(t * 2.6) * 0.16;
        armRLift = 0.35 + Math.sin(t * 3.1) * 0.25;
        break;
      case 'cast': {
        const p = Math.min(1, a / 0.55);
        armRLift = Math.sin(p * Math.PI) * 1.9;
        armLift = Math.sin(p * Math.PI) * 0.5;
        leanZ = -0.08 * Math.sin(p * Math.PI);
        if (castLight.current) {
          castLight.current.intensity = Math.sin(p * Math.PI) * 4.5;
        }
        break;
      }
      case 'attack': {
        const p = Math.min(1, a / 0.42);
        const lunge = Math.sin(p * Math.PI);
        armRLift = -2.4 * lunge;
        if (hips.current) hips.current.position.z = lunge * 0.16;
        leanZ = 0.1 * lunge;
        break;
      }
      case 'hurt': {
        const p = Math.min(1, a / 0.4);
        const shock = Math.sin(p * Math.PI) * (1 - p * 0.5);
        leanZ = shock * 0.3;
        armLift = shock * 0.9;
        armRLift = shock * 0.7;
        break;
      }
      case 'play': {
        armLift = 0.95;
        armRLift = 0.75 + Math.sin(t * 7.5) * 0.16;
        break;
      }
      case 'down':
        if (hips.current) {
          hips.current.rotation.x = -Math.PI / 2.1;
          hips.current.position.y = -dims.leg * 0.75;
        }
        break;
      case 'kneel':
        if (hips.current) hips.current.position.y = -dims.leg * 0.45;
        legSwing = 0.7;
        break;
      default:
        break;
    }

    if (action !== 'down' && action !== 'kneel' && hips.current) {
      hips.current.rotation.x += (0 - hips.current.rotation.x) * Math.min(1, dt * 6);
      hips.current.position.z += (0 - hips.current.position.z) * Math.min(1, dt * 6);
      if (action !== 'walk') hips.current.position.y += (0 - hips.current.position.y) * Math.min(1, dt * 6);
    }

    const ease = Math.min(1, dt * 9);
    if (armL.current) {
      armL.current.rotation.x += (armSwing - armLift - armL.current.rotation.x) * ease;
      armL.current.rotation.z += (0.12 + armLift * 0.3 - armL.current.rotation.z) * ease;
    }
    if (armR.current) {
      armR.current.rotation.x += (-armSwing - armRLift - armR.current.rotation.x) * ease;
      armR.current.rotation.z += (-0.12 - armRLift * 0.2 - armR.current.rotation.z) * ease;
    }
    if (foreL.current) foreL.current.rotation.x += (-0.25 - armLift * 0.6 - foreL.current.rotation.x) * ease;
    if (foreR.current) foreR.current.rotation.x += (-0.25 - armRLift * 0.35 - foreR.current.rotation.x) * ease;
    if (legL.current) legL.current.rotation.x += (legSwing - legL.current.rotation.x) * ease;
    if (legR.current) legR.current.rotation.x += (-legSwing - legR.current.rotation.x) * ease;
    if (chest.current) chest.current.rotation.z += (leanZ - chest.current.rotation.z) * ease;

    // --- cloak: secondary motion, always a beat behind the body
    if (cloakRef.current) {
      const sway = Math.sin(t * 1.7) * 0.03 + (action === 'walk' ? Math.sin(t * 6.4 - 0.7) * 0.12 : 0);
      cloakRef.current.rotation.x += (0.06 + sway - cloakRef.current.rotation.x) * Math.min(1, dt * 3.2);
      cloakRef.current.rotation.z = Math.sin(t * 1.1 + 0.4) * 0.035;
    }

    if (castLight.current && action !== 'cast') {
      castLight.current.intensity *= 1 - Math.min(1, dt * 5);
    }
    if (frostRef.current) {
      frostRef.current.emissiveIntensity = 0.2 + chill * 1.8;
    }
  });

  const skinMaterial = <meshStandardMaterial color={palette.skin} flatShading roughness={0.85} metalness={0.02} />;
  const clothMaterial = <meshStandardMaterial color={palette.cloth} flatShading roughness={0.92} />;
  const darkMaterial = <meshStandardMaterial color={palette.clothDark} flatShading roughness={0.95} />;

  const armLength = dims.torso * 0.52;

  return (
    <group ref={root} scale={scale}>
      <group ref={hips} position={[0, 0, 0]}>
        {/* legs */}
        {[-1, 1].map((side) => (
          <group key={side} ref={side < 0 ? legL : legR} position={[side * dims.waist * 0.5, dims.leg, 0]}>
            <mesh position={[0, -dims.leg * 0.28, 0]} castShadow>
              <capsuleGeometry args={[0.062, dims.leg * 0.45, 2, 6]} />
              {darkMaterial}
            </mesh>
            <mesh position={[0, -dims.leg * 0.75, 0]} castShadow>
              <capsuleGeometry args={[0.055, dims.leg * 0.4, 2, 6]} />
              {darkMaterial}
            </mesh>
            <mesh position={[0, -dims.leg, 0.03]} castShadow>
              <boxGeometry args={[0.11, 0.075, 0.2]} />
              <meshStandardMaterial color={palette.clothDark} flatShading roughness={0.7} />
            </mesh>
          </group>
        ))}

        {/* torso */}
        <group ref={chest} position={[0, dims.leg, 0]}>
          <mesh position={[0, dims.torso * 0.45, 0]} castShadow>
            <cylinderGeometry args={[dims.shoulder, dims.waist, dims.torso, 7, 1]} />
            {clothMaterial}
          </mesh>
          {/* layered jerkin */}
          <mesh position={[0, dims.torso * 0.34, 0.01]} castShadow>
            <cylinderGeometry args={[dims.shoulder * 0.96, dims.waist * 1.04, dims.torso * 0.62, 7, 1, true]} />
            <meshStandardMaterial color={palette.accent} flatShading roughness={0.8} side={THREE.DoubleSide} />
          </mesh>
          {/* belt */}
          <mesh position={[0, dims.torso * 0.06, 0]}>
            <cylinderGeometry args={[dims.waist * 1.08, dims.waist * 1.08, 0.05, 8]} />
            <meshStandardMaterial color={palette.trim} metalness={0.5} roughness={0.5} flatShading />
          </mesh>

          {/* collar */}
          <mesh position={[0, dims.torso * 0.86, 0]}>
            <cylinderGeometry args={[dims.shoulder * 0.72, dims.shoulder * 0.95, 0.09, 7, 1, true]} />
            <meshStandardMaterial color={palette.clothDark} side={THREE.DoubleSide} flatShading roughness={0.9} />
          </mesh>

          {/* arms */}
          {[-1, 1].map((side) => (
            <group
              key={side}
              ref={side < 0 ? armL : armR}
              position={[side * dims.shoulder * 0.94, dims.torso * 0.78, 0]}
            >
              <mesh position={[0, -armLength * 0.5, 0]} castShadow>
                <capsuleGeometry args={[0.05, armLength * 0.7, 2, 6]} />
                {clothMaterial}
              </mesh>
              <group ref={side < 0 ? foreL : foreR} position={[0, -armLength, 0]}>
                <mesh position={[0, -armLength * 0.45, 0]} castShadow>
                  <capsuleGeometry args={[0.044, armLength * 0.6, 2, 6]} />
                  {darkMaterial}
                </mesh>
                <mesh position={[0, -armLength * 0.85, 0]}>
                  <icosahedronGeometry args={[0.052, 0]} />
                  {skinMaterial}
                </mesh>
                {/* the hand that casts */}
                {side > 0 && (
                  <pointLight
                    ref={castLight}
                    position={[0, -armLength * 0.95, 0.05]}
                    color={castColor}
                    intensity={0}
                    distance={3.4}
                    decay={2}
                  />
                )}
              </group>
            </group>
          ))}

          {/* head */}
          <group ref={head} position={[0, dims.torso * 1.02, 0]}>
            <mesh castShadow>
              <icosahedronGeometry args={[0.115, 1]} />
              {skinMaterial}
            </mesh>
            {/* jaw / narrow chin */}
            <mesh position={[0, -0.062, 0.018]} scale={[0.82, 0.7, 0.9]}>
              <icosahedronGeometry args={[0.085, 0]} />
              {skinMaterial}
            </mesh>
            {/* nose */}
            <mesh position={[0, -0.012, 0.108]} rotation={[Math.PI / 2.1, 0, 0]}>
              <coneGeometry args={[0.021, 0.07, 4]} />
              {skinMaterial}
            </mesh>
            {/* eyes */}
            {[-1, 1].map((side) => (
              <mesh key={side} position={[side * 0.045, 0.018, 0.098]}>
                <sphereGeometry args={[0.019, 8, 6]} />
                <meshStandardMaterial
                  color={palette.eye ?? '#1a1418'}
                  emissive={palette.eye ?? '#000000'}
                  emissiveIntensity={palette.eye ? 1.5 : 0}
                  roughness={0.35}
                />
              </mesh>
            ))}
            {/* hair: a few swept planes */}
            {[0, 1, 2, 3].map((i) => (
              <mesh
                key={i}
                position={[(i - 1.5) * 0.045, 0.075 - Math.abs(i - 1.5) * 0.012, -0.02]}
                rotation={[0.35, (i - 1.5) * 0.28, (i - 1.5) * 0.12]}
              >
                <boxGeometry args={[0.05, 0.1, 0.11]} />
                <meshStandardMaterial color={palette.hair} flatShading roughness={1} />
              </mesh>
            ))}
            {horns &&
              [-1, 1].map((side) => (
                <mesh
                  key={side}
                  geometry={hornGeometry}
                  position={[side * 0.062, 0.078, 0.01]}
                  rotation={[0, side * 0.35, side * 0.22]}
                  castShadow
                >
                  <meshStandardMaterial color="#241a1c" flatShading roughness={0.55} metalness={0.15} />
                </mesh>
              ))}
          </group>

          {/* medallion: the cold centre of the whole thing */}
          {medallion && (
            <group position={[0, dims.torso * 0.6, dims.shoulder * 0.72]}>
              <mesh rotation={[0, 0, 0]}>
                <torusGeometry args={[0.035, 0.008, 6, 12]} />
                <meshStandardMaterial color="#8a8f99" metalness={0.85} roughness={0.45} flatShading />
              </mesh>
              <mesh>
                <sphereGeometry args={[0.024, 10, 8]} />
                <meshStandardMaterial
                  ref={frostRef}
                  color="#c8ccd6"
                  emissive="#9fd4e6"
                  emissiveIntensity={0.2}
                  metalness={0.3}
                  roughness={0.25}
                />
              </mesh>
              <pointLight color="#9fd4e6" intensity={0.4 + chill * 2.2} distance={1.8} decay={2} />
            </group>
          )}

          {/* cloak */}
          {cloak && (
            <group ref={cloakRef} position={[0, dims.torso * 0.82, -dims.shoulder * 0.42]}>
              <mesh
                geometry={cloakGeometry}
                position={[0, -(dims.torso + dims.leg * 0.62) / 2, 0]}
                castShadow
              >
                <meshStandardMaterial
                  color={palette.clothDark}
                  side={THREE.DoubleSide}
                  flatShading
                  roughness={0.98}
                  emissive={palette.accent}
                  emissiveIntensity={0.06}
                />
              </mesh>
            </group>
          )}

          {/* rapier at the hip */}
          {rapier && (
            <group position={[-dims.waist * 1.05, dims.torso * 0.02, -0.02]} rotation={[0.28, 0, 0.34]}>
              <mesh position={[0, -0.32, 0]}>
                <cylinderGeometry args={[0.008, 0.012, 0.64, 5]} />
                <meshStandardMaterial color="#2b2b31" metalness={0.7} roughness={0.42} flatShading />
              </mesh>
              <mesh position={[0, 0.02, 0]}>
                <torusGeometry args={[0.035, 0.008, 5, 10]} />
                <meshStandardMaterial color={palette.trim} metalness={0.8} roughness={0.35} flatShading />
              </mesh>
              <mesh position={[0, 0.07, 0]}>
                <cylinderGeometry args={[0.014, 0.016, 0.1, 6]} />
                <meshStandardMaterial color="#1d1519" roughness={0.9} flatShading />
              </mesh>
            </group>
          )}

          {/* lute */}
          {lute && <Lute position={lute} palette={palette} torso={dims.torso} shoulder={dims.shoulder} />}
        </group>
      </group>
    </group>
  );
}

function Lute({
  position,
  palette,
  torso,
  shoulder,
}: {
  position: 'back' | 'hands';
  palette: FigurePalette;
  torso: number;
  shoulder: number;
}): JSX.Element {
  const strings = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!strings.current) return;
    // Strings only move when the lute is being held to play.
    const amount = position === 'hands' ? 1 : 0.08;
    strings.current.children.forEach((child, i) => {
      child.position.x = Math.sin(state.clock.elapsedTime * (11 + i * 2.3)) * 0.0022 * amount;
    });
  });

  const transform =
    position === 'back'
      ? {
          position: [0.03, torso * 0.5, -shoulder * 0.92] as [number, number, number],
          rotation: [0.18, 0.25, 1.05] as [number, number, number],
        }
      : { position: [0.02, torso * 0.2, shoulder * 0.95] as [number, number, number], rotation: [0.25, 0.2, 0.5] as [number, number, number] };

  return (
    <group {...transform} scale={position === 'back' ? 0.82 : 1}>
      {/* body */}
      <mesh scale={[1, 1, 0.5]} castShadow>
        <sphereGeometry args={[0.13, 10, 8]} />
        <meshStandardMaterial color="#4a3122" flatShading roughness={0.7} />
      </mesh>
      {/* soundboard */}
      <mesh position={[0, 0, 0.072]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.125, 0.125, 0.004, 12]} />
        <meshStandardMaterial color="#6b4a2e" flatShading roughness={0.6} />
      </mesh>
      {/* rose */}
      <mesh position={[0, 0.02, 0.076]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.032, 0.032, 0.003, 8]} />
        <meshStandardMaterial color="#180f0a" roughness={1} />
      </mesh>
      {/* neck */}
      <mesh position={[0, 0.22, 0.03]} castShadow>
        <boxGeometry args={[0.038, 0.3, 0.026]} />
        <meshStandardMaterial color="#33221a" flatShading roughness={0.75} />
      </mesh>
      {/* bent pegbox */}
      <mesh position={[0, 0.38, 0.005]} rotation={[-0.85, 0, 0]}>
        <boxGeometry args={[0.042, 0.1, 0.024]} />
        <meshStandardMaterial color={palette.trim} flatShading metalness={0.3} roughness={0.6} />
      </mesh>
      <group ref={strings}>
        {[-2, -1, 0, 1, 2].map((i) => (
          <mesh key={i} position={[i * 0.008, 0.15, 0.05]}>
            <boxGeometry args={[0.0016, 0.42, 0.0016]} />
            <meshStandardMaterial color="#d9d2c4" metalness={0.6} roughness={0.3} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
