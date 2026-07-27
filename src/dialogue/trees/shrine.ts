/**
 * Chapter Three — The Broken Shrine, and Chapter Four's bookends.
 *
 * An original ruin: a roadside toll-shrine to a saint nobody in the party can
 * name, three worn steps, a boundary wall, a fallen cart and a dead courier.
 */

import type { DialogueTree } from '../types';

export const shrineArrive: DialogueTree = {
  id: 'shrine-arrive',
  start: 'open',
  nodes: {
    open: {
      id: 'open',
      camera: 'wide',
      lines: [
        {
          speaker: 'narrator',
          text: 'A toll-shrine, or what a toll-shrine becomes after thirty years of nobody paying. Three steps, a headless saint, a boundary wall gone down at one corner, and a cart on its side with one wheel still turning.',
          auto: true,
        },
        {
          speaker: 'narrator',
          text: 'One wheel. Still turning. In no wind at all.',
          auto: true,
        },
        { speaker: 'nell', text: 'This was not here.' },
        { speaker: 'emrik', text: 'Everything is somewhere, girl.' },
        { speaker: 'nell', text: 'Yes. And this was not *here*.' },
      ],
      onEnter: [
        { kind: 'medallionChill', to: 0.62 },
        { kind: 'music', cue: 'tension' },
        { kind: 'flag', key: 'at-shrine', value: true },
      ],
      choices: [
        {
          id: 'calm',
          text: '"Nell. Look at me. Not at the wheel. At me. Good. Now tell me what else is wrong."',
          tone: 'sincere',
          hint: 'She is frightened, and she is the one who sees things.',
          effects: [
            { kind: 'disposition', companion: 'nell', delta: 2 },
            { kind: 'choice', label: 'Steadied Nell instead of the situation' },
          ],
          next: 'nell-sees',
        },
        {
          id: 'joke',
          text: '"A shrine, a corpse and a merchant walk into a fog. Stop me if you have heard it."',
          tone: 'dry',
          effects: [{ kind: 'disposition', companion: 'nell', delta: -1 }, { kind: 'disposition', companion: 'ansbeth', delta: 1 }],
          next: 'look',
        },
        {
          id: 'quiet',
          text: '(Say nothing. Walk to the wheel. Stop it with one hand.)',
          tone: 'silent',
          effects: [{ kind: 'sfx', id: 'medallion-pulse' }, { kind: 'medallionChill', delta: 0.06 }],
          next: 'wheel',
        },
      ],
    },

    'nell-sees': {
      id: 'nell-sees',
      lines: [
        {
          speaker: 'nell',
          text: 'There are tracks. Ours. Going in. Three sets, going in, and they are *older* than us — the edges have gone soft, that takes an hour at least.',
        },
        { speaker: 'nell', text: 'We have been here for an hour and we arrived four minutes ago.' },
      ],
      onEnter: [{ kind: 'clue', id: 'fog-directs' }],
      next: 'look',
    },

    wheel: {
      id: 'wheel',
      lines: [
        {
          speaker: 'narrator',
          text: 'The wheel stops under his palm. It does not resist. It simply stops, the way a conversation stops when you enter it.',
          auto: true,
        },
        {
          speaker: 'narrator',
          text: 'When he takes his hand away it does not start again. Nobody thanks him. Everybody notices.',
          auto: true,
        },
      ],
      next: 'look',
    },

    look: {
      id: 'look',
      lines: [
        {
          speaker: 'ansbeth',
          text: 'There is a body against the wall. Do not all look at once — Corvin, you are already looking. Of course you are.',
        },
      ],
      end: true,
    },
  },
};

