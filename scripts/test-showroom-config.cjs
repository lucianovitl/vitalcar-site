const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const tools = require('./showroom.js');

const source = fs.readFileSync(path.join(__dirname, 'showroom.js'), 'utf8');
const studioSource = fs.readFileSync(path.join(__dirname, 'studio.js'), 'utf8');
const defaults = { enabled: true, defaultMode: '3d', defaultColor: 'red', autoRotate: true };

test('showroom config helpers expose exact defaults and unwrap Firestore fields', () => {
  assert.deepEqual(tools.DEFAULT_CONFIG, defaults);
  assert.deepEqual(tools.parseConfigFields({
    fields: {
      enabled: { booleanValue: false },
      defaultMode: { stringValue: 'photos' },
      defaultColor: { stringValue: 'graphite' },
      autoRotate: { booleanValue: false },
      count: { integerValue: '4' },
      ratio: { doubleValue: '1.25' }
    }
  }), {
    enabled: false,
    defaultMode: 'photos',
    defaultColor: 'graphite',
    autoRotate: false,
    count: 4,
    ratio: 1.25
  });
  assert.deepEqual(tools.normalizeConfig({
    fields: {
      enabled: { booleanValue: false },
      defaultMode: { stringValue: 'photos' },
      defaultColor: { stringValue: 'pearl' },
      autoRotate: { booleanValue: false }
    }
  }), { enabled: false, defaultMode: 'photos', defaultColor: 'pearl', autoRotate: false });
});

test('invalid config values fall back field-by-field without widening allowed values', () => {
  assert.deepEqual(tools.normalizeConfig({
    fields: {
      enabled: { stringValue: 'false' },
      defaultMode: { stringValue: 'video' },
      defaultColor: { stringValue: 'blue' },
      autoRotate: { integerValue: '0' }
    }
  }), defaults);
  assert.deepEqual(tools.normalizeConfig({
    enabled: false,
    defaultMode: 'photos',
    defaultColor: 'pearl',
    autoRotate: false
  }), { enabled: false, defaultMode: 'photos', defaultColor: 'pearl', autoRotate: false });
  assert.deepEqual(tools.normalizeConfig({
    fields: {
      enabled: { booleanValue: true },
      defaultMode: { stringValue: '3d' },
      defaultColor: { stringValue: 'red' },
      autoRotate: { booleanValue: true }
    }
  }), defaults);
});

test('absent, malformed and numeric-edge config inputs return defaults without throwing', () => {
  for (const input of [undefined, null, [], { fields: null }, { fields: [] }, { fields: {
    enabled: { booleanValue: 'yes' },
    defaultMode: { stringValue: '' },
    defaultColor: { stringValue: 'red\0' },
    autoRotate: { doubleValue: 'NaN' }
  } }]) {
    assert.doesNotThrow(() => tools.normalizeConfig(input));
    assert.deepEqual(tools.normalizeConfig(input), defaults);
  }
  assert.deepEqual(tools.parseFields({ fields: { integer: { integerValue: '-2' }, decimal: { doubleValue: 0 } } }), {
    integer: -2,
    decimal: 0
  });
});

test('booleans stay strict and every allowed mode/color is accepted', () => {
  for (const key of ['enabled', 'autoRotate']) {
    for (const value of [0, 1, '', 'true', 'false', null, [], {}, NaN, Infinity]) {
      assert.equal(tools.normalizeConfig({ [key]: value })[key], true);
    }
    for (const value of [true, false]) assert.equal(tools.normalizeConfig({ [key]: value })[key], value);
  }
  for (const [key, allowed] of [['defaultMode', ['3d', 'photos']], ['defaultColor', ['red', 'pearl', 'graphite']]]) {
    for (const value of allowed) assert.equal(tools.normalizeConfig({ [key]: value })[key], value);
    for (const value of [null, 0, false, {}, [], '', 'RED', 'Photos', '3D', ' pearl ', '__proto__']) {
      assert.equal(tools.normalizeConfig({ [key]: value })[key], defaults[key]);
    }
  }
});

test('malformed wrappers and prototype keys cannot influence normalized config', () => {
  const input = JSON.parse('{"fields":{"__proto__":{"enabled":false},"enabled":{"booleanValue":false,"stringValue":"bad"},"autoRotate":{"mapValue":{"fields":{}}}}}');
  assert.deepEqual(tools.normalizeConfig(input), defaults);
  assert.deepEqual(tools.normalizeConfig({ fields: null, enabled: false }), defaults);
  assert.deepEqual(tools.normalizeConfig(Object.create({ enabled: false })), defaults);
  for (const wrapper of [{ integerValue: '1.5' }, { integerValue: '9007199254740993' }, { doubleValue: 'Infinity' }, { doubleValue: '' }, { doubleValue: '0x20' }]) {
    assert.deepEqual(tools.parseFields({ value: wrapper }), {});
  }
});

function eventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(fn); },
    removeEventListener(type, fn) { listeners.set(type, (listeners.get(type) || []).filter(item => item !== fn)); },
    dispatchEvent(event) { for (const fn of (listeners.get(event.type) || []).slice()) fn(event); return true; },
    emit(type, values = {}) { return this.dispatchEvent({ type, preventDefault() {}, ...values }); }
  };
}

function element() {
  const classes = new Set();
  return Object.assign(eventTarget(), {
    hidden: false, disabled: false, attributes: {}, dataset: {}, textContent: '', children: [], clicks: 0,
    style: { setProperty(key, value) { this[key] = value; } },
    classList: {
      add(...names) { names.forEach(name => classes.add(name)); },
      remove(...names) { names.forEach(name => classes.delete(name)); },
      contains(name) { return classes.has(name); },
      toggle(name, on) { if (on) classes.add(name); else classes.delete(name); }
    },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getAttribute(name) { return this.attributes[name] ?? null; },
    hasAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name); },
    contains(node) { return node === this || this.children.some(child => child.contains(node)); },
    appendChild(node) { this.children.push(node); node.parentElement = this; },
    matches() { return false; }, focus() {},
    click() { if (!this.disabled) { this.clicks++; this.emit('click'); } },
    querySelector() { return null; }, querySelectorAll() { return []; },
    getBoundingClientRect() { return { top: 20, bottom: 500, width: 500, height: 300 }; },
    hasPointerCapture() { return false; }, releasePointerCapture() {}, setPointerCapture() {}
  });
}

function response(config = {}) {
  return { ok: true, json: async () => ({ fields: Object.fromEntries(Object.entries(config).map(([key, value]) => [key,
    typeof value === 'boolean' ? { booleanValue: value } : { stringValue: value }
  ])) }) };
}
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

