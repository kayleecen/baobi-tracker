// Basic regression checks for 宝比健康成长中 (Baby's Healthy Growth tracker).
//
// Purpose: after any future edit to one feature module, run this to make sure
// the OTHER modules still work as expected. This is intentionally a plain
// Playwright script (no test framework) to keep the project dependency-free.
//
// Usage:
//   node tests/regression.test.js
//
// Requires: `playwright` installed (npm i -D playwright) and a Chromium build
// available. If PLAYWRIGHT_CHROMIUM_PATH is set, that executable is used
// (useful in sandboxes that ship a prebuilt browser).

const path = require('path');
const { chromium } = require('playwright');

const INDEX = process.env.REGRESSION_TARGET_HTML
  ? 'file://' + path.resolve(process.env.REGRESSION_TARGET_HTML)
  : 'file://' + path.resolve(__dirname, '..', 'index.html');

let pass = 0, fail = 0;
const failures = [];

function ok(label, cond) {
  if (cond) { pass++; console.log('  ok  -', label); }
  else { fail++; failures.push(label); console.log('  FAIL -', label); }
}
function eq(label, actual, expected) {
  ok(label + ` (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`, actual === expected);
}

async function main() {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('dialog', d => d.dismiss().catch(() => {}));

  await page.goto(INDEX);
  await page.waitForTimeout(300);

  // ---------- 1. loads with no JS errors ----------
  ok('page loads with no uncaught JS errors', pageErrors.length === 0);

  // ---------- 2. feeding module: add, edit (correct row), delete ----------
  await page.evaluate(() => go(1)); // record page
  await page.evaluate(() => { openSheet(); pickMl(60); saveFeed(); });
  await page.evaluate(() => { openSheet(); pickMl(90); saveFeed(); });
  await page.waitForTimeout(100);

  let feedRows = await page.$$eval('#feedList .row', rows => rows.map(r => r.textContent.trim()));
  ok('feed list shows newest (90ml) on top after two adds', feedRows[0].includes('90'));

  // edit the TOP row (must edit the 90ml record, not the 60ml one - regression
  // guard for the reverse-index bug)
  await page.evaluate(() => document.querySelector('#feedList .row .edit-btn').click());
  const editedMl = await page.$eval('#customMl', el => el.value);
  await page.evaluate(() => { pickMl(150); saveFeed(); });
  await page.waitForTimeout(100);
  feedRows = await page.$$eval('#feedList .row', rows => rows.map(r => r.textContent.trim()));
  ok('editing the top row changes the 90ml record (not the 60ml one)', feedRows[0].includes('150') && feedRows[1].includes('60'));

  // delete via edit sheet
  await page.evaluate(() => document.querySelector('#feedList .row .edit-btn').click());
  await page.evaluate(() => deleteFeedFromSheet());
  await page.waitForTimeout(100);
  feedRows = await page.$$eval('#feedList .row', rows => rows.map(r => r.textContent.trim()));
  eq('one feed record remains after delete', feedRows.length, 1);
  ok('remaining feed record is the 60ml one', feedRows[0].includes('60'));

  // ---------- 3. feeding timer banner: driven by edited `at`, not `ts` ----------
  const bannerRightAfterAdd = await page.$eval('#bannerRecord', el => el.textContent);
  ok('banner shows a fresh "0小时" style reading right after adding a feed', /0小时/.test(bannerRightAfterAdd));

  const fiveHoursAgoHM = await page.evaluate(() => {
    const d = new Date(Date.now() - 5 * 3600 * 1000);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  });
  await page.evaluate((hm) => {
    document.querySelector('#feedList .row .edit-btn').click();
    document.getElementById('feedTimeInput').value = hm;
    saveFeed();
    updateBanner();
  }, fiveHoursAgoHM);
  await page.waitForTimeout(100);
  const bannerRecordText = await page.$eval('#bannerRecord', el => el.textContent);
  const bannerRecordClass = await page.$eval('#bannerRecord', el => el.className);
  ok('record-page banner reflects the EDITED time (~5小时), not the original add time', /5小时/.test(bannerRecordText));
  eq('record-page banner is in "due" state after 5h', bannerRecordClass, 'due');

  const homeBannerText = await page.evaluate(() => { go(0); updateBanner(); return document.getElementById('banner').textContent; });
  ok('home-page banner matches record-page banner', /5小时/.test(homeBannerText));

  // ---------- 4. diaper module: add, edit (correct row), delete ----------
  await page.evaluate(() => go(1));
  await page.evaluate(() => addDiaper('pee'));
  await page.evaluate(() => addDiaper('poo'));
  await page.waitForTimeout(100);

  let diaperRows = await page.$$eval('#diaperList .row', rows => rows.map(r => r.textContent.trim()));
  ok('diaper list shows newest (粑粑/poo) on top after two adds', diaperRows[0].includes('粑粑'));

  await page.evaluate(() => document.querySelector('#diaperList .row .edit-btn').click());
  const diaperOverlayClass = await page.$eval('#diaperOverlay', el => el.className);
  ok('diaper edit sheet opens', diaperOverlayClass.includes('show'));
  await page.evaluate(() => { pickDiaperType('pee'); saveDiaper(); });
  await page.waitForTimeout(100);
  diaperRows = await page.$$eval('#diaperList .row', rows => rows.map(r => r.textContent.trim()));
  ok('editing the top row changes the newest (poo->pee) record, not the older one', diaperRows[0].includes('尿尿') && diaperRows[1].includes('尿尿'));

  await page.evaluate(() => document.querySelector('#diaperList .row .edit-btn').click());
  await page.evaluate(() => deleteDiaperFromSheet());
  await page.waitForTimeout(100);
  diaperRows = await page.$$eval('#diaperList .row', rows => rows.map(r => r.textContent.trim()));
  eq('one diaper record remains after delete', diaperRows.length, 1);

  // ---------- 5. home timeline: newest-first + single "最新" tag ----------
  await page.evaluate(() => go(0));
  await page.waitForTimeout(150);
  const latestTagCount = await page.$$eval('#dayList .latest-tag', els => els.length);
  eq('home timeline shows exactly one "最新" tag', latestTagCount, 1);
  const firstRowHasTag = await page.$eval('#dayList .row:first-child', el => el.textContent.includes('最新'));
  ok('"最新" tag is on the first (newest) row', firstRowHasTag);

  // ---------- 6. baby profile card ----------
  await page.evaluate(() => {
    document.getElementById('babyWeight') && (document.getElementById('babyWeight').value = '8.2');
    document.getElementById('babyHeight') && (document.getElementById('babyHeight').value = '70');
  });
  const hasProfileFn = await page.evaluate(() => typeof saveBabyProfile === 'function');
  ok('saveBabyProfile function is present after refactor', hasProfileFn);

  // ---------- 7. calendar / report page renders without throwing ----------
  const reportErrorsBefore = pageErrors.length;
  await page.evaluate(() => go(2));
  await page.waitForTimeout(200);
  ok('switching to report page does not throw', pageErrors.length === reportErrorsBefore);
  const milkCanvasExists = await page.$('#milkChart') !== null;
  ok('report page milk chart canvas is present', milkCanvasExists);

  // ---------- 8. data merge logic (used by import) is intact ----------
  const mergeOk = await page.evaluate(() => {
    const a = { '2026-07-01': { feeds: [{ ml: 60, at: '08:00', ts: 100 }], diapers: [] } };
    const b = { '2026-07-01': { feeds: [{ ml: 90, at: '09:00', ts: 200 }], diapers: [] } };
    const merged = mergeData(a, b);
    return merged['2026-07-01'].feeds.length === 2;
  });
  ok('mergeData combines same-day records from two sources', mergeOk);

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) {
    console.log('Failed checks:', failures.join('; '));
  }
  await browser.close();
  process.exit(fail ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
