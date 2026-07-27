import { useMemo } from "react";

const PROF_BY_LEVEL = [2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6];

const XP_BY_LEVEL = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
];

export const computeLevelUpPlan = (character) => {
  const currentLevel = Math.max(1, Math.min(20, Number(character?.level) || 1));
  const nextLevel = Math.min(20, currentLevel + 1);
  const conMod = Number(character?.stats?.CON?.mod) || 0;
  const hitDie = Number(String(character?.hitDice?.type || "d8").replace(/\D/g, "")) || 8;
  const averageHpGain = Math.max(1, Math.floor(hitDie / 2) + 1 + conMod);

  return {
    currentLevel,
    nextLevel,
    canLevel: currentLevel < 20,
    prof: PROF_BY_LEVEL[nextLevel - 1] || 6,
    xpNext: XP_BY_LEVEL[nextLevel] || XP_BY_LEVEL.at(-1),
    averageHpGain,
    notes: [
      "Trefferpunkte erhöhen",
      "Übungsbonus prüfen",
      "Klassenmerkmale und Zauberplätze im Regelwerk nachtragen",
      "Neue Ressourcen oder Angriffe im Charakterbogen ergänzen",
    ],
  };
};

export const LevelUpModal = ({ c, setC, onClose }) => {
  const plan = useMemo(() => computeLevelUpPlan(c), [c]);

  const applyLevelUp = () => {
    if (!plan.canLevel) return;
    setC((prev) => ({
      ...prev,
      level: plan.nextLevel,
      prof: plan.prof,
      xpNext: plan.xpNext,
      hp: (Number(prev.hp) || 0) + plan.averageHpGain,
      hpMax: (Number(prev.hpMax) || 0) + plan.averageHpGain,
      hitDice: {
        ...(prev.hitDice || {}),
        cur: Math.min(plan.nextLevel, Number(prev.hitDice?.cur || 0) + 1),
        max: plan.nextLevel,
      },
    }));
    onClose?.();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">Level-Up Assistent</div>
            <h2>Stufe aufsteigen</h2>
          </div>
          <button className="btn btn-ghost" onClick={onClose}>Schließen</button>
        </div>
        {plan.canLevel ? (
          <>
            <p>
              {c?.name || "Dein Charakter"} steigt von Stufe {plan.currentLevel} auf Stufe {plan.nextLevel}.
              Der Assistent trägt Basiswerte ein; Klassenmerkmale solltest du danach prüfen.
            </p>
            <div className="level-grid">
              <div><span>Neue Stufe</span><strong>{plan.nextLevel}</strong></div>
              <div><span>Übungsbonus</span><strong>+{plan.prof}</strong></div>
              <div><span>TP-Zuwachs</span><strong>+{plan.averageHpGain}</strong></div>
              <div><span>Nächste EP-Schwelle</span><strong>{plan.xpNext}</strong></div>
            </div>
            <ul className="check-list">
              {plan.notes.map((note) => <li key={note}>{note}</li>)}
            </ul>
            <div className="modal-actions">
              <button className="btn" onClick={onClose}>Abbrechen</button>
              <button className="btn btn-primary" onClick={applyLevelUp}>Basiswerte übernehmen</button>
            </div>
          </>
        ) : (
          <p>Dieser Charakter ist bereits auf Stufe 20.</p>
        )}
      </div>
    </div>
  );
};

const collectBackup = () => {
  const data = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key?.startsWith("dnd.")) data[key] = localStorage.getItem(key);
  }
  return { version: 1, exportedAt: new Date().toISOString(), data };
};

export const BackupBar = () => {
  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(collectBackup(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dnd-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      Object.entries(backup.data || {}).forEach(([key, value]) => localStorage.setItem(key, value));
      window.location.reload();
    } catch (error) {
      alert(`Backup konnte nicht importiert werden: ${error.message || error}`);
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="backup-bar">
      <button className="btn btn-sm" onClick={exportBackup}>Backup</button>
      <label className="btn btn-sm">
        Restore
        <input type="file" accept="application/json,.json" onChange={importBackup} />
      </label>
    </div>
  );
};
