/**
 * Chapter Five — Beyond the Gate.
 *
 * The cliffhanger. Nothing is answered; one thing is confirmed.
 */

import type { DialogueTree } from '../types';

export const gateArrive: DialogueTree = {
  id: 'gate-arrive',
  start: 'open',
  nodes: {
    open: {
      id: 'open',
      camera: 'wide',
      lines: [
        {
          speaker: 'narrator',
          text: 'Two pillars. No gate between them — there has not been a gate between them for a very long time — and the hinge-stones are worn on the inside, as if whatever used it opened it from the far side.',
          auto: true,
        },
        {
          speaker: 'narrator',
          text: 'Lightning, once, a long way off. In it, for less than a heartbeat, something on a ridge that has towers.',
          auto: true,
          sfx: 'thunder',
        },
        { speaker: 'nell', text: 'That was not there in the flash before.' },
        { speaker: 'ansbeth', text: 'There was no flash before.' },
      ],
      onEnter: [{ kind: 'music', cue: 'reveal' }, { kind: 'medallionChill', to: 1 }],
      choices: [
        {
          id: 'medallion',
          text: '(Open the medallion. You already know. Open it anyway.)',
          tone: 'silent',
          effects: [{ kind: 'choice', label: 'Opened Die Schwelle at the threshold' }],
          next: 'handprint',
        },
        {
          id: 'ask',
          text: '"Does anyone else feel invited?"',
          tone: 'dry',
          effects: [{ kind: 'disposition', companion: 'nell', delta: 1 }],
          next: 'handprint',
        },
      ],
    },

    handprint: {
      id: 'handprint',
      camera: 'medallion',
      lines: [
        {
          speaker: 'narrator',
          text: 'The glass is not fogged any more. It is frozen — a hard white bloom right through the milky centre, cracking outward with a sound like ice on a bucket.',
          auto: true,
          sfx: 'medallion-freeze',
        },
        {
          speaker: 'narrator',
          text: 'And pressed into it, from the inside, spread flat against the glass as if against a window, there is a hand.',
          auto: true,
          camera: 'medallion',
        },
        {
          speaker: 'narrator',
          text: 'Not a print. A hand. It is holding still because it has been asked to.',
          auto: true,
        },
      ],
      onEnter: [
        { kind: 'medallionStage', to: 3 },
        { kind: 'clue', id: 'medallion-fingerprint' },
      ],
      next: 'voice',
    },

    voice: {
      id: 'voice',
      camera: 'closeup',
      lines: [
        {
          speaker: 'narrator',
          text: 'The forest beyond the pillars does not move. Not one branch, not one leaf, not for the wind and not for the thunder.',
          auto: true,
        },
        {
          speaker: 'voice',
          text: '"Corvin Vaelthorne."',
          whisper: true,
          camera: 'whisper',
          sfx: 'whisper',
        },
        {
          speaker: 'voice',
          text: '"You have kept us waiting."',
          whisper: true,
          camera: 'whisper',
        },
      ],
      onEnter: [{ kind: 'clue', id: 'voice-knows-name' }, { kind: 'sfx', id: 'medallion-freeze' }],
      choices: [
        {
          id: 'defiant',
          text: '"Ancestry is not destiny. Whatever you are, you are not my inheritance."',
          tone: 'sincere',
          effects: [{ kind: 'choice', label: 'Answered the Voice with his own ideal' }],
          next: 'final',
        },
        {
          id: 'charm',
          text: '"Then you have waited badly. I have been extremely easy to find, and I sing."',
          tone: 'charming',
          effects: [{ kind: 'choice', label: 'Answered the Voice with a joke' }],
          next: 'final',
        },
        {
          id: 'silent',
          text: '(Say nothing. It knows your name. Do not give it your voice as well.)',
          tone: 'silent',
          effects: [{ kind: 'choice', label: 'Refused to answer the Voice' }],
          next: 'final',
        },
      ],
    },

    final: {
      id: 'final',
      camera: 'wide',
      lines: [
        {
          speaker: 'narrator',
          text: 'Nothing answers. The stillness beyond the pillars goes on being still, which is worse than any answer.',
          auto: true,
        },
        {
          speaker: 'narrator',
          text: 'Corvin turns to say something reassuring to three people who very much need it.',
          auto: true,
        },
        {
          speaker: 'narrator',
          text: 'Behind them, where four days of road should be, there is forest. Unbroken. Old. Wet.',
          auto: true,
        },
        {
          speaker: 'narrator',
          text: 'There is no road at all.',
          auto: true,
        },
      ],
      onEnter: [{ kind: 'ending' }],
      end: true,
    },
  },
};
