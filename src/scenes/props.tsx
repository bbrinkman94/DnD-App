/**
 * The set.
 *
 * Ground, trees, candles, rain, fog, timber and ruins — all generated geometry,
 * all instanced where it repeats, all driven by the quality preset so the same
 * scene can run on a laptop or a workstation without changing its composition.
 */

import { MeshReflectorMaterial } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { QUALITY_PROFILES, useSettings } from '@/game/settings';
import { PALETTE } from '@/three/palette';
import { glowSprite, groundTexture, stoneTexture, woodTexture } from '@/three/textures';

export function useQuality() {
  const quality = useSettings((s) => s.quality);
  return QUALITY_PROFILES[quality];
}

/* ------------------------------------------------------------------ ground */

export function WetGround({
  size = 90,
  color = PALETTE.mud,
  reflective = true,
}: {
  size?: number;
  color?: string;
  reflective?: boolean;
}): JSX.Element {
  const quality = useQuality();
  const texture = useMemo(() => groundTexture(color, '#12161c', Math.round(size / 6)), [color, size]);
  const useReflector = reflective && quality.postprocessing;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
      <planeGeometry args={[size, size, 1, 1]} />
      {useReflector ? (
        <MeshReflectorMaterial
          map={texture}
          resolution={quality.shadowMapSize >= 2048 ? 512 : 256}
          mixBlur={2.4}
          mixStrength={2.2}
          blur={[280, 90]}
          mirror={0.28}
          depthScale={0.9}
          minDepthThreshold={0.3}
          maxDepthThreshold={1.2}
          roughness={0.85}
          color={color}
        />
      ) : (
        <meshStandardMaterial map={texture} color={color} roughness={0.82} metalness={0.05} />
      )}
    </mesh>
  );
}

/* ------------------------------------------------------------------- trees */

export interface TreeFieldProps {
  count?: number;
  radius?: number;
  innerRadius?: number;
  centre?: [number, number];
  /** Trees lean inward as this rises — the forest closing in. */
  lean?: number;
  seed?: number;
}