function browserFixture(options = {}) {
  const root = element(); root.lang = 'pt-BR'; root.clientHeight = 800; root.scrollHeight = 1600;
  const ids = Object.fromEntries([
    'studio-visual', 'showroom-root', 'showroom-canvas', 'showroom-mode',
    'showroom-motion', 'showroom-motion-note', 'studio-motion-toggle',
    'studio-motion-label', 'showroom-reset', 'showroom-status'
  ].map(id => [id, element()]));
  const visual = ids['studio-visual'], panel = ids['showroom-root'], modeControl = ids['showroom-mode'];
  const canvas = ids['showroom-canvas'], shared = ids['studio-motion-toggle'], photoControls = element();
  let top = options.near === false ? 2000 : 20;
  visual.getBoundingClientRect = () => ({ top, bottom: top + 500, width: 500, height: 500 });
  const scenes = [0, 1, 2].map(index => {
    const scene = element(), image = element(); image.complete = true; image.naturalWidth = 1200;
    scene.querySelector = () => image;
    scene.classList.toggle('is-active', index === 0);
    scene.setAttribute('aria-hidden', index !== 0);
    return scene;
  });
  const photoButtons = scenes.map((_, index) => { const button = element(); button.dataset.scene = String(index); return button; });
  const modeButtons = ['3d', 'photos'].map(mode => { const button = element(); button.setAttribute('data-showroom-mode', mode); button.setAttribute('aria-pressed', mode === 'photos'); return button; });
  const colorButtons = ['red', 'pearl', 'graphite'].map(color => { const button = element(); button.setAttribute('data-showroom-color', color); return button; });
  const caption = element(); caption.setAttribute('data-showroom-text', 'caption');
  panel.hidden = true; ids['showroom-status'].hidden = true;
  visual.querySelectorAll = selector => ({ '.studio-scene': scenes, '[data-scene-index]': scenes, 'button[data-scene]': photoButtons, '[data-showroom-text]': [caption] })[selector] || [];
  visual.querySelector = selector => selector === '.studio-controls' ? photoControls : photoButtons[0];
  panel.querySelectorAll = () => colorButtons;
  modeControl.querySelectorAll = () => modeButtons;
  [panel, modeControl, photoControls, ...scenes].forEach(node => visual.appendChild(node));
  [canvas, ...colorButtons, ids['showroom-motion'], ids['showroom-reset']].forEach(node => panel.appendChild(node));
  [...photoButtons, shared].forEach(node => photoControls.appendChild(node));
  modeButtons.forEach(node => modeControl.appendChild(node));
  const document = Object.assign(eventTarget(), {
    documentElement: root, activeElement: null, hidden: !!options.hidden,
    getElementById: id => ids[id], createElement: element, querySelectorAll: () => []
  });
  [...Object.values(ids), ...modeButtons, ...photoButtons].forEach(node => { node.focus = () => { document.activeElement = node; }; });
  const timers = new Map(), frames = new Map(), calls = [], draws = [], events = [];
  let nextTimer = 0, nextFrame = 0, creates = 0, destroys = 0;
  const reduced = Object.assign(eventTarget(), { matches: !!options.reduced });
  const fine = Object.assign(eventTarget(), { matches: true });
  const window = Object.assign(eventTarget(), {
    document, innerHeight: 800, devicePixelRatio: 1, scrollY: 0,
    matchMedia: query => query.includes('reduced') ? reduced : fine,
    CustomEvent: function(type, init) { this.type = type; this.detail = init.detail; },
    setTimeout(fn, ms) { timers.set(++nextTimer, { fn, ms }); return nextTimer; },
    clearTimeout(id) { timers.delete(id); },
    requestAnimationFrame(fn) { frames.set(++nextFrame, fn); return nextFrame; },
    cancelAnimationFrame(id) { frames.delete(id); },
    AbortController,
    fetch: options.noFetch ? undefined : (url, init) => {
      calls.push({ url, init });
      return options.fetch ? options.fetch(url, init) : Promise.resolve(response(options.config));
    }
  });
  if (!options.noRenderer) window.Vitalcar3D = { create() {
    creates++;
    if (options.createFails) throw new Error('No WebGL');
    return {
      resize: () => options.resizeFails ? false : true,
      draw(state) {
        draws.push({ ...state, photoAria: scenes[0].getAttribute('aria-hidden'), preparing: panel.classList.contains('is-preparing') });
        return !options.drawFails;
      },
      destroy() { destroys++; }
    };
  } };
  for (const type of ['vitalcar:view', 'vitalcar:showroom-config']) window.addEventListener(type, event => events.push(event));
  const context = vm.createContext({ window, document, navigator: { connection: { saveData: !!options.saveData } },
    setTimeout: window.setTimeout, clearTimeout: window.clearTimeout,
    requestAnimationFrame: window.requestAnimationFrame, cancelAnimationFrame: window.cancelAnimationFrame });
  vm.runInContext(studioSource, context);
  vm.runInContext(source, context);
  return { root, window, document, ids, visual, panel, canvas, modeControl, modeButtons, colorButtons, photoControls, photoButtons, scenes, caption, shared,
    reduced, calls, draws, events, timers, frames, get creates() { return creates; }, get destroys() { return destroys; },
    enterViewport() { top = 20; window.emit('scroll'); },
    runFrame(time = 100) { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(time)); },
    timeout() { const entry = [...timers.entries()].find(([, value]) => value.ms === 5000); assert.ok(entry); timers.delete(entry[0]); entry[1].fn(); }
  };
}

function assertPhotos(fixture, controlsHidden = true) {
  assert.equal(fixture.visual.classList.contains('is-3d'), false);
  assert.equal(fixture.panel.hidden, true);
  assert.equal(fixture.modeControl.hidden, controlsHidden);
  assert.equal(fixture.photoControls.hidden, false);
  assert.equal(fixture.scenes[0].getAttribute('aria-hidden'), 'false');
}

test('loading retains photos; one public GET gates renderer creation and the first configured draw', async () => {
  const pending = deferred();
  const s = browserFixture({ fetch: () => pending.promise });
  assertPhotos(s);
  assert.equal(s.creates, 0);
  s.modeButtons[0].click(); s.window.emit('pageshow'); s.enterViewport();
  assert.equal(s.creates, 0);
  assert.equal(s.calls.length, 1);
  const { url, init } = s.calls[0];
  assert.equal(url, 'https://firestore.googleapis.com/v1/projects/vitalcar-87179/databases/(default)/documents/config/showroom?key=AIzaSyBcp2qNpvhXHszEXmyW96plVxR9_FTAn6c');
  assert.equal(init.method, 'GET'); assert.equal(init.credentials, 'omit'); assert.ok(init.signal instanceof AbortSignal);
  assert.equal(init.body, undefined); assert.equal(init.headers, undefined);
  pending.resolve(response({ defaultColor: 'graphite' })); await flush();
  assert.equal(s.creates, 1); assert.equal(s.modeControl.hidden, false);
  assert.equal(s.visual.classList.contains('is-3d'), true); assert.equal(s.panel.hidden, false);
  assert.equal(s.draws[0].color, 'graphite'); assert.equal(s.draws[0].photoAria, 'false'); assert.equal(s.draws[0].preparing, true);
  assert.equal(s.colorButtons[2].getAttribute('aria-pressed'), 'true');
  assert.equal(s.modeButtons[0].getAttribute('aria-pressed'), 'true');
  assert.equal(s.scenes[0].getAttribute('aria-hidden'), 'true');
  assert.equal(Object.isFrozen(s.window.VitalcarShowroomConfig), true);
  assert.equal(Object.getOwnPropertyDescriptor(s.window, 'VitalcarShowroomConfig').writable, false);
  assert.equal(s.window.VitalcarShowroomConfigTools, undefined);
});

