/**
 * Chapter One — the nameless inn.
 *
 * Two areas in one scene: the wet road outside at sunset, and the taproom.
 * Walking through the door crossfades between them without a load screen.
 */

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { audio } from '@/audio/engine';
import { Ansbeth, CharacterLight, Corvin, Emrik, Nell, Tovin } from '@/characters/cast';
import { useGame } from '@/game/store';
import { PALETTE } from '@/three/palette';
import { stoneTexture, woodTexture } from '@/three/textures';
import { CameraRig } from './CameraRig';
import { Marker } from './Marker';
import { PostFx, SceneAtmosphere } from './SceneShell';
import { useExploration, useInteractionKey, type Interactable } from './exploration';
import { Candle, Hearth, Motes, Rain, Stool, Table, TimberWall, TreeField, WetGround } from './props';

const YAW = 0;

export function InnScene(): JSX.Element {
  const [inside, setInside] = useState(false);
  const startDialogue = useGame((s) => s.startDialogue);
  const hasFlag = useGame((s) => s.hasFlag);
  const setFlag = useGame((s) => s.setFlag);
  const pushToast = useGame((s) => s.pushToast);
  const inspectMedallion = useGame((s) => s.inspectMedallion);
  const chill = useGame((s) => s.run.medallionChill);
  const mode = useGame((s) => s.mode);

  useEffect(() => {
    audio.setAmbience(inside ? 'inn-inside' : 'inn-outside');
    if (inside) audio.setMusic('none');
  }, [inside]);

  const interactables = useMemo<Interactable[]>(() => {
    if (!inside) {
      return [
        {
          id: 'door',
          position: [0, 1, -3.2],
          radius: 2.1,
          label: 'Open the door',
          onInteract: () => {
            audio.play('door');
            setInside(true);
          },
        },
        {
          id: 'sign',
          position: [3.2, 1.6, -2.4],
          radius: 1.8,
          label: 'Read the sign',
          onInteract: () =>
            pushToast('The sign has no name on it. It has had one. Someone took it off with a chisel.', 'clue'),
        },
      ];
    }
    return [
      {
        id: 'emrik',
        position: [-2.6, 0.9, -1.4],
        radius: 1.7,
        label: hasFlag('met-emrik') ? 'Speak with Emrik again' : 'Emrik Waldenfels is waiting',
        onInteract: () => startDialogue('inn-emrik'),
      },
      {
        id: 'nell',
        position: [2.8, 0.9, -0.4],
        radius: 1.6,
        label: 'The halfling with two kinds of mud on her boots',
        onInteract: () => startDialogue('inn-nell'),
      },
      {
        id: 'ansbeth',
        position: [2.2, 0.9, 2.6],
        radius: 1.6,
        label: 'The tall woman who has not taken off her coat',
        onInteract: () => startDialogue('inn-ansbeth'),
      },
      {
        id: 'tovin',
        position: [-3.4, 1.1, 2.4],
        radius: 1.7,
        label: 'The innkeeper',
        onInteract: () => startDialogue('inn-tovin'),
      },
      {
        id: 'lockbox',
        position: [-4.4, 0.8, 3.2],
        radius: 1.5,
        label: "A courier's strongbox, behind the bar",
        available: () => hasFlag('tovin-box'),
        onInteract: () => startDialogue('inn-lockbox'),
      },
      {
        id: 'stool',
        position: [0.4, 0.7, 2.9],
        radius: 1.5,
        label: 'Take out the lute',
        available: () => !hasFlag('performed'),
        once: true,
        onInteract: () => startDialogue('inn-perform'),
      },
      {
        id: 'window',
        position: [4.6, 1.4, -2.2],
        radius: 1.7,
        label: 'The north window',
        onInteract: () => startDialogue('inn-window'),
      },
      {
        id: 'hearth',
        position: [-0.2, 0.7, -3.5],
        radius: 1.8,
        label: 'The fire',
        onInteract: () => {
          setFlag('watched-fire');
          pushToast('The flames lean a little away from the north window. They have been doing it all evening.', 'clue');
          audio.play('spell-thaumaturgy', { gain: 0.35 });
        },
      },
      {
        id: 'seat',
        position: [-1.0, 0.6, 1.4],
        radius: 1.4,
        label: 'A chair that faces the door',
        once: true,
        onInteract: () => {
          setFlag('sat-facing-door');
          pushToast('He sits where he can see the room and the door. He always has. It has only mattered twice.', 'info');
        },
      },
      {
        id: 'medallion',
        position: [-1.0, 1.2, 0.2],
        radius: 1.2,
        label: 'Die Schwelle',
        available: () => chill > 0.2,
        onInteract: () => inspectMedallion(true),
      },
      {
        id: 'leave',
        position: [0, 1, 4.6],
        radius: 1.8,
        label: 'Leave with the others, before first light',
        available: () => hasFlag('met-emrik'),
        onInteract: () => startDialogue('inn-depart'),
      },
    ];
  }, [inside, hasFlag, startDialogue, setFlag, pushToast, inspectMedallion, chill]);

  const exploration = useExploration({
    start: inside ? [0, 3.6] : [0, 4.5],
    bounds: inside
      ? { minX: -4.6, maxX: 5.0, minZ: -3.6, maxZ: 4.8 }
      : { minX: -7, maxX: 7, minZ: -2.6, maxZ: 9 },
    obstacles: inside
      ? [
          { x: -2.6, z: -2.1, radius: 1.0 },
          { x: 2.8, z: -1.1, radius: 0.85 },
          { x: 2.2, z: 1.9, radius: 0.85 },
          { x: -3.9, z: 3.0, radius: 1.2 },
          { x: -0.2, z: -3.9, radius: 1.1 },
        ]
      : [{ x: 0, z: -4.4, radius: 3.4 }],
    interactables,
    footstep: inside ? 'footstep-wood' : 'footstep-mud',
    cameraYaw: YAW,
  });

  useInteractionKey(exploration.interact);

  const nearestId = useGame((s) => s.interaction?.id ?? null);
  const corvinGroup = useRef<THREE.Group>(null);
  const lookRef = useRef<THREE.Vector3 | null>(null);

  useFrame((_, delta) => {
    if (!corvinGroup.current) return;
    corvinGroup.current.position.copy(exploration.position.current);
    const targetYaw = exploration.facing.current;
    const current = corvinGroup.current.rotation.y;
    let diff = targetYaw - current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    corvinGroup.current.rotation.y = current + diff * Math.min(1, delta * 8);
    lookRef.current = exploration.lookTarget.current;
  });

  const action = mode === 'dialogue' ? 'talk' : exploration.moving.current ? 'walk' : 'idle';

  return (
    <>
      <SceneAtmosphere
        look={inside ? 'inn-inside' : 'inn-outside'}
        moonAngle={inside ? [-3, 6, 4] : [-9, 7, 6]}
        moonColor={inside ? '#a87b46' : '#7f8fb5'}
        moonIntensity={inside ? 0.26 : 1.05}
      />
      <CameraRig
        target={exploration.position}
        yaw={0}
        distance={inside ? 0.82 : 1}
        elevation={inside ? 0.75 : 1}
        focus={exploration.focus}
      />
      <PostFx />
      <CharacterLight target={exploration.position} />

      <group ref={corvinGroup}>
        <Corvin action={action} lookAt={lookRef.current} chill={chill} lute={hasFlag('performed') ? 'hands' : 'back'} />
      </group>

      {interactables.map((item) => (
        <Marker
          key={item.id}
          position={item.position}
          active={nearestId === item.id}
          hidden={(item.available && !item.available()) || (item.once && exploration.used.current.has(item.id))}
          color={item.id === 'medallion' ? PALETTE.frost : PALETTE.silver}
        />
      ))}

      {inside ? <Taproom /> : <InnExterior />}
    </>
  );
}

