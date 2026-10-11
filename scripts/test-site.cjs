const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const quote = require('./quote.js');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const services = [...html.matchAll(/<input\b[^>]*data-service-id="([^"]+)"[^>]*>/g)].map(([tag, id]) => ({
  id, prices: Object.fromEntries(['hatch', 'sedan', 'pickup', 'moto'].map(type => [type, Number(tag.match(new RegExp(`data-${type}="([^"]+)"`))[1])]))
}));
const options = (selected = [], type = 'hatch', promo = { ativo: true, desconto: .1 }) => ({ services, selected, type, promo });
function block(start, end) {
  const a = html.indexOf(`/* ============ ${start} ============ */`);
  const b = html.indexOf(`/* ============ ${end} ============ */`, a + 1);
  assert.ok(a >= 0 && b > a, `Script boundaries: ${start}`);
  return html.slice(a, b);
}

test('all inline JavaScript and structured metadata parse', () => {
  let scripts = 0, metadata = 0;
  for (const [, attrs, source] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/application\/ld\+json/.test(attrs)) { JSON.parse(source); metadata++; }
    else if (!/\bsrc=/.test(attrs)) { new vm.Script(source); scripts++; }
  }
  assert.ok(scripts >= 2 && metadata >= 1);
  new vm.Script(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'));
});

test('16 services use existing prices; vehicle and active discount affect total', () => {
  assert.equal(services.length, 16);
  assert.equal(quote.calculate(options(['lav-1'])).total, 72);
  assert.equal(quote.calculate(options(['lav-1'], 'sedan')).total, 81);
  assert.equal(quote.calculate(options(['lav-1'], 'pickup')).total, 90);
  assert.equal(quote.calculate(options(['mot-4'], 'moto')).total, 135);
  assert.equal(quote.calculate(options(['lav-1'], 'hatch', { ativo: true, desconto: .2 })).total, 64);
  assert.equal(quote.calculate(options(['lav-1'], 'hatch', { ativo: false, desconto: .2 })).total, 80);
});

test('bundled wash and polish never billed twice', () => {
  for (const [id, included, gross] of [
    ['pol-1', ['lav-2'], 450], ['pol-2', ['lav-3'], 800],
    ['vit-1', ['lav-2', 'pol-1'], 700], ['vit-5', ['lav-3', 'pol-2'], 2400]
  ]) {
    const result = quote.calculate(options([id, ...included, id]));
    assert.equal(result.gross, gross);
    assert.equal(result.valid, true);
    assert.deepEqual(result.selected, [id]);
    assert.deepEqual(result.included.map(i => i.id).sort(), included.sort());
  }
  assert.deepEqual(quote.calculate(options(['vit-3'])).included, []);
});

test('alternatives replace same-group choices; incompatible bundles preserve selection', () => {
  for (const [a, b, type] of [['lav-1', 'lav-3', 'hatch'], ['pol-1', 'pol-2', 'hatch'], ['vit-1', 'vit-5', 'hatch'], ['hig-1', 'hig-2', 'hatch'], ['mot-2', 'mot-4', 'moto']]) {
    const result = quote.select(options([a], type), b, true);
    assert.deepEqual(result.selected, [b]);
    assert.deepEqual(result.replaced, [a]);
  }
  const result = quote.select(options(['vit-1']), 'pol-2', true);
  assert.ok(result.conflict);
  assert.deepEqual(result.selected, ['vit-1']);
  assert.equal(quote.calculate(options(['vit-1', 'pol-2'])).valid, false);
});

test('empty, unavailable, invalid-price and changed-catalog boundaries', () => {
  assert.equal(quote.calculate(options()).valid, false);
  assert.equal(quote.calculate(options(['lav-1'], 'moto')).valid, false);
  assert.equal(quote.calculate(options(['unknown'])).valid, false);
  const changed = options(['lav-1']);
  changed.services = [{ id: 'lav-1', prices: { hatch: 200 } }];
  assert.equal(quote.calculate(changed).total, 180);
  for (const value of [null, '', -1, 'bad', Infinity]) {
    changed.services[0].prices.hatch = value;
    assert.equal(quote.calculate(changed).valid, false);
  }
});

