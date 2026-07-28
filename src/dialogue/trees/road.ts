/**
 * Chapter Two — The Road and the Mist.
 *
 * The escalation is deliberately slow: birdsong, then distance, then the road
 * behind you.  Corvin's tools (Perception, Message, Thaumaturgy, Draconic, the
 * medallion) each open a different door onto the same fact.
 */

import type { DialogueTree } from '../types';

export const roadOpen: DialogueTree = {
  id: 'road-open',
  start: 'open',
  nodes: {
    open: {
      id: 'open',
      camera: 'wide',
      lines: [
        {
          speaker: 'narrator',
          text: 'By the second hour the birds have stopped. Not flown — stopped, the way a room stops when someone important comes in.',
          auto: true,
        },
        { speaker: 'nell', text: 'Nobody say it.' },
        { speaker: 'ansbeth', text: 'Say what.' },
        { speaker: 'nell', text: 'That. Do not say that either.' },
      ],
      onEnter: [{ kind: 'music', cue: 'tension' }, { kind: 'medallionChill', to: 0.3 }],
      choices: [
        {
          id: 'joke',
          text: '"Birds are a luxury. I have travelled with worse company than none."',
          tone: 'charming',
          effects: [{ kind: 'disposition', companion: 'nell', delta: 1 }],
          next: 'walk',
        },
        {
          id: 'honest',
          text: '"It is not the quiet that bothers me. It is that the quiet has edges."',
          tone: 'sincere',
          effects: [{ kind: 'disposition', companion: 'ansbeth', delta: 1 }, { kind: 'clue', id: 'fog-directs' }],
          next: 'walk',
        },
        {
          id: 'silent',
          text: '(Say nothing. Walk. Listen to the road under four sets of boots and count them twice.)',
          tone: 'silent',
          effects: [{ kind: 'flag', key: 'counted-boots', value: true }],
          next: 'boots',
        },
      ],
    },

    boots: {
      id: 'boots',
      lines: [
        {
          speaker: 'narrator',
          text: 'Four sets of boots. He counts five, twice, and then four again, and decides — as a professional — not to mention it.',
          auto: true,
        },
      ],
      onEnter: [{ kind: 'medallionChill', delta: 0.08 }, { kind: 'clue', id: 'fog-directs' }],
      next: 'walk',
    },

    walk: {
      id: 'walk',
      lines: [
        {
          speaker: 'emrik',
          text: 'It is weather. It has been weather since I was a boy and it will be weather when I am dead. Keep walking.',
        },
      ],
      end: true,
    },
  },
};