export function TreeField({
  count,
  radius = 42,
  innerRadius = 12,
  centre = [0, 0],
  lean = 0,
  seed = 7,
}: TreeFieldProps): JSX.Element {
  const quality = useQuality();
  const total = Math.min(count ?? quality.treeCount, quality.treeCount);
  const trunks = useRef<THREE.InstancedMesh>(null);
  const canopies = useRef<THREE.InstancedMesh>(null);

  const layout = useMemo(() => {
    const random = mulberry(seed);
    return Array.from({ length: total }, () => {
      const angle = random() * Math.PI * 2;
      const distance = innerRadius + random() * (radius - innerRadius);
      const height = 4.5 + random() * 7;
      return {
        x: centre[0] + Math.cos(angle) * distance,
        z: centre[1] + Math.sin(angle) * distance,
        height,
        width: 0.16 + random() * 0.18,
        tilt: (random() - 0.5) * 0.16,
        phase: random() * Math.PI * 2,
      };
    });
  }, [total, radius, innerRadius, centre, seed]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!trunks.current || !canopies.current) return;
    layout.forEach((tree, i) => {
      const sway = Math.sin(t * 0.55 + tree.phase) * 0.018 + Math.sin(t * 1.7 + tree.phase) * 0.006;
      const inward = Math.atan2(centre[0] - tree.x, centre[1] - tree.z);

      dummy.position.set(tree.x, tree.height / 2, tree.z);
      dummy.rotation.set(tree.tilt + sway, inward, sway * 0.6 + lean * 0.25 * Math.sign(tree.x - centre[0]) * -1);
      dummy.scale.set(tree.width, tree.height / 2, tree.width);
      dummy.updateMatrix();
      trunks.current!.setMatrixAt(i, dummy.matrix);

      dummy.position.set(tree.x, tree.height * 0.92, tree.z);
      dummy.rotation.set(sway * 1.6, tree.phase, sway);
      const canopy = tree.height * 0.3;
      dummy.scale.set(canopy, canopy * 1.25, canopy);
      dummy.updateMatrix();
      canopies.current!.setMatrixAt(i, dummy.matrix);
    });
    trunks.current.instanceMatrix.needsUpdate = true;
    canopies.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={trunks} args={[undefined, undefined, total]} castShadow={false} receiveShadow={false}>
        <cylinderGeometry args={[0.35, 1, 2, 5, 1]} />
        <meshStandardMaterial color="#14110f" flatShading roughness={1} />
      </instancedMesh>
      <instancedMesh ref={canopies} args={[undefined, undefined, total]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#0e1210" flatShading roughness={1} />
      </instancedMesh>
    </group>
  );
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------------------------------------------------------- particles */

/**
 * Drifting motes: dust in the inn, mist in the forest, ash at the gate.
 * They follow the player loosely so the volume is always where the camera is.
 */
export function Motes({
  color = '#b9bec9',
  count,
  area = 16,
  height = 4,
  speed = 0.12,
  follow,
  size = 0.09,
  opacity = 0.35,
}: {
  color?: string;
  count?: number;
  area?: number;
  height?: number;
  speed?: number;
  follow?: MutableRefObject<THREE.Vector3>;
  size?: number;
  opacity?: number;
}): JSX.Element {
  const quality = useQuality();
  const total = Math.min(count ?? quality.particles, quality.particles);
  const points = useRef<THREE.Points>(null);
  const sprite = useMemo(() => glowSprite(color), [color]);

  const { positions, drift } = useMemo(() => {
    const random = mulberry(31);
    const positions = new Float32Array(total * 3);
    const drift = new Float32Array(total * 3);
    for (let i = 0; i < total; i++) {
      positions[i * 3] = (random() - 0.5) * area;
      positions[i * 3 + 1] = random() * height;
      positions[i * 3 + 2] = (random() - 0.5) * area;
      drift[i * 3] = (random() - 0.5) * 0.6;
      drift[i * 3 + 1] = 0.2 + random() * 0.8;
      drift[i * 3 + 2] = (random() - 0.5) * 0.6;
    }
    return { positions, drift };
  }, [total, area, height]);

  useFrame((state, delta) => {
    if (!points.current) return;
    const attribute = points.current.geometry.attributes.position as THREE.BufferAttribute;
    const array = attribute.array as Float32Array;
    const dt = Math.min(0.05, delta);
    const t = state.clock.elapsedTime;
    for (let i = 0; i < total; i++) {
      array[i * 3] += Math.sin(t * 0.3 + i) * drift[i * 3] * speed * dt;
      array[i * 3 + 1] += drift[i * 3 + 1] * speed * dt;
      array[i * 3 + 2] += Math.cos(t * 0.24 + i) * drift[i * 3 + 2] * speed * dt;
      if (array[i * 3 + 1] > height) array[i * 3 + 1] = 0;
    }
    attribute.needsUpdate = true;
    if (follow) {
      points.current.position.x = follow.current.x;
      points.current.position.z = follow.current.z;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={sprite}
        size={size}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

export function Rain({ count = 900, area = 30, follow }: { count?: number; area?: number; follow?: MutableRefObject<THREE.Vector3> }): JSX.Element {
  const quality = useQuality();
  const total = Math.round(count * (quality.fogDetail || 0.5));
  const lines = useRef<THREE.LineSegments>(null);

  const geometry = useMemo(() => {
    const random = mulberry(97);
    const positions = new Float32Array(total * 6);
    for (let i = 0; i < total; i++) {
      const x = (random() - 0.5) * area;
      const y = random() * 14;
      const z = (random() - 0.5) * area;
      positions.set([x, y, z, x + 0.02, y - 0.32, z], i * 6);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return g;
  }, [total, area]);

  useFrame((_, delta) => {
    if (!lines.current) return;
    const attribute = lines.current.geometry.attributes.position as THREE.BufferAttribute;
    const array = attribute.array as Float32Array;
    const fall = Math.min(0.06, delta) * 16;
    for (let i = 0; i < array.length; i += 3) {
      array[i + 1] -= fall;
      if (array[i + 1] < -1) array[i + 1] += 14;
    }
    attribute.needsUpdate = true;
    if (follow) {
      lines.current.position.x = follow.current.x;
      lines.current.position.z = follow.current.z;
    }
  });

  return (
    <lineSegments ref={lines} geometry={geometry}>
      <lineBasicMaterial color="#8fa2bd" transparent opacity={0.22} />
    </lineSegments>
  );
}

/* ------------------------------------------------------------------- light */

/** A candle whose flicker actually drives the light around it. */
export function Candle({
  position = [0, 0, 0],
  scale = 1,
  intensity = 1.6,
  color = PALETTE.amber,
}: {
  position?: [number, number, number];
  scale?: number;
  intensity?: number;
  color?: string;
}): JSX.Element {
  const light = useRef<THREE.PointLight>(null);
  const flame = useRef<THREE.Mesh>(null);
  const seed = useMemo(() => Math.random() * 10, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime + seed;
    const flicker =
      0.78 + Math.sin(t * 11.3) * 0.08 + Math.sin(t * 3.7) * 0.09 + Math.sin(t * 27.1) * 0.04;
    if (light.current) light.current.intensity = intensity * flicker;
    if (flame.current) {
      flame.current.scale.set(0.85 + flicker * 0.2, 0.8 + flicker * 0.45, 0.85 + flicker * 0.2);
      flame.current.position.x = Math.sin(t * 5.1) * 0.004;
    }
  });

  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.026, 0.12, 7]} />
        <meshStandardMaterial color="#e7dcc4" roughness={0.85} />
      </mesh>
      <mesh ref={flame} position={[0, 0.155, 0]}>
        <coneGeometry args={[0.016, 0.06, 6]} />
        <meshBasicMaterial color="#ffd79a" transparent opacity={0.95} />
      </mesh>
      <pointLight ref={light} position={[0, 0.18, 0]} color={color} intensity={intensity} distance={5.5} decay={2} />
      <sprite position={[0, 0.16, 0]} scale={[0.6, 0.6, 0.6]}>
        <spriteMaterial map={glowSprite(color)} transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  );
}

export function Hearth({ position = [0, 0, 0] }: { position?: [number, number, number] }): JSX.Element {
  const light = useRef<THREE.PointLight>(null);
  const fire = useRef<THREE.Group>(null);
  const strange = useRef(0);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    // Every so often the fire does something a fire should not do.
    strange.current -= delta;
    if (strange.current < -6 && Math.random() < 0.004) strange.current = 1.1;
    const odd = Math.max(0, strange.current);
    const flicker = 0.75 + Math.sin(t * 7.7) * 0.12 + Math.sin(t * 19.3) * 0.06 - odd * 0.55;
    if (light.current) {
      light.current.intensity = 3.4 * flicker;
      light.current.color.setHex(odd > 0.4 ? 0x7fa0c8 : 0xe0a659);
    }
    if (fire.current) {
      fire.current.children.forEach((child, i) => {
        const s = 0.7 + Math.sin(t * (5 + i) + i) * 0.25 + flicker * 0.3;
        child.scale.set(s, s * 1.5, s);
        child.position.y = 0.12 + Math.sin(t * (4 + i * 1.7)) * 0.03;
        // When the fire is being strange, the flames lean the wrong way.
        child.rotation.z = odd > 0 ? Math.sin(t * 2) * 0.5 * odd : Math.sin(t * 3 + i) * 0.06;
      });
    }
  });

  return (
    <group position={position}>
      <mesh position={[0, 0.16, 0]} receiveShadow>
        <boxGeometry args={[1.5, 0.32, 0.7]} />
        <meshStandardMaterial map={stoneTexture('#33323a', 2)} roughness={0.95} />
      </mesh>
      <group ref={fire} position={[0, 0.3, 0]}>
        {[-0.22, 0, 0.22].map((x, i) => (
          <mesh key={i} position={[x, 0.12, 0]}>
            <coneGeometry args={[0.1, 0.3, 5]} />
            <meshBasicMaterial color={i === 1 ? '#ffcf8a' : '#e08a3c'} transparent opacity={0.9} />
          </mesh>
        ))}
      </group>
      <pointLight ref={light} position={[0, 0.5, 0.2]} color={PALETTE.amber} intensity={3.4} distance={11} decay={2} castShadow />
    </group>
  );
}

