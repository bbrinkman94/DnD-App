import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { BackupBar, LevelUpModal } from "./levelup.jsx";

const DEFAULT_TWEAKS = { density: "comfortable", diceAnim: true, showVitals: true, campaign: "Meine Kampagne" };

// =========================================================================
// PERSISTENCE
// =========================================================================
const usePersistent = (key, initial) => {
  const [val, setVal] = useState(() => {
    try {
      const raw = localStorage.getItem("dnd." + key);
      return raw ? JSON.parse(raw) : initial;
    } catch (e) { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem("dnd." + key, JSON.stringify(val)); } catch(e) {}
  }, [key, val]);
  return [val, setVal];
};

const calcMod = score => Math.floor((score - 10) / 2);

// Schadensstring parsen: "1W8+4" / "2d6+3" / "1W10"
const parseDmg = (s) => {
  const m = String(s).match(/(\d*)\s*[wWdD]\s*(\d+)\s*([+-]\s*\d+)?/);
  if (!m) return { dn: 1, die: 6, dbonus: 0 };
  return { dn: +(m[1] || 1), die: +m[2], dbonus: m[3] ? +m[3].replace(/\s/g, "") : 0 };
};

// Schadensarten (5e) mit Farbe
const DMG_TYPES = [
  ["Hieb", "#8a6d3b"], ["Stich", "#7a7a7a"], ["Wucht", "#6b5440"],
  ["Feuer", "#c1542a"], ["Kälte", "#5e7a8c"], ["Blitz", "#b08a3a"],
  ["Donner", "#8c6e5e"], ["Säure", "#6b7d4a"], ["Gift", "#5a7a4a"],
  ["Kraft", "#8c5e7a"], ["Strahlend", "#b8923a"], ["Nekrotisch", "#5a4a5a"],
  ["Psychisch", "#9c5e8c"], ["Gleißend", "#c2a23a"],
];
const dmgColor = (t) => (DMG_TYPES.find(d => d[0] === t) || ["", "var(--ink-mute)"])[1];

// Würfelt Angriff bzw. Schaden für eine Waffe; crit verdoppelt die Würfel
const rollAttack = (a) => rollDice(a.name + " — Angriff", 20, a.bonus || 0, 1);
const rollWeaponDmg = (a, crit) => {
  const d = parseDmg(a.dmg);
  const n = crit ? d.dn * 2 : d.dn;
  rollDice(`${a.name} — ${crit ? "Krit-" : ""}Schaden${a.type ? " (" + a.type + ")" : ""}`, d.die, d.dbonus, n);
};

// Wiederverwendbare „Angriffe & Zauberwirken"-Tabelle
const AttacksBlock = ({ c, setC, compact }) => {
  const updAtk = (i, patch) => setC(p => ({ ...p, attacks: (p.attacks||[]).map((a, idx) => idx === i ? { ...a, ...patch } : a) }));
  const addAtk = () => setC(p => ({ ...p, attacks: [...(p.attacks||[]), { name: "Neue Waffe", bonus: 0, dmg: "1W6", type: "Hieb" }] }));
  const rmAtk = (i) => setC(p => ({ ...p, attacks: (p.attacks||[]).filter((_, idx) => idx !== i) }));
  const atks = c.attacks || [];

  const TypeSelect = ({ a, i }) => (
    <select value={a.type || ""} onChange={e => updAtk(i, { type: e.target.value })}
      style={{ padding: "5px 6px", background: "var(--paper)", border: "1px solid var(--rule-2)", borderRadius: 5, fontFamily: "Inter, sans-serif", fontSize: 12, color: dmgColor(a.type), fontWeight: 600 }}>
      <option value="">— Art —</option>
      {DMG_TYPES.map(([t]) => <option key={t} value={t}>{t}</option>)}
    </select>
  );

  // Kompakt: gestapelte Karten (für schmale Spalten)
  if (compact) {
    return (
      <div className="card">
        <div className="card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Angriffe &amp; Waffen
          <button className="btn btn-sm" onClick={addAtk} style={{ textTransform: "none", letterSpacing: 0 }}>+ Waffe</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {atks.length === 0 && <div style={{ fontSize: 13, color: "var(--ink-mute)", fontStyle: "italic" }}>Noch keine Waffen — über „+ Waffe“ hinzufügen.</div>}
          {atks.map((a, i) => (
            <div key={i} style={{ background: "var(--bg)", border: "1px solid var(--rule)", borderLeft: `3px solid ${dmgColor(a.type)}`, borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0, fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 500 }}><Editable value={a.name} onChange={v => updAtk(i, { name: v })}/></div>
                <span onClick={() => rmAtk(i)} title="Entfernen" style={{ color: "var(--ink-mute)", fontSize: 11, cursor: "pointer" }}>✕</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, fontFamily: "Inter, sans-serif" }}>Schaden</span>
                <span style={{ fontFamily: "Fraunces, serif", fontSize: 15 }}><Editable value={a.dmg} onChange={v => updAtk(i, { dmg: v })}/></span>
                <TypeSelect a={a} i={i}/>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                <button className="btn btn-sm" title="Angriffswurf" onClick={() => rollAttack(a)} style={{ flex: 1 }}>Angriff <b style={{ color: "var(--accent-deep)" }}>{a.bonus >= 0 ? "+" : ""}{a.bonus || 0}</b></button>
                <button className="btn btn-sm" title="Schadenswurf" onClick={() => rollWeaponDmg(a, false)}>Schaden</button>
                <button className="btn btn-sm" title="Kritischer Schaden (doppelte Würfel)" onClick={() => rollWeaponDmg(a, true)} style={{ color: "var(--accent-deep)", borderColor: "var(--accent-soft)" }}>Krit</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Volle Tabelle (breite Spalten)
  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        Angriffe &amp; Waffen
        <button className="btn btn-sm" onClick={addAtk} style={{ textTransform: "none", letterSpacing: 0 }}>+ Waffe</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.6fr) 76px minmax(0,1fr) 120px auto", gap: 12, padding: "0 12px 6px", fontSize: 10, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-mute)", fontFamily: "Inter, sans-serif" }}>
        <span>Name</span><span style={{ textAlign: "center" }}>Angriff</span><span>Schaden</span><span>Art</span><span style={{ textAlign: "right" }}>Würfeln</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {atks.length === 0 && <div style={{ fontSize: 13, color: "var(--ink-mute)", fontStyle: "italic", padding: "4px 12px" }}>Noch keine Waffen — über „+ Waffe“ hinzufügen.</div>}
        {atks.map((a, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1.6fr) 76px minmax(0,1fr) 120px auto", gap: 12, alignItems: "center", padding: "9px 12px", background: "var(--bg)", border: "1px solid var(--rule)", borderLeft: `3px solid ${dmgColor(a.type)}`, borderRadius: 6 }}>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 500, minWidth: 0 }}><Editable value={a.name} onChange={v => updAtk(i, { name: v })}/></div>
            <button title="Angriffswurf" onClick={() => rollAttack(a)} style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 500, color: "var(--accent-deep)", textAlign: "center", background: "var(--paper)", border: "1px solid var(--rule-2)", borderRadius: 5, padding: "4px 0", cursor: "pointer" }}>
              <Editable value={(a.bonus >= 0 ? "+" : "") + (a.bonus || 0)} onChange={v => updAtk(i, { bonus: parseInt(String(v).replace(/[^\-\d]/g, ""), 10) || 0 })} style={{ display: "inline-block", minWidth: 22, textAlign: "center", color: "var(--accent-deep)" }}/>
            </button>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 15, minWidth: 0 }}><Editable value={a.dmg} onChange={v => updAtk(i, { dmg: v })}/></div>
            <TypeSelect a={a} i={i}/>
            <div style={{ display: "flex", gap: 4, alignItems: "center", justifyContent: "flex-end" }}>
              <button className="btn btn-sm" title="Schadenswurf" onClick={() => rollWeaponDmg(a, false)}>Sch.</button>
              <button className="btn btn-sm" title="Kritischer Schaden (doppelte Würfel)" onClick={() => rollWeaponDmg(a, true)} style={{ color: "var(--accent-deep)", borderColor: "var(--accent-soft)" }}>Krit</button>
              <span onClick={() => rmAtk(i)} title="Entfernen" style={{ color: "var(--ink-mute)", fontSize: 11, cursor: "pointer" }}>✕</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "var(--ink-mute)", fontStyle: "italic", marginTop: 8, paddingLeft: 12 }}>Angriffsbonus = Übungsbonus + Attributsmodifikator · Schaden nutzt nur den Attributsmodifikator · „Krit“ würfelt doppelte Schadenswürfel.</div>
    </div>
  );
};

// ---- Charakter-Import (offizielles 5e-PDF / JSON / Text) ----
const SKILLS_EN = ["Acrobatics","Animal","Arcana","Athletics","Deception","History","Insight","Intimidation","Investigation","Medicine","Nature","Perception","Performance","Persuasion","Religion","SleightofHand","Stealth","Survival"];
const SKILL_DE = { Acrobatics:"Akrobatik", Animal:"Mit Tieren umgehen", Arcana:"Arkane Kunde", Athletics:"Athletik", Deception:"Täuschen", History:"Geschichte", Insight:"Motiv erkennen", Intimidation:"Einschüchtern", Investigation:"Nachforschen", Medicine:"Heilkunde", Nature:"Naturkunde", Perception:"Wahrnehmung", Performance:"Auftreten", Persuasion:"Überzeugen", Religion:"Religion", SleightofHand:"Fingerfertigkeit", Stealth:"Heimlichkeit", Survival:"Überleben" };
const STAT_ALIAS = { STR:["str","strength","stärke"], DEX:["dex","dexterity","geschicklichkeit"], CON:["con","constitution","konstitution"], INT:["int","intelligence","intelligenz"], WIS:["wis","wisdom","weisheit"], CHA:["cha","charisma"] };

