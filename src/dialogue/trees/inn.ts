/**
 * Chapter One — The Nameless Inn.
 *
 * Every failed check here fails *forward*: it costs Corvin something, or hands
 * him a different piece of the truth, but it never removes content.
 */

import type { DialogueTree } from '../types';

export const innEmrik: DialogueTree = {
  id: 'inn-emrik',
  start: 'open',
  nodes: {
    open: {
      id: 'open',
      camera: 'two-shot',
      lines: [
        {
          speaker: 'narrator',
          text: 'The merchant has chosen the table furthest from the door and nearest the fire. Corvin notes both facts and sits where he can see the first.',
          auto: true,
        },
        {
          speaker: 'emrik',
          text: 'Vaelthorne. You came. Sit — no, not there, there is a draught. Wine?',
        },
      ],
      choices: [
        {
          id: 'wine-drink',
          text: '"I never refuse a man\'s wine. It tells me what he thinks I\'m worth."',
          tone: 'charming',
          effects: [{ kind: 'flag', key: 'wine', value: 'drank' }, { kind: 'choice', label: 'Drank Emrik\'s wine' }],
          next: 'terms',
        },
        {
          id: 'wine-pretend',
          text: '(Raise the cup. Wet your lip. Set it down full.)',
          tone: 'deceptive',
          hint: 'Old habit. Older reasons.',
          effects: [
            { kind: 'flag', key: 'wine', value: 'pretended' },
            { kind: 'choice', label: 'Only pretended to drink' },
            { kind: 'clue', id: 'emrik-lying' },
          ],
          next: 'terms',
        },
        {
          id: 'wine-refuse',
          text: '"Not tonight. I want to remember this conversation exactly."',
          tone: 'dry',
          effects: [{ kind: 'flag', key: 'wine', value: 'refused' }, { kind: 'choice', label: 'Refused the wine' }],
          next: 'terms',
        },
      ],
    },

    terms: {
      id: 'terms',
      lines: [
        {
          speaker: 'emrik',
          text: 'Fifty gold each. Twenty-five now, in your hand, tonight. Four days east along the old road, through the Swalitischer Wald, and out the other side. Simple work for a man with a sword he clearly does not use.',
        },
      ],
      choices: [
        {
          id: 'money',
          text: '"Fifty gold buys my attention. The road will have to earn my loyalty."',
          tone: 'dry',
          effects: [{ kind: 'disposition', companion: 'ansbeth', delta: 1 }],
          next: 'cargo',
        },
        {
          id: 'haggle',
          text: '"Seventy. You are paying for the road, not for me — and the road is worse than you said."',
          tone: 'charming',
          check: {
            skill: 'persuasion',
            dc: 13,
            label: 'Talk him upward',
            success: 'haggle-win',
            failure: 'haggle-fail',
          },
        },
        {
          id: 'cargo-ask',
          text: '"What exactly am I walking beside, Emrik?"',
          tone: 'plain',
          next: 'cargo',
        },
        {
          id: 'silence-1',
          text: '(Say nothing. Let the silence do the work.)',
          tone: 'silent',
          hint: 'He is the kind of man who fills a pause.',
          effects: [{ kind: 'clue', id: 'emrik-lying' }],
          next: 'silence-pays',
        },
      ],
    },

    'haggle-win': {
      id: 'haggle-win',
      lines: [
        {
          speaker: 'emrik',
          text: 'Sixty. And I will pretend I did not enjoy that. Thirty tonight.',
        },
        {
          speaker: 'narrator',
          text: 'He pays too quickly. Men who haggle properly do not have a second purse ready under the table.',
          auto: true,
        },
      ],
      onEnter: [
        { kind: 'flag', key: 'gold', value: 60 },
        { kind: 'clue', id: 'emrik-lying' },
        { kind: 'choice', label: 'Talked Emrik up to sixty gold' },
      ],
      next: 'cargo',
    },

    'haggle-fail': {
      id: 'haggle-fail',
      lines: [
        {
          speaker: 'emrik',
          text: 'Fifty. It is fifty because fifty is what I have, and because there are three other people in this room who can hold a weapon.',
        },
        {
          speaker: 'narrator',
          text: 'There are two. Emrik has counted someone Corvin has not yet found.',
          auto: true,
        },
      ],
      onEnter: [
        { kind: 'flag', key: 'gold', value: 50 },
        { kind: 'clue', id: 'watcher-outside' },
        { kind: 'choice', label: 'Failed to raise the price — and learned to count' },
      ],
      next: 'cargo',
    },

    'silence-pays': {
      id: 'silence-pays',
      lines: [
        { speaker: 'emrik', text: 'It is glassware. Mostly glassware. Some of it is — look, it is packed in straw, that is the important part.' },
        { speaker: 'emrik', text: 'You are not drinking.' },
      ],
      next: 'cargo',
    },

    cargo: {
      id: 'cargo',
      lines: [
        {
          speaker: 'emrik',
          text: 'Glassware, mirrors, two crates of it. Nothing that bleeds, nothing that argues. My clients in the east are particular.',
        },
      ],
      choices: [
        {
          id: 'lie-call',
          text: '"You are lying, Emrik. Fortunately, I am professionally sympathetic to liars."',
          tone: 'deceptive',
          check: {
            skill: 'deception',
            dc: 14,
            label: 'Out-lie a liar',
            success: 'lie-win',
            failure: 'lie-fail',
          },
        },
        {
          id: 'read-hands',
          text: '(Watch his hands, not his mouth.)',
          tone: 'silent',
          check: {
            skill: 'perception',
            dc: 12,
            label: 'Read the table',
            tags: ['chthonic'],
            success: 'hands-win',
            failure: 'hands-fail',
          },
        },
        {
          id: 'accept',
          text: '"Mirrors, then. I have always liked being able to see behind me."',
          tone: 'dry',
          next: 'close',
        },
      ],
    },

    'lie-win': {
      id: 'lie-win',
      lines: [
        {
          speaker: 'corvin',
          text: '"I have run three versions of that sentence myself. Yours needs work — you gave the straw a reason to exist."',
        },
        {
          speaker: 'emrik',
          text: '…It is a delivery. Not a sale. Something a family in the east wants returned to them, and would rather no one asked why. That is all I know. That is all I paid to know.',
        },
      ],
      onEnter: [
        { kind: 'clue', id: 'emrik-lying' },
        { kind: 'flag', key: 'knows-cargo', value: true },
        { kind: 'choice', label: 'Caught Emrik in the lie about the cargo' },
      ],
      next: 'close',
    },

    'lie-fail': {
      id: 'lie-fail',
      lines: [
        {
          speaker: 'emrik',
          text: 'You are very charming and I am very tired. Glassware.',
        },
        {
          speaker: 'narrator',
          text: 'He does not blink. But his rings are turned inward, stones against the palm, the way a man hides a crest he has not earned.',
          auto: true,
        },
      ],
      onEnter: [
        { kind: 'clue', id: 'emrik-lying' },
        { kind: 'choice', label: 'Pushed too hard, and learned something else instead' },
      ],
      next: 'close',
    },

    'hands-win': {
      id: 'hands-win',
      lines: [
        {
          speaker: 'narrator',
          text: 'His rings are turned inward. His left thumb keeps finding a seal in his pocket and leaving it alone. And twice now he has looked at the window rather than the door.',
          auto: true,
        },
        { speaker: 'corvin', text: '"Who is outside, Emrik?"' },
        { speaker: 'emrik', text: 'Nobody. The rain.' },
      ],
      onEnter: [
        { kind: 'clue', id: 'watcher-outside' },
        { kind: 'clue', id: 'emrik-lying' },
        { kind: 'medallionChill', delta: 0.08 },
      ],
      next: 'close',
    },

    'hands-fail': {
      id: 'hands-fail',
      lines: [
        {
          speaker: 'narrator',
          text: 'Nothing. The fire has his face and the smoke has the rest, and for a moment Corvin is only a tired man in a wet coat looking at another one.',
          auto: true,
        },
        {
          speaker: 'narrator',
          text: 'Then the medallion under his shirt goes cold enough to notice. Not a warning. An arrival.',
          auto: true,
          sfx: 'medallion-pulse',
        },
      ],
      onEnter: [
        { kind: 'medallionChill', to: 0.22 },
        { kind: 'clue', id: 'watcher-outside' },
      ],
      next: 'close',
    },

    close: {
      id: 'close',
      lines: [
        {
          speaker: 'emrik',
          text: 'We leave before first light. Talk to the others, if you must. They are the sort who prefer to be talked to.',
        },
      ],
      onEnter: [{ kind: 'flag', key: 'met-emrik', value: true }],
      end: true,
    },
  },
};

