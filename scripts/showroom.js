/* Progressive, local 3D. studio.js owns motion intent; Vitalcar3D owns WebGL.
   Photos remain the fallback until create + resize + first draw all succeed. */
(function(root){
  'use strict';

  var DEFAULT_CONFIG = Object.freeze({
    enabled: true,
    defaultMode: '3d',
    defaultColor: 'red',
    autoRotate: true
  });
  var CONFIG_URL = 'https://firestore.googleapis.com/v1/projects/vitalcar-87179/databases/(default)/documents/config/showroom?key=AIzaSyBcp2qNpvhXHszEXmyW96plVxR9_FTAn6c';
  var CONFIG_TIMEOUT = 5000;
  var hasOwn = Object.prototype.hasOwnProperty;

  function copyConfig(config){
    return {
      enabled: config.enabled,
      defaultMode: config.defaultMode,
      defaultColor: config.defaultColor,
      autoRotate: config.autoRotate
    };
  }
  function numberValue(value){
    if (typeof value === 'number') return isFinite(value) ? value : undefined;
    if (typeof value !== 'string' || !/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value)) return undefined;
    var number = Number(value);
    return isFinite(number) ? number : undefined;
  }
  function unwrapFirestoreValue(value){
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value) || Object.keys(value).length !== 1) return undefined;
    if (hasOwn.call(value, 'booleanValue')) return typeof value.booleanValue === 'boolean' ? value.booleanValue : undefined;
    if (hasOwn.call(value, 'stringValue')) return typeof value.stringValue === 'string' ? value.stringValue : undefined;
    if (hasOwn.call(value, 'integerValue')) {
      var integer = numberValue(value.integerValue);
      return integer !== undefined && Math.floor(integer) === integer && Math.abs(integer) <= 9007199254740991 ? integer : undefined;
    }
    if (hasOwn.call(value, 'doubleValue')) return numberValue(value.doubleValue);
    return undefined;
  }
  function parseFields(input){
    var fields = input && hasOwn.call(input, 'fields') ? input.fields : input;
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return {};
    var parsed = {};
    Object.keys(fields).forEach(function(key){
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') return;
      var value = unwrapFirestoreValue(fields[key]);
      if (value !== undefined) parsed[key] = value;
    });
    return parsed;
  }
  function normalizeConfig(input){
    var fields = parseFields(input), config = copyConfig(DEFAULT_CONFIG);
    if (typeof fields.enabled === 'boolean') config.enabled = fields.enabled;
    if (fields.defaultMode === '3d' || fields.defaultMode === 'photos') config.defaultMode = fields.defaultMode;
    if (fields.defaultColor === 'red' || fields.defaultColor === 'pearl' || fields.defaultColor === 'graphite') config.defaultColor = fields.defaultColor;
    if (typeof fields.autoRotate === 'boolean') config.autoRotate = fields.autoRotate;
    return config;
  }

  /* CommonJS exposes pure config helpers without evaluating the browser controller. */
  if (typeof module === 'object' && module.exports) {
    module.exports = {
      DEFAULT_CONFIG: copyConfig(DEFAULT_CONFIG),
      parseFields: parseFields,
      parseConfigFields: parseFields,
      normalizeConfig: normalizeConfig
    };
    return;
  }
  if (!root || !root.document) return;

  var document = root.document;
  var window = root;
  var rootElement = document.documentElement;
  var visual = document.getElementById('studio-visual');
  var panel = document.getElementById('showroom-root');
  var canvas = document.getElementById('showroom-canvas');
  var modeControl = document.getElementById('showroom-mode');
  var motion = document.getElementById('showroom-motion');
  var motionNote = document.getElementById('showroom-motion-note');
  var sharedMotion = document.getElementById('studio-motion-toggle');
  var reset = document.getElementById('showroom-reset');
  var status = document.getElementById('showroom-status');
  if (!visual || !panel || !canvas || !modeControl || !motion || !motionNote || !sharedMotion || !reset || !status) return;

  var labels = {
    pt: {
      modeLabel: 'Visualização', mode3d: '3D', modePhotos: 'Fotos reais',
      caption: 'Modelo 3D ilustrativo',
      canvasLabel: 'Carro 3D ilustrativo; não representa um veículo de cliente.',
      canvasFallback: 'Selecione Fotos reais para ver nosso trabalho.',
      instructions: 'Arraste ou use as setas. Home: vista inicial.',
      colorsLabel: 'Cor do modelo', red: 'Vermelho', pearl: 'Pérola', graphite: 'Grafite',
      reset: 'Repor vista', resetLabel: 'Restaurar ângulo inicial',
      pause: 'Pausar rotação', resume: 'Ativar rotação', reduced: 'Movimento reduzido',
      motionHelp: 'A rotação para enquanto o ponteiro ou o foco estão neste painel. Arrastar ou usar as setas pausa o movimento.',
      reducedHelp: 'Rotação automática desativada pela preferência de movimento reduzido do sistema. Arraste ou use as setas para explorar.',
      noMotion: 'Rotação indisponível', noMotionHelp: 'Use os controles manuais para explorar o modelo.',
      unavailable: '3D indisponível neste navegador. Veja nossas fotos reais.',
      lost: 'A visualização 3D foi interrompida. As fotos reais continuam disponíveis.'
    },
    en: {
      modeLabel: 'View', mode3d: '3D', modePhotos: 'Real photos',
      caption: 'Illustrative 3D model',
      canvasLabel: 'Illustrative 3D car; not a customer’s vehicle.',
      canvasFallback: 'Select Real photos to see our work.',
      instructions: 'Drag or use arrow keys. Home: initial view.',
      colorsLabel: 'Model color', red: 'Red', pearl: 'Pearl', graphite: 'Graphite',
      reset: 'Reset view', resetLabel: 'Restore the initial angle',
      pause: 'Pause rotation', resume: 'Enable rotation', reduced: 'Reduced motion',
      motionHelp: 'Rotation stops while the pointer or keyboard focus is in this panel. Dragging or using arrow keys pauses motion.',
      reducedHelp: 'Automatic rotation is disabled by your system’s reduced motion preference. Drag or use arrow keys to explore.',
      noMotion: 'Rotation unavailable', noMotionHelp: 'Use the manual controls to explore the model.',
      unavailable: '3D is unavailable in this browser. Explore our real photos.',
      lost: 'The 3D view was interrupted. Our real photos are still available.'
    },
    es: {
      modeLabel: 'Vista', mode3d: '3D', modePhotos: 'Fotos reales',
      caption: 'Modelo 3D ilustrativo',
      canvasLabel: 'Coche 3D ilustrativo; no representa un vehículo de un cliente.',
      canvasFallback: 'Selecciona Fotos reales para ver nuestro trabajo.',
      instructions: 'Arrastra o usa las flechas. Home: vista inicial.',
      colorsLabel: 'Color del modelo', red: 'Rojo', pearl: 'Perla', graphite: 'Grafito',
      reset: 'Restablecer', resetLabel: 'Restaurar el ángulo inicial',
      pause: 'Pausar rotación', resume: 'Activar rotación', reduced: 'Movimiento reducido',
      motionHelp: 'La rotación se detiene mientras el puntero o el foco están en este panel. Arrastrar o usar las flechas pausa el movimiento.',
      reducedHelp: 'La rotación automática está desactivada por la preferencia de movimiento reducido del sistema. Arrastra o usa las flechas para explorar.',
      noMotion: 'Rotación no disponible', noMotionHelp: 'Usa los controles manuales para explorar el modelo.',
      unavailable: '3D no disponible en este navegador. Mira nuestras fotos reales.',
      lost: 'La vista 3D se interrumpió. Las fotos reales siguen disponibles.'
    }
  };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var scenes = Array.from(visual.querySelectorAll('.studio-scene'));
  var photoControls = visual.querySelector('.studio-controls');
  var photoControlsHidden = photoControls ? photoControls.hidden : false;
  var modes = Array.from(modeControl.querySelectorAll('[data-showroom-mode]'));
  var colors = Array.from(panel.querySelectorAll('[data-showroom-color]'));
  var textNodes = Array.from(visual.querySelectorAll('[data-showroom-text]'));
  var ariaNodes = Array.from(visual.querySelectorAll('[data-showroom-aria]'));
  var renderer = null, attempted = false, failed = false, mode = 'photos';
  var config = copyConfig(DEFAULT_CONFIG), configKnown = false;
  var motionDefaultPending = false;
  var pageActive = true, near = false, visible = false;
  var hovered = finePointer.matches && visual.matches(':hover');
  var focused = visual.contains(document.activeElement), pointer = null;
  var frame = null, lastDraw = null, dirty = true, resizeNeeded = true;
  var width = 0, height = 0, pixelRatio = 0, message = '';
  var nearObserver = null, visibilityObserver = null, sizeObserver = null;
  var yaw = .7, pitch = .25, color = 'red', lightPhase = 0;
  var frameInterval = 1000 / 30;
  modeControl.hidden = true;
  panel.hidden = true;
  panel.setAttribute('aria-hidden', 'true');

  function words(){ return labels[(rootElement.lang || 'pt').slice(0, 2).toLowerCase()] || labels.pt; }
  // A missing motion controller is conservatively static, as are Save-Data and
  // weak connections, whose default paused intent is set by studio.js.
  function paused(){ return reduced.matches || rootElement.getAttribute('data-motion-paused') !== 'false'; }
  function canRender(){ return !!renderer && !failed && mode === '3d' && pageActive && !document.hidden && visible; }
  function canSpin(){ return canRender() && !paused() && !sharedMotion.disabled && !hovered && !focused && !pointer; }

  function syncMotion(){
    applyDefaultMotion();
    var copy = words();
    var unavailable = !rootElement.hasAttribute('data-motion-paused') || (sharedMotion.disabled && !reduced.matches);
    motion.disabled = reduced.matches || unavailable;
    motion.textContent = reduced.matches ? copy.reduced : (unavailable ? copy.noMotion : (paused() ? copy.resume : copy.pause));
    motion.setAttribute('aria-label', motion.textContent);
    motion.setAttribute('aria-pressed', String(paused()));
    motionNote.textContent = reduced.matches ? copy.reducedHelp : (unavailable ? copy.noMotionHelp : copy.motionHelp);
    schedule();
  }
  function translate(){
    var copy = words();
    textNodes.forEach(function(node){ node.textContent = copy[node.getAttribute('data-showroom-text')]; });
    ariaNodes.forEach(function(node){ node.setAttribute('aria-label', copy[node.getAttribute('data-showroom-aria')]); });
    if (message) status.textContent = copy[message];
    syncMotion();
    if (mode === '3d') invalidate(true);
  }
  function notifyView(){
    if (typeof window.dispatchEvent === 'function' && typeof window.CustomEvent === 'function') {
      window.dispatchEvent(new window.CustomEvent('vitalcar:view', { detail: { mode: mode } }));
    }
  }
  function showPhotos(show){
    var active = scenes.find(function(scene){ return scene.classList.contains('is-active'); }) || scenes[0];
    scenes.forEach(function(scene){ scene.setAttribute('aria-hidden', String(!show || scene !== active)); });
    if (photoControls) photoControls.hidden = show ? photoControlsHidden : true;
  }
  function stopFrame(){
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null;
    lastDraw = null;
  }
  function schedule(){
    if (!canRender() || (!dirty && !canSpin())) { stopFrame(); return; }
    if (frame === null) frame = window.requestAnimationFrame(tick);
  }
  function loadConfig(){
    if (typeof root.fetch !== 'function' || typeof root.AbortController !== 'function' || typeof root.setTimeout !== 'function') {
      return Promise.resolve(copyConfig(DEFAULT_CONFIG));
    }
    var controller;
    try { controller = new root.AbortController(); }
    catch (error) { return Promise.resolve(copyConfig(DEFAULT_CONFIG)); }
    return new Promise(function(resolve){
      var settled = false, timer = null;
      function finish(value){
        if (settled) return;
        settled = true;
        if (timer !== null && typeof root.clearTimeout === 'function') root.clearTimeout(timer);
        resolve(value);
      }
      timer = root.setTimeout(function(){
        try { controller.abort(); } catch (error) { /* The timeout still restores the photo-first defaults. */ }
        finish(copyConfig(DEFAULT_CONFIG));
      }, CONFIG_TIMEOUT);
      try {
        var request = root.fetch(CONFIG_URL, { method: 'GET', signal: controller.signal, credentials: 'omit' });
        if (!request || typeof request.then !== 'function') throw new Error('Configuration request unavailable');
        request.then(function(response){
          if (!response || response.ok === false || typeof response.json !== 'function') throw new Error('Configuration response unavailable');
          return response.json();
        }).then(function(payload){
          if (!settled) finish(normalizeConfig(payload && payload.fields));
        }).catch(function(){ finish(copyConfig(DEFAULT_CONFIG)); });
      } catch (error) { finish(copyConfig(DEFAULT_CONFIG)); }
    });
  }
  function syncColors(){
    colors.forEach(function(button){ button.setAttribute('aria-pressed', String(button.getAttribute('data-showroom-color') === color)); });
  }
  function applyDefaultMotion(){
    if (!motionDefaultPending || mode !== '3d' || reduced.matches || sharedMotion.disabled || !rootElement.hasAttribute('data-motion-paused')) return;
    // The root attribute includes visibility suspension; aria-pressed reflects
    // studio.js's actual intent. Apply the default once, preserving manual resume.
    var intent = sharedMotion.getAttribute('aria-pressed');
    if (intent !== 'true' && intent !== 'false') return;
    motionDefaultPending = false;
    if (intent === 'false') sharedMotion.click();
  }
  function exposeConfig(){
    var frozen = Object.freeze(copyConfig(config));
    try {
      Object.defineProperty(window, 'VitalcarShowroomConfig', {
        enumerable: false, writable: false, value: frozen
      });
    } catch (error) { /* Diagnostics must not prevent initialization. */ }
    if (typeof window.dispatchEvent === 'function' && typeof window.CustomEvent === 'function') {
      window.dispatchEvent(new window.CustomEvent('vitalcar:showroom-config', { detail: frozen }));
    }
  }
  function finishConfig(next){
    if (configKnown) return;
    config = normalizeConfig(next);
    configKnown = true;
    color = config.defaultColor;
    syncColors();
    motionDefaultPending = config.enabled && !config.autoRotate;
    syncMotion();
    modeControl.hidden = true;
    showPhotos(true);
    exposeConfig();
    if (!config.enabled) {
      panel.hidden = true;
      panel.setAttribute('aria-hidden', 'true');
      visual.classList.remove('is-3d');
      if (nearObserver) nearObserver.disconnect();
      return;
    }
    start();
  }
  function invalidate(resize){
    dirty = true;
    if (resize) resizeNeeded = true;
    schedule();
  }

  function draw(resize){
    try {
      if (resize || resizeNeeded) {
        var bounds = canvas.getBoundingClientRect();
        var nextWidth = Math.round(bounds.width), nextHeight = Math.round(bounds.height);
        var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        if (nextWidth < 1 || nextHeight < 1) throw new Error('Showroom has no drawing area');
        if (nextWidth !== width || nextHeight !== height || dpr !== pixelRatio) {
          if (renderer.resize(nextWidth, nextHeight, dpr) === false) throw new Error('Renderer lost its context');
          width = nextWidth; height = nextHeight; pixelRatio = dpr;
        }
      }
      if (renderer.draw({ yaw: yaw, pitch: pitch, color: color, lightPhase: lightPhase }) === false) throw new Error('Renderer did not draw');
      if (failed) return false;
      dirty = false;
      resizeNeeded = false;
      return true;
    } catch (error) {
      fallback(mode === '3d' ? 'lost' : 'unavailable');
      return false;
    }
  }
  function tick(time){
    frame = null;
    if (!canRender()) { stopFrame(); return; }
    var spin = canSpin();
    if (dirty || (spin && (lastDraw === null || time - lastDraw >= frameInterval))) {
      if (spin && lastDraw !== null) {
        var delta = Math.min(time - lastDraw, 100);
        yaw = wrapAngle(yaw + delta * .00018);
        lightPhase = (lightPhase + delta * .00024) % (Math.PI * 2);
      }
      if (!draw(false)) return;
      lastDraw = time;
    }
    schedule();
  }
  function focusMode(next){
    var button = modes.find(function(item){ return item.getAttribute('data-showroom-mode') === next; });
    if (button) button.focus({ preventScroll: true });
  }
  function applyMode(next){
    var hidingFocus = next === 'photos' ? panel.contains(document.activeElement) : (photoControls && photoControls.contains(document.activeElement));
    mode = next;
    modeControl.hidden = !configKnown || !config.enabled || failed;
    if (hidingFocus) focusMode(next);
    panel.hidden = next !== '3d';
    panel.setAttribute('aria-hidden', String(next !== '3d'));
    panel.classList.remove('is-preparing');
    visual.classList.add('showroom-ready');
    visual.classList.toggle('is-3d', next === '3d');
    visual.setAttribute('data-showroom-state', 'ready');
    modes.forEach(function(button){ button.setAttribute('aria-pressed', String(button.getAttribute('data-showroom-mode') === next)); });
    showPhotos(next === 'photos');
    if (next === 'photos') { endDrag(); stopFrame(); }
    notifyView();
    syncMotion();
  }
  function selectMode(next){
    if (failed || !configKnown || !config.enabled || !renderer || next === mode || (next !== '3d' && next !== 'photos')) return;
    if (next === '3d') {
      // Measure/draw invisibly over the still-visible photo. Never trade the
      // photograph for a blank canvas, including on a later mode switch.
      panel.classList.add('is-preparing');
      panel.setAttribute('aria-hidden', 'true');
      panel.hidden = false;
      if (!draw(true)) return;
    }
    applyMode(next);
  }
  function fallback(reason){
    if (failed) return;
    failed = true;
    var hidingFocus = panel.contains(document.activeElement) || modeControl.contains(document.activeElement);
    stopFrame();
    endDrag();
    mode = 'photos';
    panel.hidden = true;
    panel.setAttribute('aria-hidden', 'true');
    panel.classList.remove('is-preparing');
    modeControl.hidden = true;
    visual.classList.remove('is-3d', 'showroom-ready');
    visual.classList.add('has-showroom-error');
    visual.setAttribute('data-showroom-state', 'unavailable');
    showPhotos(true);
    message = reason;
    status.hidden = false;
    status.textContent = words()[message];
    if (hidingFocus) {
      var target = visual.querySelector('button[data-scene][aria-pressed="true"]:not(:disabled)') || visual.querySelector('button[data-scene]:not(:disabled)');
      if (target) target.focus({ preventScroll: true });
    }
    var oldRenderer = renderer;
    renderer = null;
    if (oldRenderer) { try { oldRenderer.destroy(); } catch (error) { /* Keep photos usable even after context loss. */ } }
    if (nearObserver) nearObserver.disconnect();
    if (visibilityObserver) visibilityObserver.disconnect();
    if (sizeObserver) sizeObserver.disconnect();
    notifyView();
  }
  function start(){
    if (attempted || failed || !configKnown || !config.enabled || !near || !pageActive || document.hidden) return;
    attempted = true;
    if (nearObserver) nearObserver.disconnect();
    try {
      if (!window.Vitalcar3D || typeof window.Vitalcar3D.create !== 'function') throw new Error('Renderer unavailable');
      renderer = window.Vitalcar3D.create(canvas);
      if (failed) { if (renderer) renderer.destroy(); renderer = null; return; }
      if (!renderer || typeof renderer.resize !== 'function' || typeof renderer.draw !== 'function' || typeof renderer.destroy !== 'function') throw new Error('Renderer unavailable');
      if (config.defaultMode === '3d') {
        selectMode('3d');
      } else {
        panel.classList.add('is-preparing');
        panel.setAttribute('aria-hidden', 'true');
        panel.hidden = false;
        if (!draw(true)) return;
        applyMode('photos');
      }
    } catch (error) { fallback('unavailable'); }
  }

  function pauseForInteraction(){
    if (!paused() && !sharedMotion.disabled) sharedMotion.click();
    syncMotion();
  }
  function wrapAngle(value){ return ((value + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; }
  function orbit(dx, dy){
    yaw = wrapAngle(yaw + dx);
    pitch = Math.max(.08, Math.min(.85, pitch + dy));
    invalidate(false);
  }
  function resetView(){
    if (mode !== '3d' || failed) return;
    pauseForInteraction();
    yaw = .7; pitch = .25;
    invalidate(false);
  }
  function endDrag(event){
    if (!pointer || (event && event.pointerId !== undefined && event.pointerId !== pointer.id)) return;
    var id = pointer.id;
    pointer = null;
    canvas.classList.remove('is-dragging');
    try { if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id); } catch (error) { /* Capture may already have been cancelled by a native scroll. */ }
    schedule();
  }

  modes.forEach(function(button){
    button.addEventListener('click', function(){ selectMode(button.getAttribute('data-showroom-mode')); });
  });
  colors.forEach(function(button){
    button.addEventListener('click', function(){
      if (mode !== '3d' || failed) return;
      var next = button.getAttribute('data-showroom-color');
      if (next !== 'red' && next !== 'pearl' && next !== 'graphite') return;
      color = next;
      syncColors();
      invalidate(false);
    });
  });
  motion.addEventListener('click', function(){
    if (mode !== '3d' || failed || reduced.matches || sharedMotion.disabled) return;
    sharedMotion.click();
    syncMotion();
  });
  sharedMotion.addEventListener('click', syncMotion);
  reset.addEventListener('click', resetView);

  canvas.addEventListener('pointerdown', function(event){
    if (mode !== '3d' || failed || pointer || event.isPrimary === false || event.button !== 0) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, orbiting: event.pointerType !== 'touch' };
    canvas.classList.add('is-dragging');
    if (event.pointerType !== 'touch') canvas.focus({ preventScroll: true });
    try { canvas.setPointerCapture(event.pointerId); } catch (error) { /* Window pointerup still releases the gesture. */ }
    schedule();
  });
  canvas.addEventListener('pointermove', function(event){
    if (!pointer || event.pointerId !== pointer.id) return;
    if (!pointer.orbiting) {
      var horizontal = Math.abs(event.clientX - pointer.startX);
      var vertical = Math.abs(event.clientY - pointer.startY);
      if (vertical > 8 && vertical > horizontal) { endDrag(event); return; }
      if (horizontal < 6) return;
      pointer.orbiting = true;
    }
    if (event.clientX === pointer.x && event.clientY === pointer.y) return;
    pauseForInteraction();
    orbit((event.clientX - pointer.x) * .008, (event.clientY - pointer.y) * .006);
    pointer.x = event.clientX; pointer.y = event.clientY;
  }, { passive: true });
  canvas.addEventListener('lostpointercapture', endDrag);
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  window.addEventListener('blur', function(){ endDrag(); });
  canvas.addEventListener('keydown', function(event){
    if (mode !== '3d' || failed || event.altKey || event.ctrlKey || event.metaKey) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].indexOf(event.key) === -1) return;
    event.preventDefault();
    pauseForInteraction();
    if (event.key === 'Home') { resetView(); return; }
    var step = event.shiftKey ? .16 : .08;
    orbit(event.key === 'ArrowLeft' ? -step : (event.key === 'ArrowRight' ? step : 0), event.key === 'ArrowUp' ? step : (event.key === 'ArrowDown' ? -step : 0));
  });
  canvas.addEventListener('webglcontextlost', function(event){
    event.preventDefault();
    fallback('lost');
  });

  visual.addEventListener('pointerenter', function(event){ if (event.pointerType === 'mouse') { hovered = true; schedule(); } });
  visual.addEventListener('pointerleave', function(){ hovered = false; schedule(); });
  visual.addEventListener('focusin', function(){ focused = true; schedule(); });
  visual.addEventListener('focusout', function(event){ if (!visual.contains(event.relatedTarget)) { focused = false; schedule(); } });
  window.addEventListener('vitalcar:language', translate);
  window.addEventListener('resize', function(){ if (!('IntersectionObserver' in window)) measureVisibility(); invalidate(true); }, { passive: true });
  document.addEventListener('visibilitychange', function(){
    if (document.hidden) endDrag();
    else { start(); if (mode === '3d') dirty = true; }
    syncMotion();
  });
  window.addEventListener('pagehide', function(){ pageActive = false; endDrag(); stopFrame(); });
  window.addEventListener('pageshow', function(){ pageActive = true; measureVisibility(); start(); invalidate(true); });
  if (reduced.addEventListener) reduced.addEventListener('change', syncMotion);
  else if (reduced.addListener) reduced.addListener(syncMotion);
  if ('MutationObserver' in window) {
    new window.MutationObserver(syncMotion).observe(rootElement, { attributes: true, attributeFilter: ['data-motion-paused'] });
  }
  if ('ResizeObserver' in window) {
    sizeObserver = new window.ResizeObserver(function(){
      if (mode !== '3d' || failed) return;
      var bounds = canvas.getBoundingClientRect();
      if (Math.round(bounds.width) !== width || Math.round(bounds.height) !== height) invalidate(true);
    });
    sizeObserver.observe(canvas.parentElement);
  }
  function measureVisibility(){
    var bounds = visual.getBoundingClientRect();
    var viewport = window.innerHeight || rootElement.clientHeight;
    visible = bounds.bottom > 0 && bounds.top < viewport;
    near = bounds.bottom > -200 && bounds.top < viewport + 200;
    if (!attempted) start();
    schedule();
  }
  translate();
  if ('IntersectionObserver' in window) {
    visibilityObserver = new window.IntersectionObserver(function(entries){
      visible = entries[0].isIntersecting;
      if (visible && mode === '3d') dirty = true;
      schedule();
    }, { threshold: 0 });
    visibilityObserver.observe(visual);
    nearObserver = new window.IntersectionObserver(function(entries){
      near = entries[0].isIntersecting;
      if (near) start();
    }, { threshold: 0, rootMargin: '200px 0px' });
    nearObserver.observe(visual);
  } else {
    window.addEventListener('scroll', measureVisibility, { passive: true });
    measureVisibility();
  }
  loadConfig().then(finishConfig, function(){ finishConfig(DEFAULT_CONFIG); });
}(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this)));