const parseTextSheet = (txt) => {
  const raw = {};
  txt.split(/\n/).forEach(line => {
    const m = line.match(/^\s*([A-Za-zÄÖÜäöüß .'\/]+?)\s*[:=]\s*(.+?)\s*$/);
    if (m) raw[m[1]] = m[2];
  });
  return raw;
};

const buildPatchFromFields = (rawMap) => {
  const norm = {};
  Object.entries(rawMap).forEach(([k, v]) => { norm[k.trim().toLowerCase()] = v; });
  const get = (...keys) => { for (const k of keys) { const v = norm[k.trim().toLowerCase()]; if (v != null && String(v).trim() !== "") return String(v).trim(); } return ""; };
  const num = (s) => parseInt(String(s).replace(/[^\-\d]/g, ""), 10) || 0;
  const patch = {}; const fields = [];
  const add = (label, key, val) => { if (val !== "" && val != null) { patch[key] = val; fields.push({ label, val: String(val) }); } };

  const name = get("charactername", "character name", "name"); if (name) add("Name", "name", name);
  const cl = get("classlevel", "class & level", "class & lvl", "class"); 
  if (cl) { const lm = cl.match(/\d+/); if (lm) add("Stufe", "level", +lm[0]); const cm = cl.replace(/\d+/g, "").replace(/\s*\/\s*/g, " / ").trim(); if (cm) add("Klasse", "class", cm); }
  add("Rasse", "race", get("race"));
  add("Hintergrund", "background", get("background"));
  add("Gesinnung", "alignment", get("alignment"));
  const xp = get("xp", "experience points", "ep"); if (xp) add("EP", "xp", num(xp));
  const ac = get("ac", "armor class", "rk"); if (ac) add("RK", "ac", num(ac));
  const sp = get("speed", "tempo"); if (sp) add("Tempo", "speed", num(sp));
  const pb = get("profbonus", "proficiency bonus", "übungsbonus"); if (pb) add("Übungsbonus", "prof", num(pb));
  const hm = get("hpmax", "hit point maximum", "max-tp"); if (hm) add("Max-TP", "hpMax", num(hm));
  const hc = get("hpcurrent", "current hit points", "aktuelle tp"); if (hc) add("Aktuelle TP", "hp", num(hc));
  const ht = get("hptemp", "temporary hit points"); if (ht) add("Temp-TP", "hpTemp", num(ht));

  const stats = {};
  Object.entries(STAT_ALIAS).forEach(([k, al]) => { const v = get(...al); if (v && /\d/.test(v)) { const sc = num(v); const mod = Math.floor((sc - 10) / 2); stats[k] = { score: sc, mod }; } });
  if (Object.keys(stats).length) { patch.__stats = stats; fields.push({ label: "Attribute", val: Object.keys(stats).join(", ") }); }

  const skills = {};
  SKILLS_EN.forEach(en => { const v = get(en, SKILL_DE[en]); if (v && /-?\d/.test(v)) skills[en] = num(v); });
  if (Object.keys(skills).length) { patch.__skills = skills; fields.push({ label: "Fertigkeiten", val: Object.keys(skills).length + " übernommen" }); }

  const atks = []; const wn = ["wpn name", "wpn name 2", "wpn name 3"];
  for (let i = 0; i < 3; i++) { const nm = get(wn[i]); if (nm) atks.push({ name: nm, bonus: num(get("wpn" + (i + 1) + " atkbonus")), dmg: get("wpn" + (i + 1) + " damage") || "1W6", type: "" }); }
  if (atks.length) { patch.__attacks = atks; fields.push({ label: "Angriffe", val: atks.map(a => a.name).join(", ") }); }

  return { patch, fields };
};

const readCharFile = async (file) => {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (ext === "pdf") {
    const buf = await file.arrayBuffer();
    const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
    const form = pdf.getForm();
    const raw = {};
    form.getFields().forEach(fl => {
      const nm = fl.getName();
      try { if (typeof fl.getText === "function") { raw[nm] = fl.getText() || ""; return; } } catch (e) {}
      try { if (typeof fl.isChecked === "function") { raw[nm] = fl.isChecked() ? "1" : ""; return; } } catch (e) {}
    });
    if (!Object.keys(raw).length) throw new Error("Keine ausfüllbaren Felder gefunden. Nutze das offizielle ausfüllbare 5e-PDF.");
    return buildPatchFromFields(raw);
  }
  if (ext === "json") {
    const j = JSON.parse(await file.text());
    if (j && (j.name || j.stats)) return { patch: { __full: j }, fields: [{ label: "Vollständiger Charakter", val: j.name || "(JSON)" }] };
    throw new Error("JSON nicht als Charakter erkannt.");
  }
  return buildPatchFromFields(parseTextSheet(await file.text()));
};

// Globaler Wurf: schreibt in die Würfel-Historie + zeigt Toast
const rollDice = (label, sides = 20, mod = 0, count = 1) => {
  const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
  const total = rolls.reduce((a, b) => a + b, 0) + mod;
  try {
    const h = JSON.parse(localStorage.getItem("dnd.dice.history") || "[]");
    h.unshift({ id: Date.now(), label, die: count > 1 ? `${count}d${sides}` : `d${sides}`, roll: rolls, mod, total,
      crit: sides === 20 && count === 1 && rolls[0] === 20, fumble: sides === 20 && count === 1 && rolls[0] === 1, time: "gerade eben" });
    localStorage.setItem("dnd.dice.history", JSON.stringify(h.slice(0, 30)));
  } catch (e) {}
  window.dispatchEvent(new CustomEvent("dnd-roll", { detail: { label, total, rolls, mod, sides } }));
  return total;
};

// Inline editable text — click to edit
const Editable = ({ value, onChange, multiline, style, placeholder = "—", className }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  const commit = () => { onChange(draft); setEditing(false); };
  if (editing) {
    if (multiline) {
      return <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit}
        style={{ width: "100%", minHeight: 100, font: "inherit", color: "inherit", background: "var(--paper)", border: "1px solid var(--accent)", borderRadius: 4, padding: 8, ...style }}/>;
    }
    return <input autoFocus type="text" value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit}
      onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
      style={{ font: "inherit", color: "inherit", background: "var(--paper)", border: "1px solid var(--accent)", borderRadius: 4, padding: "2px 6px", width: "100%", ...style }}/>;
  }
  const empty = value === "" || value == null;
  return <span className={className} onClick={() => setEditing(true)}
    style={{ cursor: "text", borderBottom: "1px dashed transparent", padding: "0 2px", ...style, color: empty ? "var(--ink-mute)" : style?.color, fontStyle: empty ? "italic" : style?.fontStyle }}
    onMouseEnter={e => e.currentTarget.style.borderBottomColor = "var(--rule-2)"}
    onMouseLeave={e => e.currentTarget.style.borderBottomColor = "transparent"}>
    {empty ? placeholder : (multiline ? value.split("\n").map((l,i) => <span key={i}>{l}{i < value.split("\n").length-1 && <br/>}</span>) : value)}
  </span>;
};

const NumStepper = ({ value, onChange, min = 0, max = 999, suffix = "" }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
    <button onClick={() => onChange(Math.max(min, value - 1))} style={{ width: 22, height: 22, border: "1px solid var(--rule-2)", background: "var(--paper)", borderRadius: 4, fontSize: 14, lineHeight: 1, color: "var(--ink-3)" }}>−</button>
    <span style={{ minWidth: 32, textAlign: "center", fontFamily: "Fraunces, serif", fontWeight: 500 }}>{value}{suffix}</span>
    <button onClick={() => onChange(Math.min(max, value + 1))} style={{ width: 22, height: 22, border: "1px solid var(--rule-2)", background: "var(--paper)", borderRadius: 4, fontSize: 14, lineHeight: 1, color: "var(--ink-3)" }}>+</button>
  </span>
);

// =========================================================================
// DATA
// =========================================================================
const CHARACTER = {
  name: "Vael Ashenbrook",
  initials: "V",
  race: "Half-Elf", class: "Warlock", subclass: "The Archfey",
  level: 7, background: "Haunted One", alignment: "CG",
  xp: 23500, xpNext: 34000,
  hp: 42, hpMax: 58, hpTemp: 0,
  ac: 15, speed: 30, prof: 3, inspiration: 1,
  hitDice: { cur: 5, max: 7, type: "d8" },
  stats: {
    STR: { score: 8, mod: -1, save: -1, prof: false },
    DEX: { score: 14, mod: 2, save: 2, prof: false },
    CON: { score: 14, mod: 2, save: 2, prof: false },
    INT: { score: 12, mod: 1, save: 1, prof: false },
    WIS: { score: 13, mod: 1, save: 1, prof: true },
    CHA: { score: 18, mod: 4, save: 7, prof: true },
  },
  skills: [
    ["Akrobatik","DEX",2,false],["Arkane Kunde","INT",4,true],
    ["Täuschen","CHA",7,true],["Geschichte","INT",1,false],
    ["Motiv erkennen","WIS",1,false],["Einschüchtern","CHA",4,false],
    ["Nachforschen","INT",1,false],["Wahrnehmung","WIS",4,true],
    ["Überzeugen","CHA",7,true],["Religion","INT",1,false],
    ["Heimlichkeit","DEX",5,true],["Überleben","WIS",1,false],
  ].map(([name,stat,mod,prof])=>({name,stat,mod,prof})),
  features: [
    { name: "Feenpräsenz", source: "Erzfee", desc: "Bezaubere oder verängstige Kreaturen in einem 3-m-Würfel (Aktion).", uses: { cur: 0, max: 1 }, recharge: "kurze Rast" },
    { name: "Nebelflucht", source: "Erzfee", desc: "Bei Schaden: unsichtbar werden und bis 18 m teleportieren (Reaktion).", uses: { cur: 1, max: 1 }, recharge: "kurze Rast" },
    { name: "Segen des Dunklen", source: "Anrufung", desc: "Temporäre TP in Höhe von CHA + Hexenmeisterstufe bei einem Kill.", uses: null },
  ],
  spellDC: 15, spellAtk: 7,
  slots: [{ lvl: 4, max: 2, used: 0 }],
  attacks: [
    { name: "Mondsilber-Rapier", bonus: 7, dmg: "1W8+4", type: "Stich", die: 8, dn: 1, dbonus: 4 },
    { name: "Schauerimpuls", bonus: 7, dmg: "1W10", type: "Energie", die: 10, dn: 1, dbonus: 0 },
    { name: "Dolch", bonus: 5, dmg: "1W4+2", type: "Stich", die: 4, dn: 1, dbonus: 2 },
  ],
  spells: [
    { name: "Schauerimpuls", lvl: 0, school: "Hervorrufung", prep: true, desc: "Fernkampf-Zauberangriff, 1W10 Energieschaden. 2 Strahlen ab Stufe 5." },
    { name: "Magierhand", lvl: 0, school: "Beschwörung", prep: true, desc: "Geisterhafte Hand, die Gegenstände bis 4,5 kg bewegt." },
    { name: "Gaukelei", lvl: 0, school: "Verwandlung", prep: true, desc: "Kleiner magischer Effekt — Funken, Geruch, Säubern." },
    { name: "Fluch", lvl: 1, school: "Verzauberung", prep: true, conc: true, desc: "+1W6 Schaden gegen Ziel, Nachteil auf ein Attribut." },
    { name: "Rüstung des Agathys", lvl: 1, school: "Bannmagie", prep: true, desc: "5 temporäre TP; Nahkampfangreifer erleiden 5 Kälteschaden." },
    { name: "Nebelschritt", lvl: 2, school: "Beschwörung", prep: true, desc: "Bonusaktion: bis 9 m an sichtbaren Ort teleportieren." },
    { name: "Hadars Hunger", lvl: 3, school: "Beschwörung", prep: true, conc: true, desc: "Sphäre aus Dunkelheit, 2W6 Schaden, blind im Bereich." },
    { name: "Verbannung", lvl: 4, school: "Bannmagie", prep: true, conc: true, desc: "Ziel auf Rettungswurf in eine andere Ebene verbannen." },
  ],
};

const COMBATANTS = [
  { id: 1, name: "Vael Ashenbrook", type: "player", init: 21, hp: 42, max: 58, ac: 15, conds: ["Gesegnet"], note: "Du — Mondsilber-Rapier, 2 Zauberplätze übrig", initials: "V", isYou: true },
  { id: 2, name: "Hobgoblin-Hauptmann", type: "enemy", init: 19, hp: 28, max: 39, ac: 17, conds: ["Wütend"], note: "Großschwert. Anführer der Patrouille. Kampfvorteil bei Verbündetem in 1,5 m.", initials: "H" },
  { id: 3, name: "Thorne Eisenschild", type: "ally", init: 16, hp: 54, max: 62, ac: 18, conds: [], note: "Zwergen-Kleriker — Heiler. Geisterwächter aktiv.", initials: "T" },
  { id: 4, name: "Goblin-Plänkler", type: "enemy", init: 14, hp: 7, max: 12, ac: 13, conds: ["Liegend"], note: "Angeschlagen", initials: "G" },
  { id: 5, name: "Mira Dämmerflüster", type: "ally", init: 12, hp: 31, max: 44, ac: 14, conds: ["Konzentration"], note: "Schurkin — Sneak Attack 4W6. Konzentriert auf Spurloser Gang.", initials: "M" },
  { id: 6, name: "Goblin-Bogenschütze", type: "enemy", init: 9, hp: 12, max: 12, ac: 13, conds: [], note: "Auf dem Vorsprung, 12 m höher. Kurzbogen +4, 1W6+2.", initials: "G" },
  { id: 7, name: "Schreckenswolf", type: "enemy", init: 7, hp: 37, max: 37, ac: 14, conds: [], note: "Rudeltaktik. Biss +5, 2W6+3.", initials: "W" },
];

const HISTORY_SEED = [
  { id: 1, label: "Überzeugen", die: "d20", roll: [17], mod: 7, total: 24, time: "gerade eben" },
  { id: 2, label: "Schauerimpuls — Angriff", die: "d20", roll: [20], mod: 7, total: 27, crit: true, time: "vor 2 Min." },
  { id: 3, label: "Energieschaden", die: "2d10", roll: [8, 6], mod: 0, total: 14, time: "vor 2 Min." },
  { id: 4, label: "Heimlichkeit", die: "d20", roll: [4], mod: 5, total: 9, time: "vor 6 Min." },
  { id: 5, label: "CHA-Rettung", die: "d20", roll: [15], mod: 7, total: 22, time: "vor 11 Min." },
];

const ITEMS = [
  { id: 1, name: "Mondsilber-Rapier", type: "weapon", rarity: "rare", attuned: true, qty: 1, weight: 2, desc: "+1 auf Angriff und Schaden. Leuchtet im Mondlicht (3 m). Umgeht Resistenz gegen nichtmagischen Stichschaden." },
  { id: 2, name: "Umhang des Hohlwalds", type: "wondrous", rarity: "uncommon", attuned: true, qty: 1, weight: 1, desc: "Vorteil auf Heimlichkeit in Wäldern. Einmal pro Morgendämmerung: Spurloser Gang." },
  { id: 3, name: "Komponentenbeutel", type: "gear", rarity: "common", attuned: false, qty: 1, weight: 2, desc: "Materialkomponenten für Zauber (ohne Goldkosten unter 1 GM)." },
  { id: 4, name: "Trank der großen Heilung", type: "consumable", rarity: "uncommon", attuned: false, qty: 3, weight: 0.5, desc: "Heilt 4W4+4 TP. Aktion zum Trinken, Bonusaktion zum Verabreichen." },
  { id: 5, name: "Glut des Ersten Herdfeuers", type: "trinket", rarity: "legendary", attuned: false, qty: 1, weight: 0, desc: "Eine ewig warme Kohle aus einem Feuer, das vor der Welt brannte. Flüstert nachts." },
  { id: 6, name: "Schriftrolle: Gegenzauber", type: "scroll", rarity: "uncommon", attuned: false, qty: 1, weight: 0, desc: "Wirke Gegenzauber (Grad 3) ohne Zauberplatz." },
  { id: 7, name: "Rationen", type: "gear", rarity: "common", attuned: false, qty: 8, weight: 2, desc: "Trockenfleisch, Hartkekse und etwas Käse in Wachstuch." },
  { id: 8, name: "Geldbeutel", type: "currency", rarity: "common", attuned: false, qty: 1, weight: 1, desc: "142 GM · 38 SM · 14 KM · 3 PM" },
];

const NOTES = [
  { id: 1, title: "Der Hohle Hirsch", tags: ["npc","fey"], body: "Abgesandter meines [[Erzfee]]-Patrons, getroffen vor [[Briarholt]]. Trug einen Hirschschädel. Bot eine Gunst gegen eine Erinnerung — ich gab ihm den Geruch der Küche meiner Mutter. Ich glaube, ich habe das bessere Geschäft gemacht.", updated: "Sitzung 14" },
  { id: 2, title: "Briarholt", tags: ["place","town"], body: "Dorf am Rand des [[Flüsterwald]]s. Bürgermeister Halric fürchtet etwas unter dem Brunnen. Taverne: Zum Kupferkessel. Der Schmied schuldet [[Thorne Eisenschild]] einen Gefallen.", updated: "Sitzung 13" },
  { id: 3, title: "Flüsterwald", tags: ["place","wilderness"], body: "Die Bäume summen in einer Sprache, die ich fast verstehe. Kompass funktioniert nicht. Der Spur des [[Der Hohle Hirsch|Hohlen Hirschs]] folgen. Die Beeren NICHT essen.", updated: "Sitzung 14" },
  { id: 4, title: "Der Mondlose Pakt", tags: ["quest","main"], body: "Die [[Erzfee]] will, dass wir vor dem nächsten Neumond einen silbernen Kelch aus [[Mournkeep]] holen. Noch 9 Tage. Belohnung: Miras Fluch wird gelöst.", updated: "Sitzung 14" },
  { id: 5, title: "Thorne Eisenschild", tags: ["npc","party"], body: "Zwergen-Kleriker des Moradin. Reist seit [[Briarholt]] mit uns. Verlor seinen Klan an einen Drachen. Schnarcht auch wie einer.", updated: "Sitzung 12" },
  { id: 6, title: "Hobgoblin-Taktik", tags: ["lore","combat"], body: "Kampfvorteil — Extraschaden, wenn ein Verbündeter in 1,5 m steht. Den Hauptmann ISOLIEREN. Rudeltaktik wirkt nicht gegen einzelne Ziele.", updated: "Sitzung 11" },
  { id: 7, title: "Mournkeep", tags: ["place","dungeon"], body: "Verlassene Festung nordöstlich von [[Briarholt]]. Gehalten von etwas, das einmal menschlich war. Der Silberkelch liegt in der Kapelle. Den Ostturm meiden.", updated: "Sitzung 14" },
  { id: 8, title: "Sitzung 14 — Rückblick", tags: ["session"], body: "[[Der Hohle Hirsch]] getroffen. [[Der Mondlose Pakt|Den Mondlosen Pakt]] angenommen. Seil gekauft, Mut gekauft. Bei Morgengrauen Richtung [[Mournkeep]].", updated: "vor 2 Tagen" },
];

// =========================================================================
// ICONS
// =========================================================================
const Icon = ({ n, s = 16 }) => {
  const p = {
    book: <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15zM4 19.5A2.5 2.5 0 0 0 6.5 22H20"/>,
    sword: <path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4"/>,
    dice: <g><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1" fill="currentColor"/></g>,
    scroll: <g><path d="M8 2h11a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H8"/><path d="M16 22H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h11"/><path d="M8 2a2 2 0 0 0-2 2v14"/></g>,
    chest: <g><rect x="3" y="8" width="18" height="13" rx="1"/><path d="M3 12h18M12 8v13M8 4h8l2 4H6z"/></g>,
    plus: <g><path d="M12 5v14M5 12h14"/></g>,
    close: <g><path d="M18 6 6 18M6 6l12 12"/></g>,
    search: <g><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></g>,
    magic: <g><path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5"/></g>,
    target: <g><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></g>,
    party: <g><circle cx="9" cy="7" r="3"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><circle cx="17" cy="8" r="2.2"/><path d="M21 21v-1.5a3.5 3.5 0 0 0-3-3.4"/></g>,
  }[n];
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{p}</svg>;
};

const Bar = ({ v, max, c = "" }) => (
  <div className="bar"><div className={"bar-fill " + c} style={{ width: `${Math.max(0, Math.min(100, v/max*100))}%` }}/></div>
);

const renderWiki = (text, onClick) => {
  return text.split(/(\[\[[^\]]+\]\])/g).map((part, i) => {
    const m = part.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/);
    if (m) return <span key={i} className="wikilink" onClick={() => onClick && onClick(m[1])}>{m[2] || m[1]}</span>;
    return <span key={i}>{part}</span>;
  });
};