test('disabled showroom stays in photos and never creates a renderer', async () => {
  const s = browserFixture({ config: { enabled: false, autoRotate: false } }); await flush();
  assertPhotos(s); assert.equal(s.creates, 0); assert.equal(s.shared.clicks, 0);
  s.modeButtons[0].click(); s.window.emit('pageshow'); s.enterViewport(); s.document.emit('visibilitychange');
  assert.equal(s.creates, 0); assert.equal(s.calls.length, 1);
  s.photoButtons[1].click(); await flush();
  assert.equal(s.scenes[1].getAttribute('aria-hidden'), 'false');
});

test('photos default proves renderer availability before exposing a usable 3D toggle', async () => {
  const s = browserFixture({ config: { defaultMode: 'photos', defaultColor: 'pearl' } }); await flush();
  assertPhotos(s, false); assert.equal(s.creates, 1); assert.equal(s.draws[0].color, 'pearl');
  assert.deepEqual(s.events.filter(event => event.type === 'vitalcar:view').map(event => event.detail.mode), ['photos']);
  s.modeButtons[0].click(); assert.equal(s.panel.hidden, false);
  s.modeButtons[1].click(); assertPhotos(s, false);
});

test('renderer remains lazy after config is known and starts only near the viewport', async () => {
  const s = browserFixture({ near: false }); await flush();
  assertPhotos(s); assert.equal(s.creates, 0);
  s.enterViewport(); assert.equal(s.creates, 1); assert.equal(s.panel.hidden, false);
});

test('static config pauses shared intent once and preserves manual color, orbit, reset and resume controls', async () => {
  const s = browserFixture({ config: { autoRotate: false } }); await flush();
  assert.equal(s.shared.clicks, 1); assert.equal(s.root.getAttribute('data-motion-paused'), 'true');
  assert.equal(s.frames.size, 0);
  s.colorButtons[1].click(); s.runFrame(); assert.equal(s.draws.at(-1).color, 'pearl');
  s.canvas.emit('keydown', { key: 'ArrowRight' }); s.runFrame(); assert.ok(s.draws.at(-1).yaw > .7);
  s.ids['showroom-reset'].click(); s.runFrame(); assert.equal(s.draws.at(-1).yaw, .7);
  s.ids['showroom-motion'].click();
  assert.equal(s.shared.clicks, 2); assert.equal(s.root.getAttribute('data-motion-paused'), 'false');
  assert.ok(s.frames.size > 0);
  s.modeButtons[1].click(); s.modeButtons[0].click(); assert.equal(s.shared.clicks, 2);
});

test('hidden-tab suspension does not prevent setting real paused intent', async () => {
  const s = browserFixture({ hidden: true, config: { autoRotate: false } }); await flush();
  assertPhotos(s); assert.equal(s.creates, 0); assert.equal(s.shared.clicks, 0);
  s.document.hidden = false; s.document.emit('visibilitychange');
  assert.equal(s.creates, 1); assert.equal(s.shared.clicks, 1); assert.equal(s.root.getAttribute('data-motion-paused'), 'true');
  const draws = s.draws.length; s.runFrame();
  assert.ok(s.draws.length <= draws + 1);
  assert.equal(s.frames.size, 0);
});

