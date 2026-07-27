/**
 * Chapters Three and Four — the broken shrine, and what was waiting at it.
 *
 * The same set serves both: exploration walks the ruin, and when the fight
 * starts the camera pulls back and the cast redeploys into the four tactical
 * zones without the location ever changing.
 */

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { audio } from '@/audio/engine';
import { Ansbeth, Corvin, MistWolf, Nell, Shade } from '@/characters/cast';
import type { FigureAction } from '@/characters/Figure';
import { currentActor } from '@/combat/engine';
import { ZONES } from '@/data/encounter';
import { useGame } from '@/game/store';
import { PALETTE } from '@/three/palette';
import { CameraRig } from './CameraRig';
import { Companions } from './RoadScene';
import { Marker } from './Marker';
import { PostFx, SceneAtmosphere } from './SceneShell';
import { useExploration, useInteractionKey, type Interactable } from './exploration';
import {
  BoundaryWall,
  DeadCourier,
  FallenCart,
  Motes,
  ShrineRuin,
  TreeField,
  WetGround,
} from './props';

export function ShrineScene(): JSX.Element {
  const startDialogue = useGame((s) => s.startDialogue);
  const inspectMedallion = useGame((s) => s.inspectMedallion);
  const hasFlag = useGame((s) => s.hasFlag);
  const mode = useGame((s) => s.mode);
  const combat = useGame((s) => s.combat);
  const chill = useGame((s) => s.run.medallionChill);

  useEffect(() => {
    audio.setAmbience('shrine');
  }, []);

  const interactables = useMemo<Interactable[]>(
    () => [
      {
        id: 'arrive',
        position: [0, 1.2, 5.5],
        radius: 3.2,
        label: 'Look at what the fog has put in front of you',
        once: true,
        onInteract: () => startDialogue('shrine-arrive'),
      },
      {
        id: 'body',
        position: [-4.6, 0.8, -1.2],
        radius: 2.0,
        label: 'The courier against the wall',
        available: () => hasFlag('at-shrine'),
        onInteract: () => startDialogue('shrine-body'),
      },
      {
        id: 'carving',
        position: [1.6, 0.8, -2.2],
        radius: 1.8,
        label: 'Marks cut into the shrine',
        available: () => hasFlag('at-shrine'),
        onInteract: () => startDialogue('shrine-carving'),
      },
      {
        id: 'box',
        position: [0, 1.2, -3.0],
        radius: 1.8,
        label: 'A hollow under the altar stone',
        available: () => hasFlag('at-shrine'),
        onInteract: () => startDialogue('shrine-box'),
      },
      {
        id: 'medallion',
        position: [-3.0, 1.2, 0.8],
        radius: 1.6,
        label: 'Die Schwelle is painful now',
        onInteract: () => inspectMedallion(true),
      },
      {
        id: 'treeline',
        position: [5.6, 1.2, -4.6],
        radius: 2.6,
        label: 'Something at the treeline',
        available: () => hasFlag('at-shrine'),
        onInteract: () => startDialogue('shrine-presence'),
      },
    ],
    [startDialogue, hasFlag, inspectMedallion],
  );

  const exploration = useExploration({
    start: [0, 7],
    bounds: { minX: -8, maxX: 8, minZ: -6, maxZ: 9 },
    obstacles: [
      { x: 0, z: -2.6, radius: 2.0 },
      { x: -3.4, z: 0.4, radius: 1.3 },
    ],
    interactables,
    footstep: 'footstep-stone',
    cameraYaw: 0,
  });
  useInteractionKey(exploration.interact);

  const nearestId = useGame((s) => s.interaction?.id ?? null);
  const corvin = useRef<THREE.Group>(null);
  const lookRef = useRef<THREE.Vector3 | null>(null);
  const combatFocus = useRef<THREE.Vector3 | null>(null);

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
    combatFocus.current = combat ? new THREE.Vector3(0, 0.35, 1.0) : null;
  });

  const inCombat = mode === 'combat' && combat !== null;
  const action: FigureAction = mode === 'dialogue' ? 'talk' : exploration.moving.current ? 'walk' : 'idle';

  return (
    <>
      <SceneAtmosphere
        look="shrine"
        moonAngle={[6, 10, -8]}
        moonColor="#7d87a8"
        moonIntensity={0.42}
        fogOverride={0.35 + chill * 0.4}
      />
      <CameraRig
        target={exploration.position}
        yaw={0}
        distance={1.1}
        elevation={1.1}
        focus={(combat ? combatFocus : exploration.focus) as MutableRefObject<THREE.Vector3 | null>}
      />
      <PostFx />

      {!inCombat && (
        <>
          <group ref={corvin}>
            <Corvin action={action} lookAt={lookRef.current} chill={chill} />
          </group>
          <Companions player={exploration.position} moving={exploration.moving} spread={0.8} />
          {interactables.map((item) => (
            <Marker
              key={item.id}
              position={item.position}
              active={nearestId === item.id}
              hidden={
                (item.available && !item.available()) || (item.once ? exploration.used.current.has(item.id) : false)
              }
              color={item.id === 'medallion' ? PALETTE.frost : item.id === 'treeline' ? PALETTE.violetPale : PALETTE.silver}
            />
          ))}
        </>
      )}

      {inCombat && (
        <>
          {/* The fight gets its own stage lighting — cold from the shrine,
              wine-red from the road, so both lines read at a glance. */}
          <pointLight position={[0, 5.2, 4.2]} color="#aebbd6" intensity={9} distance={22} decay={2} />
          <pointLight position={[-4.5, 2.4, 2.0]} color="#8d2f42" intensity={4} distance={14} decay={2} />
          <CombatStage />
        </>
      )}

      <ShrineWorld />
    </>
  );
}