export const innNell: DialogueTree = {
  id: 'inn-nell',
  start: 'open',
  nodes: {
    open: {
      id: 'open',
      camera: 'two-shot',
      lines: [
        {
          speaker: 'nell',
          text: 'You are the singer. I could tell from the walk. Nobody else comes into a room like it owes them applause.',
        },
      ],
      onEnter: [{ kind: 'flag', key: 'met-nell', value: true }],
      choices: [
        {
          id: 'halfling',
          text: '"Tal fenneth, dorrin-so." (Greet her in Halfling — properly, the way an aunt would.)',
          tone: 'sincere',
          requires: { kind: 'language', id: 'Halfling' },
          hint: 'Three languages, and this is the one that gets you fed.',
          effects: [
            { kind: 'disposition', companion: 'nell', delta: 2 },
            { kind: 'choice', label: 'Greeted Nell in Halfling' },
          ],
          next: 'warm',
        },
        {
          id: 'dry',
          text: '"It does. It has never once paid up."',
          tone: 'dry',
          effects: [{ kind: 'disposition', companion: 'nell', delta: 1 }],
          next: 'road',
        },
        {
          id: 'observe',
          text: '(Look at her boots. Two different kinds of mud.)',
          tone: 'silent',
          check: {
            skill: 'perception',
            dc: 11,
            label: 'Read the scout',
            success: 'boots-win',
            failure: 'boots-fail',
          },
        },
      ],
    },

    warm: {
      id: 'warm',
      lines: [
        {
          speaker: 'nell',
          text: 'Oh, that is unfair. That is my grandmother\'s greeting and you have used it on me in a public house.',
        },
        { speaker: 'nell', text: 'Fine. Nell Grubbin. I walk in front. You keep whatever is behind us talking.' },
      ],
      onEnter: [{ kind: 'recruit', companion: 'nell' }],
      next: 'road',
    },

    'boots-win': {
      id: 'boots-win',
      lines: [
        {
          speaker: 'narrator',
          text: 'River clay to the ankle, and over it a grey silt that does not belong to any river within four days of here.',
          auto: true,
        },
        { speaker: 'corvin', text: '"You have already been east."' },
        { speaker: 'nell', text: 'I have already come back from east. That should worry you more.' },
      ],
      onEnter: [
        { kind: 'clue', id: 'nell-road' },
        { kind: 'disposition', companion: 'nell', delta: 1 },
      ],
      next: 'road',
    },

    'boots-fail': {
      id: 'boots-fail',
      lines: [
        { speaker: 'nell', text: 'You are staring at my feet. People usually work up to that.' },
        { speaker: 'corvin', text: '"Occupational curiosity. I apologise to the feet."' },
        { speaker: 'nell', text: 'The feet forgive you. They have been east, if you were wondering. That is what you were wondering.' },
      ],
      onEnter: [{ kind: 'clue', id: 'nell-road' }, { kind: 'disposition', companion: 'nell', delta: -1 }],
      next: 'road',
    },

    road: {
      id: 'road',
      lines: [
        {
          speaker: 'nell',
          text: 'The old road changed last winter. Not fell in — changed. Same trees, wrong order. I walked it twice to be sure and the second time took longer.',
        },
      ],
      onEnter: [{ kind: 'clue', id: 'nell-road' }],
      choices: [
        {
          id: 'believe',
          text: '"I believe you. That is not me being kind. I have had the same dream four times this month."',
          tone: 'sincere',
          effects: [
            { kind: 'disposition', companion: 'nell', delta: 2 },
            { kind: 'recruit', companion: 'nell' },
            { kind: 'choice', label: 'Told Nell the truth about the dreams' },
          ],
          next: 'close',
        },
        {
          id: 'joke',
          text: '"Roads do that. So do people. So do I, on a good night."',
          tone: 'charming',
          effects: [{ kind: 'disposition', companion: 'nell', delta: 1 }, { kind: 'recruit', companion: 'nell' }],
          next: 'close',
        },
        {
          id: 'dismiss',
          text: '"Trees are trees, Nell."',
          tone: 'dry',
          effects: [{ kind: 'disposition', companion: 'nell', delta: -1 }, { kind: 'recruit', companion: 'nell' }],
          next: 'close',
        },
      ],
    },

    close: {
      id: 'close',
      lines: [
        { speaker: 'nell', text: 'Before first light, then. Bring the lute. If it goes badly I would like something to blame.' },
      ],
      end: true,
    },
  },
};