test('reduced motion and already paused intent remain respected', async () => {
  const saved = browserFixture({ saveData: true, config: { autoRotate: false } }); await flush();
  assert.equal(saved.shared.clicks, 0); assert.equal(saved.root.getAttribute('data-motion-paused'), 'true');
  const reduced = browserFixture({ reduced: true, config: { autoRotate: false } }); await flush();
  assert.equal(reduced.shared.clicks, 0); assert.equal(reduced.ids['showroom-motion'].disabled, true);
  reduced.reduced.matches = false; reduced.reduced.emit('change');
  assert.equal(reduced.shared.clicks, 1); assert.equal(reduced.root.getAttribute('data-motion-paused'), 'true');
  assert.equal(reduced.frames.size, 0);
  const normalDefault = browserFixture({ saveData: true }); await flush();
  assert.equal(normalDefault.shared.clicks, 0); assert.equal(normalDefault.root.getAttribute('data-motion-paused'), 'true');
});

test('renderer creation, resize and first-draw failures keep photos usable', async () => {
  for (const options of [{ noRenderer: true }, { createFails: true }, { resizeFails: true }, { drawFails: true }]) {
    const s = browserFixture(options); await flush();
    assertPhotos(s); assert.equal(s.ids['showroom-status'].hidden, false);
    const creates = s.creates;
    s.window.emit('pageshow'); s.document.emit('visibilitychange'); s.enterViewport(); s.modeButtons[0].click();
    assert.equal(s.creates, creates); assert.equal(s.calls.length, 1);
  }
});

test('context loss returns to photos permanently and retains translations', async () => {
  const s = browserFixture(); await flush();
  s.canvas.emit('webglcontextlost'); assertPhotos(s); assert.equal(s.destroys, 1);
  s.root.lang = 'en'; s.window.emit('vitalcar:language');
  assert.equal(s.caption.textContent, 'Illustrative 3D model');
  assert.match(s.ids['showroom-status'].textContent, /interrupted/);
  s.root.lang = 'es'; s.window.emit('vitalcar:language'); assert.match(s.ids['showroom-status'].textContent, /interrumpió/);
  s.window.emit('pageshow'); s.modeButtons[0].click(); assertPhotos(s); assert.equal(s.creates, 1);
});

test('missing/error/invalid config falls back to defaults without failing the renderer or retrying', async () => {
  for (const fetch of [
    () => Promise.reject(new Error('offline')),
    () => { throw new Error('blocked'); },
    () => Promise.resolve({ ok: false, status: 404 }),
    () => Promise.resolve({ ok: true, json: () => Promise.reject(new Error('invalid JSON')) }),
    () => Promise.resolve({ ok: true, json: async () => null }),
    () => Promise.resolve({ ok: true, json: async () => ({ error: { code: 403 } }) }),
    () => Promise.resolve(response({ defaultMode: 'bad', defaultColor: 'blue' }))
  ]) {
    const s = browserFixture({ fetch }); await flush();
    assert.deepEqual({ ...s.window.VitalcarShowroomConfig }, defaults);
    assert.equal(s.creates, 1); assert.equal(s.panel.hidden, false); assert.equal(s.ids['showroom-status'].hidden, true);
    assert.equal([...s.timers.values()].some(timer => timer.ms === 5000), false);
    s.window.emit('pageshow'); s.document.emit('visibilitychange'); assert.equal(s.calls.length, 1);
  }
});

test('timeout bounds both network and JSON reads, aborts once, and ignores late results', async () => {
  for (const stage of ['fetch', 'json']) {
    const pending = deferred();
    const s = browserFixture({ fetch: () => stage === 'fetch' ? pending.promise : Promise.resolve({ ok: true, json: () => pending.promise }) });
    await flush(); assertPhotos(s); assert.equal(s.creates, 0);
    s.timeout(); await flush();
    assert.equal(s.calls[0].init.signal.aborted, true);
    assert.deepEqual({ ...s.window.VitalcarShowroomConfig }, defaults);
    assert.equal(s.creates, 1); assert.equal(s.panel.hidden, false);
    pending.resolve(stage === 'fetch' ? response({ enabled: false }) : { fields: { enabled: { booleanValue: false } } });
    await flush(); assert.equal(s.panel.hidden, false); assert.equal(s.calls.length, 1);
    assert.equal(s.events.filter(event => event.type === 'vitalcar:showroom-config').length, 1);
  }
});

test('a browser environment without fetch still initializes with defaults', async () => {
  const s = browserFixture({ noFetch: true }); await flush();
  assert.equal(s.calls.length, 0); assert.equal(s.creates, 1); assert.equal(s.panel.hidden, false);
  assert.deepEqual({ ...s.window.VitalcarShowroomConfig }, defaults);
});

test('the browser controller source remains parseable without browser globals', () => {
  assert.doesNotThrow(() => new vm.Script(source));
  assert.doesNotThrow(() => vm.runInNewContext(source, {}));
});