/* ------------------------------------------------------------------ timber */

export function TimberWall({
  width = 8,
  height = 3.2,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  windows = 0,
}: {
  width?: number;
  height?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  windows?: number;
}): JSX.Element {
  const wood = useMemo(() => woodTexture(PALETTE.timber, '#1d140f', Math.round(width / 2)), [width]);
  const plaster = useMemo(() => stoneTexture('#4a4238', 3), []);

  return (
    <group position={position} rotation={rotation}>
      <mesh receiveShadow castShadow>
        <boxGeometry args={[width, height, 0.28]} />
        <meshStandardMaterial map={plaster} color="#6a6152" roughness={1} />
      </mesh>
      {/* exposed beams */}
      {[-0.36, 0, 0.36].map((f, i) => (
        <mesh key={i} position={[width * f, 0, 0.16]} castShadow>
          <boxGeometry args={[0.24, height, 0.1]} />
          <meshStandardMaterial map={wood} color={PALETTE.timber} roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, height / 2 - 0.16, 0.16]}>
        <boxGeometry args={[width, 0.26, 0.12]} />
        <meshStandardMaterial map={wood} color={PALETTE.timberLight} roughness={1} />
      </mesh>
      <mesh position={[0, -height / 2 + 0.14, 0.16]}>
        <boxGeometry args={[width, 0.22, 0.12]} />
        <meshStandardMaterial map={wood} color={PALETTE.timber} roughness={1} />
      </mesh>
      {Array.from({ length: windows }).map((_, i) => {
        const x = (i - (windows - 1) / 2) * (width / Math.max(1, windows)) * 0.9;
        return (
          <group key={i} position={[x, 0.25, 0.16]}>
            <mesh>
              <boxGeometry args={[0.85, 1.0, 0.06]} />
              <meshStandardMaterial color="#120e0c" roughness={0.4} metalness={0.1} emissive="#e0a659" emissiveIntensity={0.32} />
            </mesh>
            <mesh position={[0, 0, 0.04]}>
              <boxGeometry args={[0.06, 1.0, 0.04]} />
              <meshStandardMaterial map={wood} color={PALETTE.timber} roughness={1} />
            </mesh>
            <mesh position={[0, 0, 0.04]} rotation={[0, 0, Math.PI / 2]}>
              <boxGeometry args={[0.06, 0.85, 0.04]} />
              <meshStandardMaterial map={wood} color={PALETTE.timber} roughness={1} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function Table({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  size = [1.5, 0.9] as [number, number],
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  size?: [number, number];
}): JSX.Element {
  const wood = useMemo(() => woodTexture('#43301f', '#241a11', 2), []);
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
        <boxGeometry args={[size[0], 0.07, size[1]]} />
        <meshStandardMaterial map={wood} roughness={0.8} />
      </mesh>
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <mesh key={i} position={[(sx * size[0]) / 2.4, 0.37, (sz * size[1]) / 2.6]} castShadow>
          <boxGeometry args={[0.09, 0.74, 0.09]} />
          <meshStandardMaterial map={wood} color="#33241a" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

export function Stool({ position = [0, 0, 0] }: { position?: [number, number, number] }): JSX.Element {
  const wood = useMemo(() => woodTexture('#3b2a1c', '#20160f', 1), []);
  return (
    <group position={position}>
      <mesh position={[0, 0.46, 0]} castShadow>
        <cylinderGeometry args={[0.19, 0.19, 0.06, 8]} />
        <meshStandardMaterial map={wood} roughness={0.85} />
      </mesh>
      {[0, 1, 2].map((i) => {
        const angle = (i / 3) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * 0.13, 0.23, Math.sin(angle) * 0.13]} rotation={[0.1, 0, 0.1]} castShadow>
            <cylinderGeometry args={[0.025, 0.03, 0.46, 5]} />
            <meshStandardMaterial map={wood} color="#2b1e14" roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

/* ------------------------------------------------------------------- ruins */

export function ShrineRuin({ position = [0, 0, 0] }: { position?: [number, number, number] }): JSX.Element {
  const stone = useMemo(() => stoneTexture('#3d3d46', 2), []);
  return (
    <group position={position}>
      {/* three worn steps */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.13 + i * 0.22, -i * 0.34]} receiveShadow castShadow>
          <boxGeometry args={[3.2 - i * 0.4, 0.24, 1.4 - i * 0.3]} />
          <meshStandardMaterial map={stone} roughness={1} />
        </mesh>
      ))}
      {/* altar block */}
      <mesh position={[0, 0.95, -0.9]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.7, 0.85]} />
        <meshStandardMaterial map={stone} color="#464651" roughness={1} />
      </mesh>
      {/* headless saint */}
      <group position={[0, 1.3, -1.0]}>
        <mesh position={[0, 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.3, 0.9, 7]} />
          <meshStandardMaterial map={stone} color="#4d4d58" roughness={1} />
        </mesh>
        <mesh position={[0.16, 0.72, 0.1]} rotation={[0, 0, -0.5]} castShadow>
          <capsuleGeometry args={[0.06, 0.3, 2, 6]} />
          <meshStandardMaterial map={stone} color="#4d4d58" roughness={1} />
        </mesh>
        <mesh position={[0, 0.92, 0]} rotation={[0.2, 0.4, 0.1]}>
          <boxGeometry args={[0.34, 0.06, 0.34]} />
          <meshStandardMaterial map={stone} color="#3a3a44" roughness={1} />
        </mesh>
      </group>
      {/* the head, on the ground, facing the road */}
      <mesh position={[1.15, 0.16, 0.7]} rotation={[0.4, 0.9, 0.2]} castShadow>
        <icosahedronGeometry args={[0.19, 0]} />
        <meshStandardMaterial map={stone} color="#45454f" roughness={1} flatShading />
      </mesh>
    </group>
  );
}

export function BoundaryWall({
  length = 9,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  broken = true,
}: {
  length?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  broken?: boolean;
}): JSX.Element {
  const stone = useMemo(() => stoneTexture('#3a3a42', 2), []);
  const blocks = useMemo(() => {
    const random = mulberry(13);
    const out: { x: number; y: number; h: number; tilt: number }[] = [];
    const count = Math.round(length / 0.55);
    for (let i = 0; i < count; i++) {
      const x = (i - count / 2) * 0.55;
      const gap = broken && Math.abs(x - length * 0.22) < 1.1;
      const h = gap ? 0.18 + random() * 0.16 : 0.65 + random() * 0.35;
      out.push({ x, y: h / 2, h, tilt: (random() - 0.5) * 0.16 });
    }
    return out;
  }, [length, broken]);

  return (
    <group position={position} rotation={rotation}>
      {blocks.map((block, i) => (
        <mesh key={i} position={[block.x, block.y, 0]} rotation={[0, block.tilt, block.tilt * 0.5]} castShadow receiveShadow>
          <boxGeometry args={[0.52, block.h, 0.42]} />
          <meshStandardMaterial map={stone} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  );
}

export function FallenCart({ position = [0, 0, 0], rotation = [0, 0, 0] }: { position?: [number, number, number]; rotation?: [number, number, number] }): JSX.Element {
  const wood = useMemo(() => woodTexture('#3a2a1d', '#1f1610', 2), []);
  const wheel = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    // The wheel turns in no wind at all, until the fight starts.
    if (wheel.current) wheel.current.rotation.z += delta * 0.35;
  });

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.55, 0]} rotation={[0, 0, 1.15]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.16, 1.1]} />
        <meshStandardMaterial map={wood} roughness={0.95} />
      </mesh>
      {[-0.5, 0.5].map((z, i) => (
        <mesh key={i} position={[0.45, 0.35, z]} rotation={[0, 0, 1.15]} castShadow>
          <boxGeometry args={[1.4, 0.09, 0.09]} />
          <meshStandardMaterial map={wood} color="#2c2016" roughness={1} />
        </mesh>
      ))}
      <mesh ref={wheel} position={[-0.35, 0.95, 0.35]} rotation={[0, 0.4, 0]} castShadow>
        <torusGeometry args={[0.5, 0.055, 5, 14]} />
        <meshStandardMaterial map={wood} color="#33251a" roughness={1} />
      </mesh>
      <mesh position={[0.6, 0.18, -0.4]} rotation={[0.2, 0.5, 1.2]} castShadow>
        <torusGeometry args={[0.48, 0.05, 5, 14]} />
        <meshStandardMaterial map={wood} color="#33251a" roughness={1} />
      </mesh>
      {/* spilled straw and glass */}
      {Array.from({ length: 9 }).map((_, i) => {
        const random = mulberry(i + 3);
        return (
          <mesh key={i} position={[(random() - 0.5) * 2.4, 0.03, (random() - 0.5) * 2]} rotation={[0, random() * 3, 0]}>
            <boxGeometry args={[0.3, 0.02, 0.04]} />
            <meshStandardMaterial color="#6a5c3a" roughness={1} />
          </mesh>
        );
      })}
    </group>
  );
}

export function DeadCourier({ position = [0, 0, 0], rotation = [0, 0, 0] }: { position?: [number, number, number]; rotation?: [number, number, number] }): JSX.Element {
  return (
    <group position={position} rotation={rotation}>
      {/* seated, arranged, hands folded */}
      <mesh position={[0, 0.42, 0]} rotation={[0.25, 0, 0]} castShadow>
        <capsuleGeometry args={[0.17, 0.34, 2, 6]} />
        <meshStandardMaterial color="#2b2620" flatShading roughness={1} />
      </mesh>
      <mesh position={[0, 0.72, 0.12]} rotation={[0.7, 0.15, 0]} castShadow>
        <icosahedronGeometry args={[0.115, 1]} />
        <meshStandardMaterial color="#8d8577" flatShading roughness={1} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.16, 0.42, 0.12]} rotation={[1.2, 0, side * 0.3]} castShadow>
          <capsuleGeometry args={[0.05, 0.28, 2, 5]} />
          <meshStandardMaterial color="#241f1a" flatShading roughness={1} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={`leg${side}`} position={[side * 0.1, 0.13, 0.35]} rotation={[1.45, 0, 0]} castShadow>
          <capsuleGeometry args={[0.06, 0.42, 2, 5]} />
          <meshStandardMaterial color="#1d1915" flatShading roughness={1} />
        </mesh>
      ))}
      {/* the route-slip in his folded hands */}
      <mesh position={[0, 0.36, 0.28]} rotation={[1.3, 0, 0.2]}>
        <planeGeometry args={[0.14, 0.19]} />
        <meshStandardMaterial color="#c8bb9c" side={THREE.DoubleSide} roughness={1} />
      </mesh>
    </group>
  );
}