export const innAnsbeth: DialogueTree = {
  id: 'inn-ansbeth',
  start: 'open',
  nodes: {
    open: {
      id: 'open',
      camera: 'two-shot',
      lines: [
        {
          speaker: 'narrator',
          text: 'The tall woman has not taken off her coat, has not touched her drink, and has arranged herself so that the door is over her left shoulder. Corvin approves, and is annoyed to approve.',
          auto: true,
        },
        { speaker: 'ansbeth', text: 'You sat where I would have sat.' },
      ],
      onEnter: [{ kind: 'flag', key: 'met-ansbeth', value: true }],
      choices: [
        {
          id: 'pin',
          text: '(The pin at her collar. Scorched sunburst. Say nothing about it — yet.)',
          tone: 'silent',
          check: {
            skill: 'perception',
            dc: 13,
            label: 'Place the pin',
            success: 'pin-win',
            failure: 'pin-fail',
          },
        },
        {
          id: 'flatter',
          text: '"You have the posture of someone who was told, once, to stand like that forever."',
          tone: 'charming',
          check: {
            skill: 'persuasion',
            dc: 12,
            label: 'Get under the armour',
            success: 'open-up',
            failure: 'shut-down',
          },
        },
        {
          id: 'honest',
          text: '"I sat there because I do not like doors I cannot see. I assume we have that in common."',
          tone: 'sincere',
          effects: [{ kind: 'disposition', companion: 'ansbeth', delta: 2 }],
          next: 'open-up',
        },
      ],
    },

    'pin-win': {
      id: 'pin-win',
      lines: [
        {
          speaker: 'narrator',
          text: 'A sunburst, blackened on one side as if it had been in a fire and then, deliberately, never polished. Corvin has seen that shape on a banner, and under it, men who ask tieflings to remove their hoods.',
          auto: true,
        },
        { speaker: 'corvin', text: '"You do not polish it."' },
        { speaker: 'ansbeth', text: 'No.' },
        { speaker: 'ansbeth', text: 'And I do not take it off. Those are different decisions, and I have made both of them on purpose.' },
      ],
      onEnter: [
        { kind: 'clue', id: 'ansbeth-order' },
        { kind: 'disposition', companion: 'ansbeth', delta: 1 },
        { kind: 'choice', label: "Recognised Ansbeth's Pure Flame pin" },
      ],
      next: 'close',
    },

    'pin-fail': {
      id: 'pin-fail',
      lines: [
        { speaker: 'ansbeth', text: 'It is a pin. It was a gift. Ask the second question or stop looking.' },
        { speaker: 'corvin', text: '"I have been told my looking is very loud."' },
        { speaker: 'ansbeth', text: 'It is.' },
      ],
      onEnter: [{ kind: 'clue', id: 'ansbeth-order' }],
      next: 'close',
    },

    'open-up': {
      id: 'open-up',
      lines: [
        {
          speaker: 'ansbeth',
          text: 'Ansbeth Cray. I guard carts. I used to guard other things, and I was told it was the same work, and it was not.',
        },
        { speaker: 'ansbeth', text: 'If the fog comes in, stay behind me and keep talking. Your voice is doing something to this room and I would rather it did it to them.' },
      ],
      onEnter: [
        { kind: 'recruit', companion: 'ansbeth' },
        { kind: 'disposition', companion: 'ansbeth', delta: 1 },
      ],
      next: 'close',
    },

    'shut-down': {
      id: 'shut-down',
      lines: [
        { speaker: 'ansbeth', text: 'That was well built. I have had four years of well-built sentences and I am still here, so.' },
        { speaker: 'narrator', text: 'She turns her cup a quarter-turn. It is the first thing she has moved all evening.', auto: true },
        { speaker: 'ansbeth', text: 'Ansbeth Cray. Stay behind me on the road. That is not a compliment, it is a formation.' },
      ],
      onEnter: [{ kind: 'recruit', companion: 'ansbeth' }],
      next: 'close',
    },

    close: {
      id: 'close',
      lines: [
        { speaker: 'ansbeth', text: 'Before first light. Sleep if you can. I never do, and it has not helped once.' },
      ],
      end: true,
    },
  },
};

