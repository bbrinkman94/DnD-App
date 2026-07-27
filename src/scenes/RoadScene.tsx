/**
 * Chapter Two — the road east.
 *
 * A walk, with the world getting quietly worse behind you.  Progress along the
 * road drives fog density, tree lean, ambience and the medallion's chill, so the
 * escalation is continuous rather than a series of triggers with gaps between.
 */

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { audio } from '@/audio/engine';
import { Ansbeth, CharacterLight, Corvin, Emrik, Nell } from '@/characters/cast';
import { useGame } from '@/game/store';
import { PALETTE } from '@/three/palette';
import { CameraRig } from './CameraRig';
import { Marker } from './Marker';
import { PostFx, SceneAtmosphere } from './SceneShell';
import { useExploration, useInteractionKey, type Interactable } from './exploration';
import { Motes, TreeField, WetGround } from './props';

const START_Z = 10;
const END_Z = -30;

/** z position -> 0..1 along the road. */
function progressAt(z: number): number {
  return THREE.MathUtils.clamp((START_Z - z) / (START_Z - END_Z), 0, 1);
}

export function RoadScene(): JSX.Element {
  const startDialogue = useGame((s) => s.startDialogue);
  const inspectMedallion = useGame((s) => s.inspectMedallion);
  const setMedallion = useGame((s) => s.setMedallion);
  const setFlag = useGame((s) => s.setFlag);
  const mode = useGame((s) => s.mode);
  const chill = useGame((s) => s.run.medallionChill);

  useEffect(() => {
    audio.setAmbience('road');
    audio.setMusic('tension');
  }, []);

  const interactables = useMemo<Interactable[]>(
    () => [
      {
        id: 'medallion',
        position: [1.6, 1.2, 2.0],
        radius: 2.0,
        label: 'Die Schwelle is cold',
        onInteract: () => inspectMedallion(true),
      },
      {
        id: 'tracks',
        position: [-2.2, 0.4, -4.0],
        radius: 2.0,
        label: 'Tracks in the mud',
        once: true,
        onInteract: () => {
          setFlag('saw-tracks');
          useGame.getState().addClue('fog-directs', 'Tracks that stop, and then start again ahead of you');
        },
      },
      {
        id: 'stone',
        position: [2.6, 0.5, -13.0],
        radius: 2.2,
        label: 'A boundary stone, face down',
        once: true,
        onInteract: () => {
          useGame.getState().pushToast('Someone turned it face down. From this side.', 'clue');
          audio.play('medallion-pulse', { gain: 0.6 });
        },
      },
    ],
    [inspectMedallion, setFlag],
  );

  const exploration = useExploration({
    start: [0, START_Z],
    bounds: { minX: -6, maxX: 6, minZ: END_Z - 1, maxZ: START_Z + 2 },
    interactables,
    footstep: 'footstep-mud',
    cameraYaw: 0,
    speed: 2.9,
  });
  useInteractionKey(exploration.interact);

  const nearestId = useGame((s) => s.interaction?.id ?? null);
  const corvin = useRef<THREE.Group>(null);
  const progress = useRef(0);
  const fired = useRef<Set<string>>(new Set());
  const lookRef = useRef<THREE.Vector3 | null>(null);

  useFrame((_, delta) => {
    const position = exploration.position.current;
    progress.current = progressAt(position.z);

    if (corvin.current) {
      corvin.current.position.copy(position);
      const target = exploration.facing.current;
      let diff = target - corvin.current.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      corvin.current.rotation.y += diff * Math.min(1, delta * 8);
    }
    lookRef.current = exploration.lookTarget.current;

    // Chill rises with the road, and never falls back.
    const wanted = 0.28 + progress.current * 0.42;
    if (wanted > useGame.getState().run.medallionChill) setMedallion(wanted);

    if (mode !== 'explore') return;
    const beats: [string, number, string][] = [
      ['open', 0.06, 'road-open'],
      ['fog', 0.36, 'road-fog'],
      ['medallion', 0.62, 'road-medallion'],
      ['howl', 0.93, 'road-howl'],
    ];
    for (const [id, threshold, tree] of beats) {
      if (progress.current >= threshold && !fired.current.has(id)) {
        fired.current.add(id);
        setFlag(`road-${id}`);
        startDialogue(tree);
        break;
      }
    }
  });

  const action = mode === 'dialogue' ? 'talk' : exploration.moving.current ? 'walk' : 'idle';

  return (
    <>
      <SceneAtmosphere
        look="road"
        moonAngle={[-8, 12, 10]}
        moonColor="#8296bd"
        moonIntensity={0.5}
        fogOverride={Math.min(0.85, progress.current)}
      />
      <CameraRig
        target={exploration.position}
        yaw={0}
        distance={1.05}
        elevation={1.05}
        focus={exploration.focus}
      />
      <PostFx />
      <CharacterLight target={exploration.position} />

      <group ref={corvin}>
        <Corvin action={action} lookAt={lookRef.current} chill={chill} />
      </group>

      <Companions player={exploration.position} moving={exploration.moving} />

      {interactables.map((item) => (
        <Marker
          key={item.id}
          position={item.position}
          active={nearestId === item.id}
          hidden={item.once ? exploration.used.current.has(item.id) : false}
          color={item.id === 'medallion' ? PALETTE.frost : PALETTE.silver}
        />
      ))}

      <RoadWorld progress={progress} />
    </>
  );
}

