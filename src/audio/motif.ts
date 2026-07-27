/**
 * Corvin's motif.
 *
 * Five notes in D Phrygian — a scale that sounds like a door left open.  The
 * same phrase is played four ways across the experience: warm on the lute in
 * the inn, thinned and slowed on the road, sharpened and detuned when he uses
 * Dissonant Whispers, and finally broken over the credits, where one string is
 * a semitone flat and the last note never arrives.
 */

export interface MotifNote {
  frequency: number;
  /** Beats — multiplied by a variant's tempo to get seconds. */
  duration: number;
  velocity: number;
}

const D4 = 293.66;
const Eb4 = 311.13;
const F4 = 349.23;
const G4 = 392.0;
const A4 = 440.0;
const Bb4 = 466.16;
const C5 = 523.25;
const D5 = 587.33;

/** The phrase itself. Everything else is a treatment of these notes. */
export const CORVIN_MOTIF: MotifNote[] = [
  { frequency: D4, duration: 0.75, velocity: 0.5 },
  { frequency: A4, duration: 0.5, velocity: 0.42 },
  { frequency: F4, duration: 0.5, velocity: 0.38 },
  { frequency: Eb4, duration: 1.0, velocity: 0.46 },
  { frequency: D4, duration: 1.25, velocity: 0.4 },
  { frequency: Bb4, duration: 0.5, velocity: 0.3 },
  { frequency: A4, duration: 0.75, velocity: 0.34 },
  { frequency: G4, duration: 1.5, velocity: 0.3 },
];

const ANSWER: MotifNote[] = [
  { frequency: D5, duration: 0.5, velocity: 0.3 },
  { frequency: C5, duration: 0.5, velocity: 0.28 },
  { frequency: Bb4, duration: 0.75, velocity: 0.3 },
  { frequency: A4, duration: 1.5, velocity: 0.26 },
];

export interface MotifVariant {
  notes: MotifNote[];
  /** Seconds per beat. */
  tempo: number;
  transpose: number;
  gain: number;
  damping: number;
  drone: boolean;
  /** Random detune in cents — the sound of something not being right. */
  detune: number;
}

export const MOTIF_VARIANTS: Record<string, MotifVariant> = {
  title: {
    notes: [...CORVIN_MOTIF, ...ANSWER],
    tempo: 1.35,
    transpose: 0.5,
    gain: 0.55,
    damping: 0.9975,
    drone: true,
    detune: 4,
  },
  'inn-lute': {
    notes: [...CORVIN_MOTIF, ...ANSWER],
    tempo: 0.62,
    transpose: 1,
    gain: 0.75,
    damping: 0.996,
    drone: false,
    detune: 2,
  },
  tension: {
    notes: CORVIN_MOTIF.filter((_, i) => i % 2 === 0),
    tempo: 1.9,
    transpose: 0.5,
    gain: 0.5,
    damping: 0.9982,
    drone: true,
    detune: 12,
  },
  combat: {
    notes: [
      { frequency: D4, duration: 0.35, velocity: 0.5 },
      { frequency: Eb4, duration: 0.35, velocity: 0.44 },
      { frequency: D4, duration: 0.35, velocity: 0.4 },
      { frequency: Bb4, duration: 0.7, velocity: 0.46 },
    ],
    tempo: 0.5,
    transpose: 0.5,
    gain: 0.6,
    damping: 0.993,
    drone: true,
    detune: 18,
  },
  reveal: {
    notes: [
      { frequency: D4, duration: 2.5, velocity: 0.4 },
      { frequency: Eb4, duration: 2.5, velocity: 0.36 },
    ],
    tempo: 1.4,
    transpose: 0.25,
    gain: 0.7,
    damping: 0.9989,
    drone: true,
    detune: 26,
  },
  credits: {
    notes: [
      { frequency: D4, duration: 1.0, velocity: 0.42 },
      { frequency: A4, duration: 0.75, velocity: 0.34 },
      { frequency: F4, duration: 0.75, velocity: 0.3 },
      // The flat string. It is the same note, tuned a semitone wrong.
      { frequency: Eb4 * 0.944, duration: 1.5, velocity: 0.38 },
      { frequency: D4, duration: 2.5, velocity: 0.28 },
    ],
    tempo: 1.0,
    transpose: 1,
    gain: 0.5,
    damping: 0.9955,
    drone: false,
    detune: 9,
  },
};
