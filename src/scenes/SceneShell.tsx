/**
 * Per-scene atmosphere: fog, key light, bounce light and the postprocessing
 * chain.  The chain is deliberately short — bloom, vignette, a whisper of
 * chromatic aberration — and it turns itself off entirely on the low preset.
 */

import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGame } from '@/game/store';
import { useSettings } from '@/game/settings';
import { SCENE_LOOKS, type SceneLookId } from '@/three/palette';
import { useQuality } from './props';

export function SceneAtmosphere({
  look,
  moonAngle = [-6, 9, -4],
  moonColor = '#8fa2c8',
  moonIntensity = 0.7,
  fogOverride,
}: {
  look: SceneLookId;
  moonAngle?: [number, number, number];
  moonColor?: string;
  moonIntensity?: number;
  /** 0..1 — chapters push the fog in as things get worse. */
  fogOverride?: number;
}): JSX.Element {
  const { scene } = useThree();
  const quality = useQuality();
  const recipe = SCENE_LOOKS[look];
  const fog = useMemo(() => new THREE.Fog(recipe.fog, recipe.fogNear, recipe.fogFar), [recipe]);
  const light = useRef<THREE.DirectionalLight>(null);

  useEffect(() => {
    scene.fog = fog;
    scene.background = new THREE.Color(recipe.fog);
    return () => {
      scene.fog = null;
    };
  }, [scene, fog, recipe]);

  useFrame((_, delta) => {
    if (fogOverride === undefined) return;
    // Fog closes in as the chapter escalates — and as the player walks east.
    const targetFar = THREE.MathUtils.lerp(recipe.fogFar, recipe.fogFar * 0.32, fogOverride);
    fog.far += (targetFar - fog.far) * Math.min(1, delta * 0.8);
    fog.near += (recipe.fogNear * (1 - fogOverride * 0.5) - fog.near) * Math.min(1, delta * 0.8);
  });

  return (
    <>
      <ambientLight intensity={recipe.ambient} color={recipe.ambientColor} />
      <hemisphereLight args={[recipe.ambientColor, '#08070a', recipe.ambient * 1.4]} />
      <directionalLight
        ref={light}
        position={moonAngle}
        intensity={moonIntensity}
        color={moonColor}
        castShadow={quality.shadows}
        shadow-mapSize-width={quality.shadowMapSize}
        shadow-mapSize-height={quality.shadowMapSize}
        shadow-camera-near={0.5}
        shadow-camera-far={48}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-bias={-0.0012}
      />
    </>
  );
}

export function PostFx(): JSX.Element | null {
  const quality = useQuality();
  const reducedMotion = useSettings((s) => s.reducedMotion);
  const highContrast = useSettings((s) => s.highContrast);
  const chill = useGame((s) => s.run.medallionChill);
  const shake = useGame((s) => s.shake);

  const aberration = useMemo(() => new THREE.Vector2(0.0006, 0.0008), []);

  useFrame(() => {
    // Reality frays slightly when the medallion is cold or something just hit.
    const amount = 0.0004 + chill * 0.0016 + shake * 0.002;
    aberration.set(amount, amount * 1.2);
  });

  if (!quality.postprocessing) return null;

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom
        intensity={highContrast ? 0.35 : 0.62}
        luminanceThreshold={0.42}
        luminanceSmoothing={0.22}
        mipmapBlur
      />
      <ChromaticAberration offset={aberration} radialModulation modulationOffset={0.35} blendFunction={BlendFunction.NORMAL} />
      <Vignette eskil={false} offset={highContrast ? 0.34 : 0.26} darkness={highContrast ? 0.55 : 0.82} />
      <Noise opacity={reducedMotion ? 0.012 : 0.028} blendFunction={BlendFunction.OVERLAY} />
    </EffectComposer>
  );
}
