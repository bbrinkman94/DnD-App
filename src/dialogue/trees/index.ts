import type { DialogueTree } from '../types';
import { innAnsbeth, innDepart, innEmrik, innLockbox, innNell, innPerform, innTovin, innWindow } from './inn';
import { roadFog, roadHowl, roadMedallion, roadOpen } from './road';
import {
  encounterAfter,
  shrineArrive,
  shrineBody,
  shrineBox,
  shrineCarving,
  shrinePresence,
} from './shrine';
import { gateArrive } from './gate';

const ALL: DialogueTree[] = [
  innEmrik,
  innNell,
  innAnsbeth,
  innTovin,
  innLockbox,
  innPerform,
  innWindow,
  innDepart,
  roadOpen,
  roadFog,
  roadMedallion,
  roadHowl,
  shrineArrive,
  shrineBody,
  shrineCarving,
  shrineBox,
  shrinePresence,
  encounterAfter,
  gateArrive,
];

export const TREES: Record<string, DialogueTree> = Object.fromEntries(ALL.map((tree) => [tree.id, tree]));

export const TREE_LIST = ALL;
