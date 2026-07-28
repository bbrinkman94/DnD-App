/**
 * Pause, settings, controls, character sheet, journal and credits.
 *
 * All one modal with tabs, all keyboard-reachable, and every control writes
 * straight through to LocalStorage so a setting survives a reload — and a
 * restart of the experience.
 */

import { useEffect } from 'react';
import { ABILITY_LABEL, ABILITY_KEYS, SKILL_LABEL, formatModifier } from '@/data/abilities';
import { CHARACTERS, COMPANION_IDS } from '@/data/characters';
import { CORVIN } from '@/data/corvin';
import { SPELL_LIST } from '@/data/spells';
import { skillModifier } from '@/game/checks';
import { CHAPTER_TITLES, totalSlots } from '@/game/save';
import { DEFAULT_SETTINGS, useSettings, type QualityPreset, type TextSize } from '@/game/settings';
import { useGame, type MenuTab } from '@/game/store';
import { describeChill } from './Hud';

const CLUE_TEXT: Record<string, string> = {
  'emrik-lying': 'Emrik is lying about the cargo. He is not lying about being frightened.',
  'watcher-outside': 'Someone stood off the road in the rain, and did not come in.',
  'draconic-box': "Draconic on a courier's strongbox, written as a reply.",
  'ansbeth-order': "Ansbeth's scorched pin belongs to the Order of the Pure Flame.",
  'nell-road': 'Nell says the eastern road changed last winter. Same trees, wrong order.',
  'fog-directs': 'The fog is not hiding the road. It is choosing it.',
  'courier-seal': "A dead courier is carrying Emrik's seal.",
  'draconic-warning': '"The road is a mouth." The third word was never finished.',
  'medallion-fingerprint': 'A fingerprint formed inside the medallion glass. Not his.',
  'shrine-box': 'Forty years of couriers, all writing back the same two words.',
  'voice-knows-name': 'Something out there uses his full name, and has been waiting to.',
};

export function Menus(): JSX.Element | null {
  const menu = useGame((s) => s.menu);
  const setMenu = useGame((s) => s.setMenu);
  const phase = useGame((s) => s.phase);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.code !== 'Escape') return;
      event.preventDefault();
      const state = useGame.getState();
      if (state.dice || state.chapterSummary || state.finale) return;
      if (state.medallionInspect) {
        state.inspectMedallion(false);
        return;
      }
      setMenu(state.menu ? null : state.phase === 'playing' ? 'pause' : null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setMenu]);

  if (!menu) return null;

  const tabs: [MenuTab, string][] =
    phase === 'playing'
      ? [
          ['pause', 'Paused'],
          ['character', 'Corvin'],
          ['journal', 'Journal'],
          ['settings', 'Settings'],
          ['controls', 'Controls'],
          ['credits', 'Credits'],
        ]
      : [
          ['settings', 'Settings'],
          ['controls', 'Controls'],
          ['credits', 'Credits'],
        ];

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="modal__panel">
        <div className="modal__tabs">
          {tabs.map(([id, label]) => (
            <button key={id} className="tab" data-active={menu === id} onClick={() => setMenu(id)}>
              {label}
            </button>
          ))}
          <button className="tab" onClick={() => setMenu(null)} style={{ marginLeft: 'auto' }}>
            Close (Esc)
          </button>
        </div>

        {menu === 'pause' && <PausePanel />}
        {menu === 'settings' && <SettingsPanel />}
        {menu === 'controls' && <ControlsPanel />}
        {menu === 'character' && <CharacterPanel />}
        {menu === 'journal' && <JournalPanel />}
        {menu === 'credits' && <CreditsPanel />}
      </div>
    </div>
  );
}

