/**
 * Die Schwelle — The Threshold.
 *
 * The same object serves the title screen, the HUD indicator and the full-screen
 * inspection.  Its whole state is two numbers: how cold it is (0..1) and how far
 * the thing behind the glass has come (0 nothing, 1 fogging, 2 a fingerprint,
 * 3 a hand, flat against the inside).
 */

import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { frostTexture, glowSprite, medallionFace, pressTexture } from '@/three/textures';

export function MedallionObject({
  chill,
  stage,
  spin = 0.25,
  candle = true,
}: {
  chill: number;
  stage: number;
  spin?: number;
  candle?: boolean;
}): JSX.Element {
  const group = useRef<THREE.Group>(null);
  const frost = useRef<THREE.MeshBasicMaterial>(null);
  const press = useRef<THREE.MeshBasicMaterial>(null);
  const glass = useRef<THREE.MeshPhysicalMaterial>(null);
  const flame = useRef<THREE.PointLight>(null);

  const face = useMemo(() => medallionFace(), []);
  const frostMap = useMemo(() => frostTexture(), []);
  const pressMap = useMemo(() => pressTexture(stage >= 3 ? 3 : 2), [stage]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (group.current) {
      // It sways on its chain; it never turns its back on you.
      group.current.rotation.y = Math.sin(t * spin * 1.6) * 0.42;
      group.current.rotation.x = Math.sin(t * 0.6) * 0.07;
      group.current.position.y = Math.sin(t * 0.9) * 0.02;
    }
    if (frost.current) {
      // Frost grows, and never quite retreats.
      const wanted = Math.pow(Math.max(0, chill), 1.7) * 0.8;
      frost.current.opacity += (wanted - frost.current.opacity) * Math.min(1, delta * 1.6);
    }
    if (press.current) {
      const wanted = stage >= 3 ? 0.9 : stage >= 2 ? 0.55 + Math.sin(t * 1.4) * 0.08 : 0;
      press.current.opacity += (wanted - press.current.opacity) * Math.min(1, delta * 1.1);
    }
    if (glass.current) {
      glass.current.transmission = Math.max(0.05, 0.55 - chill * 0.5);
      glass.current.emissiveIntensity = 0.05 + chill * 0.5;
    }
    if (flame.current && candle) {
      flame.current.intensity = 1.5 + Math.sin(t * 9.3) * 0.35 + Math.sin(t * 2.7) * 0.2;
    }
  });

  return (
    <group ref={group}>
      {/* Everything is built facing +Z inside one group, then squashed into an
          oval — a medallion, not a coin. */}
      <group scale={[1, 1.24, 1]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.5, 0.5, 0.07, 40]} />
          <meshStandardMaterial color="#26282f" metalness={0.92} roughness={0.5} />
        </mesh>

        {/* engraved face */}
        <mesh position={[0, 0, 0.037]}>
          <circleGeometry args={[0.5, 40]} />
          <meshStandardMaterial map={face} metalness={0.7} roughness={0.48} />
        </mesh>

        {/* the milky glass at the centre — a shallow lens, not a dome */}
        <mesh position={[0, 0.06, 0.046]} scale={[1, 1, 0.26]}>
          <sphereGeometry args={[0.135, 26, 18]} />
          <meshPhysicalMaterial
            ref={glass}
            color="#b9bec9"
            transmission={0.55}
            thickness={0.22}
            roughness={0.34}
            metalness={0.05}
            emissive="#9fd4e6"
            emissiveIntensity={0.05}
            transparent
            opacity={0.62}
          />
        </mesh>

        {/* what is pressed against it, from the inside */}
        <mesh position={[0, 0.06, 0.05]}>
          <circleGeometry args={[0.125, 28]} />
          <meshBasicMaterial ref={press} map={pressMap} transparent opacity={0} depthWrite={false} />
        </mesh>

        {/* frost, over everything */}
        <mesh position={[0, 0, 0.06]}>
          <circleGeometry args={[0.505, 40]} />
          <meshBasicMaterial
            ref={frost}
            map={frostMap}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {/* suspension loop and a length of chain */}
      <mesh position={[0, 0.68, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.07, 0.016, 8, 18]} />
        <meshStandardMaterial color="#6f747f" metalness={0.9} roughness={0.42} />
      </mesh>

      {candle && (
        <>
          <pointLight ref={flame} position={[1.1, 0.4, 1.3]} color="#e0a659" intensity={1.5} distance={7} decay={2} />
          <pointLight position={[-1.4, 0.2, 0.6]} color="#9fd4e6" intensity={0.5 + chill * 2.4} distance={6} decay={2} />
          <sprite position={[1.15, 0.42, 1.35]} scale={[0.5, 0.7, 0.5]}>
            <spriteMaterial
              map={glowSprite('#e0a659')}
              transparent
              opacity={0.55}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
        </>
      )}
    </group>
  );
}

export function MedallionCanvas({
  chill,
  stage,
  spin = 0.25,
  className,
}: {
  chill: number;
  stage: number;
  spin?: number;
  className?: string;
}): JSX.Element {
  return (
    <Canvas
      className={className}
      dpr={[1, 1.8]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0.16, 2.7], fov: 38 }}
    >
      <ambientLight intensity={0.25} color="#6f7a92" />
      <MedallionObject chill={chill} stage={stage} spin={spin} />
    </Canvas>
  );
}