export const innTovin: DialogueTree = {
  id: 'inn-tovin',
  start: 'open',
  nodes: {
    open: {
      id: 'open',
      camera: 'two-shot',
      lines: [
        {
          speaker: 'narrator',
          text: 'The innkeeper is polishing a glass that has been clean for some time. He stops whenever the door is watched, and starts again when it is not.',
          auto: true,
        },
        { speaker: 'tovin', text: 'Room, food, or questions? Only two of those are for sale.' },
      ],
      choices: [
        {
          id: 'perform-offer',
          text: '"Neither. I was going to play, and let the room decide what it owes me."',
          tone: 'charming',
          next: 'perform',
        },
        {
          id: 'thaum',
          text: '(Thaumaturgy. Let the fire lean toward him when you speak.)',
          tone: 'intimidating',
          spell: 'thaumaturgy',
          hint: 'Theatre. Cheap, effective, slightly unkind.',
          effects: [{ kind: 'sfx', id: 'spell-thaumaturgy' }, { kind: 'choice', label: 'Frightened the innkeeper with parlour magic' }],
          next: 'thaum-result',
        },
        {
          id: 'ask-east',
          text: '"What comes back down the eastern road these days?"',
          tone: 'plain',
          next: 'east',
        },
      ],
    },

    perform: {
      id: 'perform',
      lines: [
        { speaker: 'tovin', text: 'Play quiet. There is a table that does not like loud.' },
        { speaker: 'narrator', text: 'He does not say which table. He does not look at it either, which is itself a direction.', auto: true },
      ],
      end: true,
    },

    'thaum-result': {
      id: 'thaum-result',
      lines: [
        {
          speaker: 'narrator',
          text: 'The hearth leans. Every flame in the room bends a hand\'s width toward the tiefling, and the shutters over the north window knock once, from outside.',
          auto: true,
          soundSubtitle: '(a shutter opens by itself)',
          sfx: 'shutter',
        },
        { speaker: 'tovin', text: 'Do not. Not in here.' },
        {
          speaker: 'tovin',
          text: 'Three carts went east this season. One came back with a driver who could not say his own name. Now put my fire back.',
        },
      ],
      onEnter: [{ kind: 'clue', id: 'watcher-outside' }, { kind: 'medallionChill', delta: 0.1 }],
      end: true,
    },

    east: {
      id: 'east',
      lines: [
        { speaker: 'tovin', text: 'Nothing comes back down it. That is the answer people want. The true answer is worse: things come back, and they are on time, and they are polite.' },
      ],
      choices: [
        {
          id: 'press',
          text: '"Politeness is the frightening part. Yes. Go on."',
          tone: 'sincere',
          check: {
            skill: 'persuasion',
            dc: 12,
            label: 'Keep him talking',
            tags: ['performance-aided'],
            success: 'east-more',
            failure: 'east-less',
          },
        },
        {
          id: 'leave',
          text: '(Let him keep the rest. He has earned the glass he is polishing.)',
          tone: 'silent',
          effects: [{ kind: 'choice', label: 'Let Tovin keep his silence' }],
          next: 'east-quiet',
        },
      ],
    },

    'east-more': {
      id: 'east-more',
      lines: [
        {
          speaker: 'tovin',
          text: 'There is a box behind my bar I did not put there. Came in a saddlebag with a courier who did not come back for it. Locked, and the lock is not a lock I know.',
        },
        { speaker: 'tovin', text: 'You look like a man with opinions about locks.' },
      ],
      onEnter: [{ kind: 'flag', key: 'tovin-box', value: true }, { kind: 'clue', id: 'draconic-box' }],
      end: true,
    },

    'east-less': {
      id: 'east-less',
      lines: [
        { speaker: 'tovin', text: 'I have said enough for a man who wants to keep an inn.' },
        {
          speaker: 'narrator',
          text: 'He puts the glass down on the bar. Behind him, low on the shelf, something square is covered by a cloth that has been arranged rather than dropped.',
          auto: true,
        },
      ],
      onEnter: [{ kind: 'flag', key: 'tovin-box', value: true }],
      end: true,
    },

    'east-quiet': {
      id: 'east-quiet',
      lines: [
        { speaker: 'tovin', text: '…' },
        {
          speaker: 'tovin',
          text: 'Box behind the bar. Not mine. Take it or do not, but if it is still here in a week I am putting it in the river.',
        },
      ],
      onEnter: [
        { kind: 'flag', key: 'tovin-box', value: true },
        { kind: 'disposition', companion: 'nell', delta: 1 },
      ],
      end: true,
    },
  },
};