function PausePanel(): JSX.Element {
  const run = useGame((s) => s.run);
  const setMenu = useGame((s) => s.setMenu);
  const saveNow = useGame((s) => s.saveNow);
  const restartChapter = useGame((s) => s.restartChapter);
  const returnToTitle = useGame((s) => s.returnToTitle);
  const eraseSave = useGame((s) => s.eraseSave);
  const chapter = CHAPTER_TITLES[run.chapter];

  return (
    <div>
      <h2 className="modal__title">{chapter.title}</h2>
      <p className="eyebrow">{chapter.index}</p>
      <hr className="rule" />
      <p style={{ fontStyle: 'italic', color: 'var(--ink-dim)' }}>{describeChill(run.medallionChill)}</p>
      <div className="modal__actions">
        <button className="btn btn--primary" onClick={() => setMenu(null)} autoFocus>
          Resume
        </button>
        <button className="btn" onClick={saveNow}>
          Save now
        </button>
        <button className="btn" onClick={restartChapter}>
          Restart chapter
        </button>
        <button className="btn" onClick={returnToTitle}>
          Return to title
        </button>
        <button
          className="btn btn--danger"
          onClick={() => {
            if (window.confirm('Erase the save and start over? This cannot be undone.')) eraseSave();
          }}
        >
          Erase save
        </button>
      </div>
    </div>
  );
}

function SettingsPanel(): JSX.Element {
  const settings = useSettings();
  const set = useSettings((s) => s.set);

  return (
    <div>
      <h2 className="modal__title">Settings</h2>
      <hr className="rule" />

      <Slider label="Master volume" value={settings.masterVolume} onChange={(v) => set('masterVolume', v)} />
      <Slider label="Music" value={settings.musicVolume} onChange={(v) => set('musicVolume', v)} />
      <Slider label="Effects" value={settings.sfxVolume} onChange={(v) => set('sfxVolume', v)} />

      <Toggle label="Mute everything" value={settings.muted} onChange={(v) => set('muted', v)} />
      <Toggle label="Subtitles for sounds" value={settings.subtitles} onChange={(v) => set('subtitles', v)} />

      <Segmented
        label="Quality"
        options={[
          ['low', 'Low'],
          ['medium', 'Medium'],
          ['high', 'High'],
        ]}
        value={settings.quality}
        onChange={(v) => set('quality', v as QualityPreset)}
        hint="Low turns off shadows, reflections and postprocessing. The composition does not change."
      />

      <Segmented
        label="Text size"
        options={[
          ['small', 'Small'],
          ['normal', 'Normal'],
          ['large', 'Large'],
        ]}
        value={settings.textSize}
        onChange={(v) => set('textSize', v as TextSize)}
      />

      <Toggle
        label="Reduced motion"
        value={settings.reducedMotion}
        onChange={(v) => set('reducedMotion', v)}
        hint="Stills the camera drift and settles the dice instantly."
      />
      <Toggle label="High contrast" value={settings.highContrast} onChange={(v) => set('highContrast', v)} />
      <Toggle label="Screen shake" value={settings.screenShake} onChange={(v) => set('screenShake', v)} />
      <Toggle
        label="Skip dice animation"
        value={settings.skipDiceAnimation}
        onChange={(v) => set('skipDiceAnimation', v)}
        hint="The die still decides nothing — the number is rolled either way."
      />

      <div className="modal__actions">
        <button className="btn" onClick={() => useSettings.getState().reset()}>
          Restore defaults
        </button>
        <span className="eyebrow" style={{ alignSelf: 'center' }}>
          Saved automatically ({Object.keys(DEFAULT_SETTINGS).length} settings)
        </span>
      </div>
    </div>
  );
}

function ControlsPanel(): JSX.Element {
  const rows: [string, string][] = [
    ['W A S D / Arrow keys', 'Move Corvin'],
    ['E', 'Interact with whatever he is looking at'],
    ['Space / Enter', 'Advance dialogue, confirm a roll'],
    ['1 – 9', 'Pick a dialogue response'],
    ['M', 'Take out the medallion'],
    ['Esc', 'Menu, or step back out of the medallion'],
    ['Mouse', 'Click choices, actions and targets'],
  ];
  return (
    <div>
      <h2 className="modal__title">Controls</h2>
      <hr className="rule" />
      {rows.map(([key, what]) => (
        <div className="settings-row" key={key}>
          <label>{key}</label>
          <span style={{ color: 'var(--ink-dim)' }}>{what}</span>
          <span />
        </div>
      ))}
      <p style={{ color: 'var(--ink-faint)', fontSize: 'var(--fs-sm)', marginTop: '1rem' }}>
        Everything can be done with the keyboard alone, or with the mouse alone.
      </p>
    </div>
  );
}