export const shrineBody: DialogueTree = {
  id: 'shrine-body',
  start: 'open',
  nodes: {
    open: {
      id: 'open',
      camera: 'closeup',
      lines: [
        {
          speaker: 'narrator',
          text: 'A courier, sat with his back to the boundary wall, hands in his lap, chin down. He has not been robbed. He has been *arranged*.',
          auto: true,
        },
        {
          speaker: 'narrator',
          text: 'Six paces out, the medallion stops being cold and starts being painful — a flat, spreading ache under the sternum, like swallowing winter.',
          auto: true,
          sfx: 'medallion-freeze',
          camera: 'medallion',
        },
      ],
      onEnter: [
        { kind: 'medallionChill', to: 0.85 },
        { kind: 'medallionStage', to: 2 },
      ],
      choices: [
        {
          id: 'search',
          text: '(Search him. Apologise while you do it. He will not mind and you will feel better.)',
          tone: 'plain',
          check: {
            skill: 'perception',
            dc: 11,
            label: 'Search the courier',
            tags: ['chthonic'],
            success: 'search-win',
            failure: 'search-fail',
          },
        },
        {
          id: 'sing',
          text: '(Sing him the five notes. Quietly. It is what you have.)',
          tone: 'sincere',
          hint: 'Not a spell. Just a courtesy.',
          effects: [
            { kind: 'sfx', id: 'lute-strum' },
            { kind: 'disposition', companion: 'ansbeth', delta: 2 },
            { kind: 'disposition', companion: 'nell', delta: 1 },
            { kind: 'flag', key: 'sang-for-courier', value: true },
            { kind: 'choice', label: 'Sang five notes for a man he never met' },
          ],
          next: 'sing',
        },
        {
          id: 'back',
          text: '(Step back. Whatever arranged him may still be counting.)',
          tone: 'silent',
          next: 'back',
        },
      ],
    },

    'search-win': {
      id: 'search-win',
      camera: 'closeup',
      lines: [
        {
          speaker: 'narrator',
          text: 'No wounds. None. His coat is whole, his boots are laced, and his hands are folded over a route-slip stamped with a merchant\'s seal.',
          auto: true,
        },
        {
          speaker: 'narrator',
          text: 'Corvin has seen that seal this week. It was on a purse, under a table, in a warm room, being counted by a man who said he dealt in mirrors.',
          auto: true,
        },
        { speaker: 'corvin', text: '"Emrik. Come and look at your own handwriting."' },
        { speaker: 'emrik', text: '…I have never seen this man.' },
        { speaker: 'corvin', text: '"No. But he has been carrying you for four days."' },
      ],
      onEnter: [
        { kind: 'clue', id: 'courier-seal' },
        { kind: 'flag', key: 'emrik-exposed', value: true },
        { kind: 'choice', label: "Found Emrik's seal on the dead courier" },
      ],
      end: true,
    },

    'search-fail': {
      id: 'search-fail',
      camera: 'closeup',
      lines: [
        {
          speaker: 'narrator',
          text: 'His fingers will not do it. Not squeamishness — cold. The medallion has taken the feeling out of his hand entirely, and the courier\'s coat might as well be a wall.',
          auto: true,
        },
        {
          speaker: 'narrator',
          text: 'What he does find, because it is at eye level and because it is meant to be found: the courier\'s eyes are open, and they are pointed at the treeline, and so were his hands before someone folded them.',
          auto: true,
        },
        { speaker: 'corvin', text: '"He was watching something arrive."' },
      ],
      onEnter: [
        { kind: 'clue', id: 'fog-directs' },
        { kind: 'medallionChill', to: 0.9 },
        { kind: 'choice', label: 'Too cold to search him — but saw what he was watching' },
      ],
      end: true,
    },

    sing: {
      id: 'sing',
      camera: 'closeup',
      lines: [
        {
          speaker: 'narrator',
          text: 'Five notes, no words, barely above breath. Ansbeth takes her hat off. Nell does not look up. Emrik looks at the road.',
          auto: true,
        },
        {
          speaker: 'narrator',
          text: 'On the fifth note the fog at the treeline stops moving entirely — the way an audience stops moving — and Corvin understands, with total clarity, that he has just been *heard*.',
          auto: true,
          sfx: 'whisper',
          soundSubtitle: '(the fog stops moving, all at once)',
        },
      ],
      onEnter: [
        { kind: 'medallionChill', to: 0.9 },
        { kind: 'medallionStage', to: 2 },
      ],
      end: true,
    },

    back: {
      id: 'back',
      lines: [
        {
          speaker: 'narrator',
          text: 'He steps back. The ache in his chest eases by exactly the width of that step, which tells him something he would rather not have measured.',
          auto: true,
        },
      ],
      end: true,
    },
  },
};

