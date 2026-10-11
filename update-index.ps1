$content = Get-Content 'C:\Users\lucia\Downloads\vitalcar-site\index.html' -Raw -Encoding UTF8

$heroStart = $content.IndexOf('<section id="inicio" class="hero studio-hero">')
$marqueeStart = $content.IndexOf('<div class="marquee"', $heroStart)

$before = $content.Substring(0, $heroStart)
$after = $content.Substring($marqueeStart)

$newHero = @'
<main id="conteudo" tabindex="-1">
<!-- LIQUID METAL HERO (Vanilla WebGL) -->
<section id="inicio" class="hero" aria-labelledby="lm-hero-title">
  <div id="lm-hero" data-lm-hero
    data-badge="🎉 10% OFF INAUGURAÇÃO · ATÉ 30/10/2026"
    data-title="SEU CARRO<br>COMO NOVO<br>TODOS OS DIAS"
    data-subtitle="Lavagem técnica, polimento, vitrificação, higienização. Carros e motos com produtos premium e mão de obra que respeita seu veículo."
    data-primary-cta="📞 Agende pelo WhatsApp"
    data-primary-href="https://wa.me/557391436726?text=Ol%C3%A1!%20Quero%20aproveitar%20os%2010%25%20de%20inaugura%C3%A7%C3%A3o%20da%20Vitalcar."
    data-secondary-cta="📱 Ligar agora"
    data-secondary-href="tel:+557391436726"
    data-features="Lavagem Técnica + Snow Foam|Polimento & Vitrificação Certificados|Higienização Profunda & Couro"
    data-rating="5.0"
    data-reviews="6"
  ></div>
  
  <!-- Studio Visual (3D Showroom) - preservado abaixo do hero -->
  <div class="studio-visual" id="studio-visual" data-tilt style="margin-top: 60px;">
    <div class="showroom-mode" id="showroom-mode" role="group" aria-label="Visualização" data-showroom-aria="modeLabel">
      <button type="button" data-showroom-mode="3d" aria-pressed="false" aria-controls="showroom-root" data-showroom-text="mode3d">3D</button>
      <button type="button" data-showroom-mode="photos" aria-pressed="true" data-showroom-text="modePhotos">Fotos reais</button>
    </div>
    <div class="showroom-root" id="showroom-root" aria-labelledby="showroom-caption" hidden>
      <p class="showroom-caption" id="showroom-caption" data-showroom-text="caption">Modelo 3D ilustrativo</p>
      <div class="showroom-stage">
        <canvas id="showroom-canvas" tabindex="0" role="img" aria-label="Carro 3D ilustrativo; não representa um veículo de cliente." data-showroom-aria="canvasLabel" aria-describedby="showroom-instructions" aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home"><span data-showroom-text="canvasFallback">Selecione Fotos reais para ver nosso trabalho.</span></canvas>
      </div>
      <div class="showroom-controls">
        <p class="showroom-instructions" id="showroom-instructions" data-showroom-text="instructions">Arraste ou use as setas. Home: vista inicial.</p>
        <div class="showroom-colors" role="group" aria-label="Cor do modelo" data-showroom-aria="colorsLabel">
          <button type="button" data-showroom-color="red" aria-pressed="true"><span class="showroom-swatch" aria-hidden="true"></span><span data-showroom-text="red">Vermelho</span></button>
          <button type="button" data-showroom-color="pearl" aria-pressed="false"><span class="showroom-swatch" aria-hidden="true"></span><span data-showroom-text="pearl">Pérola</span></button>
          <button type="button" data-showroom-color="graphite" aria-pressed="false"><span class="showroom-swatch" aria-hidden="true"></span><span data-showroom-text="graphite">Grafite</span></button>
        </div>
        <div class="showroom-tools">
          <button type="button" id="showroom-reset" aria-label="Restaurar ângulo inicial" data-showroom-aria="resetLabel" data-showroom-text="reset">Repor vista</button>
          <button type="button" id="showroom-motion" aria-pressed="false" aria-describedby="showroom-motion-note">Pausar rotação</button>
        </div>
        <p class="showroom-sr" id="showroom-motion-note"></p>
      </div>
    </div>
    <p class="showroom-status" id="showroom-status" role="status" hidden></p>
    <span class="studio-frame-mark" aria-hidden="true"></span>
    <span class="studio-visual-label" aria-hidden="true" data-i18n="studio_visual_label">Do nosso estúdio / Ilhéus, BA</span>
    <div class="studio-controls">
      <button type="button" data-scene="0" aria-pressed="true" aria-label="Mostrar foto 1: cuidado com a pintura" data-i18n-aria="studio_scene1_aria">01</button>
      <button type="button" data-scene="1" aria-pressed="false" aria-label="Mostrar foto 2: brilho e acabamento" data-i18n-aria="studio_scene2_aria">02</button>
      <button type="button" data-scene="2" aria-pressed="false" aria-label="Mostrar foto 3: cuidado com motos" data-i18n-aria="studio_scene3_aria">03</button>
      <button type="button" id="studio-motion-toggle" aria-pressed="false"><span id="studio-motion-label" data-i18n="studio_motion_pause">Pausar movimento</span></button>
    </div>
  </div>
  
  <div class="studio-hero-bottom">
    <a href="#servicos" data-i18n="studio_explore">Explore os serviços ↓</a>
    <p data-i18n="studio_location">São Francisco · Ilhéus, Bahia</p>
  </div>
</section>
'@

$newContent = $before + $newHero + $after
Set-Content 'C:\Users\lucia\Downloads\vitalcar-site\index.html' -Value $newContent -Encoding UTF8
Write-Host 'Done!'