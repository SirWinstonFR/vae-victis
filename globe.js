/* ============================================================
   VAE VICTIS — globe.js
   Tout ce qui concerne le globe D3 : rendu, rotation, zoom,
   points, badges, situations.
   ============================================================ */

'use strict';

// Globe state — partagé avec app.js via window
window.VV = window.VV || {};

// Variables globe
let proj, svgSel, gMap, gDots, gBadges;
let curK = 1;
let dragging = false;
let isRotating = false;
let _countries, _path;

const BADGE_FADE = 1.5, BADGE_HIDE = 2.5, DOTS_SHOW = 1.4;

// ---- INIT GLOBE --------------------------------------------
function initGlobe(world) {
  const wrap = document.getElementById('map-wrap');
  const W = wrap.clientWidth, H = wrap.clientHeight;

  _countries = topojson.feature(world, world.objects.countries);

  proj = d3.geoOrthographic()
    .scale(Math.min(W, H) / 2.05)
    .translate([W / 2, H / 2])
    .clipAngle(90)
    .rotate([-15, -46]);

  _path = d3.geoPath().projection(proj);

  svgSel = d3.select('#world-svg')
    .attr('width', W).attr('height', H)
    .style('display', 'block');

  // Fond
  svgSel.append('rect').attr('width', W).attr('height', H).attr('fill', '#050b14');

  // Halo atmosphérique
  const defs = svgSel.append('defs');
  const atmoGrad = defs.append('radialGradient')
    .attr('id', 'atmo-grad')
    .attr('cx', '50%').attr('cy', '50%').attr('r', '50%');
  atmoGrad.append('stop').attr('offset', '85%').attr('stop-color', '#0a2040').attr('stop-opacity', 0);
  atmoGrad.append('stop').attr('offset', '100%').attr('stop-color', '#1a5090').attr('stop-opacity', .35);

  // Océan
  svgSel.append('circle')
    .attr('class', 'globe-ocean')
    .attr('cx', W / 2).attr('cy', H / 2)
    .attr('r', proj.scale())
    .attr('fill', '#081422')
    .attr('stroke', '#1a3060').attr('stroke-width', .8);

  // Atmosphère
  svgSel.append('circle')
    .attr('class', 'globe-atmo')
    .attr('cx', W / 2).attr('cy', H / 2)
    .attr('r', proj.scale() + 6)
    .attr('fill', 'url(#atmo-grad)')
    .style('pointer-events', 'none');

  // Layers
  gMap    = svgSel.append('g').attr('class', 'g-map');
  gDots   = svgSel.append('g').attr('class', 'g-dots');
  gBadges = svgSel.append('g').attr('class', 'g-badges');

  // Graticule
  gMap.append('path')
    .datum(d3.geoGraticule()())
    .attr('d', _path)
    .attr('fill', 'none')
    .attr('stroke', '#162a3e')
    .attr('stroke-width', .25)
    .attr('opacity', .6);

  // Pays
  gMap.selectAll('path.country')
    .data(_countries.features)
    .join('path')
    .attr('class', d => `country${window.VV.COUNTRY_MAP?.[d.properties?.name] ? ' has-zone' : ''}`)
    .attr('d', _path)
    .on('mouseenter', (e, d) => {
      const z = window.VV.COUNTRY_MAP?.[d.properties?.name];
      if (z) showGlobeTT(e, z);
    })
    .on('mouseleave', hideGlobeTT)
    .on('click', (e, d) => {
      if (dragging) return;
      const z = window.VV.COUNTRY_MAP?.[d.properties?.name];
      if (z) window.VV.onZoneClick?.(z);
    });

  // Drag events natifs
  const svgNode = svgSel.node();
  let pointerDown = false, lastX = 0, lastY = 0, clickStartX = 0, clickStartY = 0;

  svgNode.addEventListener('mousedown', e => {
    pointerDown = true; dragging = false;
    lastX = e.clientX; lastY = e.clientY;
    clickStartX = e.clientX; clickStartY = e.clientY;
    e.preventDefault();
  });

  window.addEventListener('mousemove', e => {
    if (!pointerDown || isRotating) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    if (!dragging && (Math.abs(e.clientX - clickStartX) > 3 || Math.abs(e.clientY - clickStartY) > 3)) {
      dragging = true; hideGlobeTT();
    }
    if (!dragging) return;
    const s = 75 / proj.scale();
    const r = proj.rotate();
    proj.rotate([r[0] + dx * s, Math.max(-89, Math.min(89, r[1] - dy * s)), r[2]]);
    lastX = e.clientX; lastY = e.clientY;
    redrawGlobe();
  });

  window.addEventListener('mouseup', () => {
    pointerDown = false;
    setTimeout(() => { dragging = false; }, 60);
  });

  // Touch
  let lastTouch = null;
  svgNode.addEventListener('touchstart', e => {
    lastTouch = e.touches[0]; dragging = false;
    e.preventDefault();
  }, { passive: false });

  svgNode.addEventListener('touchmove', e => {
    if (!lastTouch) return;
    const t = e.touches[0];
    const dx = t.clientX - lastTouch.clientX, dy = t.clientY - lastTouch.clientY;
    dragging = true;
    const s = 80 / proj.scale();
    const r = proj.rotate();
    proj.rotate([r[0] + dx * s, Math.max(-89, Math.min(89, r[1] - dy * s)), r[2]]);
    lastTouch = t;
    redrawGlobe();
    e.preventDefault();
  }, { passive: false });

  svgNode.addEventListener('touchend', () => {
    setTimeout(() => { dragging = false; }, 60);
  });

  // Zoom scroll
  svgNode.addEventListener('wheel', e => {
    e.preventDefault();
    const base = Math.min(W, H) / 2.05;
    const factor = e.deltaY > 0 ? 0.88 : 1.14;
    const ns = Math.max(base * 0.5, Math.min(proj.scale() * factor, base * 9));
    proj.scale(ns);
    svgSel.select('.globe-ocean').attr('r', ns);
    svgSel.select('.globe-atmo').attr('r', ns + 6);
    curK = ns / base;
    redrawGlobe();
    applyGlobeZoom();
  }, { passive: false });

  document.getElementById('map-loading').style.display = 'none';
}