function CharacterPanel(): JSX.Element {
  const run = useGame((s) => s.run);
  return (
    <div>
      <h2 className="modal__title">{CORVIN.name}</h2>
      <p className="eyebrow">
        Level {CORVIN.level} {CORVIN.species} {CORVIN.characterClass} · {CORVIN.background} · {CORVIN.alignment}
      </p>
      <hr className="rule" />

      <div className="sheet-grid">
        {ABILITY_KEYS.map((key) => (
          <div className="sheet-stat" key={key}>
            <span>{ABILITY_LABEL[key].slice(0, 3)}</span>
            <b>{CORVIN.abilities[key]}</b>
            <span>{formatModifier(Math.floor((CORVIN.abilities[key] - 10) / 2))}</span>
          </div>
        ))}
      </div>

      <div className="sheet-grid">
        <div className="sheet-stat">
          <span>HP</span>
          <b>
            {run.hp}/{CORVIN.maxHp}
          </b>
        </div>
        <div className="sheet-stat">
          <span>AC</span>
          <b>{CORVIN.armorClass}</b>
        </div>
        <div className="sheet-stat">
          <span>Init</span>
          <b>{formatModifier(CORVIN.initiative)}</b>
        </div>
        <div className="sheet-stat">
          <span>Speed</span>
          <b>{CORVIN.speed} m</b>
        </div>
        <div className="sheet-stat">
          <span>Save DC</span>
          <b>{CORVIN.spellSaveDc}</b>
        </div>
        <div className="sheet-stat">
          <span>Slots</span>
          <b>
            {totalSlots() - run.slotsUsed}/{totalSlots()}
          </b>
        </div>
      </div>

      <hr className="rule" />
      <p className="eyebrow">Skills</p>
      <div className="sheet-grid">
        {(Object.keys(CORVIN.skills) as (keyof typeof CORVIN.skills)[]).map((skill) => (
          <div className="sheet-stat" key={skill}>
            <span>{SKILL_LABEL[skill]}</span>
            <b>{formatModifier(skillModifier(skill))}</b>
          </div>
        ))}
      </div>

      <hr className="rule" />
      <p className="eyebrow">Magic</p>
      <ul className="list">
        {SPELL_LIST.map((spell) => (
          <li key={spell.id} data-disabled={!spell.enabled}>
            <strong style={{ color: spell.enabled ? spell.accent : undefined }}>{spell.name}</strong>
            {spell.level > 0 ? ` · level ${spell.level}` : ' · cantrip'} — {spell.blurb}
          </li>
        ))}
      </ul>

      <hr className="rule" />
      <p className="eyebrow">Carried</p>
      <ul className="list">
        {CORVIN.weapons.map((weapon) => (
          <li key={weapon.id}>
            {weapon.name} — {formatModifier(weapon.attackBonus)} to hit, {weapon.damageDice}d{weapon.damageSides} +{' '}
            {weapon.damageBonus} {weapon.damageType}
          </li>
        ))}
        {CORVIN.instruments.map((instrument) => (
          <li key={instrument.id}>
            {instrument.name}
            {instrument.primary ? ' — his, properly his' : ''}
          </li>
        ))}
        {CORVIN.tools.map((tool) => (
          <li key={tool}>{tool}</li>
        ))}
        <li>Languages: {CORVIN.languages.join(', ')}</li>
        <li>Die Schwelle — {describeChill(run.medallionChill)}</li>
      </ul>

      <hr className="rule" />
      <p style={{ fontStyle: 'italic', color: 'var(--ink-dim)' }}>“{CORVIN.ideal}”</p>
    </div>
  );
}

