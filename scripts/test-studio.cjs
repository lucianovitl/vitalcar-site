const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const rootDir = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(__dirname, 'studio.js'), 'utf8');
const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(rootDir, 'studio.css'), 'utf8');

function node() {
  const classes = new Set();
  return {
    attributes: {}, dataset: {}, handlers: {}, properties: {}, children: [], textContent: '',
    style: { setProperty(k, v) { this[k] = v; } },
    classList: { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x), toggle(x, on) { if (on) classes.add(x); else classes.delete(x); } },
    setAttribute(k, v) { this.attributes[k] = v; }, getAttribute(k) { return this.attributes[k] || null; },
    hasAttribute(k) { return k in this.attributes; },
    addEventListener(k, fn) { this.handlers[k] = fn; }, removeEventListener(k) { delete this.handlers[k]; },
    appendChild(child) { this.children.push(child); }, contains: () => false,
    getBoundingClientRect: () => ({ top: 100, bottom: 650, width: 400, height: 550, left: 700 })
  };
}
function fixture({ reduced = false, saveData = false, broken = false, observers = false } = {}) {
  const root = node(); root.lang = 'pt-BR'; root.scrollHeight = 5000; root.classList.add('no-js');
  const visual = node(), nav = node(), toggle = node(), label = node();
  const buttons = [0, 1, 2].map(i => { const b = node(); b.dataset.scene = String(i); return b; });
  const images = [0, 1, 2].map(i => {
    const image = node(); image.complete = i === 0; image.naturalWidth = i === 0 ? 1200 : 0;
    if (i === 0) image.attributes.src = 'img/hero-01.webp'; else image.dataset.src = 'img/photo-' + i + '.webp';
    Object.defineProperty(image, 'src', { set(value) {
      image.attributes.src = value;
      image.complete = true; image.naturalWidth = broken ? 0 : 1200;
      image.handlers[broken ? 'error' : 'load']?.();
    } });
    return image;
  });
  const scenes = images.map((image, i) => { const s = node(); s.querySelector = () => image; s.setAttribute('aria-hidden', String(i !== 0)); s.classList.toggle('is-active', i === 0); return s; });
  visual.querySelectorAll = selector => selector.includes('button') ? buttons : scenes;
  const ids = { 'studio-visual': visual, 'site-nav': nav, 'studio-motion-toggle': toggle, 'studio-motion-label': label };
  const document = { documentElement: root, hidden: false, handlers: {},
    getElementById: id => ids[id], createElement: () => node(), querySelectorAll: () => [], addEventListener(k, fn) { this.handlers[k] = fn; } };
  const media = { matches: reduced, addEventListener(k, fn) { this.change = fn; } };
  const fine = { matches: true, addEventListener() {} };
  const window = { innerHeight: 800, scrollY: 0, handlers: {}, matchMedia: q => q.includes('reduced') ? media : fine,
    addEventListener(k, fn) { this.handlers[k] = fn; } };
  const timers = new Map(); let id = 0;
  const intersectionObservers = [];
  function IntersectionObserver(callback) { this.callback = callback; this.observe = () => {}; this.unobserve = () => {}; intersectionObservers.push(this); }
  if (observers) window.IntersectionObserver = IntersectionObserver;
  const context = { window, document, navigator: { connection: { saveData } }, IntersectionObserver,
    setTimeout(fn, ms) { timers.set(++id, { fn, ms }); return id; }, clearTimeout: timer => timers.delete(timer),
    requestAnimationFrame: () => 1, Set, Promise };
  vm.runInNewContext(source, context);
  return { root, visual, toggle, label, buttons, images, scenes, document, window, media, timers, intersectionObservers,
    async runAutoplay() { const entry = [...timers.entries()].find(([, value]) => value.ms === 7200); assert.ok(entry); timers.delete(entry[0]); entry[1].fn(); await Promise.resolve(); } };
}