// ---- REDRAW ------------------------------------------------
function redrawGlobe() {
  if (!_path || !gMap) return;
  _path = d3.geoPath().projection(proj);

  gMap.select('path:first-child').attr('d', d3.geoPath().projection(proj)(d3.geoGraticule()()));
  gMap.selectAll('path.country').attr('d', _path);

  buildDots();
  buildBadges();
  applyGlobeZoom();

  if (window.VV.showSituations) drawSituations();
}

// ---- VISIBILITY --------------------------------------------
function isVisible(lon, lat) {
  if (!proj) return false;
  return proj([lon, lat]) !== null;
}

// ---- DOTS --------------------------------------------------
function buildDots() {
  if (!gDots || !proj) return;
  gDots.selectAll('*').remove();

  const W = +svgSel.attr('width'), H = +svgSel.attr('height');
  const cx = W / 2, cy = H / 2, r = proj.scale();
  const tm = window.VV.tzMap ? window.VV.tzMap() : {};

  Object.values(window.VV.ZONES || {}).flatMap(z => z.territories).forEach(t => {
    const p = proj([t.lon, t.lat]);
    if (!p) return;
    const [px, py] = p;
    if (Math.hypot(px - cx, py - cy) > r * 1.01) return;

    const fill  = window.VV.dotColor(t);
    const baseR = t.pi >= 3 ? 3.2 : t.pi >= 2 ? 2.6 : 2.0;

    // Halo
    gDots.append('circle').datum(t)
      .attr('class', 'thl')
      .attr('cx', px).attr('cy', py)
      .attr('r', baseR * 2.5)
      .attr('fill', fill).attr('opacity', .12)
      .style('pointer-events', 'none');

    if (t.type === 'org') {
      const s = baseR * 1.5;
      gDots.append('path').datum(t)
        .attr('class', 'tpt')
        .attr('d', `M${px},${py-s} L${px+s},${py} L${px},${py+s} L${px-s},${py} Z`)
        .attr('fill', fill)
        .attr('stroke', 'rgba(255,255,255,.2)').attr('stroke-width', .4)
        .style('cursor', 'pointer')
        .style('filter', `drop-shadow(0 0 2px ${fill})`)
        .on('mouseenter', function(e) {
          const owner = t.owner && t.owner !== 'neutral' ? window.VV.getD(t.owner) : null;
          showGlobeTT(e, `${t.name} · ${owner ? owner.name : 'Neutre'}${t.pi > 1 ? ` · ×${t.pi}PI` : ''}`);
        })
        .on('mouseleave', hideGlobeTT)
        .on('click', e => { e.stopPropagation(); if (!dragging) window.VV.onZoneClick?.(tm[t.id]); });
    } else {
      gDots.append('circle').datum(t)
        .attr('class', 'tpt')
        .attr('cx', px).attr('cy', py).attr('r', baseR)
        .attr('fill', fill)
        .attr('stroke', 'rgba(255,255,255,.15)').attr('stroke-width', .3)
        .style('cursor', 'pointer')
        .style('filter', `drop-shadow(0 0 2px ${fill})`)
        .on('mouseenter', function(e) {
          const owner = t.owner && t.owner !== 'neutral' ? window.VV.getD(t.owner) : null;
          showGlobeTT(e, `${t.name} · ${owner ? owner.name : 'Neutre'}${t.pi > 1 ? ` · ×${t.pi}PI` : ''}`);
          d3.select(this).attr('r', baseR * 1.7);
        })
        .on('mouseleave', function() { hideGlobeTT(); d3.select(this).attr('r', baseR); })
        .on('click', e => { e.stopPropagation(); if (!dragging) window.VV.onZoneClick?.(tm[t.id]); });
    }

    // ⚔ si on attaque ce territoire
    const me = window.VV.me;
    const attacks = window.VV.attacks || [];
    if (me && attacks.some(a => a.attacker === me.id && a.territory === t.id)) {
      gDots.append('text').datum(t)
        .attr('class', 'tpt-icon')
        .attr('x', px).attr('y', py - baseR - 3)
        .attr('text-anchor', 'middle')
        .attr('font-size', Math.max(9, baseR * 3))
        .attr('pointer-events', 'none')
        .style('filter', 'drop-shadow(0 0 2px #fff)')
        .text('⚔');
    }
  });
}