test('privacy links, optional referral and responsive hidden states remain wired', () => {
  assert.ok(!/<select\b[^>]*id="bf-origem-contato"[^>]*\brequired\b/.test(html));
  assert.ok(!html.includes('if (!d.origemContato)'));
  assert.ok(html.includes('.sim-services label[hidden]'));
  assert.ok((html.match(/href="\/privacidade.html"/g) || []).length >= 3);
  assert.ok(html.includes('id="lgpd-ack"'));
  assert.ok(!html.includes('id="lgpd-accept"'));
  const privacy = fs.readFileSync(path.join(root, 'privacidade.html'), 'utf8');
  assert.ok(!/<(?:script|iframe|form)\b/i.test(privacy));
  const ids = new Set([...privacy.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
  for (const [, id] of privacy.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(id), id);
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.ok(sw.includes("'/scripts/quote.js'"));
  assert.ok(sw.includes("'/privacidade.html'"));
});

function element(dataset = {}) {
  const classes = new Set();
  return {
    dataset, attributes: {}, listeners: {}, children: [], textContent: '', disabled: false,
    classList: { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x),
      toggle(x, on) { if (on) classes.add(x); else classes.delete(x); } },
    setAttribute(k, v) { this.attributes[k] = v; },
    addEventListener(k, fn) { this.listeners[k] = fn; },
    appendChild(child) { this.children.push(child); },
    click() { if (!this.disabled) return this.listeners.click?.(); }
  };
}

function simulator() {
  const types = ['hatch', 'sedan', 'pickup', 'moto'].map(tipo => element({ tipo }));
  const recommendations = ['lav-1', 'pol-1', 'vit-1', 'hig-1', 'mot-1'].map(recommend => element({ recommend }));
  const inputs = services.map(s => {
    const input = element({ serviceId: s.id, ...s.prices });
    const label = element({ cat: s.id.startsWith('mot-') ? 'moto' : 'carro' });
    const span = element(), small = element(); span.textContent = s.id;
    label.querySelector = selector => selector === 'small' ? small : span;
    input.parentElement = label;
    return input;
  });
  const nodes = Object.fromEntries(['sim-total', 'sim-original', 'sim-desconto', 'sim-enviar', 'sim-reset', 'sim-summary', 'sim-feedback'].map(id => [id, element()]));
  const opened = [];
  const window = { VitalcarQuote: quote, VITALCAR_PROMO: { ativo: true, desconto: .1 },
    VITALCAR_TR: (key, vars) => key + (vars ? ' ' + Object.values(vars).join(' ') : ''), open: url => opened.push(url) };
  const document = { getElementById: id => nodes[id], createElement: () => element(),
    querySelectorAll: selector => ({ '#sim-tipo button': types, '#sim-servicos input': inputs, '[data-recommend]': recommendations })[selector] };
  vm.runInNewContext(block('SIMULADOR', 'BA SLIDERS'), { window, document });
  return { window, nodes, types, recommendations, inputs, opened };
}

test('actual simulator handlers: suggestions, inclusions, rejection, reset and WhatsApp', () => {
  const s = simulator();
  assert.equal(s.nodes['sim-enviar'].disabled, true);
  s.recommendations[2].click();
  assert.equal(s.window.atualizarSimuladorSite().total, 630);
  const partial = s.inputs.find(i => i.dataset.serviceId === 'pol-1');
  assert.equal(partial.checked, true);
  assert.equal(partial.disabled, true);
  const technical = s.inputs.find(i => i.dataset.serviceId === 'pol-2');
  technical.checked = true; technical.listeners.change();
  assert.equal(technical.checked, false);
  assert.match(s.nodes['sim-feedback'].textContent, /sim_conflict/);
  s.nodes['sim-enviar'].click();
  assert.equal(s.opened.length, 1);
  const message = new URL(s.opened[0]).searchParams.get('text');
  assert.match(message, /vit-1/);
  assert.match(message, /sim_included/);
  assert.match(message, /630/);
  s.nodes['sim-reset'].click();
  assert.equal(s.nodes['sim-enviar'].disabled, true);
  s.nodes['sim-enviar'].click();
  assert.equal(s.opened.length, 1);
});

test('actual simulator handlers: vehicle, dynamic prices and promotions', () => {
  const s = simulator();
  s.recommendations[0].click();
  s.types[1].click();
  assert.equal(s.window.atualizarSimuladorSite().total, 81);
  assert.equal(s.types[1].attributes['aria-pressed'], 'true');
  const wash = s.inputs.find(i => i.dataset.serviceId === 'lav-1');
  assert.equal(wash.parentElement.querySelector('small').textContent, 'R$ 90');
  wash.dataset.sedan = 200;
  s.window.VITALCAR_PROMO = { ativo: true, desconto: .2 };
  assert.equal(s.window.atualizarSimuladorSite().total, 160);
  s.types[3].click();
  assert.equal(s.nodes['sim-enviar'].disabled, true);
  assert.equal(wash.parentElement.hidden, true);
  s.recommendations[4].click();
  assert.equal(s.window.atualizarSimuladorSite().total, 40);
});

function booking() {
  const form = element();
  for (const [key, value] of Object.entries({ nome: 'Cliente Teste', telefone: '73999999999', veiculo: 'Veiculo teste', placa: '', tipoVeiculo: 'hatch', servico: 'Lavagem Nível I', origemContato: '', data: '2026-10-13', obs: '', periodo: 'manha' })) form[key] = { value };
  const submit = element(); submit.querySelector = () => element();
  const nodes = { 'booking-form': form, 'bf-submit': submit, 'bf-whats': element(), 'bf-feedback': element(),
    'bf-servico': { options: [{ getAttribute: () => '80' }], selectedIndex: 0 }, 'bf-tipo': form.tipoVeiculo, 'bf-data': element() };
  const requests = [], opened = [];
  const window = { VITALCAR_PROMO: { ativo: true, desconto: .2, aplicar: n => Math.round(n * .8), brl: n => String(n) },
    VITALCAR_TR: key => key, open: url => opened.push(url) };
  const context = { window, document: { getElementById: id => nodes[id] },
    fetch: async (url, init) => { requests.push(JSON.parse(init.body)); return { ok: true, json: async () => ({}) }; },
    setTimeout: fn => fn(), Date, Math };
  vm.runInNewContext(block('FORM AGENDAMENTO', 'SIMULADOR'), context);
  return { form, nodes, window, requests, opened };
}

test('actual booking handlers: optional source, preferred date and unchanged Firestore payload', async () => {
  const b = booking();
  await b.form.listeners.submit({ preventDefault() {} });
  assert.equal(b.requests.length, 1);
  const fields = b.requests[0].fields;
  assert.equal(fields.entrada.stringValue, '2026-10-13');
  assert.equal(fields.valor.doubleValue, 64);
  assert.equal(fields.descontoValor.doubleValue, 20);
  assert.equal(fields.status.stringValue, 'pendente');
  assert.equal('data' in fields, false);
  assert.equal('origemContato' in fields, false);
  const message = new URL(b.opened[0]).searchParams.get('text');
  assert.match(message, /13\/10\/2026/);
  assert.match(message, /Desconto 20%/);
});

test('actual booking handler rejects Sunday when configured closed without any submission', async () => {
  const b = booking();
  b.window.VITALCAR_DOM_FECHADO = true;
  b.form.data.value = '2026-10-11';
  b.nodes['bf-data'].focus = () => {};
  await b.form.listeners.submit({ preventDefault() {} });
  assert.equal(b.requests.length, 0);
  assert.equal(b.opened.length, 0);
  assert.equal(b.nodes['bf-feedback'].textContent, 'fb_domingo');
});

test('privacy notice works even when browser storage is blocked', () => {
  const banner = element(), ack = element();
  vm.runInNewContext(block('LGPD', 'STATUS LOJA'), {
    document: { getElementById: id => id === 'lgpd' ? banner : ack },
    localStorage: { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } },
    setTimeout: fn => fn()
  });
  assert.equal(banner.classList.contains('show'), true);
  ack.click();
  assert.equal(banner.classList.contains('show'), false);
});

test('offline navigation uses privacy cache, not a misleading home-page fallback', async () => {
  const handlers = {}, matched = [];
  let cached = new Response('privacy page');
  vm.runInNewContext(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), {
    self: { location: { origin: 'https://example.test' }, addEventListener: (event, fn) => { handlers[event] = fn; } },
    caches: { match: async key => { matched.push(key); return cached; } },
    fetch: async () => { throw new Error('offline'); }, URL, Response
  });
  let response;
  const event = { request: { method: 'GET', mode: 'navigate', url: 'https://example.test/privacidade', headers: { has: () => false } },
    respondWith(promise) { response = promise; } };
  handlers.fetch(event);
  assert.equal(await (await response).text(), 'privacy page');
  assert.deepEqual(matched, ['/privacidade.html']);
  cached = undefined;
  handlers.fetch(event);
  assert.equal((await response).status, 503);
  let intercepted = false;
  handlers.fetch({ request: { ...event.request, url: 'https://example.test/admin/' }, respondWith() { intercepted = true; } });
  assert.equal(intercepted, false);
});