export const shrineCarving: DialogueTree = {
  id: 'shrine-carving',
  start: 'open',
  nodes: {
    open: {
      id: 'open',
      camera: 'closeup',
      lines: [
        {
          speaker: 'narrator',
          text: 'Someone has cut into the shrine\'s base, deep and fast, with a blade not meant for stone. The marks are angular. They are not local.',
          auto: true,
        },
      ],
      choices: [
        {
          id: 'read',
          text: '(Draconic. Read it.)',
          tone: 'arcane',
          requires: { kind: 'language', id: 'Draconic' },
          lockedReason: 'You do not read this script',
          effects: [{ kind: 'clue', id: 'draconic-warning' }],
          next: 'read',
        },
        {
          id: 'ask',
          text: '(Ask Ansbeth what she makes of it.)',
          tone: 'plain',
          next: 'ask',
        },
      ],
    },

    read: {
      id: 'read',
      camera: 'closeup',
      lines: [
        {
          speaker: 'narrator',
          text: 'Two words, and then a third that has been started and abandoned.',
          auto: true,
        },
        { speaker: 'corvin', text: '"Kothar vur — *the road is a mouth.*"' },
        {
          speaker: 'narrator',
          text: 'The third word begins with the sign for *do not*. Whoever was carving it did not get to finish saying what should not be done.',
          auto: true,
        },
        { speaker: 'nell', text: 'What does it say?' },
        { speaker: 'corvin', text: '"…That we should keep to the middle of it."' },
      ],
      onEnter: [
        { kind: 'clue', id: 'draconic-warning' },
        { kind: 'flag', key: 'read-warning', value: true },
        { kind: 'choice', label: 'Read the Draconic warning — and softened it for Nell' },
      ],
      end: true,
    },

    ask: {
      id: 'ask',
      lines: [
        { speaker: 'ansbeth', text: 'Scratches. Made in a hurry by someone who ran out of hurry.' },
        {
          speaker: 'narrator',
          text: 'She is wrong, and Corvin does not correct her, because the alternative is explaining how a travelling singer learned to read Draconic and from whom.',
          auto: true,
        },
      ],
      end: true,
    },
  },
};

export const shrineBox: DialogueTree = {
  id: 'shrine-box',
  start: 'open',
  nodes: {
    open: {
      id: 'open',
      camera: 'closeup',
      lines: [
        {
          speaker: 'narrator',
          text: 'Under the altar stone, in a hollow that was cut for offerings and has been used for something else: a sealed box, wax intact, no dust on the lid.',
          auto: true,
        },
      ],
      choices: [
        {
          id: 'pick',
          text: "(Thieves' tools. There is never a good time, so this is as good as it gets.)",
          tone: 'deceptive',
          requires: { kind: 'tool', id: 'thieves' },
          check: {
            skill: 'sleightOfHand',
            dc: 14,
            label: 'Open the sealed box',
            success: 'unsealed',
            failure: 'fail',
          },
        },
        {
          id: 'leave',
          text: '(Leave it sealed. Not everything that opens should.)',
          tone: 'silent',
          effects: [{ kind: 'choice', label: 'Left the sealed box under the altar' }],
          next: 'leave',
        },
      ],
    },

    unsealed: {
      id: 'unsealed',
      camera: 'closeup',
      lines: [
        { speaker: 'narrator', text: 'The seal gives. The lid gives. The smell is cold stone and old paper.', auto: true, sfx: 'chest-open' },
        {
          speaker: 'narrator',
          text: 'Inside: a bundle of route-slips, forty years of them, every one for the eastern road, every one signed by a different courier in a different hand — and every signature ends with the same two Draconic characters.',
          auto: true,
        },
        { speaker: 'corvin', text: '"They all wrote *and to you*. Forty years of couriers, answering the same greeting."' },
        {
          speaker: 'narrator',
          text: 'There is also a small pan flute, cracked along one pipe, wrapped in wool. Corvin puts it in his coat without deciding to.',
          auto: true,
        },
      ],
      onEnter: [
        { kind: 'clue', id: 'shrine-box' },
        { kind: 'flag', key: 'opened-shrine-box', value: true },
        { kind: 'choice', label: 'Opened the sealed box: forty years of the same reply' },
        { kind: 'medallionChill', to: 0.92 },
      ],
      end: true,
    },

    fail: {
      id: 'fail',
      camera: 'closeup',
      lines: [
        {
          speaker: 'narrator',
          text: 'The pick turns half a degree and the wax seal splits on its own, ahead of him, as if the box had decided to be helpful.',
          auto: true,
          sfx: 'medallion-freeze',
        },
        {
          speaker: 'narrator',
          text: 'He does not open it. He puts both hands flat on the lid and holds it shut, and behind him, at the treeline, something that has been extremely patient stops being patient.',
          auto: true,
        },
        { speaker: 'ansbeth', text: 'CORVIN.' },
      ],
      onEnter: [
        { kind: 'clue', id: 'shrine-box' },
        { kind: 'medallionChill', to: 1 },
        { kind: 'flag', key: 'box-opened-itself', value: true },
        { kind: 'choice', label: 'The sealed box opened itself' },
      ],
      end: true,
    },

    leave: {
      id: 'leave',
      lines: [
        {
          speaker: 'narrator',
          text: 'He slides the altar stone back and, for reasons he could not defend in front of a magistrate, apologises to it.',
          auto: true,
        },
      ],
      end: true,
    },
  },
};