test('studio markup preserves unique IDs, lazy scenes, section order and local dependencies', () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal((html.match(/data-scene-index=/g) || []).length, 3);
  assert.equal((html.match(/data-scene="/g) || []).length, 3);
  assert.ok(html.includes('data-src="img/soltas-brilho-01.webp"'));
  assert.ok(!/<div\s+id="loader"/.test(html));
  assert.ok(!/src="https:\/\/unpkg.com\/aos/.test(html));
  assert.ok(html.indexOf('id="servicos"') < html.indexOf('id="sobre"'));
  assert.ok(html.indexOf('id="depoimentos"') < html.indexOf('id="certificacoes"'));
  for (const name of ['studio.css', 'scripts/studio.js', 'scripts/quote.js']) {
    assert.ok(html.includes('"' + name + '"'));
    assert.ok(fs.existsSync(path.join(rootDir, name)));
    assert.ok(fs.readFileSync(path.join(rootDir, 'sw.js'), 'utf8').includes("'/" + name + "'"));
  }
  new vm.Script(source);
});

test('native carousel is lazy, can pause, and manual navigation selects only one scene', async () => {
  const s = fixture();
  assert.equal(s.root.classList.contains('no-js'), false);
  assert.equal(s.images[1].getAttribute('src'), null);
  assert.equal(s.root.getAttribute('data-motion-paused'), 'false');
  await s.runAutoplay();
  assert.equal(s.scenes[1].getAttribute('aria-hidden'), 'false');
  assert.equal(s.scenes[0].getAttribute('aria-hidden'), 'true');
  assert.equal(s.buttons[1].getAttribute('aria-pressed'), 'true');
  s.toggle.handlers.click();
  assert.equal(s.root.getAttribute('data-motion-paused'), 'true');
  assert.equal(s.timers.size, 0);
  s.buttons[2].handlers.click(); await Promise.resolve();
  assert.equal(s.scenes[2].classList.contains('is-active'), true);
  assert.equal(s.scenes.filter(scene => scene.classList.contains('is-active')).length, 1);
  assert.equal(s.timers.size, 0);
});

test('reduced motion and data saving do not auto-load extra photos', () => {
  for (const settings of [{ reduced: true }, { saveData: true }]) {
    const s = fixture(settings);
    assert.equal(s.root.getAttribute('data-motion-paused'), 'true');
    assert.equal(s.timers.size, 0);
    assert.equal(s.images[1].getAttribute('src'), null);
  }
  assert.equal(fixture({ reduced: true }).toggle.disabled, true);
});

test('motion stops while hidden, focused or offscreen, and resumes only when appropriate', () => {
  const s = fixture({ observers: true });
  s.document.hidden = true; s.document.handlers.visibilitychange();
  assert.equal(s.timers.size, 0);
  s.document.hidden = false; s.document.handlers.visibilitychange();
  assert.equal(s.timers.size, 1);
  s.visual.handlers.focusin();
  assert.equal(s.timers.size, 0);
  s.visual.handlers.focusout({ relatedTarget: null });
  assert.equal(s.timers.size, 1);
  s.intersectionObservers[1].callback([{ isIntersecting: false }]);
  assert.equal(s.timers.size, 0);
  s.intersectionObservers[1].callback([{ isIntersecting: true }]);
  assert.equal(s.timers.size, 1);
});

test('failed photos keep the current image and explain the error', async () => {
  const s = fixture({ broken: true });
  s.buttons[1].handlers.click(); await Promise.resolve();
  assert.equal(s.scenes[0].classList.contains('is-active'), true);
  assert.equal(s.buttons[1].disabled, true);
  assert.match(s.visual.children[0].textContent, /indisponível/);
});

test('language changes preserve pause state and translate motion controls', () => {
  const s = fixture();
  s.toggle.handlers.click();
  s.root.lang = 'en'; s.window.handlers['vitalcar:language']();
  assert.equal(s.label.textContent, 'Enable motion');
  s.root.lang = 'es'; s.window.handlers['vitalcar:language']();
  assert.equal(s.label.textContent, 'Activar movimiento');
  assert.equal(s.toggle.getAttribute('aria-pressed'), 'true');
});

test('design includes mobile, focus, no-JS and motion preference fallbacks', () => {
  assert.match(css, /max-width: 380px/);
  assert.match(css, /max-width: 560px/);
  assert.match(css, /max-width: 980px/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /focus-visible/);
  assert.match(css, /html\.no-js/);
  assert.match(css, /repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\[hidden\]/);
});

test('all new studio labels have EN/ES translations; actual language switch restores PT', () => {
  const start = html.indexOf('/* ============ MULTI-IDIOMA ============ */');
  const end = html.indexOf('/* ============ UTM TRACKING ============ */', start);
  const code = html.slice(start, end);
  const declaration = code.slice(code.indexOf('var TRAD ='), code.indexOf('function aplicarIdioma'));
  const dictionary = vm.runInNewContext('(function(){' + declaration + ';return TRAD;})()');
  const keys = new Set([...html.matchAll(/data-i18n(?:-aria|-alt)?="(studio_[^"]+)"/g)].map(m => m[1]));
  for (const lang of ['en', 'es']) for (const key of keys) assert.ok(dictionary[lang][key], lang + ': ' + key);
  const root = node(), text = node(), aria = node(), image = node();
  text.dataset.i18n = 'hero_l1'; text.textContent = 'O cuidado.';
  aria.setAttribute('data-i18n-aria', 'studio_home'); aria.setAttribute('aria-label', 'Vitalcar — início');
  image.setAttribute('data-i18n-alt', 'studio_photo_car_alt'); image.setAttribute('alt', 'Carro preto');
  const pills = ['pt', 'en', 'es'].map(lang => { const button = node(); button.dataset.lang = lang; return button; });
  const dispatched = [];
  vm.runInNewContext(code, {
    window: { dispatchEvent: event => dispatched.push(event.detail.lang) },
    document: { documentElement: root, querySelectorAll: selector => ({ '#idioma-pills button': pills, '[data-i18n]': [text], '[data-i18n-aria]': [aria], '[data-i18n-alt]': [image] })[selector] || [] },
    navigator: { language: 'pt-BR' }, localStorage: { getItem: () => null, setItem() {} },
    CustomEvent: function(name, init) { this.detail = init.detail; }
  });
  pills[1].handlers.click();
  assert.equal(root.lang, 'en');
  assert.equal(text.textContent, 'The care.');
  assert.equal(aria.getAttribute('aria-label'), 'Vitalcar — home');
  assert.equal(image.getAttribute('alt'), dictionary.en.studio_photo_car_alt);
  pills[2].handlers.click(); assert.equal(text.textContent, 'El cuidado.');
  pills[0].handlers.click();
  assert.equal(root.lang, 'pt-BR');
  assert.equal(text.textContent, 'O cuidado.');
  assert.equal(aria.getAttribute('aria-label'), 'Vitalcar — início');
  assert.equal(image.getAttribute('alt'), 'Carro preto');
  assert.deepEqual(dispatched, ['en', 'es', 'pt']);
});