// =========================================================================
// CHARACTER
// =========================================================================
const Character = ({ c, setC }) => {
  const update = (patch) => setC(prev => ({ ...prev, ...(typeof patch === "function" ? patch(prev) : patch) }));
  const updateStat = (k, score) => {
    const s = Math.max(1, Math.min(30, +score || 0));
    const mod = calcMod(s);
    setC(prev => ({ ...prev, stats: { ...prev.stats, [k]: { ...prev.stats[k], score: s, mod, save: mod + (prev.stats[k].prof ? prev.prof : 0) } } }));
  };
  const toggleSaveProf = (k) => {
    setC(prev => {
      const stat = prev.stats[k]; const newProf = !stat.prof;
      return { ...prev, stats: { ...prev.stats, [k]: { ...stat, prof: newProf, save: stat.mod + (newProf ? prev.prof : 0) } } };
    });
  };
  const toggleSkill = (i) => setC(prev => ({ ...prev, skills: prev.skills.map((s, idx) => idx === i ? { ...s, prof: !s.prof, mod: prev.stats[s.stat].mod + (!s.prof ? prev.prof : 0) } : s) }));
  const updSkill = (i, patch) => setC(p => ({ ...p, skills: p.skills.map((s, idx) => idx === i ? { ...s, ...patch } : s) }));
  const addSkill = () => setC(p => ({ ...p, skills: [...p.skills, { name: "Neue Fertigkeit", stat: "DEX", mod: 0, prof: false }] }));
  const rmSkill = (i) => { if (confirm("Fertigkeit entfernen?")) setC(p => ({ ...p, skills: p.skills.filter((_, idx) => idx !== i) })); };
  const STATS_KEYS = ["STR","DEX","CON","INT","WIS","CHA"];
  const setHp = (delta) => update(prev => ({ hp: Math.max(0, Math.min(prev.hpMax, prev.hp + delta)) }));
  const setHpAbs = (v) => update(prev => ({ hp: Math.max(0, Math.min(prev.hpMax, +v || 0)) }));
  const toggleFeature = (i) => setC(prev => ({ ...prev, features: prev.features.map((f, idx) => idx === i && f.uses ? { ...f, uses: { ...f.uses, cur: f.uses.cur > 0 ? f.uses.cur - 1 : f.uses.max } } : f) }));
  const updFeat = (i, patch) => setC(p => ({ ...p, features: p.features.map((f, idx) => idx === i ? { ...f, ...patch } : f) }));
  const addFeat = () => setC(p => ({ ...p, features: [...p.features, { name: "Neues Merkmal", source: "", desc: "", uses: null }] }));
  const rmFeat = (i) => { if (confirm("Merkmal entfernen?")) setC(p => ({ ...p, features: p.features.filter((_, idx) => idx !== i) })); };
  const ds = c.deathSaves || { s: 0, f: 0 };
  const setDS = (k, n) => update({ deathSaves: { ...ds, [k]: ds[k] === n ? n - 1 : n } });
  const shortRest = () => { if (!confirm("Kurze Rast? Pakt-Slots & Kurzrast-Merkmale werden aufgefrischt.")) return; setC(p => ({ ...p, slots: (p.slots||[]).map(s => ({ ...s, used: 0 })), features: p.features.map(f => f.uses && /short|kurz|rast/i.test(f.recharge||"") ? { ...f, uses: { ...f.uses, cur: f.uses.max } } : f) })); };
  const longRest = () => { if (!confirm("Lange Rast? TP, Slots, Trefferwürfel & Merkmale werden zurückgesetzt.")) return; setC(p => ({ ...p, hp: p.hpMax, hpTemp: 0, hitDice: { ...p.hitDice, cur: p.hitDice.max }, deathSaves: { s: 0, f: 0 }, slots: (p.slots||[]).map(s => ({ ...s, used: 0 })), features: p.features.map(f => f.uses ? { ...f, uses: { ...f.uses, cur: f.uses.max } } : f) })); };
  const reset = () => { if (confirm("Charakterbogen auf Standard zurücksetzen?")) setC(CHARACTER); };

  // Import / Export
  const [luOpen, setLuOpen] = useState(false);
  const LU = LevelUpModal;
  const [impOpen, setImpOpen] = useState(false);
  const [impData, setImpData] = useState(null);
  const [impErr, setImpErr] = useState("");
  const [impBusy, setImpBusy] = useState(false);
  const onImportFile = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setImpErr(""); setImpData(null); setImpBusy(true);
    try { const res = await readCharFile(f); if (!res.fields.length) setImpErr("Keine bekannten Felder erkannt."); else setImpData(res); }
    catch (err) { setImpErr(err.message || String(err)); }
    setImpBusy(false); e.target.value = "";
  };
  const applyImport = () => {
    const p = impData.patch;
    setC(prev => {
      let next;
      if (p.__full) {
        next = { ...CHARACTER, ...prev, ...p.__full };
        ["attacks", "slots", "spells"].forEach(k => { if (!Array.isArray(next[k])) next[k] = []; });
      } else {
        next = { ...prev };
        Object.entries(p).forEach(([k, v]) => { if (!k.startsWith("__")) next[k] = v; });
        if (p.__stats) {
          next.stats = { ...prev.stats };
          Object.entries(p.__stats).forEach(([k, s]) => { const pr = prev.stats[k]?.prof || false; next.stats[k] = { score: s.score, mod: s.mod, prof: pr, save: s.mod + (pr ? (next.prof || 0) : 0) }; });
        }
        if (p.__skills) {
          next.skills = prev.skills.map(sk => {
            const hit = Object.entries(p.__skills).find(([en]) => { const de = (SKILL_DE[en] || "").toLowerCase(); const n = sk.name.toLowerCase(); return n === en.toLowerCase() || n === de || (de && n.includes(de)) || n.includes(en.toLowerCase()); });
            return hit ? { ...sk, mod: hit[1] } : sk;
          });
        }
        if (p.__attacks) next.attacks = [ ...(prev.attacks || []), ...p.__attacks ];
      }
      return next;
    });
    setImpOpen(false); setImpData(null);
  };
  const exportChar = () => {
    const blob = new Blob([JSON.stringify(c, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = (c.name || "charakter").replace(/[^\w\-]+/g, "_") + ".json"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  // Profilbild: hochladen + auf 256px verkleinern (spart Speicher)
  const onPortrait = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const S = 256, cv = document.createElement("canvas"); cv.width = S; cv.height = S;
        const ctx = cv.getContext("2d"); const sc = Math.max(S / img.width, S / img.height);
        const w = img.width * sc, h = img.height * sc;
        ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
        update({ portrait: cv.toDataURL("image/jpeg", 0.82) });
      };
      img.src = r.result;
    };
    r.readAsDataURL(f); e.target.value = "";
  };
  return (
    <div>
      <div className="screen-head">
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          <label style={{ cursor: "pointer", position: "relative", flexShrink: 0 }} title="Bild ändern">
            <div style={{ width: 76, height: 76, borderRadius: "50%", overflow: "hidden", border: "2px solid var(--accent)", background: "linear-gradient(135deg, var(--ink-3), var(--ink-2))", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--paper)", fontFamily: "Fraunces, serif", fontSize: 30, fontWeight: 500 }}>
              {c.portrait ? <img src={c.portrait} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/> : (c.name || "?").trim().charAt(0)}
            </div>
            <span style={{ position: "absolute", bottom: -2, right: -2, width: 22, height: 22, borderRadius: "50%", background: "var(--accent)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, border: "2px solid var(--paper)" }}>✎</span>
            {c.portrait && <span onClick={ev => { ev.preventDefault(); ev.stopPropagation(); update({ portrait: null }); }} title="Bild entfernen" style={{ position: "absolute", top: -2, left: -2, width: 20, height: 20, borderRadius: "50%", background: "var(--red)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, border: "2px solid var(--paper)" }}>✕</span>}
            <input type="file" accept="image/*" onChange={onPortrait} style={{ display: "none" }}/>
          </label>
          <div>
          <div className="eyebrow">Spielercharakter</div>
          <h1><Editable value={c.name} onChange={v => update({ name: v })}/></h1>
          <div style={{ marginTop: 6, color: "var(--ink-3)", fontStyle: "italic", fontSize: 14 }}>
            Stufe <Editable value={c.level} onChange={v => update({ level: Math.max(1, Math.min(20, +v || 1)) })} style={{ display: "inline-block", minWidth: 18 }}/> <Editable value={c.race} onChange={v => update({ race: v })}/> <Editable value={c.class} onChange={v => update({ class: v })}/> · <Editable value={c.subclass} onChange={v => update({ subclass: v })}/> · <Editable value={c.background} onChange={v => update({ background: v })}/>
          </div>
          </div>
        </div>
        <div className="head-meta">
          <div style={{ fontSize: 11, color: "var(--ink-mute)", letterSpacing: ".08em", textTransform: "uppercase" }}>Inspiration</div>
          <button onClick={() => update({ inspiration: c.inspiration ? 0 : 1 })} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "Fraunces, serif", fontSize: 24, color: "var(--accent)" }}>{"★".repeat(c.inspiration)}{"☆".repeat(Math.max(0, 1-c.inspiration))}</button>
          <div style={{ marginTop: 8, display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button className="btn btn-sm" onClick={() => setLuOpen(true)} style={{ background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }}>▲ Stufe aufsteigen</button>
            <button className="btn btn-sm" onClick={() => { setImpOpen(true); setImpErr(""); setImpData(null); }}>⤓ Importieren</button>
            <button className="btn btn-sm" onClick={exportChar}>Export</button>
            <button className="btn btn-sm" onClick={shortRest}>Kurze Rast</button>
            <button className="btn btn-sm btn-primary" onClick={longRest}>Lange Rast</button>
            <button className="btn btn-ghost" onClick={reset} style={{ fontSize: 10 }}>Zurücksetzen</button>
          </div>
        </div>
      </div>

      {luOpen && LU && <LU c={c} setC={setC} onClose={() => setLuOpen(false)} />}

      {impOpen && (
        <div onClick={() => setImpOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(44,24,16,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 210, padding: 30 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 560, background: "var(--paper)", border: "1px solid var(--rule-2)", borderRadius: 10, padding: 28, boxShadow: "var(--shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 500 }}>Charakter importieren</h2>
              <button className="btn btn-ghost" onClick={() => setImpOpen(false)}><Icon n="close"/></button>
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 14, lineHeight: 1.5 }}>
              Lade dein Charakterblatt als <b>ausfüllbares 5e-PDF</b> (die Formularfelder werden ausgelesen), als <b>JSON</b>-Backup oder als <b>Textdatei</b> (Zeilen wie „Stärke: 16"). Die erkannten Werte siehst du vor dem Übernehmen.
            </div>
            <label className="btn btn-primary" style={{ cursor: "pointer" }}>
              {impBusy ? "Lese Datei…" : "Datei wählen (.pdf, .json, .txt)"}
              <input type="file" accept=".pdf,.json,.txt,.md,application/pdf,application/json,text/plain" onChange={onImportFile} style={{ display: "none" }}/>
            </label>
            {impErr && <div style={{ marginTop: 14, padding: 12, background: "#f0d8d8", border: "1px solid #d9b0b0", borderRadius: 6, fontSize: 13, color: "var(--red)" }}>{impErr}</div>}
            {impData && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, color: "var(--accent)", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 600, fontFamily: "Inter, sans-serif", marginBottom: 8 }}>Erkannt — wird übernommen</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 240, overflowY: "auto" }}>
                  {impData.fields.map((f, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 10px", background: "var(--bg)", border: "1px solid var(--rule)", borderRadius: 6, fontSize: 13 }}>
                      <span style={{ color: "var(--ink-3)" }}>{f.label}</span>
                      <span style={{ fontFamily: "Fraunces, serif", fontWeight: 500, textAlign: "right" }}>{f.val}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
                  <button className="btn" onClick={() => setImpData(null)}>Verwerfen</button>
                  <button className="btn btn-primary" onClick={applyImport}>Übernehmen</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px,300px) minmax(0,1fr) minmax(260px,300px)", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card" style={{ textAlign: "center" }}>
            <div className="card-title">Trefferpunkte</div>
            <div style={{ fontFamily: "Fraunces, serif", marginBottom: 10 }}>
              <span style={{ fontSize: 56, fontWeight: 500, color: "var(--ink)" }}><Editable value={c.hp} onChange={setHpAbs} style={{ display: "inline-block", minWidth: 50, textAlign: "center" }}/></span>
              <span style={{ fontSize: 20, color: "var(--ink-mute)" }}> / <Editable value={c.hpMax} onChange={v => update({ hpMax: Math.max(1, +v || 1) })} style={{ display: "inline-block", minWidth: 30 }}/></span>
            </div>
            <Bar v={c.hp} max={c.hpMax} c="red"/>
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 10, flexWrap: "wrap" }}>
              <button className="btn" style={{ color: "var(--red)", borderColor: "#d9b0b0", padding: "4px 10px", fontSize: 11 }} onClick={() => setHp(-1)}>−1</button>
              <button className="btn" style={{ color: "var(--red)", borderColor: "#d9b0b0", padding: "4px 10px", fontSize: 11 }} onClick={() => setHp(-5)}>−5</button>
              <button className="btn" style={{ color: "var(--red)", borderColor: "#d9b0b0", padding: "4px 10px", fontSize: 11 }} onClick={() => { const n = prompt("Schaden?"); if (n) setHp(-(+n||0)); }}>−…</button>
              <button className="btn" style={{ color: "var(--green)", borderColor: "#c0cba0", padding: "4px 10px", fontSize: 11 }} onClick={() => setHp(1)}>+1</button>
              <button className="btn" style={{ color: "var(--green)", borderColor: "#c0cba0", padding: "4px 10px", fontSize: 11 }} onClick={() => setHp(5)}>+5</button>
              <button className="btn" style={{ color: "var(--green)", borderColor: "#c0cba0", padding: "4px 10px", fontSize: 11 }} onClick={() => update({ hp: c.hpMax })}>Voll</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
              <div className="stat">
                <div className="stat-label">Temp. TP</div>
                <div className="stat-value"><Editable value={c.hpTemp} onChange={v => update({ hpTemp: +v || 0 })} placeholder="0"/></div>
              </div>
              <div className="stat">
                <div className="stat-label">Trefferwürfel</div>
                <div className="stat-value"><Editable value={c.hitDice.cur} onChange={v => update(p => ({ hitDice: { ...p.hitDice, cur: Math.max(0, Math.min(p.hitDice.max, +v || 0)) } }))} style={{ display: "inline-block", minWidth: 20 }}/><span style={{ fontSize: 13, color: "var(--ink-mute)" }}><Editable value={c.hitDice.type} onChange={v => update(p => ({ hitDice: { ...p.hitDice, type: v } }))} style={{ display: "inline-block", minWidth: 22 }}/></span></div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Verteidigung</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div className="stat"><div className="stat-value"><Editable value={c.ac} onChange={v => update({ ac: +v || 0 })}/></div><div className="stat-label" style={{ marginTop: 4 }}>RK</div></div>
              <div className="stat"><div className="stat-value">+{c.stats.DEX.mod}</div><div className="stat-label" style={{ marginTop: 4 }}>Init</div></div>
              <div className="stat"><div className="stat-value"><Editable value={c.speed} onChange={v => update({ speed: +v || 0 })}/></div><div className="stat-label" style={{ marginTop: 4 }}>Tempo</div></div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Todesrettungswürfe</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 10, color: "var(--green)", letterSpacing: ".1em", marginBottom: 6, fontWeight: 600 }}>ERFOLG</div>
                <div style={{ display: "flex", gap: 5 }}>{[1,2,3].map(n => <button key={n} onClick={() => setDS("s", n)} style={{ width: 16, height: 16, padding: 0, border: "1.5px solid var(--green)", borderRadius: "50%", background: n <= ds.s ? "var(--green)" : "transparent", cursor: "pointer" }}/>)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--red)", letterSpacing: ".1em", marginBottom: 6, fontWeight: 600, textAlign: "right" }}>FEHLSCHLAG</div>
                <div style={{ display: "flex", gap: 5 }}>{[1,2,3].map(n => <button key={n} onClick={() => setDS("f", n)} style={{ width: 16, height: 16, padding: 0, border: "1.5px solid var(--red)", borderRadius: "50%", background: n <= ds.f ? "var(--red)" : "transparent", cursor: "pointer" }}/>)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Middle */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card">
            <div className="card-title">Attribute</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
              {Object.entries(c.stats).map(([k, s]) => (
                <div key={k} style={{ textAlign: "center", background: "var(--bg)", border: "1px solid var(--rule)", borderRadius: 6, padding: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--accent)", letterSpacing: ".1em", fontFamily: "Inter, sans-serif" }}>{k}</div>
                  <div style={{ fontFamily: "Fraunces, serif", fontSize: 26, fontWeight: 500, color: "var(--ink)", lineHeight: 1, marginTop: 4 }}>{s.mod >= 0 ? "+" : ""}{s.mod}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 2, fontStyle: "italic" }}><Editable value={s.score} onChange={v => updateStat(k, v)}/></div>
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--rule)" }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: "var(--ink-mute)", letterSpacing: ".1em", fontFamily: "Inter, sans-serif" }}>RETT.</div>
                    <button onClick={() => toggleSaveProf(k)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "Fraunces, serif", fontSize: 14, color: s.prof ? "var(--accent)" : "var(--ink-3)" }}>
                      {s.prof && <span style={{ fontSize: 8, marginRight: 2 }}>●</span>}
                      {s.save >= 0 ? "+" : ""}{s.save}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-title">Fertigkeiten</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
              {c.skills.map((sk, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", padding: "5px 0", borderBottom: "1px dotted var(--rule)" }}>
                  <button onClick={() => toggleSkill(i)} title="Geübt umschalten" style={{ width: 13, height: 13, padding: 0, borderRadius: "50%", border: "1.5px solid var(--accent)", background: sk.prof ? "var(--accent)" : "transparent", marginRight: 10, cursor: "pointer", flexShrink: 0 }}/>
                  <div style={{ flex: 1, fontSize: 14, minWidth: 0 }}><Editable value={sk.name} onChange={v => updSkill(i, { name: v })}/></div>
                  <button onClick={() => { const next = STATS_KEYS[(STATS_KEYS.indexOf(sk.stat) + 1) % 6]; updSkill(i, { stat: next, mod: c.stats[next].mod + (sk.prof ? c.prof : 0) }); }} title="Attribut wechseln" style={{ fontSize: 10, color: "var(--ink-mute)", letterSpacing: ".08em", marginRight: 8, fontFamily: "Inter, sans-serif", background: "none", border: "none", cursor: "pointer", padding: 0 }}>{sk.stat}</button>
                  <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, color: sk.prof ? "var(--ink)" : "var(--ink-3)", minWidth: 30, textAlign: "right", fontWeight: 500 }}>
                    <Editable value={(sk.mod >= 0 ? "+" : "") + sk.mod} onChange={v => updSkill(i, { mod: parseInt(String(v).replace(/[^\-\d]/g, ""), 10) || 0 })} style={{ display: "inline-block", minWidth: 24, textAlign: "right" }}/>
                  </div>
                  <span onClick={() => rmSkill(i)} title="Entfernen" style={{ color: "var(--ink-mute)", fontSize: 10, cursor: "pointer", marginLeft: 6 }}>✕</span>
                </div>
              ))}
            </div>
            <button className="btn btn-sm" onClick={addSkill} style={{ marginTop: 10 }}>+ Fertigkeit</button>
          </div>
        </div>

        {/* Right */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card" style={{ textAlign: "center" }}>
            <div className="card-title">Übungsbonus</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 44, color: "var(--accent)", lineHeight: 1, fontWeight: 500 }}>+{c.prof}</div>
          </div>

          <AttacksBlock c={c} setC={setC} compact/>

          <div className="card">
            <div className="card-title">Erfahrung</div>
            <Bar v={c.xp} max={c.xpNext} c="gold"/>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: "var(--ink-3)" }}>
              <span><Editable value={c.xp} onChange={v => update({ xp: +String(v).replace(/\D/g,"") || 0 })} style={{ display: "inline-block", minWidth: 40 }}/> XP</span>
              <span style={{ fontStyle: "italic" }}>{Math.max(0, c.xpNext - c.xp).toLocaleString()} bis St. {c.level + 1}</span>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Merkmale</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {c.features.map((f, i) => (
                <div key={i}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 3, gap: 6 }}>
                    <div style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 500, flex: 1 }}><Editable value={f.name} onChange={v => updFeat(i, { name: v })}/></div>
                    {f.uses && (
                      <button onClick={() => toggleFeature(i)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", gap: 3 }}>
                        {Array.from({length: f.uses.max}).map((_, k) => (
                          <div key={k} style={{ width: 9, height: 9, borderRadius: "50%", border: "1.5px solid var(--accent)", background: k < f.uses.cur ? "var(--accent)" : "transparent" }}/>
                        ))}
                      </button>
                    )}
                    <span onClick={() => rmFeat(i)} style={{ color: "var(--ink-mute)", fontSize: 11, cursor: "pointer" }} title="Entfernen">✕</span>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--ink-mute)", letterSpacing: ".06em", textTransform: "uppercase", fontFamily: "Inter, sans-serif", marginBottom: 4 }}>
                    <Editable value={f.source} onChange={v => updFeat(i, { source: v })} placeholder="Quelle"/>{f.recharge && ` · ${f.recharge}`}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5, fontStyle: "italic" }}><Editable multiline value={f.desc} onChange={v => updFeat(i, { desc: v })} placeholder="Beschreibung…"/></div>
                </div>
              ))}
              <button className="btn btn-sm" onClick={addFeat} style={{ alignSelf: "flex-start" }}>+ Merkmal</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// COMBAT