/* --------------------------------------------------------------- exterior */

function InnExterior(): JSX.Element {
  const follow = useRef(new THREE.Vector3());
  return (
    <group>
      <WetGround size={80} color="#211a16" />
      <TreeField count={90} radius={40} innerRadius={16} seed={4} />
      <Rain follow={follow} />
      <Motes color="#7f8fb5" area={26} height={5} opacity={0.16} speed={0.3} />

      {/* the inn itself */}
      <group position={[0, 0, -6]}>
        <TimberWall width={11} height={3.6} position={[0, 1.8, 2.2]} windows={2} />
        <TimberWall width={9} height={3.6} position={[-5.5, 1.8, -2.2]} rotation={[0, Math.PI / 2, 0]} windows={1} />
        <TimberWall width={9} height={3.6} position={[5.5, 1.8, -2.2]} rotation={[0, Math.PI / 2, 0]} windows={1} />
        {/* roof */}
        <mesh position={[0, 4.4, -2]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[8.6, 2.4, 4]} />
          <meshStandardMaterial color="#241c18" flatShading roughness={1} />
        </mesh>
        {/* door */}
        <mesh position={[0, 1.1, 2.4]}>
          <boxGeometry args={[1.2, 2.2, 0.12]} />
          <meshStandardMaterial map={woodTexture('#332319', '#1a110c', 1)} roughness={0.9} />
        </mesh>
        <pointLight position={[0, 2.4, 2.9]} color={PALETTE.amber} intensity={1.6} distance={9} decay={2} />
        {/* the sign with the name taken off it */}
        <group position={[3.2, 2.4, 2.6]}>
          <mesh rotation={[0, 0, 0.06]}>
            <boxGeometry args={[1.1, 0.62, 0.06]} />
            <meshStandardMaterial map={woodTexture('#2c2019', '#150f0b', 1)} roughness={1} />
          </mesh>
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[0.06, 0.3, 0.06]} />
            <meshStandardMaterial color="#1c1512" roughness={1} />
          </mesh>
        </group>
      </group>

      {/* the old road going east into the trees */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 12]}>
        <planeGeometry args={[3.4, 34]} />
        <meshStandardMaterial color="#2c241d" roughness={0.7} metalness={0.1} />
      </mesh>
    </group>
  );
}

