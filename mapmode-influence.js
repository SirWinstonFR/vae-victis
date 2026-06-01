/* ============================================================
   VAE VICTIS — mapmode-influence.js
   Mapmode "Influence Divine" — canvas 2D overlay
   
   Technique : canvas offscreen par pays, masqué avec la forme
   exacte du pays (destination-in) → jamais de débordement.
   
   Patterns style Victoria 3 :
     Olympiens  → hexagones dorés
     Sovereign  → hachures horizontales bleues
     Shemning   → diagonales croisées rouges
   
   Animations :
     - Respiration (opacité qui monte/descend)
     - Onde concentrique qui s'étend du centre vers les bords
   ============================================================ */

'use strict';

window.VV = window.VV || {};

(function () {

  /* ── CONSTANTES ─────────────────────────────────────────── */

  const FACS = {
    olympien:  { color: '#c8901a', rgb: [200, 144, 26],  label: 'Olympiens' },
    sovereign: { color: '#3a7acc', rgb: [58,  122, 204], label: 'Sovereign' },
    shemning:  { color: '#b02828', rgb: [176, 40,  40],  label: 'Shemning'  },
  };

  /* Vitesses d'animation par faction (ms) */
  const ANIM = {
    olympien:  { breath: 3000, wave: 2200 },
    sovereign: { breath: 3600, wave: 2600 },
    shemning:  { breath: 4200, wave: 3000 },
  };

  /* ── STATE ──────────────────────────────────────────────── */
  let active    = false;
  let canvas    = null;   // canvas overlay sur le globe
  let ctx       = null;
  let rafId     = null;
  let startTime = null;
  let patterns  = {};     // faction -> CanvasPattern

  /* ── CALCUL INFLUENCE (depuis alignX/alignY nations) ────── */
  function computeInfluence() {
    const nations = window.VV.NATIONS || {};
    const result  = {};

    Object.entries(nations).forEach(([zone, n]) => {
      const ax = n.alignX ?? 0.5;
      const ay = n.alignY ?? 0.5;
      const wO  = 1 - ay;
      const wS  = ay * (1 - ax);
      const wSh = ay * ax;
      const scores = { olympien: wO, sovereign: wS, shemning: wSh };
      const dom  = Object.keys(scores).reduce((a, b) => scores[a] >= scores[b] ? a : b);
      const str  = scores[dom]; // 0..1
      if (str < 0.36) return;   // trop neutre
      result[zone] = { faction: dom, strength: str, scores };
    });

    return result;
  }

  /* ── CRÉER LES PATTERNS CANVAS ──────────────────────────── */
  function buildPatterns() {
    patterns = {};

    /* OLYMPIENS — hexagones dorés */
    const olC = document.createElement('canvas');
    olC.width = 20; olC.height = 23;
    const olX = olC.getContext('2d');
    olX.strokeStyle = 'rgba(200,144,26,0.70)';
    olX.lineWidth = 1.1;
    // Hexagone centré
    olX.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 180 * (60 * i - 30);
      const x = 10 + 7 * Math.cos(a);
      const y = 11.5 + 7 * Math.sin(a);
      i === 0 ? olX.moveTo(x, y) : olX.lineTo(x, y);
    }
    olX.closePath();
    olX.stroke();
    patterns.olympien = ctx.createPattern(olC, 'repeat');

    /* SOVEREIGN — hachures horizontales bleues */
    const svC = document.createElement('canvas');
    svC.width = 14; svC.height = 10;
    const svX = svC.getContext('2d');
    svX.strokeStyle = 'rgba(58,122,204,0.75)';
    svX.lineWidth = 1.2;
    svX.beginPath(); svX.moveTo(0, 3.5); svX.lineTo(14, 3.5); svX.stroke();
    svX.strokeStyle = 'rgba(58,122,204,0.35)';
    svX.lineWidth = 0.6;
    svX.beginPath(); svX.moveTo(0, 8);   svX.lineTo(14, 8);   svX.stroke();
    patterns.sovereign = ctx.createPattern(svC, 'repeat');

    /* SHEMNING — diagonales croisées rouges */
    const shC = document.createElement('canvas');
    shC.width = 12; shC.height = 12;
    const shX = shC.getContext('2d');
    shX.strokeStyle = 'rgba(176,40,40,0.72)';
    shX.lineWidth = 1.1;
    shX.beginPath(); shX.moveTo(0,0); shX.lineTo(12,12); shX.stroke();
    shX.strokeStyle = 'rgba(176,40,40,0.40)';
    shX.lineWidth = 0.6;
    shX.beginPath(); shX.moveTo(12,0); shX.lineTo(0,12); shX.stroke();
    patterns.shemning = ctx.createPattern(shC, 'repeat');
  }

  /* ── INIT CANVAS ────────────────────────────────────────── */
  function initCanvas() {
    const wrap = document.getElementById('map-wrap');
    if (!wrap) return false;

    canvas = document.createElement('canvas');
    canvas.id = 'vv-influence-canvas';
    canvas.style.cssText = `
      position:absolute; top:0; left:0;
      width:100%; height:100%;
      pointer-events:none;
      z-index:5;
    `;
    canvas.width  = wrap.clientWidth;
    canvas.height = wrap.clientHeight;
    wrap.appendChild(canvas);

    ctx = canvas.getContext('2d');
    buildPatterns();
    return true;
  }

  /* ── DESSINER UN PAYS SUR LE CANVAS ────────────────────── */
  // Technique : canvas offscreen → clip par le path du pays → glow + pattern
  // Le clip canvas 2D est strictement limité aux pixels du pays.
  function drawCountry(feat, inf, t, pathFn) {
    const W = canvas.width, H = canvas.height;
    const f    = FACS[inf.faction];
    const anim = ANIM[inf.faction];

    // Générer le path SVG string via D3, puis le convertir en Path2D canvas
    let svgPathStr;
    try { svgPathStr = pathFn(feat); } catch(e) { return; }
    if (!svgPathStr) return;

    let path2d;
    try { path2d = new Path2D(svgPathStr); } catch(e) { return; }

    // Centroïde via D3 pour le gradient
    let cx, cy;
    try {
      const c = pathFn.centroid(feat);
      if (!c || isNaN(c[0]) || isNaN(c[1])) return;
      [cx, cy] = c;
    } catch(e) { return; }

    // Vérifier que le pays est visible (côté avant du globe)
    if (cx < -50 || cx > W + 50 || cy < -50 || cy > H + 50) return;

    // Canvas offscreen
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const ox = off.getContext('2d');

    /* ── 1. Clip strict = forme du pays ── */
    ox.save();
    ox.beginPath();
    // Redessiner le path via Path2D pour le clip
    ox.clip(path2d);

    /* ── 2. Respiration ── */
    const breath = (Math.sin(t / anim.breath * Math.PI * 2 - Math.PI / 2) + 1) / 2;
    const globalAlpha = (0.30 + inf.strength * 0.25) + breath * (0.35 + inf.strength * 0.30);

    /* ── 3. Fond dégradé centre→bords ── */
    const gradR = Math.max(W, H) * 0.40;
    const grd = ox.createRadialGradient(cx, cy, 0, cx, cy, gradR);
    grd.addColorStop(0.00, `rgba(${f.rgb[0]},${f.rgb[1]},${f.rgb[2]},${Math.min(0.95, globalAlpha).toFixed(2)})`);
    grd.addColorStop(0.50, `rgba(${f.rgb[0]},${f.rgb[1]},${f.rgb[2]},${Math.min(0.55, globalAlpha * 0.55).toFixed(2)})`);
    grd.addColorStop(1.00, `rgba(${f.rgb[0]},${f.rgb[1]},${f.rgb[2]},0)`);
    ox.fillStyle = grd;
    ox.fillRect(0, 0, W, H);

    /* ── 4. Pattern texturé ── */
    if (patterns[inf.faction]) {
      ox.globalAlpha = Math.min(0.85, (0.38 + inf.strength * 0.35) * (0.5 + breath * 0.5));
      ox.fillStyle = patterns[inf.faction];
      ox.fillRect(0, 0, W, H);
      ox.globalAlpha = 1;
    }

    /* ── 5. Onde concentrique ── */
    const wavePhase = (t % anim.wave) / anim.wave;
    const waveR     = wavePhase * gradR * 0.85;
    const waveAlpha = (1 - wavePhase) * (0.50 + inf.strength * 0.35);
    if (waveR > 2 && waveAlpha > 0.01) {
      ox.beginPath();
      ox.arc(cx, cy, waveR, 0, Math.PI * 2);
      ox.strokeStyle = `rgba(${f.rgb[0]},${f.rgb[1]},${f.rgb[2]},${waveAlpha.toFixed(2)})`;
      ox.lineWidth   = Math.max(0.5, 2.8 * (1 - wavePhase));
      ox.stroke();
    }

    ox.restore();

    /* ── 6. Contour lumineux (hors clip) ── */
    ox.strokeStyle = `rgba(${f.rgb[0]},${f.rgb[1]},${f.rgb[2]},${(0.45 + inf.strength * 0.45).toFixed(2)})`;
    ox.lineWidth   = inf.strength >= 0.65 ? 1.5 : 0.9;
    ox.stroke(path2d);

    /* ── 7. Copier sur le canvas principal ── */
    ctx.drawImage(off, 0, 0);
  }

  /* ── BOUCLE D'ANIMATION ─────────────────────────────────── */
  function renderLoop(ts) {
    if (!active || !ctx) return;
    if (!startTime) startTime = ts;
    const t = ts - startTime;

    // Récupérer proj et pathFn depuis globe.js
    const pathFn = window.VV.globe?._pathFn?.();
    const world  = window.VV._world;

    if (!pathFn || !world) {
      rafId = requestAnimationFrame(renderLoop);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const influence  = computeInfluence();
    const countryMap = window.VV.COUNTRY_MAP || {};

    world.features.forEach(feat => {
      const cn = feat.properties?.name;
      const zn = countryMap[cn];
      if (!zn || !influence[zn]) return;
      drawCountry(feat, influence[zn], t, pathFn);
    });

    rafId = requestAnimationFrame(renderLoop);
  }

  /* ── ACTIVER / DÉSACTIVER ───────────────────────────────── */
  function enable() {
    if (active) return;
    active = true;
    if (!canvas) {
      if (!initCanvas()) return;
    } else {
      canvas.style.display = 'block';
    }
    startTime = null;
    rafId = requestAnimationFrame(renderLoop);
    updateBtn(true);
  }

  function disable() {
    if (!active) return;
    active = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.display = 'none';
    }
    updateBtn(false);
  }

  function toggle() { active ? disable() : enable(); }

  /* ── BOUTON TOGGLE ──────────────────────────────────────── */
  function updateBtn(on) {
    const btn = document.getElementById('vv-mapmode-btn');
    if (!btn) return;
    btn.classList.toggle('active', on);
    btn.title = on ? 'Désactiver Influence Divine' : 'Activer Influence Divine';
  }

  function injectBtn() {
    if (document.getElementById('vv-mapmode-btn')) return;

    /* Injecter le CSS du bouton */
    const style = document.createElement('style');
    style.textContent = `
      #vv-mapmode-btn {
        position: absolute;
        bottom: 48px;
        right: 12px;
        z-index: 20;
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 7px 13px;
        background: rgba(5,12,25,0.88);
        border: 1px solid rgba(80,120,200,0.30);
        border-radius: 8px;
        color: rgba(180,200,230,0.70);
        font-family: Rajdhani, sans-serif;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.6px;
        cursor: pointer;
        transition: border-color .2s, color .2s, background .2s;
        user-select: none;
      }
      #vv-mapmode-btn:hover {
        border-color: rgba(120,160,240,0.55);
        color: rgba(200,220,255,0.90);
        background: rgba(8,18,38,0.95);
      }
      #vv-mapmode-btn.active {
        border-color: rgba(160,120,50,0.70);
        color: #d4a84c;
        background: rgba(30,18,5,0.92);
        box-shadow: 0 0 10px rgba(200,144,26,0.18);
      }
      #vv-mapmode-btn .vv-mm-icon {
        font-size: 14px;
        line-height: 1;
      }
      /* Légende mapmode */
      #vv-mapmode-legend {
        position: absolute;
        bottom: 92px;
        right: 12px;
        z-index: 20;
        background: rgba(5,12,25,0.88);
        border: 1px solid rgba(80,120,200,0.20);
        border-radius: 8px;
        padding: 8px 12px;
        font-family: Rajdhani, sans-serif;
        font-size: 11px;
        display: none;
        flex-direction: column;
        gap: 5px;
      }
      #vv-mapmode-legend.visible { display: flex; }
      .vv-mm-leg-item {
        display: flex; align-items: center; gap: 7px;
        color: rgba(180,200,230,0.75);
        font-weight: 500;
      }
      .vv-mm-leg-swatch {
        width: 28px; height: 10px;
        border-radius: 2px;
        flex-shrink: 0;
      }
    `;
    document.head.appendChild(style);

    /* Légende */
    const legend = document.createElement('div');
    legend.id = 'vv-mapmode-legend';
    legend.innerHTML = `
      <div class="vv-mm-leg-item">
        <div class="vv-mm-leg-swatch" style="background:rgba(200,144,26,0.75);outline:1px solid rgba(200,144,26,0.5)"></div>
        Olympiens
      </div>
      <div class="vv-mm-leg-item">
        <div class="vv-mm-leg-swatch" style="background:rgba(58,122,204,0.75);outline:1px solid rgba(58,122,204,0.5)"></div>
        Sovereign
      </div>
      <div class="vv-mm-leg-item">
        <div class="vv-mm-leg-swatch" style="background:rgba(176,40,40,0.75);outline:1px solid rgba(176,40,40,0.5)"></div>
        Shemning
      </div>
    `;

    /* Bouton */
    const btn = document.createElement('button');
    btn.id = 'vv-mapmode-btn';
    btn.innerHTML = '<span class="vv-mm-icon">✦</span> INFLUENCE DIVINE';
    btn.title = 'Activer Influence Divine';
    btn.addEventListener('click', () => {
      toggle();
      legend.classList.toggle('visible', active);
    });

    const wrap = document.getElementById('map-wrap');
    if (wrap) {
      wrap.appendChild(legend);
      wrap.appendChild(btn);
    }
  }

  /* ── RESIZE ─────────────────────────────────────────────── */
  function onResize() {
    if (!canvas) return;
    const wrap = document.getElementById('map-wrap');
    if (!wrap) return;
    canvas.width  = wrap.clientWidth;
    canvas.height = wrap.clientHeight;
    if (active) buildPatterns(); // recréer les patterns (ctx changé)
  }

  window.addEventListener('resize', onResize);

  /* ── EXPORT PUBLIC ──────────────────────────────────────── */
  window.VV.mapmode = {
    enable,
    disable,
    toggle,
    isActive: () => active,
  };

  /* ── AUTO-INIT ──────────────────────────────────────────── */
  // Attendre que le globe soit prêt
  function waitAndInit() {
    if (document.getElementById('map-wrap')) {
      injectBtn();
    } else {
      setTimeout(waitAndInit, 200);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitAndInit);
  } else {
    waitAndInit();
  }

})();