export function GatePillars({ position = [0, 0, 0] }: { position?: [number, number, number] }): JSX.Element {
  const stone = useMemo(() => stoneTexture('#2f2f38', 3), []);
  return (
    <group position={position}>
      {[-2.6, 2.6].map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          <mesh position={[0, 2.6, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.0, 5.2, 1.0]} />
            <meshStandardMaterial map={stone} roughness={1} />
          </mesh>
          <mesh position={[0, 5.35, 0]} castShadow>
            <boxGeometry args={[1.3, 0.32, 1.3]} />
            <meshStandardMaterial map={stone} color="#39394a" roughness={1} />
          </mesh>
          {/* worn hinge-stones, on the inside */}
          <mesh position={[x > 0 ? -0.55 : 0.55, 3.1, 0]}>
            <sphereGeometry args={[0.16, 8, 6]} />
            <meshStandardMaterial color="#4a4a58" metalness={0.3} roughness={0.6} flatShading />
          </mesh>
          <mesh position={[x > 0 ? -0.55 : 0.55, 1.7, 0]}>
            <sphereGeometry args={[0.16, 8, 6]} />
            <meshStandardMaterial color="#4a4a58" metalness={0.3} roughness={0.6} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** A silhouette on a far ridge, visible only in lightning. */
export function CastleSilhouette({ opacity }: { opacity: number }): JSX.Element {
  return (
    <group position={[8, 0, -70]} scale={[1, 1, 1]}>
      {[
        [0, 7, 4, 14],
        [-4.5, 5, 3, 10],
        [4.6, 5.6, 2.6, 11],
        [-8, 3.4, 2.2, 7],
        [8.4, 3.8, 2, 8],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, 0]}>
          <boxGeometry args={[w, h, 2]} />
          <meshBasicMaterial color="#05050a" transparent opacity={opacity} />
        </mesh>
      ))}
      {[-4.5, 0, 4.6].map((x, i) => (
        <mesh key={`spire${i}`} position={[x, i === 1 ? 15 : 11.5, 0]}>
          <coneGeometry args={[i === 1 ? 2.2 : 1.6, i === 1 ? 4 : 3, 4]} />
          <meshBasicMaterial color="#05050a" transparent opacity={opacity} />
        </mesh>
      ))}
    </group>
  );
}