/** Nell walks ahead. Ansbeth walks behind. Emrik complains in the middle. */
export function Companions({
  player,
  moving,
  spread = 1,
}: {
  player: MutableRefObject<THREE.Vector3>;
  moving: MutableRefObject<boolean>;
  spread?: number;
}): JSX.Element {
  const nell = useRef<THREE.Group>(null);
  const ansbeth = useRef<THREE.Group>(null);
  const emrik = useRef<THREE.Group>(null);
  const targets = useMemo(
    () => [
      { ref: nell, offset: new THREE.Vector3(-1.5 * spread, 0, -3.4 * spread) },
      { ref: emrik, offset: new THREE.Vector3(1.9 * spread, 0, 1.6 * spread) },
      { ref: ansbeth, offset: new THREE.Vector3(-1.7 * spread, 0, 2.6 * spread) },
    ],
    [spread],
  );

  useFrame((_, delta) => {
    const ease = Math.min(1, delta * 1.9);
    for (const { ref, offset } of targets) {
      if (!ref.current) continue;
      const wanted = new THREE.Vector3().copy(player.current).add(offset);
      ref.current.position.lerp(wanted, ease);
      const dx = player.current.x - ref.current.position.x;
      const dz = player.current.z - ref.current.position.z;
      const yaw = Math.atan2(dx, dz);
      let diff = yaw - ref.current.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      ref.current.rotation.y += diff * Math.min(1, delta * 3);
    }
  });

  const action = moving.current ? 'walk' : 'idle';
  return (
    <>
      <group ref={nell}>
        <Nell action={action} />
      </group>
      <group ref={emrik}>
        <Emrik action={action} />
      </group>
      <group ref={ansbeth}>
        <Ansbeth action={action} />
      </group>
    </>
  );
}

function RoadWorld({ progress }: { progress: MutableRefObject<number> }): JSX.Element {
  const follow = useRef(new THREE.Vector3());
  const mist = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    follow.current.set(0, 0, 0);
    if (mist.current) {
      const material = mist.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.06 + progress.current * 0.16;
      mist.current.position.z = -6 - progress.current * 12;
      mist.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <group>
      <WetGround size={110} color="#1e1b18" reflective={false} />
      {/* the road itself */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -10]} receiveShadow>
        <planeGeometry args={[3.6, 60]} />
        <meshStandardMaterial color="#2b241d" roughness={0.66} metalness={0.12} />
      </mesh>
      <TreeField count={220} radius={46} innerRadius={5.5} centre={[0, -8]} lean={0.9} seed={21} />
      <TreeField count={110} radius={30} innerRadius={4.5} centre={[0, -26]} lean={1.2} seed={55} />
      <Motes color="#9aa7bd" area={30} height={6} opacity={0.28} speed={0.18} size={0.14} />

      {/* the wall of fog that is always a little further along the road */}
      <mesh ref={mist} position={[0, 3, -18]}>
        <sphereGeometry args={[13, 12, 10]} />
        <meshBasicMaterial color="#aebbd0" transparent opacity={0.1} depthWrite={false} side={THREE.BackSide} />
      </mesh>

      {/* a boundary stone, face down */}
      <mesh position={[2.6, 0.14, -13]} rotation={[1.4, 0.4, 0]} castShadow>
        <boxGeometry args={[0.5, 0.9, 0.16]} />
        <meshStandardMaterial color="#3a3a42" roughness={1} flatShading />
      </mesh>
    </group>
  );
}