/* --------------------------------------------------------------- interior */

function Taproom(): JSX.Element {
  const floor = useMemo(() => woodTexture('#33241a', '#1c130d', 6), []);
  const plaster = useMemo(() => stoneTexture('#3d362c', 3), []);
  const emrikLook = useMemo(() => new THREE.Vector3(0, 1.2, 1), []);

  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 11]} />
        <meshStandardMaterial map={floor} roughness={0.86} />
      </mesh>
      {/* ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3.1, 0]}>
        <planeGeometry args={[12, 11]} />
        <meshStandardMaterial map={plaster} color="#241d18" roughness={1} />
      </mesh>
      {/* beams */}
      {[-3, -1, 1, 3].map((z) => (
        <mesh key={z} position={[0, 2.92, z]} castShadow>
          <boxGeometry args={[12, 0.24, 0.24]} />
          <meshStandardMaterial map={woodTexture('#2e2016', '#170f0a', 4)} roughness={1} />
        </mesh>
      ))}
      {/* walls */}
      <TimberWall width={12} height={3.1} position={[0, 1.55, -4.4]} />
      <TimberWall width={11} height={3.1} position={[5.6, 1.55, 0]} rotation={[0, -Math.PI / 2, 0]} windows={1} />
      <TimberWall width={11} height={3.1} position={[-5.6, 1.55, 0]} rotation={[0, Math.PI / 2, 0]} />
      <TimberWall width={12} height={3.1} position={[0, 1.55, 5.4]} rotation={[0, Math.PI, 0]} />

      <Hearth position={[-0.2, 0, -4.0]} />
      <Motes color="#e0a659" area={9} height={3} opacity={0.22} size={0.05} speed={0.08} />

      {/* Emrik's table, furthest from the door, nearest the fire */}
      <Table position={[-2.6, 0, -2.1]} />
      <Stool position={[-2.6, 0, -1.2]} />
      <Stool position={[-3.4, 0, -2.6]} />
      <Candle position={[-2.6, 0.78, -2.1]} />
      <group position={[-2.9, 0, -2.7]} rotation={[0, 0.4, 0]}>
        <Emrik action="talk" lookAt={emrikLook} />
      </group>

      {/* Nell, at the end of the bar with her back to a wall */}
      <group position={[2.9, 0, -1.4]} rotation={[0, -2.4, 0]}>
        <Nell action="idle" />
      </group>
      <Table position={[2.8, 0, -0.9]} size={[1.0, 0.8]} />
      <Candle position={[2.8, 0.78, -0.9]} scale={0.9} intensity={1.1} />

      {/* Ansbeth, door over her left shoulder */}
      <group position={[2.2, 0, 2.1]} rotation={[0, -2.9, 0]}>
        <Ansbeth action="idle" />
      </group>
      <Stool position={[2.2, 0, 2.8]} />

      {/* the bar, and Tovin polishing a clean glass */}
      <group position={[-3.9, 0, 3.0]}>
        <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.0, 1.1, 0.8]} />
          <meshStandardMaterial map={woodTexture('#3a2a1e', '#1e1510', 2)} roughness={0.85} />
        </mesh>
        <mesh position={[0, 1.14, 0]}>
          <boxGeometry args={[3.3, 0.09, 1.0]} />
          <meshStandardMaterial map={woodTexture('#4a3524', '#251a12', 2)} roughness={0.6} />
        </mesh>
        {/* the strongbox nobody put there */}
        <mesh position={[-0.5, 0.42, -0.5]} castShadow>
          <boxGeometry args={[0.42, 0.3, 0.32]} />
          <meshStandardMaterial color="#15161a" metalness={0.6} roughness={0.5} flatShading />
        </mesh>
      </group>
      <group position={[-3.4, 0, 3.6]} rotation={[0, 0.3, 0]}>
        <Tovin action="idle" />
      </group>
      <Candle position={[-4.8, 1.2, 3.0]} scale={0.9} intensity={1.2} />

      {/* the stool by the fire where a bard would sit */}
      <Stool position={[0.4, 0, 2.9]} />

      {/* other tables, other lives */}
      <Table position={[3.6, 0, 4.0]} rotation={[0, 0.4, 0]} size={[1.2, 0.9]} />
      <Candle position={[3.6, 0.78, 4.0]} scale={0.8} intensity={0.9} />

      {/* the door out */}
      <mesh position={[0, 1.1, 5.28]}>
        <boxGeometry args={[1.3, 2.2, 0.1]} />
        <meshStandardMaterial map={woodTexture('#2c1e15', '#160e0a', 1)} roughness={0.95} />
      </mesh>
    </group>
  );
}