export const innLockbox: DialogueTree = {
  id: 'inn-lockbox',
  start: 'open',
  nodes: {
    open: {
      id: 'open',
      camera: 'closeup',
      lines: [
        {
          speaker: 'narrator',
          text: 'A courier\'s strongbox, black iron, no keyhole on the face — the mechanism has been set into the side, behind a plate scratched with fine angular marks.',
          auto: true,
        },
      ],
      choices: [
        {
          id: 'draconic',
          text: '(Read the marks. They are not decoration — they are Draconic.)',
          tone: 'arcane',
          requires: { kind: 'language', id: 'Draconic' },
          hideWhenLocked: false,
          lockedReason: 'You do not read this script',
          effects: [
            { kind: 'clue', id: 'draconic-box' },
            { kind: 'choice', label: 'Read the Draconic on the courier\'s box' },
          ],
          next: 'draconic',
        },
        {
          id: 'pick',
          text: "(Thieves' tools. Slowly. The bar is watching.)",
          tone: 'deceptive',
          requires: { kind: 'tool', id: "thieves" },
          check: {
            skill: 'sleightOfHand',
            dc: 13,
            label: 'Pick the courier\'s lock',
            success: 'picked',
            failure: 'pick-fail',
          },
        },
        {
          id: 'leave',
          text: '(Leave it. Whatever it is, it is somebody\'s.)',
          tone: 'silent',
          next: 'leave',
        },
      ],
    },

    draconic: {
      id: 'draconic',
      camera: 'closeup',
      lines: [
        {
          speaker: 'narrator',
          text: 'The angular marks are a single word, cut by someone in a hurry, in a language most of this valley cannot even recognise as language.',
          auto: true,
        },
        { speaker: 'corvin', text: '"Vur ekess wux." — Not a warning. A greeting. *And to you.*' },
        {
          speaker: 'narrator',
          text: 'Someone wrote a reply on a locked box, in Draconic, for a reader they expected to arrive. Corvin puts his hand flat on the lid and finds the iron colder than the room.',
          auto: true,
          sfx: 'medallion-pulse',
        },
      ],
      onEnter: [
        { kind: 'medallionChill', to: 0.3 },
        { kind: 'flag', key: 'read-box', value: true },
      ],
      choices: [
        {
          id: 'pick-after',
          text: "(Now open it. Thieves' tools, and no more manners.)",
          tone: 'deceptive',
          requires: { kind: 'tool', id: 'thieves' },
          check: {
            skill: 'sleightOfHand',
            dc: 12,
            label: 'Open the box',
            success: 'picked',
            failure: 'pick-fail',
          },
        },
        {
          id: 'stop',
          text: '(Take your hand off the lid.)',
          tone: 'silent',
          next: 'leave',
        },
      ],
    },

    picked: {
      id: 'picked',
      camera: 'closeup',
      lines: [
        {
          speaker: 'narrator',
          text: 'Three tumblers, one after another, and the lid gives with a sound like someone sitting down.',
          auto: true,
          sfx: 'chest-open',
        },
        {
          speaker: 'narrator',
          text: 'Inside: a wax seal broken in half, a courier\'s route-slip for a road that does not appear on any map Corvin has sung his way across — and eight silver, which he takes, because he is not a saint.',
        },
        { speaker: 'corvin', text: '"Emrik. Your seal is in a dead man\'s box and you have not mentioned it once."' },
      ],
      onEnter: [
        { kind: 'clue', id: 'courier-seal' },
        { kind: 'flag', key: 'opened-inn-box', value: true },
        { kind: 'choice', label: "Opened the courier's strongbox" },
        { kind: 'sfx', id: 'lockpick' },
      ],
      end: true,
    },

    'pick-fail': {
      id: 'pick-fail',
      camera: 'closeup',
      lines: [
        {
          speaker: 'narrator',
          text: 'The second tumbler slips, the pick skids, and the plate snaps back hard enough to take skin off his knuckle.',
          auto: true,
          sfx: 'hit',
        },
        {
          speaker: 'narrator',
          text: 'Blood on black iron. The blood does not run — it beads, and sits, and cools, and the frost that has been living in his medallion all evening walks out along the lid to meet it.',
          auto: true,
          sfx: 'medallion-freeze',
        },
        { speaker: 'corvin', text: '"…That is new."' },
      ],
      onEnter: [
        { kind: 'damage', amount: 1 },
        { kind: 'medallionChill', to: 0.42 },
        { kind: 'medallionStage', to: 1 },
        { kind: 'clue', id: 'courier-seal' },
        { kind: 'choice', label: 'Failed the lock, and the medallion answered' },
      ],
      end: true,
    },

    leave: {
      id: 'leave',
      lines: [
        {
          speaker: 'narrator',
          text: 'He puts the cloth back the way it was arranged, which is a courtesy the box does not deserve and Tovin does.',
          auto: true,
        },
      ],
      end: true,
    },
  },
};

