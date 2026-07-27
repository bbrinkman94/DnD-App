/**
 * Manual smoke test, run against a preview build.
 *
 *   npm run build && npx vite preview --port 4173 &
 *   node scripts/smoke.mjs [url]
 *
 * Playwright is an optional dev dependency: if the browser is missing this
 * script just fails, and nothing else in the project depends on it.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const out = process.env.SMOKE_OUT ?? './smoke-shots';
mkdirSync(out, { recursive: true });

const executablePath = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({
  executablePath,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));

const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });
const say = (...a) => console.log(...a);

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(2200);
await shot('01-title');
say('title:', await page.locator('.title__name').textContent());

await page.getByRole('button', { name: 'Begin' }).click();
await page.waitForTimeout(3500);
await shot('02-inn-outside');

// Drive the story through the debug store rather than walking for a minute.
const dialogue = async (tree, name) => {
  await page.evaluate((t) => window.thresholdStores.useGame.getState().startDialogue(t), tree);
  await page.waitForTimeout(1400);
  await shot(name);
};

await dialogue('inn-emrik', '03-dialogue');
say('speaker:', await page.locator('.dialogue__name').first().textContent().catch(() => 'narration'));

// Advance to the first set of choices, then take a skill check.
for (let i = 0; i < 6; i++) {
  const choices = await page.locator('.choice').count();
  if (choices > 0) break;
  await page.locator('.dialogue__panel').click();
  await page.waitForTimeout(450);
}
say('choices offered:', await page.locator('.choice').count());
await shot('04-choices');

// Pick a choice with a check on it if there is one.
await page.evaluate(() => window.thresholdStores.useGame.getState().startDialogue('inn-emrik'));
await page.waitForTimeout(600);
for (let i = 0; i < 8; i++) {
  await page.locator('.dialogue__panel').click();
  await page.waitForTimeout(300);
  if (await page.locator('.choice').count()) break;
}
const check = page.locator('.choice', { has: page.locator('.tag--check') }).first();
if (await check.count()) {
  await check.click();
  await page.waitForTimeout(2800);
  await shot('05-dice');
  say('dice verdict:', await page.locator('.dice__verdict').textContent().catch(() => 'still rolling'));
  await page.getByRole('button', { name: /Continue|Skip/ }).click();
  await page.waitForTimeout(800);
}

// Combat.
await page.evaluate(() => {
  const g = window.thresholdStores.useGame.getState();
  g.setChapter('shrine');
});
await page.waitForTimeout(2500);
await page.evaluate(() => window.thresholdStores.useGame.getState().beginCombat());
await page.waitForTimeout(2500);
await shot('06-combat');
say('combat actors:', await page.locator('.turn-chip').count());

// Play a few rounds by clicking whatever is available.
for (let round = 0; round < 14; round++) {
  const outcome = await page.evaluate(() => window.thresholdStores.useGame.getState().combat?.outcome);
  if (outcome !== 'ongoing') break;
  const mine = await page.evaluate(() => {
    const c = window.thresholdStores.useGame.getState().combat;
    return c && c.order[c.turnIndex] === 'corvin' && !window.thresholdStores.useGame.getState().combatBusy;
  });
  if (!mine) {
    await page.waitForTimeout(900);
    continue;
  }
  const mockery = page.locator('.action-btn', { hasText: 'Vicious Mockery' }).first();
  if ((await mockery.count()) && (await mockery.isEnabled())) {
    await mockery.click();
    const target = page.locator('.target-btn').filter({ hasText: 'Mist-Touched' }).first();
    if (await target.count()) await target.click();
  }
  await page.locator('.target-btn', { hasText: 'End turn' }).first().click();
  await page.waitForTimeout(1200);
}
await shot('07-combat-late');
say('combat outcome:', await page.evaluate(() => window.thresholdStores.useGame.getState().combat?.outcome ?? 'resolved'));

// Menus and settings persistence.
await page.keyboard.press('Escape');
await page.waitForTimeout(600);
await shot('08-pause');
await page.getByRole('button', { name: 'Corvin' }).click();
await page.waitForTimeout(500);
await shot('09-sheet');
await page.getByRole('button', { name: 'Settings' }).click();
await page.waitForTimeout(400);
await shot('10-settings');

// Ending + credits.
await page.evaluate(() => {
  const g = window.thresholdStores.useGame.getState();
  g.setMenu(null);
  g.setChapter('gate');
  g.setMedallion(1, 3);
});
await page.waitForTimeout(2500);
await shot('11-gate');
await page.evaluate(() => window.thresholdStores.useGame.getState().showFinale());
await page.waitForTimeout(2200);
await shot('12-finale');
await page.evaluate(() => window.thresholdStores.useGame.getState().rollCredits());
await page.waitForTimeout(1600);
await shot('13-credits');

// Save + reload -> Continue must exist.
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1800);
const continueBtn = page.getByRole('button', { name: /Continue/ });
say('continue enabled after reload:', await continueBtn.isEnabled());
await shot('14-title-returned');

// Narrow layout.
await page.setViewportSize({ width: 720, height: 720 });
await page.waitForTimeout(900);
await shot('15-narrow');

say('CONSOLE ERRORS:', errors.length);
errors.slice(0, 12).forEach((e) => say(' -', e.slice(0, 300)));
await browser.close();
process.exit(errors.length > 0 ? 1 : 0);