// =========================================================================
const Combat = () => {
  const [list, setList] = usePersistent("combat.list", COMBATANTS);
  const [activeIdx, setActiveIdx] = usePersistent("combat.activeIdx", 0);
  const [round, setRound] = usePersistent("combat.round", 1);
  const [delta, setDelta] = useState("");
  const [adding, setAdding] = useState(false);
  const [newC, setNewC] = useState({ name: "", type: "enemy", init: 10, hp: 10, max: 10, ac: 12 });
  const [editingNote, setEditingNote] = useState(false);

  const sorted = useMemo(() => [...list].sort((a,b) => b.init - a.init), [list]);
  const safeIdx = Math.min(activeIdx, Math.max(0, sorted.length - 1));
  const active = sorted[safeIdx];
  const onDeck = sorted[(safeIdx + 1) % Math.max(1, sorted.length)];

  const next = () => {
    const i = (safeIdx + 1) % sorted.length;
    setActiveIdx(i);
    if (i === 0) setRound(r => r + 1);
  };
  const prev = () => {
    const i = (safeIdx - 1 + sorted.length) % sorted.length;
    setActiveIdx(i);
  };
  const adjust = (sign) => {
    const d = parseInt(delta, 10);
    if (isNaN(d) || !active) return;
    setList(L => L.map(c => c.id === active.id ? { ...c, hp: Math.max(0, Math.min(c.max, c.hp + sign * d)) } : c));
    setDelta("");
  };
  const updateActive = (patch) => setList(L => L.map(c => c.id === active.id ? { ...c, ...patch } : c));
  const removeCombatant = (id) => setList(L => L.filter(c => c.id !== id));
  const addCombatant = () => {
    if (!newC.name) return;
    const initials = newC.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    setList(L => [...L, { ...newC, id: Date.now(), conds: [], note: "", initials }]);
    setNewC({ name: "", type: "enemy", init: 10, hp: 10, max: 10, ac: 12 });
    setAdding(false);
  };
  const toggleCond = (cond) => {
    if (!active) return;
    const has = active.conds.includes(cond);
    updateActive({ conds: has ? active.conds.filter(c => c !== cond) : [...active.conds, cond] });
  };
  const newRound = () => { if (confirm("Neuen Kampf starten? Runde und Reihenfolge werden zurückgesetzt.")) { setRound(1); setActiveIdx(0); } };

  const CONDITIONS = ["Gesegnet","Blind","Bezaubert","Konzentration","Verängstigt","Gepackt","Kampfunfähig","Unsichtbar","Gelähmt","Vergiftet","Liegend","Wütend","Festgehalten","Betäubt","Bewusstlos"];
  const TYPE_DE = { player: "Spieler", enemy: "Gegner", ally: "Verbündet" };

  const addForm = (
    <div className="card" style={{ marginTop: 8, padding: 14, textAlign: "left" }}>
      <input type="text" autoFocus placeholder="Name" value={newC.name} onChange={e => setNewC({ ...newC, name: e.target.value })} onKeyDown={e => { if (e.key === "Enter") addCombatant(); }} style={{ width: "100%", marginBottom: 8 }}/>
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        {["enemy","ally","player"].map(t => <button key={t} className={"t-chip" + (newC.type === t ? " active" : "")} onClick={() => setNewC({ ...newC, type: t })}>{TYPE_DE[t]}</button>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
        <div><div className="tweak-label">Init</div><input type="number" value={newC.init} onChange={e => setNewC({ ...newC, init: +e.target.value || 0 })} style={{ width: "100%" }}/></div>
        <div><div className="tweak-label">TP</div><input type="number" value={newC.max} onChange={e => setNewC({ ...newC, max: +e.target.value || 1, hp: +e.target.value || 1 })} style={{ width: "100%" }}/></div>
        <div><div className="tweak-label">RK</div><input type="number" value={newC.ac} onChange={e => setNewC({ ...newC, ac: +e.target.value || 0 })} style={{ width: "100%" }}/></div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={addCombatant}>Hinzufügen</button>
        <button className="btn" onClick={() => setAdding(false)}>Abbrechen</button>
      </div>
    </div>
  );

  if (!active) return (
    <div style={{ padding: 60, textAlign: "center", color: "var(--ink-mute)" }}>
      <p style={{ fontStyle: "italic", marginBottom: 16 }}>Das Feld ist leer.</p>
      {!adding && <button className="btn btn-primary" onClick={() => setAdding(true)}>+ Kämpfer hinzufügen</button>}
      {adding && <div style={{ maxWidth: 340, margin: "0 auto" }}>{addForm}</div>}
    </div>
  );

  const tColor = { player: "var(--accent)", enemy: "var(--red)", ally: "var(--green)" }[active.type];
  const pct = active.hp / active.max * 100;

  return (
    <div>
      <div className="screen-head">
        <div>
          <div className="eyebrow">Runde {round} · Zug {safeIdx + 1} von {sorted.length}</div>
          <h1>Kampf</h1>
        </div>
        <div className="head-meta">
          <div style={{ fontSize: 11, color: "var(--ink-mute)", letterSpacing: ".08em", textTransform: "uppercase" }}>Als Nächstes</div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, color: "var(--ink)" }}>{onDeck.name}</div>
          <div style={{ fontSize: 12, color: "var(--ink-mute)", fontStyle: "italic" }}>Init {onDeck.init}</div>
          <div style={{ marginTop: 6 }}><button className="btn btn-ghost" onClick={newRound} style={{ fontSize: 10 }}>↻ Neuer Kampf</button></div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 320px)", gap: 20 }}>
        <div style={{ minWidth: 0 }}>
          <div key={active.id} style={{
            background: `linear-gradient(155deg, ${active.type === 'enemy' ? 'rgba(168, 50, 50, 0.06)' : active.type === 'player' ? 'rgba(193, 84, 42, 0.06)' : 'rgba(107, 125, 74, 0.06)'}, var(--paper))`,
            border: "1px solid var(--rule)",
            borderTop: `3px solid ${tColor}`,
            borderRadius: 10,
            padding: 28,
            boxShadow: "var(--shadow)",
            animation: "fadeUp 0.3s ease forwards",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 22 }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: `linear-gradient(135deg, ${tColor}, ${tColor}cc)`,
                color: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "Fraunces, serif", fontSize: 32, fontWeight: 500,
                boxShadow: "var(--shadow)",
              }}>{active.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: tColor, letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 600, fontFamily: "Inter, sans-serif", marginBottom: 4 }}>
                  Init <Editable value={active.init} onChange={v => updateActive({ init: +v || 0 })} style={{ display: "inline-block", minWidth: 18 }}/> · {TYPE_DE[active.type] || active.type}{active.isYou ? " · Du" : ""}
                  <button onClick={() => { if (confirm(`${active.name} entfernen?`)) removeCombatant(active.id); }} style={{ marginLeft: 12, background: "none", border: "none", color: "var(--ink-mute)", cursor: "pointer", fontSize: 11 }}>✕ entfernen</button>
                </div>
                <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 32, fontWeight: 500, lineHeight: 1, color: "var(--ink)" }}><Editable value={active.name} onChange={v => updateActive({ name: v, initials: v.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase() })}/></h2>
                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                  {active.conds.map(c => <button key={c} className="chip chip-accent" onClick={() => toggleCond(c)} style={{ cursor: "pointer" }} title="Click to remove">{c} ✕</button>)}
                  <details style={{ position: "relative" }}>
                    <summary className="chip" style={{ cursor: "pointer", listStyle: "none", borderStyle: "dashed" }}>+ Zustand</summary>
                    <div style={{ position: "absolute", top: "110%", left: 0, zIndex: 50, background: "var(--paper)", border: "1px solid var(--rule-2)", borderRadius: 8, padding: 10, boxShadow: "var(--shadow-lg)", display: "flex", flexWrap: "wrap", gap: 4, width: 320 }}>
                      {CONDITIONS.map(cond => (
                        <button key={cond} className={"t-chip" + (active.conds.includes(cond) ? " active" : "")} onClick={(e) => { toggleCond(cond); e.currentTarget.closest("details").open = false; }}>{cond}</button>
                      ))}
                    </div>
                  </details>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 18, marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 10, color: "var(--ink-mute)", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 600, fontFamily: "Inter, sans-serif", marginBottom: 6 }}>Trefferpunkte</div>
                <div style={{ fontFamily: "Fraunces, serif", marginBottom: 10 }}>
                  <span style={{ fontSize: 44, fontWeight: 500, color: pct <= 25 ? "var(--red)" : pct <= 50 ? "var(--accent)" : "var(--ink)", lineHeight: 1 }}>{active.hp}</span>
                  <span style={{ fontSize: 18, color: "var(--ink-mute)" }}> / {active.max}</span>
                </div>
                <Bar v={active.hp} max={active.max} c={pct <= 50 ? "red" : "green"}/>
              </div>
              <div className="stat" style={{ alignSelf: "center" }}>
                <div className="stat-label">RK</div>
                <div className="stat-value"><Editable value={active.ac} onChange={v => updateActive({ ac: +v || 0 })}/></div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: 12, background: "var(--bg)", border: "1px solid var(--rule)", borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 600, fontFamily: "Inter, sans-serif", marginRight: 4 }}>HP</div>
              <input type="text" value={delta} onChange={e => setDelta(e.target.value.replace(/\D/g, ""))} onKeyDown={e => { if (e.key === "Enter") adjust(-1); }} placeholder="0" style={{ width: 60, textAlign: "center", fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 500 }}/>
              <button className="btn" onClick={() => adjust(-1)} style={{ color: "var(--red)", borderColor: "#d9b0b0" }}>− Schaden</button>
              <button className="btn" onClick={() => adjust(1)} style={{ color: "var(--green)", borderColor: "#c0cba0" }}>+ Heilen</button>
              <div style={{ flex: 1 }}/>
              <button className="btn" onClick={prev}>← Zurück</button>
              <button className="btn btn-primary" onClick={next}>Zug beenden →</button>
            </div>

            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px dotted var(--rule)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>
              <span style={{ fontSize: 10, color: "var(--accent)", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 600, fontFamily: "Inter, sans-serif", marginRight: 8 }}>Notiz</span>
              <Editable value={active.note} onChange={v => updateActive({ note: v })} placeholder="Notiz hinzufügen…" style={{ fontStyle: "italic" }}/>
            </div>
          </div>
        </div>

        <div>
          <div className="card-title" style={{ marginBottom: 10 }}>Initiative</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sorted.map((c, i) => {
              const cColor = { player: "var(--accent)", enemy: "var(--red)", ally: "var(--green)" }[c.type];
              return (
                <button key={c.id} onClick={() => setActiveIdx(i)} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px",
                  background: i === activeIdx ? "var(--accent-soft)" : "var(--paper)",
                  border: `1px solid ${i === activeIdx ? "var(--accent)" : "var(--rule)"}`,
                  borderLeft: `3px solid ${cColor}`,
                  borderRadius: 6, opacity: c.hp === 0 ? 0.45 : 1,
                  textAlign: "left", width: "100%",
                }}>
                  <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 500, color: cColor, minWidth: 26, textAlign: "center" }}>{c.init}</div>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: cColor, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Fraunces, serif", fontSize: 13 }}>{c.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "Fraunces, serif", fontSize: 14, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                    <div style={{ marginTop: 3 }}><Bar v={c.hp} max={c.max} c={(c.hp/c.max) <= 0.5 ? "red" : "green"}/></div>
                  </div>
                  <div style={{ fontFamily: "Fraunces, serif", fontSize: 13, fontWeight: 500 }}>
                    {c.hp}<span style={{ color: "var(--ink-mute)" }}>/{c.max}</span>
                  </div>
                  <span title="Entfernen" onClick={e => { e.stopPropagation(); if (confirm(`${c.name} entfernen?`)) removeCombatant(c.id); }}
                    style={{ color: "var(--ink-mute)", fontSize: 12, padding: "2px 4px", borderRadius: 4, cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.color = "var(--red)"}
                    onMouseLeave={e => e.currentTarget.style.color = "var(--ink-mute)"}>✕</span>
                </button>
              );
            })}
          </div>
          <button className="btn" style={{ marginTop: 10, width: "100%" }} onClick={() => setAdding(a => !a)}><Icon n="plus" s={12}/> Kämpfer hinzufügen</button>
          {adding && addForm}
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// DICE
// =========================================================================
const DICE = [4, 6, 8, 10, 12, 20, 100];
const rollOnce = sides => Math.floor(Math.random() * sides) + 1;