export const innPerform: DialogueTree = {
  id: 'inn-perform',
  start: 'open',
  nodes: {
    open: {
      id: 'open',
      camera: 'wide',
      lines: [
        {
          speaker: 'narrator',
          text: 'He does not announce it. He simply begins, quietly, in the corner, and lets the room notice on its own — which is the only way a room ever forgives you for playing.',
          auto: true,
          sfx: 'lute-strum',
        },
      ],
      onEnter: [{ kind: 'flag', key: 'performed', value: true }, { kind: 'music', cue: 'inn-lute' }],
      choices: [
        {
          id: 'crowd',
          text: '(Play for the room. Something old, in five notes, that nobody here will admit they know.)',
          tone: 'sincere',
          check: {
            skill: 'performance',
            dc: 11,
            label: 'Play the room',
            success: 'good',
            failure: 'bad',
          },
        },
        {
          id: 'window',
          text: '(Play for whoever is standing in the rain outside the north window.)',
          tone: 'intimidating',
          hint: 'An audience is an audience.',
          check: {
            skill: 'performance',
            dc: 13,
            label: 'Play to the window',
            success: 'window-win',
            failure: 'window-fail',
          },
        },
      ],
    },

    good: {
      id: 'good',
      lines: [
        {
          speaker: 'narrator',
          text: 'Five notes. Nobody claps — this is not that kind of room — but the conversation drops a step and stays there, and someone at the back stops chewing.',
          auto: true,
        },
        { speaker: 'nell', text: 'That is a funeral tune.' },
        { speaker: 'corvin', text: '"It is a travelling tune. The difference is mostly tempo."' },
      ],
      onEnter: [
        { kind: 'disposition', companion: 'nell', delta: 1 },
        { kind: 'disposition', companion: 'ansbeth', delta: 1 },
        { kind: 'flag', key: 'performed-well', value: true },
        { kind: 'choice', label: 'Played the room, and the room went quiet' },
      ],
      end: true,
    },

    bad: {
      id: 'bad',
      lines: [
        {
          speaker: 'narrator',
          text: 'The third string is a hair flat and every ear in the room finds it before he does. He plays through, because stopping is worse, and finishes to the sound of a chair being turned away.',
          auto: true,
        },
        { speaker: 'tovin', text: 'You are not the worst who has played here.' },
        { speaker: 'corvin', text: '"High praise. Who was?"' },
        { speaker: 'tovin', text: 'He also went east.' },
      ],
      onEnter: [
        { kind: 'flag', key: 'string-flat', value: true },
        { kind: 'choice', label: 'Played badly — and learned about the last one who went east' },
      ],
      end: true,
    },

    'window-win': {
      id: 'window-win',
      camera: 'closeup',
      lines: [
        {
          speaker: 'narrator',
          text: 'He turns the tune outward, at the black glass, and plays it as an invitation.',
          auto: true,
        },
        {
          speaker: 'narrator',
          text: 'For four bars, something outside keeps time. A knuckle, on the shutter, on the beat. On the fifth bar it stops, and the rain sounds like rain again.',
          auto: true,
          sfx: 'whisper',
          soundSubtitle: '(something taps along, and then does not)',
        },
        { speaker: 'corvin', text: '"…I have played for worse audiences. Fewer of them had claws."' },
      ],
      onEnter: [
        { kind: 'clue', id: 'watcher-outside' },
        { kind: 'medallionChill', to: 0.36 },
        { kind: 'medallionStage', to: 1 },
        { kind: 'flag', key: 'played-to-watcher', value: true },
        { kind: 'choice', label: 'Played to the thing in the rain — and it kept time' },
      ],
      end: true,
    },

    'window-fail': {
      id: 'window-fail',
      lines: [
        {
          speaker: 'narrator',
          text: 'The tune goes out into the rain and does not come back, and the only thing that answers is the shutter, once, in the wind.',
          auto: true,
          sfx: 'shutter',
        },
        {
          speaker: 'narrator',
          text: 'Then the medallion cools against his sternum, slowly, the way a hand cools when it is let go of.',
          auto: true,
          sfx: 'medallion-pulse',
        },
      ],
      onEnter: [
        { kind: 'medallionChill', to: 0.3 },
        { kind: 'clue', id: 'watcher-outside' },
      ],
      end: true,
    },
  },
};

