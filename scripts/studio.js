/* Native, progressive motion. No tracking, animation libraries or scroll hijacking. */
(function(){
  'use strict';
  var root = document.documentElement;
  var visual = document.getElementById('studio-visual');
  var nav = document.getElementById('site-nav');
  if (!visual) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var connection = navigator.connection || {};
  var paused = !!(connection.saveData || window.VITALCAR_REDE_FRACA);
  var hovered = false, focused = false, visible = true, timer = null, frame = null;
  var current = 0, sequence = 0, loading = false;
  var showing3D = false;
  var scenes = Array.from(visual.querySelectorAll('[data-scene-index]'));
  var buttons = Array.from(visual.querySelectorAll('button[data-scene]'));
  var toggle = document.getElementById('studio-motion-toggle');
  var toggleLabel = document.getElementById('studio-motion-label');
  var failed = new Set();
  var status = document.createElement('p');
  status.className = 'studio-scene-status';
  status.setAttribute('role', 'status');
  visual.appendChild(status);
  var labels = {
    pt: { pause: 'Pausar movimento', resume: 'Ativar movimento', reduced: 'Movimento reduzido', error: 'Foto indisponível. Escolha outra imagem.' },
    en: { pause: 'Pause motion', resume: 'Enable motion', reduced: 'Reduced motion', error: 'Photo unavailable. Choose another image.' },
    es: { pause: 'Pausar movimiento', resume: 'Activar movimiento', reduced: 'Movimiento reducido', error: 'Foto no disponible. Elige otra imagen.' }
  };
  function words(){ return labels[(root.lang || 'pt').slice(0, 2)] || labels.pt; }
  function userStopped(){ return paused || reduced.matches; }
  function suspended(){ return showing3D || userStopped() || document.hidden || !visible || hovered || focused; }
  function clearTimer(){ if (timer !== null) { clearTimeout(timer); timer = null; } }
  function resetTilt(){ visual.style.setProperty('--tilt-x', '0deg'); visual.style.setProperty('--tilt-y', '0deg'); }
  function updateControls(){
    root.setAttribute('data-motion-paused', String(userStopped() || !!document.hidden));
    visual.setAttribute('data-motion-suspended', String(suspended()));
    toggle.disabled = reduced.matches;
    toggle.setAttribute('aria-pressed', String(userStopped()));
    toggleLabel.textContent = reduced.matches ? words().reduced : (paused ? words().resume : words().pause);
    toggle.setAttribute('aria-label', toggleLabel.textContent);
    if (status.textContent) status.textContent = words().error;
    if (suspended()) resetTilt();
  }
  function schedule(){
    clearTimer();
    updateControls();
    if (suspended() || loading || scenes.length - failed.size < 2) return;
    timer = setTimeout(function(){
      timer = null;
      var next = (current + 1) % scenes.length;
      while (failed.has(next) && next !== current) next = (next + 1) % scenes.length;
      show(next, false);
    }, 7200);
  }
  function ensureImage(scene){
    var image = scene.querySelector('img');
    if (!image) return Promise.resolve(false);
    if (image.complete && image.naturalWidth > 0) return Promise.resolve(true);
    return new Promise(function(resolve){
      var deadline, done = false;
      function finish(ok){
        if (done) return;
        done = true;
        clearTimeout(deadline);
        image.removeEventListener('load', success);
        image.removeEventListener('error', failure);
        resolve(ok);
      }
      function success(){ finish(true); }
      function failure(){ finish(false); }
      image.addEventListener('load', success);
      image.addEventListener('error', failure);
      deadline = setTimeout(failure, 8000);
      if (image.dataset.src && !image.getAttribute('src')) image.src = image.dataset.src;
      if (image.complete && image.naturalWidth > 0) finish(true);
    });
  }
  function show(index, manual){
    if (!scenes[index] || failed.has(index)) return;
    clearTimer();
    if (manual) { paused = true; updateControls(); }
    status.textContent = '';
    var request = ++sequence;
    loading = true;
    ensureImage(scenes[index]).then(function(ok){
      if (request !== sequence) return;
      loading = false;
      if (!ok) {
        failed.add(index);
        if (buttons[index]) buttons[index].disabled = true;
        if (manual) status.textContent = words().error;
      } else if (manual || !suspended()) {
        current = index;
        scenes.forEach(function(scene, i){
          scene.classList.toggle('is-active', i === index);
          scene.setAttribute('aria-hidden', String(i !== index));
        });
        buttons.forEach(function(button, i){ button.setAttribute('aria-pressed', String(i === index)); });
      }
      schedule();
    });
  }
  buttons.forEach(function(button){
    button.addEventListener('click', function(){ show(Number(button.dataset.scene), true); });
  });
  toggle.addEventListener('click', function(){ paused = !paused; schedule(); });
  visual.addEventListener('pointerenter', function(e){ if (e.pointerType === 'mouse') { hovered = true; schedule(); } });
  visual.addEventListener('pointerleave', function(){ hovered = false; resetTilt(); schedule(); });
  visual.addEventListener('focusin', function(){ focused = true; schedule(); });
  visual.addEventListener('focusout', function(e){ if (!visual.contains(e.relatedTarget)) { focused = false; schedule(); } });
  visual.addEventListener('pointermove', function(e){
    if (showing3D || !finePointer.matches || userStopped() || document.hidden || !visible) return;
    var bounds = visual.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    visual.style.setProperty('--tilt-x', ((.5 - (e.clientY - bounds.top) / bounds.height) * 2).toFixed(2) + 'deg');
    visual.style.setProperty('--tilt-y', (((e.clientX - bounds.left) / bounds.width - .5) * 2).toFixed(2) + 'deg');
  }, { passive: true });
  document.addEventListener('visibilitychange', schedule);
  window.addEventListener('vitalcar:language', updateControls);
  window.addEventListener('vitalcar:view', function(event){
    showing3D = !!(event.detail && event.detail.mode === '3d');
    // Invalidate any image load started before changing modes. It must not
    // expose a hidden photo to assistive technology behind the 3D canvas.
    sequence++;
    loading = false;
    resetTilt();
    schedule();
  });
  if (reduced.addEventListener) reduced.addEventListener('change', schedule);
  else if (reduced.addListener) reduced.addListener(schedule);
  if (finePointer.addEventListener) finePointer.addEventListener('change', resetTilt);

  function refreshChrome(){
    frame = null;
    var y = window.scrollY || 0;
    var distance = root.scrollHeight - window.innerHeight;
    root.style.setProperty('--scroll-progress', String(distance > 0 ? Math.min(1, Math.max(0, y / distance)) : 0));
    if (nav) {
      nav.classList.toggle('is-scrolled', y > 24);
      root.style.setProperty('--studio-header', Math.ceil(nav.getBoundingClientRect().height) + 'px');
    }
  }
  function requestChrome(){ if (frame === null) frame = requestAnimationFrame(refreshChrome); }
  window.addEventListener('scroll', requestChrome, { passive: true });
  window.addEventListener('resize', requestChrome, { passive: true });
  if (nav && 'ResizeObserver' in window) new ResizeObserver(requestChrome).observe(nav);
  refreshChrome();

  // Content is visible by default; only a successfully installed observer can hide it.
  if ('IntersectionObserver' in window) {
    var reveal = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); reveal.unobserve(entry.target); }
      });
    }, { threshold: 0, rootMargin: '0px 0px 40px 0px' });
    document.querySelectorAll('[data-aos]').forEach(function(el){
      el.classList.add('studio-reveal');
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-visible');
      else reveal.observe(el);
    });
    root.classList.add('studio-motion-ready');
    visible = visual.getBoundingClientRect().top < window.innerHeight && visual.getBoundingClientRect().bottom > 0;
    var visibility = new IntersectionObserver(function(entries){
      visible = entries[0].isIntersecting;
      schedule();
    }, { threshold: 0 });
    visibility.observe(visual);
  }
  window.addEventListener('pagehide', clearTimer);
  window.addEventListener('pageshow', function(){ requestChrome(); schedule(); });
  root.classList.remove('no-js');
  schedule();
})();