export const shrinePresence: DialogueTree = {
  id: 'shrine-presence',
  start: 'open',
  nodes: {
    open: {
      id: 'open',
      camera: 'wide',
      lines: [
        {
          speaker: 'narrator',
          text: 'It has been at the treeline for some time. Corvin has known this for some time. The difference between those two facts is about to become everyone\'s problem.',
          auto: true,
        },
      ],
      onEnter: [{ kind: 'medallionChill', to: 1 }, { kind: 'medallionStage', to: 2 }],
      choices: [
        {
          id: 'perform',
          text: '"You have been very patient. Come out and be an audience properly."',
          tone: 'intimidating',
          hint: 'Draw it out on your terms, not its own.',
          check: {
            skill: 'performance',
            dc: 13,
            label: 'Call it out',
            tags: ['performance-aided'],
            success: 'drawn-good',
            failure: 'drawn-bad',
          },
        },
        {
          id: 'deceive',
          text: '"We are leaving. There is nothing here." (Say it to the trees, not to your friends.)',
          tone: 'deceptive',
          check: {
            skill: 'deception',
            dc: 14,
            label: 'Lie to the fog',
            success: 'lie-good',
            failure: 'drawn-bad',
          },
        },
        {
          id: 'run',
          text: '"Everyone walk. Do not run, do not look, walk."',
          tone: 'plain',
          effects: [{ kind: 'choice', label: 'Tried to walk away from the treeline' }],
          next: 'drawn-bad',
        },
      ],
    },

    'drawn-good': {
      id: 'drawn-good',
      camera: 'reveal',
      lines: [
        {
          speaker: 'narrator',
          text: 'He plays four bars at the trees and takes a bow he has taken in eleven towns, and the fog *applauds* — a dry rattle of branches, out of time, from all directions.',
          auto: true,
          sfx: 'whisper',
        },
        {
          speaker: 'narrator',
          text: 'Two wolves come out of it at a walk, unhurried, on his terms. Behind them, something grey that was once a person kneels down on the shrine steps and looks at his chest, where the medallion is.',
          auto: true,
        },
        { speaker: 'corvin', text: '"Ansbeth. Front. Nell, the cart. I have their attention and I would like to keep it."' },
      ],
      onEnter: [
        { kind: 'flag', key: 'combat-prepared', value: true },
        { kind: 'choice', label: 'Drew the ambush out on his own terms' },
        { kind: 'startCombat' },
      ],
      end: true,
    },

    'lie-good': {
      id: 'lie-good',
      camera: 'reveal',
      lines: [
        {
          speaker: 'narrator',
          text: 'He says it to the trees in the voice he uses for magistrates, and for four full seconds the fog believes him.',
          auto: true,
        },
        {
          speaker: 'narrator',
          text: 'Four seconds is enough to get Ansbeth turned around and Nell behind the cart. Then something on the shrine steps says his name in his mother\'s voice, and the wolves come.',
          auto: true,
          sfx: 'wolf-close',
        },
      ],
      onEnter: [
        { kind: 'flag', key: 'combat-prepared', value: true },
        { kind: 'clue', id: 'voice-knows-name' },
        { kind: 'choice', label: 'Lied to the fog, and bought four seconds' },
        { kind: 'startCombat' },
      ],
      end: true,
    },

    'drawn-bad': {
      id: 'drawn-bad',
      camera: 'reveal',
      lines: [
        {
          speaker: 'narrator',
          text: 'They get eleven paces. The fog closes behind them like a hand closing, and the wolves are already inside it, and they were never at the treeline at all.',
          auto: true,
          sfx: 'wolf-close',
        },
        { speaker: 'ansbeth', text: 'BEHIND — Corvin, BEHIND—' },
      ],
      onEnter: [
        { kind: 'choice', label: 'Was caught in the open when it came' },
        { kind: 'damage', amount: 2 },
        { kind: 'startCombat' },
      ],
      end: true,
    },
  },
};