export const innWindow: DialogueTree = {
  id: 'inn-window',
  start: 'open',
  nodes: {
    open: {
      id: 'open',
      camera: 'closeup',
      lines: [
        {
          speaker: 'narrator',
          text: 'Rain on old glass, and behind it the road, and standing off the road where the light does not reach — a shape that is the wrong shape for a post.',
          auto: true,
        },
      ],
      choices: [
        {
          id: 'message',
          text: '(Message. Send four words out into the rain and see what comes back.)',
          tone: 'arcane',
          spell: 'message',
          hint: 'A thread of sound, one ear wide.',
          effects: [{ kind: 'sfx', id: 'whisper' }],
          next: 'message',
        },
        {
          id: 'look',
          text: '(Just look. Count to ten. See if it moves first.)',
          tone: 'silent',
          check: {
            skill: 'perception',
            dc: 12,
            label: 'Outwait the watcher',
            tags: ['chthonic'],
            success: 'look-win',
            failure: 'look-fail',
          },
        },
        {
          id: 'away',
          text: '(Step back from the glass. Some audiences you do not acknowledge.)',
          tone: 'dry',
          next: 'away',
        },
      ],
    },

    message: {
      id: 'message',
      camera: 'whisper',
      lines: [
        { speaker: 'corvin', text: '"You are getting wet, friend."', whisper: true },
        {
          speaker: 'narrator',
          text: 'The spell is a thread. It goes out, finds an ear, and something comes back along it — not words at first, just the texture of a voice deciding whether to use them.',
          auto: true,
          sfx: 'whisper',
        },
        {
          speaker: 'voice',
          text: '"…not yet, Vaelthorne. Not in the warm."',
          whisper: true,
          camera: 'whisper',
        },
        {
          speaker: 'narrator',
          text: 'The medallion goes cold enough that he presses his palm over it, in a room full of people, like a man with heartburn.',
          auto: true,
          sfx: 'medallion-freeze',
        },
      ],
      onEnter: [
        { kind: 'medallionChill', to: 0.55 },
        { kind: 'medallionStage', to: 1 },
        { kind: 'clue', id: 'voice-knows-name' },
        { kind: 'clue', id: 'watcher-outside' },
        { kind: 'choice', label: 'Whispered to the thing outside, and it knew his name' },
      ],
      end: true,
    },

    'look-win': {
      id: 'look-win',
      lines: [
        {
          speaker: 'narrator',
          text: 'It does not move for a very long time. Then, without stepping, it is four feet further from the road, and the rain where it stood is falling through nothing at all.',
          auto: true,
        },
      ],
      onEnter: [
        { kind: 'clue', id: 'watcher-outside' },
        { kind: 'medallionChill', to: 0.4 },
        { kind: 'medallionStage', to: 1 },
      ],
      end: true,
    },

    'look-fail': {
      id: 'look-fail',
      lines: [
        {
          speaker: 'narrator',
          text: 'Rain. A post. A coat on a post, probably. He is tired, he has been paid, and there is a fire.',
          auto: true,
        },
        {
          speaker: 'narrator',
          text: 'When he turns away, his own reflection stays facing the glass for exactly as long as it takes him to notice.',
          auto: true,
          sfx: 'medallion-pulse',
        },
      ],
      onEnter: [{ kind: 'medallionChill', to: 0.34 }, { kind: 'clue', id: 'watcher-outside' }],
      end: true,
    },

    away: {
      id: 'away',
      lines: [
        {
          speaker: 'narrator',
          text: 'He steps back into the light and does not look again, which is the most professional thing he does all evening.',
          auto: true,
        },
      ],
      end: true,
    },
  },
};