// ---- BADGES ------------------------------------------------
function buildBadges() {
  if (!gBadges || !proj) return;
  gBadges.selectAll('*').remove();

  const W = +svgSel.attr('width'), H = +svgSel.attr('height');
  const cx = W / 2, cy = H / 2, r = proj.scale();

  Object.entries(window.VV.ZONES || {}).forEach(([zoneName, zd]) => {
    if (!zd.cx && !zd.cy) return;
    const p = proj([zd.cx, zd.cy]);
    if (!p) return;
    const [px, py] = p;
    if (Math.hypot(px - cx, py - cy) > r * 1.01) return;

    const n = zd.territories.length;
    const g = gBadges.append('g')
      .attr('class', 'zone-badge')
      .attr('transform', `translate(${px},${py})`)
      .style('cursor', 'pointer')
      .on('click', e => { e.stopPropagation(); if (!dragging) window.VV.onZoneClick?.(zoneName); })
      .on('mouseenter', e => showGlobeTT(e, zoneName))
      .on('mouseleave', hideGlobeTT);

    g.append('circle').attr('r', 11).attr('fill', '#06101e').attr('stroke', '#2a5a8a').attr('stroke-width', .8).attr('opacity', .95);
    g.append('circle').attr('r', 8).attr('fill', '#0c1e36').attr('opacity', .9);
    g.append('text')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('font-size', n >= 10 ? 7 : 8.5).attr('font-weight', '700')
      .attr('fill', '#7ab8f5').attr('font-family', 'Rajdhani, sans-serif')
      .text(n);
  });
}

