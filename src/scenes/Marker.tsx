/**
 * The only diegetic UI in the 3D world: a small cold mote over anything Corvin
 * can look at, brighter when he is close enough to act.
 */

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { glowSprite } from '@/three/textures';

export function Marker({
  position,
  active = false,
  color = '#b9bec9',
  hidden = false,
}: {
  position: [number, number, number];
  active?: boolean;
  color?: string;
  hidden?: boolean;
}): JSX.Element | null {
  const sprite = useRef<THREE.Sprite>(null);
  const seed = useRef(Math.random() * 6);

  useFrame((state) => {
    if (!sprite.current) return;
    const t = state.clock.elapsedTime + seed.current;
    const pulse = 0.55 + Math.sin(t * 2.1) * 0.2;
    const scale = (active ? 0.42 : 0.24) * pulse + 0.1;
    sprite.current.scale.setScalar(scale);
    sprite.current.position.y = position[1] + Math.sin(t * 1.3) * 0.05;
    const material = sprite.current.material as THREE.SpriteMaterial;
    material.opacity = (active ? 0.85 : 0.4) * pulse;
  });

  if (hidden) return null;

  return (
    <sprite ref={sprite} position={position}>
      <spriteMaterial
        map={glowSprite(color)}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  );
}
