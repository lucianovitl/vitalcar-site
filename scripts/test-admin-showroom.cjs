const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const admin = fs.readFileSync(path.join(root, 'admin', 'index.html'), 'utf8');
const publicPage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const adminSw = fs.readFileSync(path.join(root, 'admin', 'sw.js'), 'utf8');

test('admin exposes a protected showroom configuration surface', () => {
  assert.match(admin, /href="#showroom"[^>]+data-tab="showroom"/);
  assert.match(admin, /id="panel-showroom"/);
  for (const id of ['showroom-enabled', 'showroom-mode', 'showroom-color', 'showroom-auto-rotate', 'showroom-preview', 'showroom-status', 'showroom-salvar', 'showroom-restaurar']) {
    assert.match(admin, new RegExp(`id="${id}"`), id);
  }
  assert.match(admin, /SHOWROOM_DEFAULTS\s*=\s*\{\s*enabled:true,\s*defaultMode:'3d',\s*defaultColor:'red',\s*autoRotate:true\s*\}/);
  assert.match(admin, /function normalizeShowroom\(data\)/);
  assert.match(admin, /function carregarShowroom\(\)/);
  assert.match(admin, /function salvarShowroom\(\)/);
  assert.match(admin, /doc\(db, 'config', 'showroom'\)/);
  assert.match(admin, /setDoc\(doc\(db, 'config', 'showroom'\)/);
  assert.match(admin, /carregarShowroom\(\);/);
});

test('showroom writes stay behind explicit admin action and Firestore rules', () => {
  const saveStart = admin.indexOf('async function salvarShowroom');
  const saveEnd = admin.indexOf('async function restaurarShowroom', saveStart);
  const loadStart = admin.indexOf('async function carregarShowroom');
  const loadEnd = admin.indexOf('function dadosShowroomForm', loadStart);
  assert.ok(saveStart >= 0 && saveEnd > saveStart);
  assert.ok(loadStart >= 0 && loadEnd > loadStart);
  assert.match(admin.slice(saveStart, saveEnd), /setDoc\(doc\(db, 'config', 'showroom'\)/);
  assert.doesNotMatch(admin.slice(loadStart, loadEnd), /setDoc\(|addDoc\(|updateDoc\(/);
  assert.match(rules, /match \/config\/\{docId\}/);
  assert.match(rules, /allow read: if true;/);
  assert.match(rules, /allow write: if isAdmin\(\);/);
});

test('public fallback and cache contain the showroom stack', () => {
  assert.equal((publicPage.match(/id="conteudo"/g) || []).length, 1);
  assert.equal((publicPage.match(/data-scene-index=/g) || []).length, 3);
  assert.doesNotMatch(publicPage, /liquid-metal-vanilla\.js/);
  for (const asset of ['showroom.css', 'scripts/car-3d.js', 'scripts/showroom.js']) {
    const escaped = asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(publicPage, new RegExp(escaped));
    assert.match(sw, new RegExp("'/" + escaped + "'"));
  }
});

test('admin shell cache version advances with the new panel', () => {
  assert.match(adminSw, /vitalcar-admin-v10/);
  assert.match(adminSw, /vitalcar-admin-runtime-v10/);
});