const Dice = ({ char }) => {
  const [history, setHistory] = usePersistent("dice.history", HISTORY_SEED);
  const noAnim = () => window.__diceAnim === false;
  const [sides, setSides] = useState(20);
  const [count, setCount] = useState(1);
  const [mod, setMod] = useState(0);
  const [label, setLabel] = useState("");
  const [adv, setAdv] = useState("normal");
  const [rolling, setRolling] = useState(false);
  const [current, setCurrent] = useState({ faces: [20], sides: 20, total: 20, mod: 0, label: "" });

  const doRoll = (o = {}) => {
    if (rolling) return;
    const S = o.sides ?? sides, C = o.count ?? count, M = o.mod ?? mod;
    const L = o.label ?? (label || (C > 1 ? `${C}d${S}` : `d${S}`));
    if (o.sides) { setSides(S); setCount(C); setMod(M); setLabel(o.label || ""); }
    if (!noAnim()) setRolling(true);
    let rolls;
    if (adv !== "normal" && S === 20 && C === 1) {
      const a = rollOnce(20), b = rollOnce(20);
      rolls = adv === "advantage" ? [Math.max(a,b)] : [Math.min(a,b)];
    } else {
      rolls = Array.from({length: C}, () => rollOnce(S));
    }
    const total = rolls.reduce((a,b)=>a+b, 0) + M;
    setCurrent({ faces: rolls, sides: S, total, mod: M, label: L });
    const finish = () => {
      setRolling(false);
      setHistory(h => [{
        id: Date.now(), label: L,
        die: C > 1 ? `${C}d${S}` : `d${S}`,
        roll: rolls, mod: M, total,
        crit: S === 20 && C === 1 && rolls[0] === 20,
        fumble: S === 20 && C === 1 && rolls[0] === 1,
        time: "gerade eben",
      }, ...h].slice(0, 30));
    };
    if (noAnim()) finish(); else setTimeout(finish, 800);
  };

  // char kommt live aus der App — Proben sind immer aktuell

  return (
    <div>
      <div className="screen-head">
        <div>
          <div className="eyebrow">Die Würfelsteine</div>
          <h1>Würfel</h1>
        </div>
        <div className="head-meta" style={{ fontStyle: "italic" }}>Das Schicksal fällt, wie es will.</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 320px)", gap: 20 }}>
        <div style={{ minWidth: 0 }}>
          <div className="card" style={{ padding: 36, textAlign: "center", minHeight: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, background: "linear-gradient(180deg, var(--paper), var(--bg))" }}>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
              {current.faces.map((v, i) => (
                <div key={`${current.label}-${i}-${v}-${rolling}`} className={"die" + (rolling ? " rolling" : "") + (!rolling && current.sides === 20 && v === 20 ? " crit" : "") + (!rolling && current.sides === 20 && current.faces.length === 1 && v === 1 ? " fumble" : "")}
                  style={{ width: current.faces.length > 3 ? 80 : 110, height: current.faces.length > 3 ? 80 : 110, fontSize: current.faces.length > 3 ? 30 : 44 }}>
                  {rolling ? "?" : v}
                </div>
              ))}
            </div>
            {!rolling && (
              <div style={{ animation: "fadeUp 0.3s ease forwards" }}>
                {current.faces.length > 1 && (
                  <div style={{ fontSize: 12, color: "var(--ink-mute)", fontStyle: "italic", marginBottom: 4 }}>
                    {current.faces.join(" + ")}{current.mod ? ` ${current.mod >= 0 ? "+" : ""}${current.mod}` : ""}
                  </div>
                )}
                <div style={{ fontFamily: "Fraunces, serif", fontSize: 56, fontWeight: 500,
                  color: current.sides === 20 && current.faces[0] === 20 && current.faces.length === 1 ? "var(--accent)" :
                         current.sides === 20 && current.faces[0] === 1 && current.faces.length === 1 ? "var(--red)" : "var(--ink)",
                  lineHeight: 1 }}>{current.total}</div>
                <div style={{ fontSize: 11, color: "var(--ink-mute)", letterSpacing: ".12em", textTransform: "uppercase", marginTop: 4, fontFamily: "Inter, sans-serif", fontWeight: 600 }}>{current.label}</div>
              </div>
            )}
          </div>

          <div className="card" style={{ marginTop: 14 }}>
            <div className="card-title">Würfel</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              {DICE.map(d => (
                <button key={d} onClick={() => setSides(d)} style={{
                  flex: 1, padding: "9px 0",
                  background: sides === d ? "var(--accent)" : "var(--paper)",
                  border: `1px solid ${sides === d ? "var(--accent)" : "var(--rule-2)"}`,
                  color: sides === d ? "white" : "var(--ink-3)",
                  fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 500,
                  borderRadius: 6, transition: "all .12s",
                }}>d{d}</button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "70px 70px minmax(0, 1fr) auto", gap: 10, alignItems: "end", marginBottom: 12 }}>
              <div>
                <div className="tweak-label">Anzahl</div>
                <input type="number" min={1} max={20} value={count} onChange={e => setCount(Math.max(1, Math.min(20, +e.target.value || 1)))} style={{ width: "100%", textAlign: "center" }}/>
              </div>
              <div>
                <div className="tweak-label">Mod</div>
                <input type="number" value={mod} onChange={e => setMod(+e.target.value || 0)} style={{ width: "100%", textAlign: "center" }}/>
              </div>
              <div>
                <div className="tweak-label">Bezeichnung</div>
                <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="z. B. Wahrnehmung" style={{ width: "100%" }}/>
              </div>
              <button className="btn btn-primary" onClick={() => doRoll()} disabled={rolling} style={{ padding: "8px 18px" }}>{rolling ? "…" : "Würfeln"}</button>
            </div>

            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              {[["normal","Normal"],["advantage","Vorteil"],["disadvantage","Nachteil"]].map(([k,l]) => (
                <button key={k} className={"t-chip" + (adv === k ? " active" : "")} onClick={() => setAdv(k)}>{l}</button>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginTop: 14 }}>
            <div className="card-title">Proben — {(char.name || "").split(" ")[0]}</div>
            <div className="tweak-label">Rettungswürfe</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
              {Object.entries(char.stats || {}).map(([k, s]) => (
                <button key={k} className="t-chip" onClick={() => doRoll({ label: `${k}-Rettung`, sides: 20, mod: s.save, count: 1 })}>{k} {s.save >= 0 ? "+" : ""}{s.save}</button>
              ))}
            </div>
            <div className="tweak-label">Fertigkeiten</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
              {(char.skills || []).map(sk => (
                <button key={sk.name} className="t-chip" onClick={() => doRoll({ label: sk.name, sides: 20, mod: sk.mod, count: 1 })}>{sk.name} {sk.mod >= 0 ? "+" : ""}{sk.mod}</button>
              ))}
            </div>
            <div className="tweak-label">Sonstiges</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              <button className="t-chip" onClick={() => doRoll({ label: "Initiative", sides: 20, mod: char.stats?.DEX?.mod ?? 0, count: 1 })}>Initiative</button>
              <button className="t-chip" onClick={() => doRoll({ label: "Angriff", sides: 20, mod: (char.stats?.CHA?.mod ?? 0) + (char.prof ?? 0), count: 1 })}>Angriff +{(char.stats?.CHA?.mod ?? 0) + (char.prof ?? 0)}</button>
              <button className="t-chip" onClick={() => doRoll({ label: "Todesrettungswurf", sides: 20, mod: 0, count: 1 })}>Todesrettung</button>
              <button className="t-chip" onClick={() => doRoll({ label: "Trefferwürfel", sides: +(char.hitDice?.type || "d8").slice(1) || 8, mod: char.stats?.CON?.mod ?? 0, count: 1 })}>Trefferwürfel ({char.hitDice?.type || "d8"})</button>
              <button className="t-chip" onClick={() => doRoll({ label: "Zauberangriff", sides: 20, mod: (char.stats?.CHA?.mod ?? 0) + (char.prof ?? 0), count: 1 })}>Zauberangriff</button>
            </div>
          </div>
        </div>

        <div>
          <div className="card-title" style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>Wurf-Historie <button className="btn btn-ghost" style={{ fontSize: 10, padding: "2px 8px" }} onClick={() => { if (confirm("Wurf-Historie leeren?")) setHistory([]); }}>Leeren</button></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 580, overflowY: "auto" }}>
            {history.map(h => (
              <div key={h.id} style={{
                padding: "9px 12px",
                background: h.crit ? "var(--accent-soft)" : h.fumble ? "#f0d8d8" : "var(--paper)",
                border: "1px solid var(--rule)",
                borderLeft: `3px solid ${h.crit ? "var(--accent)" : h.fumble ? "var(--red)" : "var(--rule-2)"}`,
                borderRadius: 6,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ fontSize: 13, fontStyle: "italic" }}>{h.label}</div>
                  <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 500, color: h.crit ? "var(--accent)" : h.fumble ? "var(--red)" : "var(--ink)" }}>{h.total}</div>
                </div>
                <div style={{ fontSize: 10, color: "var(--ink-mute)", letterSpacing: ".06em", textTransform: "uppercase", fontFamily: "Inter, sans-serif", marginTop: 2 }}>
                  {h.die} [{h.roll.join(", ")}]{h.mod !== 0 && ` ${h.mod > 0 ? "+" : ""}${h.mod}`}{h.crit && " · KRIT!"}{h.fumble && " · PATZER"} · {h.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// NOTES
// =========================================================================
const tagColor = t => ({
  npc: "chip-accent", place: "chip-green", quest: "chip-blue", lore: "",
  session: "", main: "chip-accent", combat: "chip-red", party: "chip-green",
  fey: "chip-blue", town: "chip-green", wilderness: "chip-green", dungeon: "chip-red",
  imported: "chip-blue",
})[t] || "";

// Note body: renders wiki links in view mode, textarea in edit mode
const NoteBody = ({ note, onSave, onLink }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.body);
  useEffect(() => { setDraft(note.body); setEditing(false); }, [note.id]);
  if (editing) {
    return (
      <div>
        <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)}
          style={{ width: "100%", minHeight: 140, fontSize: 15, lineHeight: 1.7, color: "var(--ink)", fontFamily: "Source Serif 4, serif", background: "var(--paper)", border: "1px solid var(--accent)", borderRadius: 6, padding: 12 }}/>
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={() => { onSave(draft); setEditing(false); }}>Speichern</button>
          <button className="btn btn-sm" onClick={() => { setDraft(note.body); setEditing(false); }}>Abbrechen</button>
        </div>
      </div>
    );
  }
  const empty = !note.body;
  return (
    <div onClick={e => { if (!e.target.classList.contains("wikilink")) setEditing(true); }}
      style={{ fontSize: 15, lineHeight: 1.7, color: empty ? "var(--ink-mute)" : "var(--ink)", cursor: "text", fontStyle: empty ? "italic" : "normal", minHeight: 40 }}>
      {empty ? "Notiz schreiben… [[Titel]] verlinkt andere Notizen." : renderWiki(note.body, onLink)}
    </div>
  );
};