export const innDepart: DialogueTree = {
  id: 'inn-depart',
  start: 'open',
  nodes: {
    open: {
      id: 'open',
      camera: 'wide',
      lines: [
        {
          speaker: 'emrik',
          text: 'Before first light. That is what I said, and it is not yet first light, so we are early rather than late. Everyone likes early.',
        },
        {
          speaker: 'narrator',
          text: 'The door of the nameless inn opens onto a road with no colour in it yet, and a forest at the end of the road, and four days of east.',
          auto: true,
          sfx: 'door',
        },
      ],
      choices: [
        {
          id: 'go',
          text: '"Then let us go and be early at something."',
          tone: 'dry',
          effects: [
            { kind: 'choice', label: 'Signed on and left before dawn' },
            { kind: 'flag', key: 'left-inn', value: true },
            { kind: 'chapter', to: 'road' },
            { kind: 'endChapter' },
          ],
          next: 'end',
        },
        {
          id: 'last-look',
          text: '(Look back at the inn once. Just to have done it.)',
          tone: 'silent',
          effects: [
            { kind: 'choice', label: 'Looked back at the inn' },
            { kind: 'flag', key: 'looked-back', value: true },
            { kind: 'medallionChill', delta: 0.05 },
            { kind: 'chapter', to: 'road' },
            { kind: 'endChapter' },
          ],
          next: 'end',
        },
      ],
    },
    end: {
      id: 'end',
      lines: [],
      end: true,
    },
  },
};