/* ------------------------------------------------------------ combat stage */

const ZONE_SLOTS: Record<string, [number, number][]> = {
  front: [
    [-1.35, -0.25],
    [1.35, 0.35],
    [0, 1.25],
    [0.2, -0.9],
  ],
  cover: [
    [0, 0],
    [-1.0, 0.7],
  ],
  rear: [
    [0, 0],
    [1.1, 0.6],
  ],
  high: [
    [0, 0],
    [1.0, 0.5],
  ],
};

function CombatStage(): JSX.Element {
  const combat = useGame((s) => s.combat);
  if (!combat) return <></>;

  const active = currentActor(combat).id;
  const byZone = new Map<string, string[]>();
  for (const id of combat.order) {
    const actor = combat.actors[id];
    const list = byZone.get(actor.zone) ?? [];
    list.push(id);
    byZone.set(actor.zone, list);
  }

  return (
    <group>
      {Object.values(ZONES).map((zone) => (
        <group key={zone.id} position={zone.position}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <ringGeometry args={[1.55, 1.68, 28]} />
            <meshBasicMaterial color="#6a6f7d" transparent opacity={0.22} />
          </mesh>
        </group>
      ))}

      {combat.order.map((id) => {
        const actor = combat.actors[id];
        const zone = ZONES[actor.zone];
        const slots = ZONE_SLOTS[actor.zone] ?? [[0, 0]];
        const index = (byZone.get(actor.zone) ?? []).indexOf(id);
        const [ox, oz] = slots[index % slots.length];
        return (
          <CombatActor
            key={id}
            id={id}
            kind={actor.kind}
            position={[zone.position[0] + ox, zone.position[1], zone.position[2] + oz]}
            downed={actor.downed}
            dead={actor.dead}
            active={active === id}
            side={actor.side}
          />
        );
      })}
    </group>
  );
}

function CombatActor({
  id,
  kind,
  position,
  downed,
  dead,
  active,
  side,
}: {
  id: string;
  kind: string;
  position: [number, number, number];
  downed: boolean;
  dead: boolean;
  active: boolean;
  side: string;
}): JSX.Element {
  const group = useRef<THREE.Group>(null);
  const events = useGame((s) => s.combat?.events ?? []);
  const chill = useGame((s) => s.run.medallionChill);
  const hurt = useRef(0);
  const acting = useRef(0);

  useEffect(() => {
    for (const event of events) {
      if ('targetId' in event && event.targetId === id && (event.kind === 'damage' || event.kind === 'attack')) {
        hurt.current = 1;
      }
      if ('actorId' in event && event.actorId === id && (event.kind === 'attack' || event.kind === 'spell')) {
        acting.current = 1;
      }
    }
  }, [events, id]);

  useFrame((_, delta) => {
    hurt.current = Math.max(0, hurt.current - delta * 1.6);
    acting.current = Math.max(0, acting.current - delta * 1.6);
    if (group.current) {
      // Face the enemy line.
      // Enemies face the road; allies face them. The camera watches from the
      // shrine side, so both lines read in profile rather than as backs.
      group.current.rotation.y = side === 'enemy' ? 0.35 : Math.PI - 0.35;
      group.current.position.set(...position);
      group.current.position.y += active ? Math.sin(performance.now() * 0.004) * 0.02 : 0;
    }
  });

  const action: FigureAction = dead || downed ? 'down' : hurt.current > 0.4 ? 'hurt' : acting.current > 0.4 ? 'cast' : 'idle';

  return (
    <group ref={group}>
      {active && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <ringGeometry args={[0.42, 0.52, 20]} />
          <meshBasicMaterial color={side === 'enemy' ? '#8d2f42' : '#9fd4e6'} transparent opacity={0.6} />
        </mesh>
      )}
      {kind === 'corvin' && <Corvin action={action} chill={chill} />}
      {kind === 'companion' && id === 'nell' && <Nell action={action} />}
      {kind === 'companion' && id === 'ansbeth' && <Ansbeth action={action} />}
      {kind === 'wolf' && <MistWolf hurt={hurt.current} dead={dead} phase={id === 'wolf-b' ? 2.2 : 0} />}
      {kind === 'shade' && <Shade hurt={hurt.current} dead={dead} />}
    </group>
  );
}

/* ------------------------------------------------------------------ world */

function ShrineWorld(): JSX.Element {
  const light = useRef<THREE.PointLight>(null);
  useFrame((state) => {
    if (light.current) {
      light.current.intensity = 0.5 + Math.sin(state.clock.elapsedTime * 0.7) * 0.2;
    }
  });

  return (
    <group>
      <WetGround size={90} color="#1c1a1c" />
      <ShrineRuin position={[3.2, 0, -2.2]} />
      <BoundaryWall length={11} position={[-4.6, 0, -1.4]} rotation={[0, Math.PI / 2, 0]} />
      <BoundaryWall length={7} position={[3.0, 0, 3.4]} broken={false} />
      <FallenCart position={[-3.4, 0, 0.4]} rotation={[0, 0.7, 0]} />
      <DeadCourier position={[-4.6, 0, -1.2]} rotation={[0, 1.4, 0]} />
      <TreeField count={200} radius={40} innerRadius={9} centre={[0, -6]} lean={1.1} seed={88} />
      <Motes color="#a08bd0" area={22} height={5} opacity={0.3} size={0.16} speed={0.14} />
      <pointLight ref={light} position={[3.2, 2.2, -2.6]} color={PALETTE.violet} intensity={0.5} distance={9} decay={2} />
      {/* road, coming in and not going out */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 9]}>
        <planeGeometry args={[3.4, 22]} />
        <meshStandardMaterial color="#2b241d" roughness={0.7} metalness={0.1} />
      </mesh>
    </group>
  );
}