export const roadFog: DialogueTree = {
  id: 'road-fog',
  start: 'open',
  nodes: {
    open: {
      id: 'open',
      camera: 'wide',
      lines: [
        {
          speaker: 'narrator',
          text: 'The fog does not roll in. It is simply further along the road than it was, and then it is here, and the trees have leaned a little closer to see.',
          auto: true,
        },
      ],
      onEnter: [{ kind: 'medallionChill', to: 0.45 }],
      choices: [
        {
          id: 'perceive',
          text: '(Read the fog. It is moving against the wind, and it is moving with purpose.)',
          tone: 'silent',
          check: {
            skill: 'perception',
            dc: 13,
            label: 'Read the fog',
            tags: ['chthonic'],
            success: 'read-win',
            failure: 'read-fail',
          },
        },
        {
          id: 'thaum',
          text: '(Thaumaturgy. Throw your voice down the road and hear what shape comes back.)',
          tone: 'arcane',
          spell: 'thaumaturgy',
          effects: [{ kind: 'sfx', id: 'spell-thaumaturgy' }],
          next: 'thaum',
        },
        {
          id: 'message-nell',
          text: '(Message. Nell, quietly, so Emrik does not hear the question.)',
          tone: 'arcane',
          spell: 'message',
          effects: [{ kind: 'sfx', id: 'whisper' }],
          next: 'message',
        },
      ],
    },

    'read-win': {
      id: 'read-win',
      lines: [
        {
          speaker: 'narrator',
          text: 'It is thickest to the left and thinnest ahead. Every time the road forks, the thin part is the fork they take. The fog is not hiding the road. It is choosing it.',
          auto: true,
        },
        { speaker: 'corvin', text: '"We are being herded. Politely, but herded."' },
        { speaker: 'ansbeth', text: 'Toward what?' },
        { speaker: 'corvin', text: '"That is the polite part. It has not told us."' },
      ],
      onEnter: [
        { kind: 'clue', id: 'fog-directs' },
        { kind: 'choice', label: 'Realised the fog was steering them' },
        { kind: 'disposition', companion: 'ansbeth', delta: 1 },
      ],
      end: true,
    },

    'read-fail': {
      id: 'read-fail',
      lines: [
        {
          speaker: 'narrator',
          text: 'It is fog. It is grey, it is wet, and it does nothing that fog has not done since the world was drying out.',
          auto: true,
        },
        {
          speaker: 'narrator',
          text: 'Then he turns to check the road behind them, and the road behind them is a stand of black trees with no gap in it at all.',
          auto: true,
          sfx: 'medallion-freeze',
        },
        { speaker: 'nell', text: 'Corvin.' },
        { speaker: 'nell', text: 'Do not turn around again.' },
      ],
      onEnter: [
        { kind: 'clue', id: 'fog-directs' },
        { kind: 'medallionChill', to: 0.58 },
        { kind: 'medallionStage', to: 1 },
        { kind: 'choice', label: 'Missed the fog — and found the road behind them gone' },
      ],
      end: true,
    },

    thaum: {
      id: 'thaum',
      lines: [
        {
          speaker: 'narrator',
          text: 'He puts the spell into two words and lets them go down the road at three times the size of a man.',
          auto: true,
        },
        { speaker: 'corvin', text: '"WHO IS THERE."' },
        {
          speaker: 'narrator',
          text: 'The echo comes back on time from the left, and on time from the right, and eleven seconds late from directly ahead, in his own voice, saying something slightly different.',
          auto: true,
          sfx: 'whisper',
          soundSubtitle: '(an echo, in his voice, saying something else)',
        },
        { speaker: 'emrik', text: 'Do not do that again.' },
      ],
      onEnter: [
        { kind: 'clue', id: 'fog-directs' },
        { kind: 'medallionChill', to: 0.55 },
        { kind: 'choice', label: 'Shouted into the fog, and the fog answered in his voice' },
      ],
      end: true,
    },

    message: {
      id: 'message',
      camera: 'whisper',
      lines: [
        { speaker: 'corvin', text: '"Nell. Is this the road you walked twice?"', whisper: true },
        { speaker: 'nell', text: '"…No. And that is the wrong answer, because it is also the only road."', whisper: true },
        { speaker: 'nell', text: '"Corvin. There is a shrine ahead. There was never a shrine ahead."', whisper: true },
      ],
      onEnter: [
        { kind: 'clue', id: 'fog-directs' },
        { kind: 'disposition', companion: 'nell', delta: 1 },
        { kind: 'flag', key: 'knows-shrine', value: true },
        { kind: 'choice', label: 'Asked Nell privately, and learned about the shrine' },
      ],
      end: true,
    },
  },
};