function JournalPanel(): JSX.Element {
  const run = useGame((s) => s.run);
  return (
    <div>
      <h2 className="modal__title">What he has noticed</h2>
      <hr className="rule" />
      {run.clues.length === 0 ? (
        <p style={{ color: 'var(--ink-faint)', fontStyle: 'italic' }}>Nothing worth writing down. Yet.</p>
      ) : (
        <ul className="list">
          {run.clues.map((clue) => (
            <li key={clue}>{CLUE_TEXT[clue] ?? clue}</li>
          ))}
        </ul>
      )}

      <hr className="rule" />
      <p className="eyebrow">Company</p>
      <ul className="list">
        {COMPANION_IDS.map((id) => {
          const state = run.companions[id];
          return (
            <li key={id} data-disabled={!state.met}>
              <strong>{CHARACTERS[id].name}</strong> — {CHARACTERS[id].title}.{' '}
              {state.met ? describeDisposition(state.disposition) : 'Not spoken to.'}
            </li>
          );
        })}
      </ul>

      <hr className="rule" />
      <p className="eyebrow">Choices</p>
      {run.choices.length === 0 ? (
        <p style={{ color: 'var(--ink-faint)', fontStyle: 'italic' }}>Nothing decided yet.</p>
      ) : (
        <ul className="list">
          {run.choices.map((choice, i) => (
            <li key={i}>
              <span className="eyebrow">{CHAPTER_TITLES[choice.chapter].index}</span> — {choice.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function describeDisposition(value: number): string {
  if (value >= 4) return 'Would follow him somewhere stupid.';
  if (value >= 2) return 'Warming to him, against her better judgement.';
  if (value >= 0) return 'Professional. Watchful.';
  if (value >= -2) return 'Has decided something about him, and it was not kind.';
  return 'Would leave him on the road.';
}

function CreditsPanel(): JSX.Element {
  return (
    <div>
      <h2 className="modal__title">Credits &amp; attribution</h2>
      <hr className="rule" />
      <ul className="list">
        <li>Written, designed and built as an original fan-made prologue.</li>
        <li>All 3D geometry is generated at runtime from primitives — no imported models.</li>
        <li>All textures are painted procedurally into a canvas at load — no image files.</li>
        <li>All audio is synthesised with the Web Audio API — no samples, no music files.</li>
        <li>Typography uses the system serif and humanist sans stacks. No web fonts are downloaded.</li>
        <li>
          Characters, dialogue, locations, creatures and encounter numbers are original. No published text, map,
          illustration or stat block is reproduced.
        </li>
        <li>Built with React, TypeScript, Vite, three.js, React Three Fiber, drei, postprocessing and Zustand.</li>
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------- primitives */

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}): JSX.Element {
  return (
    <div className="settings-row">
      <label htmlFor={`s-${label}`}>{label}</label>
      <input
        id={`s-${label}`}
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="eyebrow">{Math.round(value * 100)}%</span>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  hint?: string;
}): JSX.Element {
  return (
    <div className="settings-row">
      <label>{label}</label>
      <span />
      <button className="switch" data-on={value} aria-pressed={value} onClick={() => onChange(!value)}>
        {value ? 'On' : 'Off'}
      </button>
      {hint && <small>{hint}</small>}
    </div>
  );
}

function Segmented({
  label,
  options,
  value,
  onChange,
  hint,
}: {
  label: string;
  options: [string, string][];
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}): JSX.Element {
  return (
    <div className="settings-row">
      <label>{label}</label>
      <div className="segmented">
        {options.map(([id, text]) => (
          <button key={id} data-active={value === id} onClick={() => onChange(id)}>
            {text}
          </button>
        ))}
      </div>
      <span />
      {hint && <small>{hint}</small>}
    </div>
  );
}