const Notes = () => {
  const [notes, setNotes] = usePersistent("notes", NOTES);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState(null);
  const [openId, setOpenId] = useState(null);
  const open = notes.find(n => n.id === openId) || null;

  const allTags = useMemo(() => [...new Set(notes.flatMap(n => n.tags))], [notes]);
  const filtered = notes.filter(n => {
    if (activeTag && !n.tags.includes(activeTag)) return false;
    if (query && !(n.title + " " + n.body).toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const handleLink = target => {
    const found = notes.find(n => n.title.toLowerCase() === target.toLowerCase());
    if (found) setOpenId(found.id);
  };
  const backlinks = open ? notes.filter(n => n.id !== open.id && n.body.toLowerCase().includes("[[" + open.title.toLowerCase())) : [];

  const updateNote = (id, patch) => setNotes(N => N.map(n => n.id === id ? { ...n, ...patch, updated: "heute" } : n));
  const addNote = () => {
    const id = Date.now();
    setNotes(N => [{ id, title: "Neue Notiz", tags: [], body: "", updated: "heute" }, ...N]);
    setOpenId(id);
  };
  const deleteNote = (id) => {
    if (!confirm("Diese Notiz löschen?")) return;
    setNotes(N => N.filter(n => n.id !== id));
    setOpenId(null);
  };
  const toggleNoteTag = (id, tag) => {
    setNotes(N => N.map(n => {
      if (n.id !== id) return n;
      const has = n.tags.includes(tag);
      return { ...n, tags: has ? n.tags.filter(t => t !== tag) : [...n.tags, tag] };
    }));
  };
  const addTag = (id) => {
    const tag = prompt("Tag-Name:");
    if (tag) toggleNoteTag(id, tag.toLowerCase().trim());
  };

  // ---- Import ----
  const [importing, setImporting] = useState(false);
  const [importText, setImportText] = useState("");
  const parseImport = (text) => {
    text = text.trim();
    if (!text) return [];
    // 1) JSON array
    try {
      const j = JSON.parse(text);
      if (Array.isArray(j)) return j.filter(n => n && (n.title || n.body)).map(n => ({
        title: String(n.title || "Untitled"), body: String(n.body || n.text || n.content || ""),
        tags: Array.isArray(n.tags) ? n.tags.map(String) : ["imported"],
      }));
    } catch(e) {}
    // 2) Markdown headings
    if (/^#{1,3}\s/m.test(text)) {
      const parts = text.split(/^(?=#{1,3}\s)/m).filter(s => s.trim());
      return parts.map(p => {
        const lines = p.trim().split("\n");
        const title = lines[0].replace(/^#{1,3}\s*/, "").trim() || "Untitled";
        return { title, body: lines.slice(1).join("\n").trim(), tags: ["imported"] };
      });
    }
    // 3) Blank-line blocks: first line = title
    const blocks = text.split(/\n\s*\n/).filter(b => b.trim());
    return blocks.map(b => {
      const lines = b.trim().split("\n");
      const first = lines[0].trim();
      const hasBody = lines.length > 1;
      return {
        title: hasBody ? first.slice(0, 80) : first.slice(0, 40) + (first.length > 40 ? "…" : ""),
        body: hasBody ? lines.slice(1).join("\n").trim() : first,
        tags: ["imported"],
      };
    });
  };
  const doImport = () => {
    const parsed = parseImport(importText);
    if (!parsed.length) { alert("Keine Notizen erkannt."); return; }
    const base = Date.now();
    setNotes(N => [...parsed.map((n, i) => ({ ...n, id: base + i, updated: "imported" })), ...N]);
    setImportText(""); setImporting(false);
  };
  const onImportFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setImportText(String(r.result || ""));
    r.readAsText(f);
    e.target.value = "";
  };

  return (
    <div>
      <div className="screen-head">
        <div>
          <div className="eyebrow">Das Notizbuch</div>
          <h1>Notizen</h1>
        </div>
        <div className="head-meta">{notes.length} Karten · {allTags.length} Tags</div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", width: 280 }}>
          <div style={{ position: "absolute", left: 10, top: 9, color: "var(--ink-mute)" }}><Icon n="search" s={14}/></div>
          <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Notizen durchsuchen…" style={{ width: "100%", paddingLeft: 32 }}/>
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <button className={"t-chip" + (!activeTag ? " active" : "")} onClick={() => setActiveTag(null)}>Alle</button>
          {allTags.map(t => (
            <button key={t} className={"t-chip" + (activeTag === t ? " active" : "")} onClick={() => setActiveTag(activeTag === t ? null : t)}>{t}</button>
          ))}
        </div>
        <div style={{ flex: 1 }}/>
        <button className="btn" onClick={() => setImporting(true)}>⤓ Import</button>
        <button className="btn btn-primary" onClick={addNote}><Icon n="plus" s={12}/> Neue Notiz</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
        {filtered.map(n => (
          <div key={n.id} className="card" onClick={() => setOpenId(n.id)} style={{ cursor: "pointer", transition: "all .15s", padding: 16, minHeight: 160, display: "flex", flexDirection: "column" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "var(--shadow-lg)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "var(--shadow-sm)"; e.currentTarget.style.borderColor = "var(--rule)"; }}>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
              {n.tags.map(t => <span key={t} className={"chip " + tagColor(t)}>{t}</span>)}
            </div>
            <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 500, lineHeight: 1.2, marginBottom: 8 }}>{n.title}</h3>
            <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5, flex: 1, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
              {n.body.replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, "$1")}
            </div>
            <div style={{ fontSize: 10, color: "var(--ink-mute)", letterSpacing: ".06em", textTransform: "uppercase", fontFamily: "Inter, sans-serif", fontWeight: 600, marginTop: 10, paddingTop: 8, borderTop: "1px dotted var(--rule)" }}>
              {n.updated}
            </div>
          </div>
        ))}
      </div>

      {importing && (
        <div onClick={() => setImporting(false)} style={{ position: "fixed", inset: 0, background: "rgba(44,24,16,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 210, padding: 30 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 640, background: "var(--paper)", border: "1px solid var(--rule-2)", borderRadius: 10, padding: 28, boxShadow: "var(--shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 500 }}>Notizen importieren</h2>
              <button className="btn btn-ghost" onClick={() => setImporting(false)}><Icon n="close"/></button>
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 12 }}>
              Text einfügen oder Datei laden (.txt, .md, .json). Markdown-Überschriften (<code style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11 }}># Titel</code>) werden eigene Notizen; sonst trennt eine Leerzeile die Notizen (erste Zeile = Titel).
            </div>
            <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder={"# Der Hohle Hirsch\nBegegnet bei Briarholt…\n\n# Mournkeep\nVerlassene Festung…"}
              style={{ width: "100%", minHeight: 200, fontSize: 13, lineHeight: 1.6, fontFamily: "JetBrains Mono, monospace", background: "var(--bg)", border: "1px solid var(--rule-2)", borderRadius: 6, padding: 12, color: "var(--ink)" }}/>
            <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
              <label className="btn" style={{ cursor: "pointer" }}>
                Datei wählen…
                <input type="file" accept=".txt,.md,.json,.markdown,text/plain,application/json" onChange={onImportFile} style={{ display: "none" }}/>
              </label>
              <div style={{ flex: 1 }}/>
              <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>{importText.trim() ? `${parseImport(importText).length} Notiz(en) erkannt` : ""}</span>
              <button className="btn btn-primary" onClick={doImport} disabled={!importText.trim()}>Importieren</button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div onClick={() => setOpenId(null)} style={{ position: "fixed", inset: 0, background: "rgba(44,24,16,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 30 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 680, maxHeight: "85vh", overflowY: "auto", background: "var(--paper)", border: "1px solid var(--rule-2)", borderRadius: 10, padding: 32, boxShadow: "var(--shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {open.tags.map(t => <button key={t} className={"chip " + tagColor(t)} onClick={() => toggleNoteTag(open.id, t)} style={{ cursor: "pointer" }} title="Click to remove">{t} ✕</button>)}
                  <button className="chip" style={{ borderStyle: "dashed", cursor: "pointer" }} onClick={() => addTag(open.id)}>+ tag</button>
                </div>
                <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 32, fontWeight: 500, lineHeight: 1.05 }}><Editable value={open.title} onChange={v => updateNote(open.id, { title: v })}/></h2>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button className="btn btn-ghost" onClick={() => deleteNote(open.id)} style={{ color: "var(--red)" }} title="Delete note">✕</button>
                <button className="btn btn-ghost" onClick={() => setOpenId(null)}><Icon n="close"/></button>
              </div>
            </div>
            <div className="divider"/>
            <NoteBody note={open} onSave={v => updateNote(open.id, { body: v })} onLink={handleLink}/>
            <div style={{ marginTop: 10, fontSize: 11, color: "var(--ink-mute)", fontStyle: "italic" }}>Tipp: [[Titel]] verlinkt Notizen · Text anklicken zum Bearbeiten</div>
            {backlinks.length > 0 && (
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--rule)" }}>
                <div style={{ fontSize: 11, color: "var(--accent)", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 600, fontFamily: "Inter, sans-serif", marginBottom: 8 }}>Verlinkt von</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {backlinks.map(b => (
                    <button key={b.id} onClick={() => setOpenId(b.id)} style={{ padding: "8px 12px", background: "var(--bg)", border: "1px solid var(--rule)", borderRadius: 6, textAlign: "left", fontFamily: "Fraunces, serif", fontSize: 14, fontWeight: 500 }}>{b.title}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// INVENTORY
// =========================================================================
const rarityColor = {
  common: "var(--ink-mute)",
  uncommon: "var(--green)",
  rare: "var(--blue)",
  legendary: "var(--accent)",
};
const TYPE_IT = { weapon: "Waffe", wondrous: "Wundersam", gear: "Ausrüstung", consumable: "Verbrauch", scroll: "Schriftrolle", trinket: "Kuriosität", currency: "Währung" };
const RARITY_DE = { common: "gewöhnlich", uncommon: "ungewöhnlich", rare: "selten", legendary: "legendär" };

const Inventory = () => {
  const [items, setItems] = usePersistent("inventory", ITEMS);
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? null);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", type: "gear", rarity: "common", qty: 1, weight: 0, desc: "" });
  const selected = items.find(i => i.id === selectedId) || items[0] || null;

  const totalWeight = items.reduce((a, i) => a + i.weight * i.qty, 0);
  const attuned = items.filter(i => i.attuned).length;
  const types = ["all", ...new Set(items.map(i => i.type))];
  const filtered = filter === "all" ? items : items.filter(i => i.type === filter);

  const updateItem = (id, patch) => setItems(I => I.map(i => i.id === id ? { ...i, ...patch } : i));
  const dropItem = (id) => {
    if (!confirm("Gegenstand ablegen?")) return;
    setItems(I => I.filter(i => i.id !== id));
    setSelectedId(null);
  };
  const useItem = (id) => {
    setItems(I => I.flatMap(i => {
      if (i.id !== id) return [i];
      if (i.qty > 1) return [{ ...i, qty: i.qty - 1 }];
      if (confirm(`Letzte(r) ${i.name} — aus dem Inventar entfernen?`)) return [];
      return [i];
    }));
  };
  const addItem = () => {
    if (!newItem.name) return;
    const id = Date.now();
    setItems(I => [...I, { ...newItem, id, attuned: false }]);
    setNewItem({ name: "", type: "gear", rarity: "common", qty: 1, weight: 0, desc: "" });
    setAdding(false);
    setSelectedId(id);
  };
  const placeholderDesc = "Beschreibung hinzufügen…";

  return (
    <div>
      <div className="screen-head">
        <div>
          <div className="eyebrow">Der Rucksack</div>
          <h1>Inventar</h1>
        </div>
        <div className="head-meta" style={{ display: "flex", gap: 28 }}>
          <div>
            <div style={{ fontSize: 10, color: "var(--ink-mute)", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 600, fontFamily: "Inter, sans-serif" }}>Gewicht</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 20, color: "var(--ink)" }}>{totalWeight} lb</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--ink-mute)", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 600, fontFamily: "Inter, sans-serif" }}>Eingestimmt</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 20, color: "var(--accent)" }}>{attuned}<span style={{ color: "var(--ink-mute)", fontSize: 13 }}> / 3</span></div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        {types.map(t => <button key={t} className={"t-chip" + (filter === t ? " active" : "")} onClick={() => setFilter(t)}>{t === "all" ? "alle" : (TYPE_IT[t] || t)}</button>)}
        <div style={{ flex: 1 }}/>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(a => !a)}><Icon n="plus" s={12}/> Gegenstand</button>
      </div>

      {adding && (
        <div className="card" style={{ marginBottom: 14, display: "grid", gridTemplateColumns: "2fr 1fr 1fr 80px 80px auto", gap: 10, alignItems: "end" }}>
          <div><div className="tweak-label">Name</div><input type="text" autoFocus value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} onKeyDown={e => { if (e.key === "Enter") addItem(); }} style={{ width: "100%" }}/></div>
          <div><div className="tweak-label">Typ</div>
            <select value={newItem.type} onChange={e => setNewItem({ ...newItem, type: e.target.value })} style={{ width: "100%", padding: "7px 10px", background: "var(--paper)", border: "1px solid var(--rule-2)", borderRadius: 5, fontFamily: "Inter, sans-serif", fontSize: 13 }}>
              {["weapon","wondrous","gear","consumable","scroll","trinket","currency"].map(t => <option key={t} value={t}>{TYPE_IT[t]}</option>)}
            </select>
          </div>
          <div><div className="tweak-label">Seltenheit</div>
            <select value={newItem.rarity} onChange={e => setNewItem({ ...newItem, rarity: e.target.value })} style={{ width: "100%", padding: "7px 10px", background: "var(--paper)", border: "1px solid var(--rule-2)", borderRadius: 5, fontFamily: "Inter, sans-serif", fontSize: 13 }}>
              {["common","uncommon","rare","legendary"].map(r => <option key={r} value={r}>{RARITY_DE[r]}</option>)}
            </select>
          </div>
          <div><div className="tweak-label">Anz.</div><input type="number" min={1} value={newItem.qty} onChange={e => setNewItem({ ...newItem, qty: Math.max(1, +e.target.value || 1) })} style={{ width: "100%" }}/></div>
          <div><div className="tweak-label">Pfd</div><input type="number" min={0} step={0.5} value={newItem.weight} onChange={e => setNewItem({ ...newItem, weight: Math.max(0, +e.target.value || 0) })} style={{ width: "100%" }}/></div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-primary" onClick={addItem}>Hinzufügen</button>
            <button className="btn" onClick={() => setAdding(false)}>✕</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 380px)", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map(item => (
            <button key={item.id} onClick={() => setSelectedId(item.id)} style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "12px 14px",
              background: selected?.id === item.id ? "var(--accent-soft)" : "var(--paper)",
              border: `1px solid ${selected?.id === item.id ? "var(--accent)" : "var(--rule)"}`,
              borderLeft: `3px solid ${rarityColor[item.rarity]}`,
              borderRadius: 6, textAlign: "left", width: "100%",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                  <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 500 }}>{item.name}</div>
                  {item.attuned && <span style={{ fontSize: 9, color: "var(--accent)", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 600, fontFamily: "Inter, sans-serif" }}>⚯ Attuned</span>}
                </div>
                <div style={{ fontSize: 10, color: rarityColor[item.rarity], letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 600, fontFamily: "Inter, sans-serif", marginTop: 2 }}>
                  {RARITY_DE[item.rarity] || item.rarity} · {TYPE_IT[item.type] || item.type}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 500 }}>×{item.qty}</div>
                <div style={{ fontSize: 10, color: "var(--ink-mute)", letterSpacing: ".06em", fontFamily: "Inter, sans-serif" }}>{item.weight} lb</div>
              </div>
              <span title="Löschen" onClick={e => { e.stopPropagation(); if (confirm(`${item.name} löschen?`)) { setItems(I => I.filter(x => x.id !== item.id)); if (selectedId === item.id) setSelectedId(null); } }}
                style={{ color: "var(--ink-mute)", fontSize: 12, padding: "2px 4px", borderRadius: 4, cursor: "pointer", alignSelf: "center" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--red)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--ink-mute)"}>✕</span>
            </button>
          ))}
        </div>

        {selected && (
          <div className="card" style={{ position: "sticky", top: 30, alignSelf: "start", borderTop: `3px solid ${rarityColor[selected.rarity]}` }}>
            <div style={{ fontSize: 10, color: rarityColor[selected.rarity], letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 600, fontFamily: "Inter, sans-serif", marginBottom: 4 }}>
              {RARITY_DE[selected.rarity] || selected.rarity} · {TYPE_IT[selected.type] || selected.type}
            </div>
            <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 26, fontWeight: 500, lineHeight: 1.1, marginBottom: 6 }}><Editable value={selected.name} onChange={v => updateItem(selected.id, { name: v })}/></h2>
            <button onClick={() => updateItem(selected.id, { attuned: !selected.attuned })} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 10, color: selected.attuned ? "var(--accent)" : "var(--ink-mute)", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 600, fontFamily: "Inter, sans-serif", marginBottom: 12, display: "block" }}>
              ⚯ {selected.attuned ? "Eingestimmt — klicken zum Lösen" : "Nicht eingestimmt — klicken zum Einstimmen"}
            </button>
            <div className="divider"/>
            <div style={{ fontSize: 14, lineHeight: 1.65, fontStyle: "italic", color: "var(--ink-2)", marginBottom: 16 }}><Editable multiline value={selected.desc} onChange={v => updateItem(selected.id, { desc: v })} placeholder={placeholderDesc}/></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
              <div className="stat"><div className="stat-label">Anzahl</div><div className="stat-value"><NumStepper value={selected.qty} onChange={v => updateItem(selected.id, { qty: v })} min={1}/></div></div>
              <div className="stat"><div className="stat-label">Gewicht</div><div className="stat-value"><Editable value={selected.weight} onChange={v => updateItem(selected.id, { weight: Math.max(0, +v || 0) })} style={{ display: "inline-block", minWidth: 24 }}/><span style={{ fontSize: 12, color: "var(--ink-mute)" }}> lb</span></div></div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn" style={{ flex: 1 }} onClick={() => useItem(selected.id)}>Benutzen (−1)</button>
              <button className="btn" style={{ color: "var(--red)", borderColor: "#d9b0b0" }} onClick={() => dropItem(selected.id)}>Ablegen</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// =========================================================================