export const encounterAfter: DialogueTree = {
  id: 'encounter-after',
  start: 'open',
  nodes: {
    open: {
      id: 'open',
      camera: 'wide',
      lines: [
        {
          speaker: 'narrator',
          text: 'The last of it comes apart into wet air and does not fall over, because there was never quite enough of it to fall.',
          auto: true,
        },
        {
          speaker: 'narrator',
          text: 'Nobody says anything for a while. Nell is checking her sling. Ansbeth is checking Nell. Emrik is checking the road, and the road is not there.',
          auto: true,
        },
      ],
      onEnter: [{ kind: 'music', cue: 'none' }, { kind: 'medallionChill', to: 1 }],
      choices: [
        {
          id: 'emrik',
          text: '"Emrik. The courier. Now, please, and in whatever order you like."',
          tone: 'intimidating',
          check: {
            skill: 'intimidation',
            dc: 12,
            label: 'Break the merchant',
            success: 'confess',
            failure: 'confess-partial',
          },
        },
        {
          id: 'check',
          text: '"Is everyone standing? Say a number, any number, I want to hear voices."',
          tone: 'sincere',
          effects: [
            { kind: 'disposition', companion: 'nell', delta: 1 },
            { kind: 'disposition', companion: 'ansbeth', delta: 1 },
            { kind: 'choice', label: 'Counted his people before he counted the loot' },
          ],
          next: 'gate',
        },
        {
          id: 'quiet',
          text: '(Say nothing. Sit down on the shrine steps. Let your hands stop shaking on their own time.)',
          tone: 'silent',
          effects: [{ kind: 'choice', label: 'Sat down and said nothing at all' }],
          next: 'gate',
        },
      ],
    },

    confess: {
      id: 'confess',
      lines: [
        {
          speaker: 'emrik',
          text: 'It is not cargo. It never was. It is a *return*. A family in the east lost something four generations back and they have been paying couriers to carry pieces of it home ever since.',
        },
        { speaker: 'emrik', text: 'I did not know what was in the crates. I knew what was in the contract. They pay for the road east and they never, ever pay for the road back.' },
        { speaker: 'corvin', text: '"And you hired an escort of four."' },
        { speaker: 'emrik', text: 'They asked for four. They asked for one of them to be you.' },
      ],
      onEnter: [
        { kind: 'clue', id: 'voice-knows-name' },
        { kind: 'flag', key: 'emrik-confessed', value: true },
        { kind: 'choice', label: 'Broke Emrik: the contract asked for Corvin by name' },
      ],
      next: 'gate',
    },

    'confess-partial': {
      id: 'confess-partial',
      lines: [
        { speaker: 'emrik', text: 'I do not answer to a hedge-singer with a lute on his back.' },
        {
          speaker: 'narrator',
          text: 'It would be a good line if he were not holding his own route-slip, and if the seal on it were not shaking.',
          auto: true,
        },
        { speaker: 'ansbeth', text: 'He asked you a question, merchant.' },
        { speaker: 'emrik', text: '…They asked for four. That is all. Four, and they were particular about it.' },
      ],
      onEnter: [
        { kind: 'flag', key: 'emrik-partial', value: true },
        { kind: 'disposition', companion: 'ansbeth', delta: 1 },
        { kind: 'choice', label: 'Emrik gave up only half of it' },
      ],
      next: 'gate',
    },

    gate: {
      id: 'gate',
      camera: 'reveal',
      lines: [
        {
          speaker: 'narrator',
          text: 'The fog goes out like a held breath.',
          auto: true,
        },
        {
          speaker: 'narrator',
          text: 'Where the eastern road was, there is no road. There are two pillars, older than the shrine, older than the language on the shrine, and beyond them a forest so still that the fog will not enter it.',
          auto: true,
        },
      ],
      onEnter: [
        { kind: 'chapter', to: 'gate' },
        { kind: 'endChapter' },
      ],
      end: true,
    },
  },
};