// ---- SITUATIONS --------------------------------------------
function drawSituations() {
  svgSel.selectAll('.situation-layer').remove();
  const situations = window.VV.situations || [];
  if (!situations.length || !proj) return;

  const situLayer = svgSel.insert('g', '.g-dots')
    .attr('class', 'situation-layer')
    .style('pointer-events', 'none');

  situations.forEach(s => {
    const color = window.VV.getSituationColor?.(s.type, s.intensity);
    if (!color) return;

    const countries = Object.entries(window.VV.COUNTRY_MAP || {})
      .filter(([, z]) => z === s.zone).map(([c]) => c);

    gMap.selectAll('path.country').each(function(d) {
      if (countries.includes(d.properties?.name)) {
        d3.select(this).style('fill', color).style('opacity', .7).style('stroke', color).style('stroke-width', .6);
      }
    });

    const zd = (window.VV.ZONES || {})[s.zone];
    if (zd && zd.cx && zd.cy) {
      const p = proj([zd.cx, zd.cy]);
      if (p) {
        const st = window.VV.SITUATION_TYPES?.[s.type];
        situLayer.append('text')
          .attr('x', p[0]).attr('y', p[1])
          .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
          .attr('font-size', 14 + s.intensity * 2)
          .attr('fill', color).attr('stroke', '#050b14').attr('stroke-width', 2)
          .attr('paint-order', 'stroke')
          .style('filter', `drop-shadow(0 0 5px ${color})`)
          .text(st?.icon || '!');
      }
    }
  });
}

// ---- HIGHLIGHT ZONE ----------------------------------------
function highlightZone(name) {
  if (!gMap) return;
  gMap.selectAll('.country')
    .classed('active', false)
    .classed('zone-member', false)
    .classed('trans-member', false);

  document.querySelectorAll('.tchip').forEach(c => c.classList.remove('active'));

  if (!name) return;

  const targets = Object.entries(window.VV.COUNTRY_MAP || {})
    .filter(([, z]) => z === name).map(([c]) => c);
  (targets.length ? targets : [name]).forEach(cn =>
    gMap.selectAll('.country').filter(d => d.properties?.name === cn)
      .classed('active', true).classed('zone-member', true)
  );

  // Rotation + dezoom animé vers la zone
  const zd = (window.VV.ZONES || {})[name];
  if (zd?.cx !== undefined) {
    const svgNode = svgSel.node();
    const W = +svgSel.attr('width'), H = +svgSel.attr('height');
    const base = Math.min(W, H) / 2.05;

    const r0 = proj.rotate();
    const s0 = proj.scale();
    const targetLon = -zd.cx;
    const targetLat = Math.max(-80, Math.min(80, -zd.cy * 0.6));
    let dLon = targetLon - r0[0];
    while (dLon > 180)  dLon -= 360;
    while (dLon < -180) dLon += 360;
    const r1 = [r0[0] + dLon, r0[1] + (targetLat - r0[1]), r0[2]];

    // Cible de zoom : revenir à 1x si trop zoomé
    const targetScale = curK > 2.5 ? base * 2.0 : s0;
    const interpR = d3.interpolate(r0, r1);
    const interpS = d3.interpolate(s0, targetScale);

    const dist = Math.hypot(dLon, targetLat - r0[1]);
    const duration = Math.min(900, Math.max(400, dist * 5));

    isRotating = true;
    d3.transition().duration(duration).ease(d3.easeCubicInOut)
      .tween('navigate', () => t => {
        proj.rotate(interpR(t));
        const ns = interpS(t);
        proj.scale(ns);
        svgSel.select('.globe-ocean').attr('r', ns);
        svgSel.select('.globe-atmo').attr('r', ns + 6);
        curK = ns / base;
        redrawGlobe();
      })
      .on('end', () => {
        isRotating = false;
        applyGlobeZoom();
      });
  }
}