// SPELLS / ZAUBER
// =========================================================================
const Spells = ({ c, setC }) => {
  const slots = c.slots || [];
  const spells = c.spells || [];
  const useSlot = (lvl, delta) => setC(p => ({ ...p, slots: p.slots.map(s => s.lvl === lvl ? { ...s, used: Math.max(0, Math.min(s.max, s.used + delta)) } : s) }));
  const cast = (sp) => {
    rollDice(sp.lvl === 0 ? `${sp.name} (Zaubertrick)` : `${sp.name} (Grad ${sp.lvl})`, 20, c.spellAtk || 0, 1);
    if (sp.lvl === 0) return;
    const slot = slots.find(s => s.lvl >= sp.lvl && s.used < s.max);
    if (slot) useSlot(slot.lvl, +1);
  };
  const togglePrep = (i) => setC(p => ({ ...p, spells: p.spells.map((s, idx) => idx === i ? { ...s, prep: !s.prep } : s) }));
  const rmSpell = (i) => { if (confirm("Zauber entfernen?")) setC(p => ({ ...p, spells: p.spells.filter((_, idx) => idx !== i) })); };
  const updSpell = (i, patch) => setC(p => ({ ...p, spells: p.spells.map((s, idx) => idx === i ? { ...s, ...patch } : s) }));
  const addSpell = () => { const lvl = +(prompt("Zaubergrad (0–9)?", "1") || 1); setC(p => ({ ...p, spells: [...p.spells, { name: "Neuer Zauber", lvl: Math.max(0, Math.min(9, lvl)), school: "", prep: true, desc: "" }] })); };
  const addSlot = () => {
    const lvl = Math.max(0, Math.min(9, +(prompt("Grad des Zauberplatzes (1–9)?", "1") || 1)));
    const max = Math.max(1, +(prompt("Anzahl Plätze?", "1") || 1));
    setC(p => {
      const ex = (p.slots||[]).find(s => s.lvl === lvl);
      const next = ex ? p.slots.map(s => s.lvl === lvl ? { ...s, max: s.max + max } : s) : [...(p.slots||[]), { lvl, max, used: 0 }];
      return { ...p, slots: next.sort((a, b) => a.lvl - b.lvl) };
    });
  };
  const rmSlotLvl = (lvl) => setC(p => ({ ...p, slots: p.slots.filter(s => s.lvl !== lvl) }));

  const byLevel = {};
  spells.forEach((s, i) => { (byLevel[s.lvl] = byLevel[s.lvl] || []).push({ ...s, i }); });
  const levels = Object.keys(byLevel).map(Number).sort((a, b) => a - b);
  const LVL_NAME = l => l === 0 ? "Zaubertricks" : `Grad ${l}`;

  return (
    <div>
      <div className="screen-head">
        <div>
          <div className="eyebrow">Zauberwirken</div>
          <h1>Zauber</h1>
        </div>
        <div className="head-meta" style={{ display: "flex", gap: 24 }}>
          <div>
            <div style={{ fontSize: 10, color: "var(--ink-mute)", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 600, fontFamily: "Inter, sans-serif" }}>Zauber-SG</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, color: "var(--ink)" }}><Editable value={c.spellDC} onChange={v => setC(p => ({ ...p, spellDC: +v || 0 }))}/></div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--ink-mute)", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 600, fontFamily: "Inter, sans-serif" }}>Angriff</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, color: "var(--accent)" }}>+<Editable value={c.spellAtk} onChange={v => setC(p => ({ ...p, spellAtk: +v || 0 }))} style={{ display: "inline-block", minWidth: 18 }}/></div>
          </div>
        </div>
      </div>

      {/* Angriffe & Waffen — direkt bei den Zauberwerten */}
      <AttacksBlock c={c} setC={setC}/>

      {/* Zauberplätze */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>Zauberplätze
          <button className="btn btn-sm" onClick={addSlot} style={{ textTransform: "none", letterSpacing: 0 }}>+ Zauberplatz</button>
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {slots.length === 0 && <span style={{ fontSize: 13, color: "var(--ink-mute)", fontStyle: "italic" }}>Keine Zauberplätze — über „+ Zauberplatz“ hinzufügen.</span>}
          {slots.map(s => (
            <div key={s.lvl} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, fontFamily: "Inter, sans-serif", marginBottom: 6, display: "flex", gap: 5, justifyContent: "center", alignItems: "center" }}>Grad {s.lvl} <span onClick={() => rmSlotLvl(s.lvl)} title="Entfernen" style={{ color: "var(--ink-mute)", cursor: "pointer", fontWeight: 400 }}>✕</span></div>
              <div style={{ display: "flex", gap: 5 }}>
                {Array.from({ length: s.max }).map((_, k) => (
                  <button key={k} onClick={() => useSlot(s.lvl, k < s.used ? -1 : +1)} title="Platz umschalten"
                    style={{ width: 20, height: 20, padding: 0, borderRadius: "50%", border: "1.5px solid var(--accent)", background: k < s.used ? "transparent" : "var(--accent)", cursor: "pointer" }}/>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 5 }}>{s.max - s.used}/{s.max} frei</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button className="btn btn-primary btn-sm" onClick={addSpell}><Icon n="plus" s={12}/> Zauber</button>
      </div>

      {levels.map(lvl => (
        <div key={lvl} style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 500, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
            {LVL_NAME(lvl)} <span style={{ flex: 1, height: 1, background: "var(--rule)" }}/>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 }}>
            {byLevel[lvl].map(sp => (
              <div key={sp.i} className="card" style={{ padding: 14, opacity: sp.prep ? 1 : 0.55 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <button onClick={() => togglePrep(sp.i)} title="Vorbereitet" style={{ width: 12, height: 12, padding: 0, borderRadius: 3, border: "1.5px solid var(--accent)", background: sp.prep ? "var(--accent)" : "transparent", cursor: "pointer", flexShrink: 0 }}/>
                  <div style={{ flex: 1, minWidth: 0, fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 500 }}><Editable value={sp.name} onChange={v => updSpell(sp.i, { name: v })}/></div>
                  {sp.conc && <span className="chip" style={{ fontSize: 9 }}>Konz.</span>}
                  <span onClick={() => rmSpell(sp.i)} style={{ color: "var(--ink-mute)", fontSize: 11, cursor: "pointer" }} title="Entfernen">✕</span>
                </div>
                <div style={{ fontSize: 10, color: "var(--ink-mute)", letterSpacing: ".06em", textTransform: "uppercase", fontFamily: "Inter, sans-serif", marginBottom: 6, marginLeft: 20 }}><Editable value={sp.school} onChange={v => updSpell(sp.i, { school: v })} placeholder="Schule"/></div>
                <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5, fontStyle: "italic", marginLeft: 20, marginBottom: 10 }}><Editable multiline value={sp.desc} onChange={v => updSpell(sp.i, { desc: v })} placeholder="Beschreibung…"/></div>
                <div style={{ marginLeft: 20 }}>
                  <button className="btn btn-sm btn-primary" onClick={() => cast(sp)}>{sp.lvl === 0 ? "Wirken" : "Wirken (Platz)"}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// =========================================================================
// GEGNER (Schaden-Tracker für Spieler — ohne TP-Kenntnis)
// =========================================================================
const ENEMIES_SEED = [
  { id: 1, name: "Goblin-Späher", dealt: 7, log: [3, 4], status: "active", knownHp: null, note: "RK 15? sehr flink" },
  { id: 2, name: "Oger", dealt: 0, log: [], status: "active", knownHp: null, note: "" },
];

const EnemyCard = ({ e, onDmg, onUndo, onUpd, onRemove }) => {
  const [amt, setAmt] = useState("");
  const apply = () => { const n = parseInt(amt, 10); if (n) onDmg(e.id, n); setAmt(""); };
  const remaining = e.knownHp != null ? Math.max(0, e.knownHp - e.dealt) : null;
  let disp = e.status;
  if (e.knownHp != null) disp = remaining === 0 ? "down" : remaining <= e.knownHp / 2 ? "bloodied" : "active";
  const label = { active: "Aktiv", bloodied: "Angeschlagen", down: "Besiegt" }[disp];
  const col = disp === "down" ? "var(--ink-mute)" : disp === "bloodied" ? "var(--red)" : "var(--accent)";
  const cycle = () => { if (e.knownHp != null) return; const o = ["active", "bloodied", "down"]; onUpd(e.id, { status: o[(o.indexOf(e.status) + 1) % 3] }); };
  return (
    <div className="card" style={{ borderTop: `3px solid ${col}`, opacity: disp === "down" ? 0.62 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0, fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 500 }}><Editable value={e.name} onChange={v => onUpd(e.id, { name: v })}/></div>
        <button className="chip" onClick={cycle} style={{ borderColor: col, color: col, background: "transparent", cursor: e.knownHp != null ? "default" : "pointer" }} title={e.knownHp != null ? "automatisch" : "Status wechseln"}>{label}</button>
        <span onClick={() => onRemove(e.id)} title="Entfernen" style={{ color: "var(--ink-mute)", cursor: "pointer", fontSize: 12 }}>✕</span>
      </div>

      <div style={{ textAlign: "center", margin: "4px 0 14px" }}>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 46, fontWeight: 500, color: "var(--accent)", lineHeight: 1 }}>{e.dealt}</div>
        <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-mute)", fontFamily: "Inter, sans-serif", fontWeight: 600, marginTop: 2 }}>Schaden ausgeteilt</div>
        {remaining != null && (
          <div style={{ marginTop: 10 }}>
            <Bar v={remaining} max={e.knownHp} c={remaining <= e.knownHp / 2 ? "red" : "green"}/>
            <div style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 4 }}>{remaining}/{e.knownHp} TP übrig</div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
        {[1, 2, 5, 10].map(n => <button key={n} className="t-chip" onClick={() => onDmg(e.id, n)}>+{n}</button>)}
        <input type="text" value={amt} onChange={ev => setAmt(ev.target.value.replace(/\D/g, ""))} onKeyDown={ev => { if (ev.key === "Enter") apply(); }} placeholder="…" style={{ width: 48, textAlign: "center" }}/>
        <button className="btn btn-sm btn-primary" onClick={apply}>+ Schaden</button>
        <button className="btn btn-sm" onClick={() => onUndo(e.id)} disabled={!e.log.length} title="Rückgängig">↶</button>
      </div>

      {e.log.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: ".08em", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>Treffer</span>
          {e.log.map((n, i) => <span key={i} style={{ fontSize: 11, fontFamily: "Fraunces, serif", padding: "1px 7px", background: "var(--bg)", border: "1px solid var(--rule)", borderRadius: 10 }}>{n}</span>)}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: "var(--ink-mute)" }}>TP bekannt?</span>
        <input type="text" value={e.knownHp == null ? "" : e.knownHp} onChange={ev => { const v = ev.target.value.replace(/\D/g, ""); onUpd(e.id, { knownHp: v === "" ? null : +v }); }} placeholder="–" style={{ width: 60, textAlign: "center" }}/>
        <span style={{ fontSize: 11, color: "var(--ink-mute)", fontStyle: "italic" }}>(falls der DM sie verrät)</span>
      </div>
      <div style={{ fontSize: 13, fontStyle: "italic", color: "var(--ink-2)" }}><Editable value={e.note} onChange={v => onUpd(e.id, { note: v })} placeholder="Notiz (RK, Resistenzen, Position…)"/></div>
    </div>
  );
};

// =========================================================================
// PARTY (Mitkämpfer — Kurzinfos)
// =========================================================================
const PARTY_SEED = [
  { id: 1, name: "Thorne Eisenschild", player: "Markus", role: "Zwerg-Kleriker", lvl: 7, ac: 18, status: "ok", note: "Heiler · Spirit Guardians · schuldet mir 50 GM" },
  { id: 2, name: "Mira Dämmerflüster", player: "Lena", role: "Halbling-Schurkin", lvl: 7, ac: 14, status: "ok", note: "Schleicher · Sneak Attack 4d6 · verflucht" },
  { id: 3, name: "Bramble", player: "Jonas", role: "Waldelf-Druide", lvl: 6, ac: 15, status: "ok", note: "Wildgestalt · Ranken & Heilung" },
];

const PartyCard = ({ p, onUpd, onRemove }) => {
  const ST = { ok: ["Wohlauf", "var(--green)"], hurt: ["Verletzt", "var(--gold)"], down: ["Kampfunfähig", "var(--red)"] };
  const cycle = () => { const o = ["ok", "hurt", "down"]; onUpd(p.id, { status: o[(o.indexOf(p.status) + 1) % 3] }); };
  const [lbl, col] = ST[p.status] || ST.ok;
  return (
    <div className="card" style={{ borderTop: `3px solid ${col}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <div style={{ width: 46, height: 46, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, var(--accent), var(--accent-deep))", color: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 500 }}>
          {(p.name || "?").trim().charAt(0)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 500 }}><Editable value={p.name} onChange={v => onUpd(p.id, { name: v })}/></div>
          <div style={{ fontSize: 12, color: "var(--ink-mute)" }}><Editable value={p.player} onChange={v => onUpd(p.id, { player: v })} placeholder="Spieler"/></div>
        </div>
        <button className="chip" onClick={cycle} title="Status wechseln" style={{ borderColor: col, color: col, background: "transparent", cursor: "pointer" }}>{lbl}</button>
        <span onClick={() => onRemove(p.id)} title="Entfernen" style={{ color: "var(--ink-mute)", cursor: "pointer", fontSize: 12 }}>✕</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div className="stat" style={{ flex: 1 }}><div className="stat-label">Klasse</div><div style={{ fontFamily: "Fraunces, serif", fontSize: 14, fontWeight: 500 }}><Editable value={p.role} onChange={v => onUpd(p.id, { role: v })}/></div></div>
        <div className="stat" style={{ width: 60 }}><div className="stat-label">Stufe</div><div className="stat-value" style={{ fontSize: 20 }}><Editable value={p.lvl} onChange={v => onUpd(p.id, { lvl: +String(v).replace(/\D/g,"") || 1 })}/></div></div>
        <div className="stat" style={{ width: 60 }}><div className="stat-label">RK</div><div className="stat-value" style={{ fontSize: 20 }}><Editable value={p.ac} onChange={v => onUpd(p.id, { ac: +String(v).replace(/\D/g,"") || 0 })}/></div></div>
      </div>
      <div style={{ fontSize: 13, color: "var(--ink-2)", fontStyle: "italic", lineHeight: 1.5 }}><Editable multiline value={p.note} onChange={v => onUpd(p.id, { note: v })} placeholder="Kurzinfo — Rolle, Eigenheiten, Beziehungen…"/></div>
    </div>
  );
};

const Party = () => {
  const [list, setList] = usePersistent("party", PARTY_SEED);
  const [name, setName] = useState("");
  const add = () => { if (!name.trim()) return; setList(L => [...L, { id: Date.now(), name: name.trim(), player: "", role: "", lvl: 1, ac: 10, status: "ok", note: "" }]); setName(""); };
  const upd = (id, patch) => setList(L => L.map(p => p.id === id ? { ...p, ...patch } : p));
  const remove = (id) => { if (confirm("Mitglied entfernen?")) setList(L => L.filter(p => p.id !== id)); };

  return (
    <div>
      <div className="screen-head">
        <div>
          <div className="eyebrow">Die Gefährten</div>
          <h1>Party</h1>
        </div>
        <div className="head-meta">{list.length} Mitglied{list.length === 1 ? "" : "er"}</div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <input type="text" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") add(); }} placeholder="Name des Mitglieds…" style={{ flex: 1, maxWidth: 360 }}/>
        <button className="btn btn-primary" onClick={add}><Icon n="plus" s={12}/> Mitglied hinzufügen</button>
      </div>

      {list.length === 0 ? (
        <div style={{ padding: 50, textAlign: "center", color: "var(--ink-mute)", fontStyle: "italic" }}>Noch keine Party. Füge oben deine Mitkämpfer hinzu.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {list.map(p => <PartyCard key={p.id} p={p} onUpd={upd} onRemove={remove}/>)}
        </div>
      )}
    </div>
  );
};

const Enemies = () => {
  const [list, setList] = usePersistent("enemies", ENEMIES_SEED);
  const [name, setName] = useState("");
  const add = () => { if (!name.trim()) return; setList(L => [...L, { id: Date.now(), name: name.trim(), dealt: 0, log: [], status: "active", knownHp: null, note: "" }]); setName(""); };
  const upd = (id, patch) => setList(L => L.map(e => e.id === id ? { ...e, ...patch } : e));
  const dmg = (id, n) => setList(L => L.map(e => e.id === id ? { ...e, dealt: Math.max(0, e.dealt + n), log: [n, ...e.log].slice(0, 14) } : e));
  const undo = (id) => setList(L => L.map(e => { if (e.id !== id || !e.log.length) return e; const [last, ...rest] = e.log; return { ...e, dealt: Math.max(0, e.dealt - last), log: rest }; }));
  const remove = (id) => { if (confirm("Gegner entfernen?")) setList(L => L.filter(e => e.id !== id)); };
  const newFight = () => { if (confirm("Neuer Kampf? Alle Gegner werden entfernt.")) setList([]); };
  const total = list.reduce((a, e) => a + e.dealt, 0);
  const active = list.filter(e => (e.knownHp != null ? e.knownHp - e.dealt > 0 : e.status !== "down")).length;

  return (
    <div>
      <div className="screen-head">
        <div>
          <div className="eyebrow">Schaden-Tracker</div>
          <h1>Gegner</h1>
        </div>
        <div className="head-meta" style={{ display: "flex", gap: 24, alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 10, color: "var(--ink-mute)", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 600, fontFamily: "Inter, sans-serif" }}>Aktiv</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, color: "var(--ink)" }}>{active}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--ink-mute)", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 600, fontFamily: "Inter, sans-serif" }}>Gesamt-Schaden</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, color: "var(--accent)" }}>{total}</div>
          </div>
          <button className="btn btn-ghost" onClick={newFight} style={{ fontSize: 10 }}>↻ Neuer Kampf</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <input type="text" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") add(); }} placeholder="Gegnername — z. B. Goblin, Drache…" style={{ flex: 1, maxWidth: 360 }}/>
        <button className="btn btn-primary" onClick={add}><Icon n="plus" s={12}/> Gegner hinzufügen</button>
      </div>

      {list.length === 0 ? (
        <div style={{ padding: 50, textAlign: "center", color: "var(--ink-mute)", fontStyle: "italic" }}>Noch keine Gegner. Füge oben einen hinzu und zähle einfach den ausgeteilten Schaden mit — TP musst du nicht kennen.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {list.map(e => <EnemyCard key={e.id} e={e} onDmg={dmg} onUndo={undo} onUpd={upd} onRemove={remove}/>)}
        </div>
      )}
    </div>
  );
};

// =========================================================================
// TWEAKS
// =========================================================================
const TweaksPanel = ({ t, setT, onClose }) => {
  const set = (k, v) => {
    setT({ ...t, [k]: v });
    if (window.parent !== window) window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*');
  };
  return (
    <div className="tweaks-panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3>Tweaks</h3>
        <button onClick={onClose} title="Minimieren" style={{ background: "none", border: "none", color: "var(--ink-mute)", fontSize: 16, padding: "0 4px" }}>−</button>
      </div>
      <div className="sub">Varianten ausprobieren</div>
      <div className="tweak-row">
        <span className="tweak-label">Dichte</span>
        <div className="t-chips">
          {[["compact","kompakt"],["comfortable","normal"],["spacious","luftig"]].map(([v,l]) => <button key={v} className={"t-chip" + (t.density === v ? " active" : "")} onClick={() => set("density", v)}>{l}</button>)}
        </div>
      </div>
      <div className="tweak-row">
        <span className="tweak-label">Würfel-Animation</span>
        <div className="t-chips">
          <button className={"t-chip" + (t.diceAnim ? " active" : "")} onClick={() => set("diceAnim", true)}>An</button>
          <button className={"t-chip" + (!t.diceAnim ? " active" : "")} onClick={() => set("diceAnim", false)}>Aus</button>
        </div>
      </div>
      <div className="tweak-row">
        <span className="tweak-label">Werte in Seitenleiste</span>
        <div className="t-chips">
          <button className={"t-chip" + (t.showVitals ? " active" : "")} onClick={() => set("showVitals", true)}>An</button>
          <button className={"t-chip" + (!t.showVitals ? " active" : "")} onClick={() => set("showVitals", false)}>Aus</button>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// APP
// =========================================================================
const NAV = [
  { sec: "Charakter", items: [
    { k: "character", l: "Charakter", i: "book" },
    { k: "spells", l: "Zauber", i: "magic" },
    { k: "inventory", l: "Inventar", i: "chest" },
    { k: "party", l: "Party", i: "party" },
  ]},
  { sec: "Am Tisch", items: [
    { k: "combat", l: "Kampf", i: "sword" },
    { k: "enemies", l: "Gegner", i: "target" },
    { k: "dice", l: "Würfel", i: "dice" },
    { k: "notes", l: "Notizen", i: "scroll" },
  ]},
];

const App = () => {
  const [tweaks, setTweaks] = usePersistent("tweaks", DEFAULT_TWEAKS);
  const [tweaksOpen, setTweaksOpen] = usePersistent("tweaksOpen", false);
  const [screen, setScreen] = useState(() => localStorage.getItem("dnd.screen") || "combat");
  const [char, setChar] = usePersistent("character", CHARACTER);
  // Migration: fehlende Felder aus Standard ergänzen (alte Speicherände)
  useEffect(() => {
    setChar(prev => {
      const m = { ...prev };
      let changed = false;
      if (!Array.isArray(m.attacks)) { m.attacks = []; changed = true; }
      if (!Array.isArray(m.slots)) { m.slots = []; changed = true; }
      if (!Array.isArray(m.spells)) { m.spells = []; changed = true; }
      if (!Array.isArray(m.skills)) { m.skills = CHARACTER.skills; changed = true; }
      if (!Array.isArray(m.features)) { m.features = []; changed = true; }
      if (!m.stats) { m.stats = CHARACTER.stats; changed = true; }
      if (!m.hitDice) { m.hitDice = CHARACTER.hitDice; changed = true; }
      if (!m.initials) { m.initials = (m.name || CHARACTER.name).trim().charAt(0) || "?"; changed = true; }
      if (m.spellDC == null) { m.spellDC = 13; changed = true; }
      if (m.spellAtk == null) { m.spellAtk = 5; changed = true; }
      if (!m.deathSaves) { m.deathSaves = { s: 0, f: 0 }; changed = true; }
      return changed ? m : prev;
    });
  }, []);
  const [toast, setToast] = useState(null);
  useEffect(() => {
    const h = e => { setToast(e.detail); clearTimeout(window.__tt); window.__tt = setTimeout(() => setToast(null), 2800); };
    window.addEventListener("dnd-roll", h);
    return () => window.removeEventListener("dnd-roll", h);
  }, []);
  useEffect(() => { localStorage.setItem("dnd.screen", screen); }, [screen]);

  // Apply tweaks
  useEffect(() => {
    document.body.className = tweaks.density && tweaks.density !== "comfortable" ? `density-${tweaks.density}` : "";
    window.__diceAnim = tweaks.diceAnim !== false;
  }, [tweaks]);

  useEffect(() => {
    const h = e => {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "__activate_edit_mode") setTweaksOpen(true);
      if (e.data.type === "__deactivate_edit_mode") setTweaksOpen(false);
    };
    window.addEventListener("message", h);
    if (window.parent !== window) window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", h);
  }, []);

  const Screens = { character: Character, party: Party, combat: Combat, enemies: Enemies, dice: Dice, notes: Notes, inventory: Inventory };

  const c = char;
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">C</div>
          <div>
            <div className="brand-text">Codex</div>
            <div className="brand-sub"><Editable value={tweaks.campaign || "Meine Kampagne"} onChange={v => { const next = { ...tweaks, campaign: v }; setTweaks(next); }}/></div>
          </div>
        </div>
        <nav className="nav">
          {NAV.map(grp => (
            <div key={grp.sec}>
              <div className="section-label" style={{ padding: "10px 12px 4px" }}>{grp.sec}</div>
              {grp.items.map(n => (
                <button key={n.k} className={"nav-item" + (screen === n.k ? " active" : "")} onClick={() => setScreen(n.k)} data-screen-label={n.l}>
                  <Icon n={n.i} s={15}/>{n.l}
                </button>
              ))}
            </div>
          ))}
        </nav>
        {tweaks.showVitals && (
          <div style={{ margin: "16px 14px", padding: "12px 14px", background: "var(--bg-2)", borderRadius: 8, border: "1px solid var(--rule)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-mute)", fontFamily: "Inter, sans-serif" }}>HP</span>
              <span style={{ fontFamily: "Fraunces, serif", fontSize: 14, fontWeight: 500 }}>{c.hp}<span style={{ color: "var(--ink-mute)" }}>/{c.hpMax}</span></span>
            </div>
            <Bar v={c.hp} max={c.hpMax} c="red"/>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11 }}>
              <div><div style={{ color: "var(--ink-mute)", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 9, letterSpacing: ".1em" }}>AC</div><div style={{ fontFamily: "Fraunces, serif", fontSize: 14, fontWeight: 500 }}>{c.ac}</div></div>
              <div><div style={{ color: "var(--ink-mute)", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 9, letterSpacing: ".1em" }}>SPD</div><div style={{ fontFamily: "Fraunces, serif", fontSize: 14, fontWeight: 500 }}>{c.speed}</div></div>
              <div><div style={{ color: "var(--ink-mute)", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 9, letterSpacing: ".1em" }}>PROF</div><div style={{ fontFamily: "Fraunces, serif", fontSize: 14, fontWeight: 500 }}>+{c.prof}</div></div>
            </div>
          </div>
        )}
        <div className="sidebar-footer">
          <BackupBar/>
          <div className="char-chip">
            <div className="char-portrait" style={c.portrait ? { padding: 0, overflow: "hidden" } : {}}>{c.portrait ? <img src={c.portrait} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/> : c.initials}</div>
            <div>
              <div className="char-name">{c.name.split(" ")[0]}</div>
              <div className="char-sub">St. {c.level} {c.class}</div>
            </div>
          </div>
        </div>
      </aside>
      <main className="main">{(() => {
        if (screen === "character") return <Character c={char} setC={setChar}/>;
        if (screen === "spells") return <Spells c={char} setC={setChar}/>;
        if (screen === "dice") return <Dice char={char}/>;
        const S = Screens[screen] || Character;
        return <S />;
      })()}</main>
      {toast && (
        <div style={{ position: "fixed", bottom: 74, right: 20, zIndex: 120, background: "var(--paper)", border: "1px solid var(--accent)", borderRadius: 10, padding: "12px 18px", boxShadow: "var(--shadow-lg)", animation: "fadeUp .2s ease forwards", minWidth: 160 }}>
          <div style={{ fontSize: 10, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, fontFamily: "Inter, sans-serif" }}>{toast.label}</div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 30, fontWeight: 500, color: toast.sides === 20 && toast.rolls.length === 1 && toast.rolls[0] === 20 ? "var(--accent)" : toast.sides === 20 && toast.rolls.length === 1 && toast.rolls[0] === 1 ? "var(--red)" : "var(--ink)" }}>
            {toast.total} <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>[{toast.rolls.join(", ")}]{toast.mod ? (toast.mod > 0 ? " +" + toast.mod : " " + toast.mod) : ""}</span>
          </div>
        </div>
      )}
      {tweaksOpen
        ? <TweaksPanel t={tweaks} setT={setTweaks} onClose={() => setTweaksOpen(false)}/>
        : <button className="tweaks-fab" title="Tweaks öffnen" onClick={() => setTweaksOpen(true)}>⚙</button>}
    </div>
  );
};

export default App;