/**
 * Vitalcar Liquid Metal Hero — Vanilla JS Version
 * Zero React, zero Tailwind, zero build step.
 * Drop into index.html + studio.js stack.
 * 
 * Usage:
 *   <script src="liquid-metal-vanilla.js"></script>
 *   <div id="lm-hero"></div>
 *   <script>LiquidMetalHero.mount('#lm-hero', { title, subtitle, ... })</script>
 */

(function () {
  'use strict';

  // ============================================================
  // SHADER SOURCE (ported from @paper-design/shaders-react preset 2)
  // ============================================================
  const VERTEX_SHADER = `
    attribute vec2 aPosition;
    varying vec2 vUv;
    void main() {
      vUv = aPosition * 0.5 + 0.5;
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  const FRAGMENT_SHADER = `
    precision highp float;
    varying vec2 vUv;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform vec3 uColorC;
    uniform float uIntensity;
    uniform float uSpeed;

    // Noise functions
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 1.0/7.0;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ * ns.x + ns.yyyy;
      vec4 y = y_ * ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0) * 2.0 + 1.0;
      vec4 s1 = floor(b1) * 2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
    }

    // FBM
    float fbm(vec3 p) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 6; i++) {
        value += amplitude * snoise(p);
        p *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }

    // Domain warping
    vec2 warp(vec2 p, float t) {
      vec2 q = vec2(fbm(vec3(p.x + 1.7, p.y + 9.2, t * 0.5)),
                    fbm(vec3(p.x + 8.3, p.y + 2.8, t * 0.5)));
      vec2 r = vec2(fbm(vec3(p.x + q.x + 3.4, p.y + q.y + 7.1, t * 0.5)),
                    fbm(vec3(p.x + q.x + 5.2, p.y + q.y + 1.9, t * 0.5)));
      return r;
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
      float t = uTime * uSpeed;
      
      vec2 p = uv * 2.0;
      vec2 w = warp(p, t);
      
      float n1 = fbm(vec3(p + w, t));
      float n2 = fbm(vec3(p - w, t + 100.0));
      float n3 = fbm(vec3(p + w * 0.5, t + 200.0));
      
      float liquid = smoothstep(0.3, 0.7, n1) * smoothstep(0.4, 0.8, n2);
      float edges = smoothstep(0.45, 0.55, n3);
      
      vec3 col = mix(uColorA, uColorB, liquid);
      col = mix(col, uColorC, edges * 0.5);
      col = mix(col, vec3(0.02, 0.02, 0.03), 1.0 - liquid * 0.7);
      
      // Vignette
      float vignette = 1.0 - length(uv) * 0.6;
      col *= vignette;
      
      // Subtle scanlines
      float scan = sin(gl_FragCoord.y * 0.5 + t * 10.0) * 0.01;
      col += scan;
      
      gl_FragColor = vec4(col * uIntensity, 1.0);
    }
  `;

  // ============================================================
  // PRESET COLORS (matching liquidMetalPresets[2])
  // ============================================================
  const PRESET = {
    colorA: [0.08, 0.02, 0.03],    // dark red-black
    colorB: [0.45, 0.08, 0.12],    // deep crimson
    colorC: [0.95, 0.35, 0.25],    // bright orange-red
    intensity: 1.1,
    speed: 0.15
  };

  // ============================================================
  // WEBGL RENDERER
  // ============================================================
  class LiquidMetalRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = null;
      this.program = null;
      this.uniforms = {};
      this.startTime = performance.now();
      this.animationId = null;
      this.resizeObserver = null;
      this.init();
    }

    init() {
      const gl = this.canvas.getContext('webgl', {
        alpha: true,
        premultipliedAlpha: true,
        antialias: true,
        powerPreference: 'low-power'
      });
      if (!gl) {
        console.warn('[LiquidMetal] WebGL not available');
        return;
      }
      this.gl = gl;

      // Compile shaders
      const vs = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
      const fs = this.compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
      if (!vs || !fs) return;

      this.program = gl.createProgram();
      gl.attachShader(this.program, vs);
      gl.attachShader(this.program, fs);
      gl.linkProgram(this.program);

      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
        console.error('[LiquidMetal] Program link failed:', gl.getProgramInfoLog(this.program));
        return;
      }

      gl.useProgram(this.program);

      // Attributes
      const posLoc = gl.getAttribLocation(this.program, 'aPosition');
      gl.enableVertexAttribArray(posLoc);

      // Fullscreen quad
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,  1, -1,  -1, 1,
        -1,  1,  1, -1,  1, 1
      ]), gl.STATIC_DRAW);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      // Uniforms
      this.uniforms = {
        uTime: gl.getUniformLocation(this.program, 'uTime'),
        uResolution: gl.getUniformLocation(this.program, 'uResolution'),
        uColorA: gl.getUniformLocation(this.program, 'uColorA'),
        uColorB: gl.getUniformLocation(this.program, 'uColorB'),
        uColorC: gl.getUniformLocation(this.program, 'uColorC'),
        uIntensity: gl.getUniformLocation(this.program, 'uIntensity'),
        uSpeed: gl.getUniformLocation(this.program, 'uSpeed')
      };

      // Set static uniforms
      gl.uniform3fv(this.uniforms.uColorA, PRESET.colorA);
      gl.uniform3fv(this.uniforms.uColorB, PRESET.colorB);
      gl.uniform3fv(this.uniforms.uColorC, PRESET.colorC);
      gl.uniform1f(this.uniforms.uIntensity, PRESET.intensity);
      gl.uniform1f(this.uniforms.uSpeed, PRESET.speed);

      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      this.resize();
      this.animate();
      this.observeResize();
    }

    compileShader(type, source) {
      const gl = this.gl;
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('[LiquidMetal] Shader compile failed:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    resize() {
      if (!this.gl) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const rect = this.canvas.getBoundingClientRect();
      this.canvas.width = Math.floor(rect.width * dpr);
      this.canvas.height = Math.floor(rect.height * dpr);
      this.canvas.style.width = rect.width + 'px';
      this.canvas.style.height = rect.height + 'px';
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      this.gl.uniform2f(this.uniforms.uResolution, this.canvas.width, this.canvas.height);
    }

    observeResize() {
      if ('ResizeObserver' in window) {
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.canvas);
      } else {
        window.addEventListener('resize', () => this.resize());
      }
    }

    animate() {
      if (!this.gl) return;
      const gl = this.gl;
      const elapsed = (performance.now() - this.startTime) * 0.001;
      
      gl.uniform1f(this.uniforms.uTime, elapsed);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      
      this.animationId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
      if (this.animationId) cancelAnimationFrame(this.animationId);
      if (this.resizeObserver) this.resizeObserver.disconnect();
      if (this.gl && this.program) {
        this.gl.deleteProgram(this.program);
      }
    }
  }

  // ============================================================
  // HERO COMPONENT
  // ============================================================
  class LiquidMetalHero {
    constructor(container, options = {}) {
      this.container = typeof container === 'string' 
        ? document.querySelector(container) 
        : container;
      if (!this.container) {
        console.error('[LiquidMetalHero] Container not found');
        return;
      }

      this.options = {
        badge: options.badge || '',
        title: options.title || 'VITALCAR',
        subtitle: options.subtitle || 'Estética Automotiva de Alto Nível',
        primaryCtaLabel: options.primaryCtaLabel || 'Agendar pelo WhatsApp',
        primaryCtaHref: options.primaryCtaHref || 'https://wa.me/557391436726',
        secondaryCtaLabel: options.secondaryCtaLabel || 'Ligar agora',
        secondaryCtaHref: options.secondaryCtaHref || 'tel:+557391436726',
        features: options.features || [
          'Lavagem Técnica + Snow Foam',
          'Polimento & Vitrificação Certificados',
          'Higienização Profunda & Couro'
        ],
        rating: options.rating || '5.0',
        reviewsCount: options.reviewsCount || 6,
        onPrimaryClick: options.onPrimaryClick || null,
        onSecondaryClick: options.onSecondaryClick || null
      };

      this.render();
      this.initAnimations();
      this.bindEvents();
    }

    render() {
      const { badge, title, subtitle, primaryCtaLabel, primaryCtaHref, secondaryCtaLabel, secondaryCtaHref, features, rating, reviewsCount } = this.options;

      this.container.innerHTML = `
        <section class="lm-hero" style="
          position: relative;
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: var(--bg, #0d0b0a);
          color: var(--text, #f5ecd8);
        ">
          <!-- WebGL Canvas -->
          <canvas class="lm-canvas" style="
            position: fixed;
            inset: 0;
            width: 100%;
            height: 100%;
            z-index: 0;
            pointer-events: none;
          " aria-hidden="true"></canvas>

          <!-- Overlay gradient -->
          <div class="lm-overlay" style="
            position: fixed;
            inset: 0;
            z-index: 1;
            pointer-events: none;
            background: 
              radial-gradient(ellipse at 20% 30%, rgba(255,26,26,0.12) 0%, transparent 60%),
              radial-gradient(ellipse at 80% 70%, rgba(245,197,24,0.08) 0%, transparent 60%),
              linear-gradient(180deg, rgba(13,11,10,0.4) 0%, rgba(13,11,10,0.8) 50%, rgba(13,11,10,0.95) 100%);
          "></div>

          <!-- Content -->
          <div class="lm-content" style="
            position: relative;
            z-index: 2;
            width: 100%;
            max-width: 1180px;
            margin: 0 auto;
            padding: 0 24px;
            text-align: center;
          ">
            ${badge ? `
              <div class="lm-badge" style="
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 8px 18px;
                font-family: 'Space Mono', monospace;
                font-size: 0.7rem;
                font-weight: 700;
                letter-spacing: 4px;
                text-transform: uppercase;
                color: var(--red, #ff1a1a);
                border: 1px solid var(--red, #ff1a1a);
                background: rgba(255,26,26,0.06);
                margin-bottom: 24px;
                opacity: 0;
                transform: translateY(20px);
                transition: opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1);
              ">${badge}</div>
            ` : ''}

            <div class="lm-title-block" style="opacity: 0; transform: translateY(30px); transition: opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1);">
              <h1 class="lm-title" style="
                font-family: 'Archivo Black', 'Arial Black', sans-serif;
                font-size: clamp(3.4rem, 11vw, 9rem);
                line-height: 0.82;
                letter-spacing: -0.05em;
                font-weight: 900;
                text-transform: uppercase;
                color: var(--text, #f5ecd8);
                margin: 0 0 16px;
                text-shadow: 0 6px 30px rgba(0,0,0,0.55);
              ">${title}</h1>
              
              <p class="lm-subtitle" style="
                font-family: 'Space Mono', monospace;
                font-size: clamp(1rem, 2.5vw, 1.2rem);
                line-height: 1.7;
                color: var(--text2, #a89880);
                max-width: 680px;
                margin: 0 auto 32px;
                letter-spacing: 0.5px;
                text-shadow: 0 3px 16px rgba(0,0,0,0.85);
              ">${subtitle}</p>
            </div>

            <div class="lm-ctas" style="
              display: flex;
              flex-wrap: wrap;
              gap: 12px;
              justify-content: center;
              align-items: center;
              margin-bottom: 32px;
              opacity: 0;
              transform: translateY(30px);
              transition: opacity 0.9s cubic-bezier(0.16,1,0.3,1) 0.2s, transform 0.9s cubic-bezier(0.16,1,0.3,1) 0.2s;
            ">
              <a class="lm-btn lm-btn-primary" href="${primaryCtaHref}" target="_blank" rel="noopener" style="
                display: inline-flex;
                align-items: center;
                gap: 10px;
                padding: 18px 40px;
                text-decoration: none;
                font-family: 'Archivo Black', sans-serif;
                font-weight: 900;
                font-size: 1rem;
                letter-spacing: 1px;
                text-transform: uppercase;
                background: var(--red, #ff1a1a);
                color: #fff;
                border: 2px solid var(--red, #ff1a1a);
                transition: all 0.18s ease;
                cursor: pointer;
              ">${primaryCtaLabel}</a>

              ${secondaryCtaLabel ? `
                <a class="lm-btn lm-btn-ghost" href="${secondaryCtaHref}" style="
                  display: inline-flex;
                  align-items: center;
                  gap: 10px;
                  padding: 18px 40px;
                  text-decoration: none;
                  font-family: 'Archivo Black', sans-serif;
                  font-weight: 900;
                  font-size: 1rem;
                  letter-spacing: 1px;
                  text-transform: uppercase;
                  background: transparent;
                  color: var(--text, #f5ecd8);
                  border: 2px solid var(--text, #f5ecd8);
                  transition: all 0.18s ease;
                  cursor: pointer;
                ">${secondaryCtaLabel}</a>
              ` : ''}
            </div>

            <div class="lm-rating" style="
              display: inline-flex;
              align-items: center;
              gap: 12px;
              background: var(--yellow, #f5c518);
              color: #0a0a0a;
              padding: 12px 24px;
              font-family: 'Space Mono', monospace;
              font-weight: 700;
              font-size: 0.8rem;
              text-decoration: none;
              border: 2px solid #000;
              box-shadow: 3px 3px 0 #000;
              transition: all 0.18s ease;
              transform: rotate(-1deg);
              opacity: 0;
              transform: translateY(20px) rotate(-1deg);
              transition: opacity 0.8s cubic-bezier(0.16,1,0.3,1) 0.4s, transform 0.8s cubic-bezier(0.16,1,0.3,1) 0.4s;
            ">
              <span class="lm-rating-stars" style="color: #0a0a0a; letter-spacing: 2px;">★★★★★</span>
              <span class="lm-rating-text"><strong>${rating}</strong> no Google · ${reviewsCount} avaliações</span>
            </div>

            ${features.length > 0 ? `
              <div class="lm-features" style="
                margin-top: 64px;
                opacity: 0;
                transform: translateY(30px);
                transition: opacity 0.8s cubic-bezier(0.16,1,0.3,1) 0.6s, transform 0.8s cubic-bezier(0.16,1,0.3,1) 0.6s;
              ">
                <div class="lm-features-card" style="
                  background: var(--bg2, #151210);
                  border: 2px solid var(--border, #2a241f);
                  border-radius: 8px;
                  padding: 32px 24px;
                ">
                  <div class="lm-features-grid" style="
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 24px;
                  ">
                    ${features.map((feature, i) => `
                      <div class="lm-feature" style="
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        text-align: center;
                        opacity: 0;
                        transform: translateX(${i % 2 === 0 ? -20 : 20}px);
                        transition: opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${0.7 + i * 0.1}s, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${0.7 + i * 0.1}s;
                      ">
                        <p style="
                          font-family: 'Space Mono', monospace;
                          font-size: 0.85rem;
                          font-weight: 600;
                          color: var(--text, #f5ecd8);
                          letter-spacing: 0.5px;
                          text-transform: uppercase;
                        ">${feature}</p>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            ` : ''}
          </div>
        </section>
      `;

      // Initialize canvas
      this.canvas = this.container.querySelector('.lm-canvas');
      if (this.canvas) {
        this.renderer = new LiquidMetalRenderer(this.canvas);
      }

      // Trigger entrance animations
      requestAnimationFrame(() => {
        this.container.querySelectorAll('[style*="opacity: 0"]').forEach(el => {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0) rotate(0)';
        });
      });
    }

    initAnimations() {
      // Button hover effects
      this.container.querySelectorAll('.lm-btn').forEach(btn => {
        btn.addEventListener('mouseenter', () => {
          btn.style.transform = 'translate(-2px, -2px)';
          btn.style.boxShadow = '4px 4px 0 var(--yellow, #f5c518)';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.transform = 'none';
          btn.style.boxShadow = 'none';
        });
      });

      // Rating hover
      const rating = this.container.querySelector('.lm-rating');
      if (rating) {
        rating.addEventListener('mouseenter', () => {
          rating.style.transform = 'rotate(-1deg) translate(-2px, -2px)';
          rating.style.boxShadow = '5px 5px 0 #000';
        });
        rating.addEventListener('mouseleave', () => {
          rating.style.transform = 'rotate(-1deg)';
          rating.style.boxShadow = '3px 3px 0 #000';
        });
      }

      // Feature cards hover
      this.container.querySelectorAll('.lm-feature').forEach(feat => {
        feat.addEventListener('mouseenter', () => {
          feat.style.transform = 'translateY(-4px)';
        });
        feat.addEventListener('mouseleave', () => {
          feat.style.transform = 'translateY(0)';
        });
      });
    }

    bindEvents() {
      // Primary CTA click tracking
      const primaryBtn = this.container.querySelector('.lm-btn-primary');
      if (primaryBtn && this.options.onPrimaryClick) {
        primaryBtn.addEventListener('click', (e) => {
          if (this.options.onPrimaryClick) this.options.onPrimaryClick(e);
        });
      }

      // Secondary CTA click tracking
      const secondaryBtn = this.container.querySelector('.lm-btn-ghost');
      if (secondaryBtn && this.options.onSecondaryClick) {
        secondaryBtn.addEventListener('click', (e) => {
          if (this.options.onSecondaryClick) this.options.onSecondaryClick(e);
        });
      }
    }

    destroy() {
      if (this.renderer) this.renderer.destroy();
    }
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  window.LiquidMetalHero = {
    mount(container, options) {
      return new LiquidMetalHero(container, options);
    },
    PRESET
  };

  // Auto-mount if data attribute present
  document.addEventListener('DOMContentLoaded', () => {
    const autoMount = document.querySelector('[data-lm-hero]');
    if (autoMount) {
      const options = {
        badge: autoMount.dataset.badge || '',
        title: autoMount.dataset.title || 'VITALCAR',
        subtitle: autoMount.dataset.subtitle || '',
        primaryCtaLabel: autoMount.dataset.primaryCta || 'Agendar pelo WhatsApp',
        primaryCtaHref: autoMount.dataset.primaryHref || 'https://wa.me/557391436726',
        secondaryCtaLabel: autoMount.dataset.secondaryCta || 'Ligar agora',
        secondaryCtaHref: autoMount.dataset.secondaryHref || 'tel:+557391436726',
        features: autoMount.dataset.features ? autoMount.dataset.features.split('|') : [],
        rating: autoMount.dataset.rating || '5.0',
        reviewsCount: parseInt(autoMount.dataset.reviews || '6', 10)
      };
      LiquidMetalHero.mount(autoMount, options);
    }
  });

})();