export const roadMedallion: DialogueTree = {
  id: 'road-medallion',
  start: 'open',
  nodes: {
    open: {
      id: 'open',
      camera: 'medallion',
      lines: [
        {
          speaker: 'narrator',
          text: 'He stops walking, which the others notice, and opens his shirt, which they pretend not to.',
          auto: true,
        },
        {
          speaker: 'narrator',
          text: 'Die Schwelle. Blackened silver, an oval the size of a thumbprint, a door with three stars over it worn nearly flat by four generations of Vaelthorne hands.',
          auto: true,
        },
        {
          speaker: 'narrator',
          text: 'The glass at its centre has fogged from the inside. And in the fog, slowly, with the unhurried certainty of something pressing rather than something appearing, there is a fingerprint.',
          auto: true,
          sfx: 'medallion-freeze',
          camera: 'medallion',
        },
        { speaker: 'corvin', text: '"That is not mine."' },
      ],
      onEnter: [
        { kind: 'medallionChill', to: 0.68 },
        { kind: 'medallionStage', to: 2 },
        { kind: 'clue', id: 'medallion-fingerprint' },
        { kind: 'music', cue: 'reveal' },
      ],
      choices: [
        {
          id: 'arcana',
          text: '(Hold it. Let it tell you what it is doing — and what it is doing it *for*.)',
          tone: 'arcane',
          check: {
            skill: 'arcana',
            dc: 12,
            label: 'Listen to Die Schwelle',
            tags: ['medallion'],
            success: 'arcana-win',
            failure: 'arcana-fail',
          },
        },
        {
          id: 'close',
          text: '(Close your hand around it. Some questions are worse answered on a road.)',
          tone: 'silent',
          effects: [
            { kind: 'choice', label: 'Closed his hand on the medallion and kept walking' },
            { kind: 'disposition', companion: 'ansbeth', delta: 1 },
          ],
          next: 'closed',
        },
        {
          id: 'show',
          text: '(Show it to Ansbeth. She has seen things like this. That is the problem.)',
          tone: 'sincere',
          effects: [{ kind: 'choice', label: 'Showed the medallion to Ansbeth' }],
          next: 'shown',
        },
      ],
    },

    'arcana-win': {
      id: 'arcana-win',
      camera: 'medallion',
      lines: [
        {
          speaker: 'narrator',
          text: 'It is not detecting. Detecting is passive, and this is not passive. There is a current in it, and the current runs *outward* — from the glass, down the road, into the fog.',
          auto: true,
        },
        { speaker: 'corvin', text: '"You are not warning me."' },
        { speaker: 'corvin', text: '"You are calling."' },
      ],
      onEnter: [
        { kind: 'flag', key: 'medallion-truth', value: true },
        { kind: 'clue', id: 'medallion-fingerprint' },
        { kind: 'choice', label: 'Understood that the medallion is calling, not warning' },
      ],
      end: true,
    },

    'arcana-fail': {
      id: 'arcana-fail',
      camera: 'medallion',
      lines: [
        {
          speaker: 'narrator',
          text: 'Nothing. Cold silver, cold glass, and a cold that goes up his arm to the elbow and stays there long after he lets go.',
          auto: true,
        },
        {
          speaker: 'narrator',
          text: 'The fingerprint does not fade. It waits, the way a hand waits on the other side of a door for someone to stop pretending to be out.',
          auto: true,
        },
      ],
      onEnter: [{ kind: 'medallionChill', to: 0.72 }],
      end: true,
    },

    closed: {
      id: 'closed',
      lines: [
        {
          speaker: 'ansbeth',
          text: 'Whatever that was, you closed your hand on it instead of showing it to us. I am going to take that as manners rather than the other thing.',
        },
        { speaker: 'corvin', text: '"It is both. It is usually both."' },
      ],
      end: true,
    },

    shown: {
      id: 'shown',
      lines: [
        {
          speaker: 'narrator',
          text: 'Ansbeth looks at it for a long moment. Her thumb goes to the scorched pin at her collar without her permission.',
          auto: true,
        },
        { speaker: 'ansbeth', text: 'We burned a house for a thing that did less than that.' },
        { speaker: 'ansbeth', text: 'I am telling you because you should know what I am, and because I am not going to do it again.' },
      ],
      onEnter: [
        { kind: 'clue', id: 'ansbeth-order' },
        { kind: 'disposition', companion: 'ansbeth', delta: 2 },
        { kind: 'flag', key: 'ansbeth-confession', value: true },
      ],
      end: true,
    },
  },
};

export const roadHowl: DialogueTree = {
  id: 'road-howl',
  start: 'open',
  nodes: {
    open: {
      id: 'open',
      camera: 'wide',
      lines: [
        {
          speaker: 'narrator',
          text: 'A wolf, far off to the north, long and thin and almost musical.',
          auto: true,
          sfx: 'wolf-howl',
        },
        {
          speaker: 'narrator',
          text: 'The answer comes from the south. It is the same call, note for note, and it is perhaps two hundred paces away.',
          auto: true,
          sfx: 'wolf-close',
        },
        { speaker: 'ansbeth', text: 'Formation. Now. Corvin, behind me. Nell — Nell, where is the road?' },
        { speaker: 'nell', text: 'I am looking at where the road is. That is the problem. I am *looking* at it.' },
      ],
      onEnter: [
        { kind: 'medallionChill', to: 0.6 },
        { kind: 'choice', label: 'Heard the second howl answer the first' },
      ],
      next: 'go',
    },
    // The transition lives on a terminal empty node so the howl actually
    // plays before the chapter card covers the screen.
    go: {
      id: 'go',
      lines: [],
      onEnter: [
        { kind: 'chapter', to: 'shrine' },
        { kind: 'endChapter' },
      ],
      end: true,
    },
  },
};