function highlightTransMembers(members) {
  if (!gMap) return;
  gMap.selectAll('.country').classed('active', false).classed('zone-member', false).classed('trans-member', false);
  members.forEach(cn =>
    gMap.selectAll('.country').filter(d => d.properties?.name === cn).classed('trans-member', true)
  );
}

function resetCountryColors() {
  if (!gMap) return;
  // Supprimer le layer situation
  if (svgSel) svgSel.selectAll('.situation-layer').remove();
  // Redraw complet d'abord
  redrawGlobe();
  // Puis forcer reset des styles inline APRÈS le redraw
  setTimeout(() => {
    if (gMap) gMap.selectAll('path.country')
      .style('fill', null)
      .style('opacity', null)
      .style('stroke', null)
      .style('stroke-width', null);
  }, 20);
}

// ---- ZOOM --------------------------------------------------
function applyGlobeZoom() {
  const bOp = curK < BADGE_FADE ? 1 : curK > BADGE_HIDE ? 0 : 1 - (curK - BADGE_FADE) / (BADGE_HIDE - BADGE_FADE);
  const dOp = curK < DOTS_SHOW ? 0 : curK > BADGE_HIDE ? 1 : (curK - DOTS_SHOW) / (BADGE_HIDE - DOTS_SHOW);
  if (gBadges) gBadges.style('opacity', bOp).style('pointer-events', bOp > .1 ? 'auto' : 'none');
  if (gDots)   gDots.style('opacity', dOp).style('pointer-events', dOp > .2 ? 'auto' : 'none');
}

// ---- TOOLTIP -----------------------------------------------
function showGlobeTT(e, txt) {
  if (dragging) return;
  const tt = document.getElementById('map-tt');
  const rect = document.getElementById('map-wrap').getBoundingClientRect();
  if (!tt) return;
  tt.textContent = txt; tt.style.display = 'block';
  tt.style.left = `${e.clientX - rect.left + 14}px`;
  tt.style.top  = `${e.clientY - rect.top  - 30}px`;
}
function hideGlobeTT() {
  const tt = document.getElementById('map-tt');
  if (tt) tt.style.display = 'none';
}

// ---- ZOOM BUTTONS ------------------------------------------
function zoomGlobeIn() {
  if (!proj || !svgSel) return;
  const W = +svgSel.attr('width'), H = +svgSel.attr('height');
  const base = Math.min(W, H) / 2.05;
  const ns = Math.min(proj.scale() * 1.5, base * 9);
  proj.scale(ns);
  svgSel.select('.globe-ocean').attr('r', ns);
  svgSel.select('.globe-atmo').attr('r', ns + 6);
  curK = ns / base; redrawGlobe(); applyGlobeZoom();
}
function zoomGlobeOut() {
  if (!proj || !svgSel) return;
  const W = +svgSel.attr('width'), H = +svgSel.attr('height');
  const base = Math.min(W, H) / 2.05;
  const ns = Math.max(proj.scale() * 0.67, base * 0.5);
  proj.scale(ns);
  svgSel.select('.globe-ocean').attr('r', ns);
  svgSel.select('.globe-atmo').attr('r', ns + 6);
  curK = ns / base; redrawGlobe(); applyGlobeZoom();
}
function zoomGlobeReset() {
  if (!proj || !svgSel) return;
  const W = +svgSel.attr('width'), H = +svgSel.attr('height');
  const base = Math.min(W, H) / 2.05;
  proj.scale(base).rotate([-15, -46]);
  svgSel.select('.globe-ocean').attr('r', base);
  svgSel.select('.globe-atmo').attr('r', base + 6);
  curK = 1; redrawGlobe(); applyGlobeZoom();
}

// ---- EXPORTS -----------------------------------------------
window.VV.globe = {
  init: initGlobe,
  redraw: redrawGlobe,
  buildDots,
  buildBadges,
  highlightZone,
  highlightTransMembers,
  resetCountryColors,
  drawSituations,
  zoomIn: zoomGlobeIn,
  zoomOut: zoomGlobeOut,
  zoomReset: zoomGlobeReset,
  isVisible,
  isDragging: () => dragging,
};
