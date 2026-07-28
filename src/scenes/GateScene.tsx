/**
 * Chapter Five — beyond the gate.
 *
 * Two pillars, a forest that will not move, and lightning that shows a ridge
 * with towers on it for less than a heartbeat.  Walking forward is the only
 * mechanic left, which is the point.
 */

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { audio } from '@/audio/engine';
import { CharacterLight, Corvin } from '@/characters/cast';
import { useGame } from '@/game/store';
import { PALETTE } from '@/three/palette';
import { CameraRig } from './CameraRig';
import { Companions } from './RoadScene';
import { Marker } from './Marker';
import { PostFx, SceneAtmosphere } from './SceneShell';
import { useExploration, useInteractionKey, type Interactable } from './exploration';
import { GATE } from './layout';
import { CastleSilhouette, GatePillars, Motes, TreeField, WetGround } from './props';

export function GateScene(): JSX.Element {
  const startDialogue = useGame((s) => s.startDialogue);
  const inspectMedallion = useGame((s) => s.inspectMedallion);
  const mode = useGame((s) => s.mode);
  const chill = useGame((s) => s.run.medallionChill);
  const completed = useGame((s) => s.run.completed);

  useEffect(() => {
    audio.setAmbience('gate');
    audio.setMusic('reveal');
  }, []);

  const interactables = useMemo<Interactable[]>(
    () => [
      {
        id: 'pillars',
        ...GATE.points.pillars,
        label: 'Walk to the pillars',
        once: true,
        onInteract: () => startDialogue('gate-arrive'),
      },
      {
        id: 'medallion',
        ...GATE.points.medallion,
        label: 'Die Schwelle',
        onInteract: () => inspectMedallion(true),
      },
      {
        id: 'behind',
        ...GATE.points.behind,
        label: 'Look back at the road',
        available: () => completed,
        onInteract: () => {
          audio.play('medallion-freeze');
          useGame.getState().pushToast('There is no road at all.', 'clue');
          window.setTimeout(() => useGame.getState().showFinale(), 1800);
        },
      },
    ],
    [startDialogue, inspectMedallion, completed],
  );

  const exploration = useExploration({
    start: GATE.start,
    bounds: GATE.bounds,
    obstacles: GATE.obstacles,
    interactables,
    footstep: 'footstep-mud',
    cameraYaw: 0,
  });
  useInteractionKey(exploration.interact);

  const nearestId = useGame((s) => s.interaction?.id ?? null);
  const corvin = useRef<THREE.Group>(null);
  const lookRef = useRef<THREE.Vector3 | null>(null);

  // One brief moment of control after the Voice, then the last card — whether
  // or not the player thinks to look behind them.
  useEffect(() => {
    if (!completed) return;
    const timer = window.setTimeout(() => {
      if (!useGame.getState().finale && useGame.getState().phase === 'playing') useGame.getState().showFinale();
    }, 26000);
    return () => window.clearTimeout(timer);
  }, [completed]);

  useFrame((_, delta) => {
    if (corvin.current) {
      corvin.current.position.copy(exploration.position.current);
      const target = exploration.facing.current;
      let diff = target - corvin.current.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      corvin.current.rotation.y += diff * Math.min(1, delta * 8);
    }
    lookRef.current = exploration.lookTarget.current;
  });

  const action = mode === 'dialogue' ? 'talk' : exploration.moving.current ? 'walk' : 'idle';

  return (
    <>
      <SceneAtmosphere look="gate" moonAngle={[-4, 14, -12]} moonColor="#7a6fa8" moonIntensity={0.34} />
      <CameraRig
        target={exploration.position}
        yaw={0}
        distance={1.15}
        elevation={1.1}
        focus={exploration.focus}
      />
      <PostFx />
      <CharacterLight target={exploration.position} />

      <group ref={corvin}>
        <Corvin action={action} lookAt={lookRef.current} chill={Math.max(chill, 0.9)} />
      </group>
      <Companions player={exploration.position} moving={exploration.moving} spread={0.9} />

      {interactables.map((item) => (
        <Marker
          key={item.id}
          position={item.position}
          active={nearestId === item.id}
          hidden={(item.available && !item.available()) || (item.once ? exploration.used.current.has(item.id) : false)}
          color={item.id === 'medallion' ? PALETTE.frost : PALETTE.violetPale}
        />
      ))}

      <GateWorld />
    </>
  );
}

function GateWorld(): JSX.Element {
  const flash = useRef(0);
  const nextFlash = useRef(3);
  const light = useRef<THREE.DirectionalLight>(null);
  const silhouette = useRef(0);

  useFrame((_, delta) => {
    nextFlash.current -= delta;
    if (nextFlash.current <= 0) {
      nextFlash.current = 6 + Math.random() * 9;
      flash.current = 1;
      audio.play('thunder', { gain: 0.6 });
    }
    flash.current = Math.max(0, flash.current - delta * 2.6);
    silhouette.current = flash.current;
    if (light.current) {
      light.current.intensity = 0.12 + flash.current * 2.6;
      light.current.color.setHex(flash.current > 0.3 ? 0xc9d3ea : 0x6f6aa0);
    }
  });

  return (
    <group>
      <WetGround size={120} color="#191720" reflective={false} />
      <directionalLight ref={light} position={[10, 18, -40]} intensity={0.12} color="#6f6aa0" />
      <GatePillars position={[0, 0, -5]} />
      {/* the forest beyond, which does not move */}
      <TreeField count={160} radius={34} innerRadius={7} centre={[0, -22]} lean={0} seed={9} />
      {/* the forest behind, which arrived recently */}
      <TreeField count={120} radius={26} innerRadius={9} centre={[0, 16]} lean={0.4} seed={31} />
      <Motes color="#a08bd0" area={26} height={7} opacity={0.24} size={0.18} speed={0.08} />
      <LightningSilhouette level={silhouette} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 4]}>
        <planeGeometry args={[3.4, 16]} />
        <meshStandardMaterial color="#272029" roughness={0.7} metalness={0.12} />
      </mesh>
    </group>
  );
}

function LightningSilhouette({ level }: { level: MutableRefObject<number> }): JSX.Element {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!group.current) return;
    group.current.visible = level.current > 0.05;
    group.current.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.material && 'opacity' in mesh.material) {
        (mesh.material as THREE.MeshBasicMaterial).opacity = Math.min(1, level.current * 1.4);
      }
    });
  });
  return (
    <group ref={group}>
      <CastleSilhouette opacity={0.9} />
    </group>
  );
}
