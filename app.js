/* ============================================================
   VAE VICTIS — app.js
   ============================================================ */

'use strict';

// ---- CONFIG ------------------------------------------------
const CFG = {
  SHEET_PUB_ID: '2PACX-1vS3YihqiaMrry5ksybGNmpyn3zsFVlztk6hAtdZLQj55bkxCgXhLBr29ap_tFmNq__M7Nvjt6f5ZPxQ',
  SHEET_ID:     '1L9hbQuAD9A4WQFG1G47teZlUPM6-JkMmuuX2Ys-TYt8',
  APPS_SCRIPT:  'https://script.google.com/macros/s/AKfycbyCaQI2c5ds2uCmoeCw6_fALjh-8ii05fkOVgZmWPhbY64vyYbrNcFvqbFKRb7rUwyxwQ/exec',
  REFRESH_MIN:  5,
  // GIDs des onglets — visible dans l'URL du sheet après #gid=
  GIDS: {
    divinites:    '855807094',
    territoires:  '658049216',
    attaques:     '2093054741',
    cycles:       '1122856746',
    zones_config: '851605217',
  },
};

// ---- STATE -------------------------------------------------
let DEITIES       = [];
let ZONES         = {};
let TRANS_ZONES   = {
  UE:   { icon: '🇪🇺', name: 'Union Européenne', territories: [] },
  OTAN: { icon: '🛡️',  name: 'OTAN',             territories: [] },
  ONU:  { icon: '🌐',  name: 'ONU',              territories: [] },
};
let COUNTRY_MAP   = {}; // countryName → zoneName
let CYCLE         = 7;
let me            = null;
let attacks       = [];
let capitulation  = null;
let pendingAtk    = null;
let selDeity      = null;
let selZone       = null;
let selTrans      = null;
let refreshTimer  = null;

// D3 / map state
let proj, svgSel, gMap, gDots, gBadges, zoomBeh;
let curK      = 1;
let dragging  = false;
const N = 'neutral';
const BADGE_FADE = 1.8, BADGE_HIDE = 2.8, DOTS_SHOW = 2.0;

// ---- HELPERS -----------------------------------------------
const $ = id => document.getElementById(id);
const getD = id => DEITIES.find(d => d.id === id) || { id, name: id, color: '#3a5a7a', pi: 0, avatar: '' };
const getT = id => allT().find(t => t.id === id);
const allT = () => [
  ...Object.values(ZONES).flatMap(z => z.territories),
  ...Object.values(TRANS_ZONES).flatMap(z => z.territories),
];
const atkOn   = did => attacks.filter(a => a.target === did).length;
const myAtks  = ()  => me ? attacks.filter(a => a.attacker === me.id) : [];
const tzMap   = ()  => {
  const m = {};
  Object.entries(ZONES).forEach(([z, d]) => d.territories.forEach(t => { m[t.id] = z; }));
  return m;
};

function dotColor(t) {
  const isMe    = me && t.owner === me.id;
  const isAtked = attacks.some(a => a.territory === t.id);
  const isCap   = capitulation === t.id;
  const owner   = t.owner && t.owner !== N ? getD(t.owner) : null;
  if (isCap)              return '#d44040';
  if (isAtked && isMe)    return '#4a9ad4';
  if (isAtked)            return '#d4a020';
  if (owner)              return isMe ? '#2a9a6a' : owner.color;
  return '#2a4a6a';
}

// ---- GOOGLE SHEETS — READ ----------------------------------
// gviz/tq supporte CORS nativement — pas besoin de proxy
function gvizUrl(tab) {
  return `https://docs.google.com/spreadsheets/d/${CFG.SHEET_ID}/gviz/tq?tqx=out:json&gid=${CFG.GIDS[tab] || '0'}`;
}

function parseGviz(raw) {
  const match = raw.match(/setResponse\(([\s\S]*)\)/);
  if (!match) throw new Error('Format gviz invalide');
  const data = JSON.parse(match[1]);
  const cols = data.table.cols.map(c => (c.label || c.id || '').trim());
  return (data.table.rows || []).map(r =>
    Object.fromEntries(cols.map((col, i) => [col, String(r?.c?.[i]?.v ?? '').trim()]))
  );
}

async function fetchTab(tab) {
  try {
    const r = await fetch(gvizUrl(tab));
    const text = await r.text();
    return parseGviz(text);
  } catch (e) {
    console.warn(`[Sheets] Erreur onglet "${tab}":`, e);
    return [];
  }
}

function setSyncState(state, label) {
  const dot = $('sync-dot'), lbl = $('sync-label');
  if (dot) dot.className = `sync-dot ${state}`;
  if (lbl) lbl.textContent = label;
}

async function loadData() {
  setSyncState('loading', 'Synchronisation…');
  console.log('[VV] Chargement depuis:', gvizUrl('divinites'));
  try {
    const [div, terr, atk, cyc, zones] = await Promise.all([
      fetchTab('divinites'), fetchTab('territoires'), fetchTab('attaques'),
      fetchTab('cycles'),    fetchTab('zones_config'),
    ]);
    console.log('[VV] Divinités chargées:', div.length);
    console.log('[VV] Territoires chargés:', terr.length);
    console.log('[VV] Attaques:', atk.length);

    // Divinités
    DEITIES = div.filter(r => r.id).map(r => ({
      id:     r.id.trim(),
      name:   (r.nom   || r.id).trim(),
      player: (r.joueur || '').trim(),
      pi:     Number(r.pi) || 0,
      color:  (r.couleur || '#4a8ad4').trim(),
      pass:   (r.pass  || '').trim(),
      avatar: (r.avatar_url || '').trim(),
    }));

    // Zones config
    COUNTRY_MAP = {};
    const cx = {}, cy = {};
    zones.filter(r => r.zone).forEach(r => {
      cx[r.zone] = Number(r.cx) || 0;
      cy[r.zone] = Number(r.cy) || 0;
      (r.pays_associes || '').split(',').forEach(p => {
        p = p.trim();
        if (p) COUNTRY_MAP[p] = r.zone.trim();
      });
    });
  // Mapping exact des régions (source officielle)
  const FB = {
    // USA
    'United States of America':'USA',
    // Canada
    'Canada':'Canada',
    // Amérique Centrale
    'Mexico':'Amérique Centrale','Guatemala':'Amérique Centrale','Belize':'Amérique Centrale',
    'Honduras':'Amérique Centrale','El Salvador':'Amérique Centrale','Nicaragua':'Amérique Centrale',
    'Costa Rica':'Amérique Centrale','Panama':'Amérique Centrale',
    'Cuba':'Amérique Centrale','Haiti':'Amérique Centrale','Dominican Republic':'Amérique Centrale','Jamaica':'Amérique Centrale',
    // Brésil (+ Amérique du Sud)
    'Brazil':'Brésil','Argentina':'Brésil','Bolivia':'Brésil','Paraguay':'Brésil',
    'Uruguay':'Brésil','Chile':'Brésil','Colombia':'Brésil','Venezuela':'Brésil',
    'Peru':'Brésil','Ecuador':'Brésil','Guyana':'Brésil','Suriname':'Brésil',
    // France
    'France':'France',
    // Espagne-Portugal (Péninsule Ibérique)
    'Spain':'Espagne','Portugal':'Espagne',
    // Allemagne-Autriche (PAS la Suisse)
    'Germany':'Allemagne','Austria':'Allemagne',
    // BeNeLux
    'Belgium':'BeNeLux','Netherlands':'BeNeLux','Luxembourg':'BeNeLux',
    // Royaume-Uni
    'United Kingdom':'Royaume-Uni','Ireland':'Royaume-Uni',
    // Italie
    'Italy':'Italie','Malta':'Italie',
    // Grèce & Balkans
    'Greece':'Grèce & Balkans','Albania':'Grèce & Balkans','Bosnia and Herzegovina':'Grèce & Balkans',
    'Serbia':'Grèce & Balkans','Montenegro':'Grèce & Balkans','Kosovo':'Grèce & Balkans',
    'North Macedonia':'Grèce & Balkans','Croatia':'Grèce & Balkans','Slovenia':'Grèce & Balkans',
    'Bulgaria':'Grèce & Balkans',
    // Visegrad (Czechia = Czech Republic dans TopoJSON)
    'Poland':'Visegrad','Czech Republic':'Visegrad','Czechia':'Visegrad','Slovakia':'Visegrad','Hungary':'Visegrad',
    // Scandinavie
    'Sweden':'Scandinavie','Norway':'Scandinavie','Denmark':'Scandinavie','Finland':'Scandinavie','Iceland':'Scandinavie',
    // Ruthenie
    'Ukraine':'Ruthenie','Estonia':'Ruthenie','Latvia':'Ruthenie','Lithuania':'Ruthenie',
    'Romania':'Ruthenie','Moldova':'Ruthenie','Belarus':'Ruthenie',
    // Arabie (Péninsule Arabique)
    'Iraq':'Arabie','Syria':'Arabie','Saudi Arabia':'Arabie','Yemen':'Arabie',
    'Oman':'Arabie','United Arab Emirates':'Arabie','Qatar':'Arabie','Kuwait':'Arabie',
    'Bahrain':'Arabie','Jordan':'Arabie','Lebanon':'Arabie','Israel':'Arabie','Palestine':'Arabie',
    // Perse (Iran-Georgie)
    'Iran':'Perse','Georgia':'Perse','Armenia':'Perse','Azerbaijan':'Perse',
    // Asie Centrale (Steppes)
    'Kazakhstan':'Russie','Uzbekistan':'Russie','Turkmenistan':'Russie',
    'Tajikistan':'Russie','Kyrgyzstan':'Russie','Afghanistan':'Russie',
    // Russie
    'Russia':'Russie',
    // Chine
    'China':'Chine','Taiwan':'Chine','Mongolia':'Chine',
    // Japon
    'Japan':'Japon','South Korea':'Japon','North Korea':'Japon',
    // Inde
    'India':'Inde','Pakistan':'Inde','Bangladesh':'Inde','Sri Lanka':'Inde','Nepal':'Inde','Bhutan':'Inde',
    // Océanie
    'Australia':'Océanie','New Zealand':'Océanie','Papua New Guinea':'Océanie','Indonesia':'Océanie',
    'Philippines':'Océanie','Malaysia':'Océanie','Vietnam':'Océanie','Thailand':'Océanie',
    'Myanmar':'Océanie','Cambodia':'Océanie','Laos':'Océanie','Singapore':'Océanie','Timor-Leste':'Océanie',
    // Maghreb (uniquement Afrique du Nord)
    'Morocco':'Maghreb','Algeria':'Maghreb','Tunisia':'Maghreb','Libya':'Maghreb',
    'Egypt':'Maghreb','Western Sahara':'Maghreb',
    // Suisse — neutre, pas de zone
  };
  Object.entries(FB).forEach(([c,z])=>{ if(!COUNTRY_MAP[c]) COUNTRY_MAP[c]=z; });

    // Territoires
    const newZones = {};
    const transKeys = Object.keys(TRANS_ZONES);
    transKeys.forEach(k => { TRANS_ZONES[k].territories = []; });

    terr.filter(r => r.id && r.zone).forEach(r => {
      const zone = r.zone.trim();
      const t = {
        id:    r.id.trim(),
        name:  (r.nom || r.id).trim(),
        type:  (r.type || 'org').trim(),
        owner: (r.proprietaire || N).trim(),
        pi:    Number(r.pi_valeur) || 1,
        lon:   Number(r.lon) || 0,
        lat:   Number(r.lat) || 0,
        img:   (r.image_url || '').trim(),
      };
      if (transKeys.includes(zone)) {
        TRANS_ZONES[zone].territories.push(t);
      } else {
        if (!newZones[zone]) newZones[zone] = { cx: cx[zone] || 0, cy: cy[zone] || 0, territories: [] };
        newZones[zone].territories.push(t);
      }
    });
    ZONES = newZones;

    // Cycle actif
    const active = cyc.find(r => r.statut?.trim() === 'actif');
    if (active) CYCLE = Number(active.numero);
    const cb = $('cycle-badge');
    if (cb) cb.textContent = `CYCLE ${CYCLE}`;

    // Attaques
    attacks = atk
      .filter(r => Number(r.cycle) === CYCLE && r.statut?.trim() === 'déclarée')
      .map(r => ({
        attacker:  r.attaquant.trim(),
        target:    r.cible.trim(),
        territory: r.territoire_id.trim(),
      }));

    setSyncState('ok', `Sync ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`);
    return true;
  } catch (e) {
    console.error('[Sheets] loadData error:', e);
    setSyncState('error', 'Erreur sync');
    return false;
  }
}

// ---- APPS SCRIPT — WRITE -----------------------------------
async function postScript(payload) {
  try {
    // Apps Script CORS fix: encode as URL params via GET
    const params = new URLSearchParams({ data: JSON.stringify(payload) });
    const url = CFG.APPS_SCRIPT + '?' + params.toString();
    const r = await fetch(url, { method: 'GET' });
    const text = await r.text();
    const d = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text);
    if (!d.success) throw new Error(d.error || 'Erreur inconnue');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ---- MAP ---------------------------------------------------
function initMap(world) {
  const wrap = $('map-wrap');
  const W = wrap.clientWidth, H = wrap.clientHeight;
  const countries = topojson.feature(world, world.objects.countries);

  proj = d3.geoNaturalEarth1().scale(153).translate([W / 2, H / 2]);
  const path = d3.geoPath().projection(proj);

  svgSel = d3.select('#world-svg')
    .attr('width', W).attr('height', H)
    .attr('viewBox', `0 0 ${W} ${H}`)
    .style('display', 'block');

  svgSel.append('rect').attr('width', W).attr('height', H).attr('fill', '#060d1a');
  // Pas de sphère — fond plat uniquement

  gMap    = svgSel.append('g');
  gDots   = svgSel.append('g');
  gBadges = svgSel.append('g');

  // Countries
  gMap.selectAll('path')
    .data(countries.features)
    .join('path')
    .attr('d', path)
    .attr('class', d => `country${COUNTRY_MAP[d.properties?.name] ? ' has-zone' : ''}`)
    .on('mouseenter', (e, d) => {
      const z = COUNTRY_MAP[d.properties?.name];
      if (z) showTT(e, z);
    })
    .on('mouseleave', hideTT)
    .on('click', (e, d) => {
      const z = COUNTRY_MAP[d.properties?.name];
      if (z) onZoneClick(z);
    });

  // Zoom
  zoomBeh = d3.zoom()
    .scaleExtent([.6, 18])
    .on('start', () => { dragging = true; hideTT(); })
    .on('zoom', e => {
      curK = e.transform.k;
      gMap.attr('transform', e.transform);
      gDots.attr('transform', e.transform);
      gBadges.attr('transform', e.transform);
      applyZoom(curK);
    })
    .on('end', () => setTimeout(() => { dragging = false; }, 50));

  svgSel.call(zoomBeh);
  $('map-loading').style.display = 'none';
}

function buildDots() {
  if (!gDots || !proj) return;
  gDots.selectAll('*').remove();
  const tm = tzMap();

  Object.values(ZONES).flatMap(z => z.territories).forEach(t => {
    const fill  = dotColor(t);
    const baseR = t.pi >= 3 ? 2.8 : t.pi >= 2 ? 2.3 : 1.9;
    const [px, py] = proj([t.lon, t.lat]);

    // Halo
    gDots.append('circle').datum(t)
      .attr('class', 'thl')
      .attr('cx', px).attr('cy', py)
      .attr('r', baseR * 2.2)
      .attr('fill', fill).attr('opacity', .14)
      .style('pointer-events', 'none');

    if (t.type === 'org') {
      // Losange pour les organisations
      const s = baseR * 1.4;
      gDots.append('path').datum(t)
        .attr('class', 'tpt')
        .attr('d', `M${px},${py - s} L${px + s},${py} L${px},${py + s} L${px - s},${py} Z`)
        .attr('fill', fill)
        .attr('stroke', 'rgba(255,255,255,.25)').attr('stroke-width', .3)
        .style('cursor', 'pointer')
        .style('filter', `drop-shadow(0 0 1.5px ${fill})`)
        .on('mouseenter', function (e) {
          const owner = t.owner && t.owner !== N ? getD(t.owner) : null;
          showTT(e, `${t.name} · ${owner ? owner.name : 'Neutre'}${t.pi > 1 ? ` · ×${t.pi}PI` : ''}`);
          d3.select(this).attr('transform', `scale(1.3)`).attr('transform-origin', `${px}px ${py}px`);
        })
        .on('mouseleave', function () { hideTT(); d3.select(this).attr('transform', null); })
        .on('click', e => { e.stopPropagation(); onZoneClick(tm[t.id]); });
    } else {
      // Cercle pour les villes
      gDots.append('circle').datum(t)
        .attr('class', 'tpt')
        .attr('cx', px).attr('cy', py)
        .attr('r', baseR)
        .attr('fill', fill)
        .attr('stroke', 'rgba(255,255,255,.2)').attr('stroke-width', .3)
        .style('cursor', 'pointer')
        .style('filter', `drop-shadow(0 0 1.5px ${fill})`)
        .on('mouseenter', function (e) {
          const owner = t.owner && t.owner !== N ? getD(t.owner) : null;
          showTT(e, `${t.name} · ${owner ? owner.name : 'Neutre'}${t.pi > 1 ? ` · ×${t.pi}PI` : ''}`);
          d3.select(this).attr('r', baseR * 1.6);
        })
        .on('mouseleave', function () { hideTT(); d3.select(this).attr('r', baseR); })
        .on('click', e => { e.stopPropagation(); onZoneClick(tm[t.id]); });
    }
  });
}

function buildBadges() {
  if (!gBadges || !proj) return;
  gBadges.selectAll('*').remove();

  Object.entries(ZONES).forEach(([zoneName, zd]) => {
    if (!zd.cx && !zd.cy) return;
    const [px, py] = proj([zd.cx, zd.cy]);
    const n = zd.territories.length;

    const g = gBadges.append('g')
      .attr('class', 'zone-badge')
      .attr('transform', `translate(${px},${py})`)
      .style('cursor', 'pointer')
      .on('click', e => { e.stopPropagation(); onZoneClick(zoneName); })
      .on('mouseenter', e => showTT(e, zoneName))
      .on('mouseleave', hideTT);

    g.append('circle').attr('r', 10).attr('fill', '#08111f').attr('stroke', '#2a5a8a').attr('stroke-width', .8).attr('opacity', .92);
    g.append('circle').attr('r', 7).attr('fill', '#0d2040').attr('opacity', .9);
    g.append('text')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('font-size', n >= 10 ? 6.5 : 7.5).attr('font-weight', '700')
      .attr('fill', '#7ab8f5').attr('font-family', 'sans-serif')
      .text(n);
  });
}

function applyZoom(k) {
  const bOp = k < BADGE_FADE ? 1 : k > BADGE_HIDE ? 0 : 1 - (k - BADGE_FADE) / (BADGE_HIDE - BADGE_FADE);
  const dOp = k < DOTS_SHOW  ? 0 : k > BADGE_HIDE ? 1 : (k - DOTS_SHOW)  / (BADGE_HIDE - DOTS_SHOW);

  gBadges.style('opacity', bOp).style('pointer-events', bOp > .1 ? 'auto' : 'none');
  gDots.style('opacity', dOp).style('pointer-events', dOp > .2 ? 'auto' : 'none');

  const s = Math.pow(k, .45);
  gDots.selectAll('.tpt').each(function (d) {
    const b = (d.pi >= 3 ? 2.8 : d.pi >= 2 ? 2.3 : 1.9) / s;
    const el = d3.select(this);
    if (this.tagName === 'circle') {
      el.attr('r', b);
    } else {
      // losange org
      const [px, py] = proj([d.lon, d.lat]);
      const sv = b * 1.4;
      el.attr('d', `M${px},${py - sv} L${px + sv},${py} L${px},${py + sv} L${px - sv},${py} Z`);
    }
  });
  gDots.selectAll('.thl').each(function (d) { d3.select(this).attr('r', (d.pi >= 3 ? 2.8 : d.pi >= 2 ? 2.3 : 1.9) * 2.2 / s); });

  gBadges.selectAll('.zone-badge').attr('transform', function () {
    const t = d3.select(this).attr('transform');
    const m = t.match(/translate\(([^,]+),([^)]+)\)/);
    return m ? `translate(${m[1]},${m[2]}) scale(${1 / k})` : t;
  });
}

function refreshDotColors() {
  if (!gDots) return;
  gDots.selectAll('.tpt').each(function (d) {
    const fill = dotColor(d);
    const el = d3.select(this);
    el.attr('fill', fill);
    if (d.type === 'org' && el.node().tagName === 'path') {
      const [px, py] = proj([d.lon, d.lat]);
      const s = (d.pi >= 3 ? 2.8 : d.pi >= 2 ? 2.3 : 1.9) * 1.4;
      el.attr('d', `M${px},${py - s} L${px + s},${py} L${px},${py + s} L${px - s},${py} Z`);
    }
  });
  gDots.selectAll('.thl').each(function (d) { d3.select(this).attr('fill', dotColor(d)); });
}

function highlightZone(name) {
  if (!gMap) return;
  gMap.selectAll('.country').classed('active', false).classed('zone-member', false).classed('trans-member', false);
  document.querySelectorAll('.tchip').forEach(c => c.classList.remove('active'));
  if (!name) return;
  const targets = Object.entries(COUNTRY_MAP).filter(([, z]) => z === name).map(([c]) => c);
  const list = targets.length ? targets : [name];
  list.forEach(cn =>
    gMap.selectAll('.country').filter(d => d.properties?.name === cn)
      .classed('active', true)
      .classed('zone-member', true)
  );
}

function showTT(e, txt) {
  if (dragging) return;
  const tt = $('map-tt'), rect = $('map-wrap').getBoundingClientRect();
  tt.textContent = txt; tt.style.display = 'block';
  tt.style.left = `${e.clientX - rect.left + 12}px`;
  tt.style.top  = `${e.clientY - rect.top  - 26}px`;
}
function hideTT() { const tt = $('map-tt'); if (tt) tt.style.display = 'none'; }

// ---- MAP CLICK HANDLER -------------------------------------
function onZoneClick(zoneName) {
  if (!zoneName) return;
  highlightZone(zoneName);
  selDeity = null; selTrans = null;
  renderDock();
  document.querySelectorAll('.tchip').forEach(c => c.classList.remove('active'));
  renderZonePanel(zoneName);
}

// ---- DOCK --------------------------------------------------
function renderDock() {
  const dock = $('dock');
  if (!dock) return;
  dock.innerHTML = DEITIES.map(d => {
    const n = atkOn(d.id), locked = n >= 2 && (!me || d.id !== me.id), isActive = selDeity === d.id;
    return `<div class="dchip${isActive ? ' active' : ''}${locked ? ' locked' : ''}" data-id="${d.id}" title="${d.name} · ${d.pi}PI">
      ${n > 0 ? `<div class="abadge">${n}</div>` : ''}
      <div class="av" style="background:${d.color}22;color:${d.color};border-color:${isActive ? d.color : 'transparent'}">
        ${d.avatar
          ? `<img src="${d.avatar}" alt="${d.name}" style="position:absolute;width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.remove()">`
          : `<span style="position:relative;z-index:1">${d.name.slice(0, 2).toUpperCase()}</span>`
        }
        ${d.avatar ? '' : ''}
      </div>
      <div class="dn" style="color:${isActive ? d.color : '#3a6a8a'}">${d.name}</div>
      <div class="dp">${d.pi}PI</div>
    </div>`;
  }).join('');
  dock.querySelectorAll('.dchip:not(.locked)').forEach(el =>
    el.addEventListener('click', () => selectDeity(el.dataset.id))
  );
}

function selectDeity(id) {
  if (atkOn(id) >= 2 && me && id !== me.id) return;
  selDeity = id; selZone = null; selTrans = null;
  highlightZone(null);
  document.querySelectorAll('.tchip').forEach(c => c.classList.remove('active'));
  renderDock();
  if (me && id === me.id) { renderPlayerPanel(); return; }
  renderDeityPanel(getD(id));
}

// ---- PANELS ------------------------------------------------
function setPanel(html) {
  const p = $('panel-inner');
  if (p) p.innerHTML = html;
}

function renderDeityPanel(d) {
  const myT  = allT().filter(t => t.owner === d.id);
  const n    = atkOn(d.id);
  const canA = me && d.id !== me.id && myAtks().length < 2 && n < 2;

  setPanel(`
    <div style="display:flex;align-items:center;gap:9px;margin-bottom:11px">
      <div class="d-avatar" style="background:${d.color}22;color:${d.color};border-color:${d.color}44">
        ${d.avatar ? `<img src="${d.avatar}" alt="${d.name}">` : d.name.slice(0, 2).toUpperCase()}
      </div>
      <div>
        <div style="font-size:12px;font-weight:500;color:var(--text1)">${d.name}</div>
        <div style="font-size:9px;color:var(--text3)">${d.player ? d.player + ' · ' : ''}${d.pi}PI · ${myT.length} territoires</div>
      </div>
    </div>
    <div class="info-row"><span class="ik">Attaques reçues</span><span class="iv" style="color:${n > 0 ? 'var(--danger)' : 'var(--text1)'}">${n}/2</span></div>
    ${n >= 2 ? `<div class="notif notif-warn" style="margin-top:6px"><i class="ti ti-lock"></i> Verrouillé — 2 attaques reçues</div>` : ''}
    ${canA ? `<button class="btn btn-danger btn-full" style="margin-top:10px" id="panel-atk-btn"><i class="ti ti-sword"></i> Déclarer une attaque</button>` : ''}
    ${!me ? `<div style="font-size:9px;color:var(--text4);margin-top:10px;text-align:center">Connectez-vous pour interagir</div>` : ''}
    <div class="divider"></div>
    <div class="sec">Territoires (${myT.length})</div>
    ${myT.map(t => `<div class="hentry">
      <span class="tag ${t.type === 'city' ? 'tag-city' : 'tag-org'}">${t.type === 'city' ? 'V' : 'O'}</span>
      ${t.name}
      ${t.pi > 1 ? `<span style="color:var(--text3);font-size:8px;margin-left:auto">×${t.pi}</span>` : ''}
    </div>`).join('')}
  `);
  if (canA) {
    const btn = $('panel-atk-btn');
    if (btn) btn.addEventListener('click', () => openAtkModal(d.id));
  }
}

function renderTransPanel(key) {
  const z = TRANS_ZONES[key];
  if (!z) return;
  const cards = z.territories.map(t => terrCard(t)).join('');
  setPanel(`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:11px">
      <span style="font-size:22px">${z.icon}</span>
      <div>
        <div style="font-size:12px;font-weight:500;color:var(--text1)">${z.name}</div>
        <div style="font-size:9px;color:var(--text3)">${z.territories.length} points</div>
      </div>
    </div>
    <div class="divider"></div>
    ${cards}
  `);
  bindTerrButtons();
}

function renderZonePanel(zoneName) {
  selZone = zoneName;
  const data = ZONES[zoneName];

  if (!data || data.territories.length === 0) {
    setPanel(`
      <button class="back-btn" id="back-btn"><i class="ti ti-arrow-left"></i> Vue globale</button>
      <div style="font-size:10px;color:var(--text4);text-align:center;margin-top:20px">Aucun point d'influence ici</div>
    `);
    $('back-btn')?.addEventListener('click', clearZone);
    return;
  }

  setPanel(`
    <button class="back-btn" id="back-btn"><i class="ti ti-arrow-left"></i> Vue globale</button>
    <div class="sec">${zoneName.toUpperCase()} — ${data.territories.length} POINT${data.territories.length > 1 ? 'S' : ''}</div>
    ${data.territories.map(t => terrCard(t)).join('')}
  `);

  $('back-btn')?.addEventListener('click', clearZone);
  bindTerrButtons();
}

function terrCard(t) {
  const owner   = t.owner && t.owner !== N ? getD(t.owner) : null;
  const isAtked = attacks.some(a => a.territory === t.id);
  const isCap   = capitulation === t.id;
  const isMyT   = me && t.owner === me.id;
  const canA    = me && owner && owner.id !== me.id && myAtks().length < 2 && atkOn(owner.id) < 2;
  const dc      = dotColor(t);
  const isCity  = t.type === 'city';

  // Villes : carte avec image
  if (isCity) {
    return `<div class="terr-card${isAtked ? ' under-attack' : ''}">
      ${t.img
        ? `<img class="terr-img" src="${t.img}" alt="${t.name}" loading="lazy">`
        : `<div class="terr-ph" style="background:${dc}18;border-bottom:2px solid ${dc}33"><i class="ti ti-building-skyscraper" style="color:${dc};font-size:22px"></i></div>`
      }
      <div class="terr-body">
        <div class="terr-row">
          <div style="display:flex;align-items:center;gap:4px;min-width:0">
            <div class="dot" style="background:${dc};box-shadow:0 0 4px ${dc}88"></div>
            <span class="terr-name">${t.name}</span>
            <span class="tag tag-city">VILLE</span>
            ${t.pi > 1 ? `<span class="pi-badge">×${t.pi}</span>` : ''}
          </div>
          ${canA ? `<button class="atk-btn" data-owner="${owner.id}" data-terr="${t.id}"><i class="ti ti-sword"></i>ATK</button>` : ''}
        </div>
        <div class="terr-owner" style="color:${owner ? owner.color : 'var(--text3)'}">${owner ? owner.name : 'Neutre'}</div>
        ${isAtked && !isCap ? `<div class="terr-status" style="color:${isMyT ? 'var(--def-color)' : '#d4a020'}">${isMyT ? '⚔ Défense auto' : '⚔ Sous attaque'}</div>` : ''}
        ${isCap ? `<div class="terr-status" style="color:var(--atk-color)">⚑ Capitulation</div>` : ''}
      </div>
    </div>`;
  }

  // Organisations : chip avec image optionnelle
  if (t.img) {
    return `<div class="terr-card${isAtked ? ' under-attack' : ''}" style="border-color:${dc}44">
      <img class="terr-img" src="${t.img}" alt="${t.name}" loading="lazy">
      <div class="terr-body">
        <div class="terr-row">
          <div style="display:flex;align-items:center;gap:4px;min-width:0">
            <div class="dot" style="background:${dc};box-shadow:0 0 4px ${dc}88;clip-path:polygon(50% 0%,100% 50%,50% 100%,0% 50%)"></div>
            <span class="terr-name">${t.name}</span>
            <span class="tag tag-org">ORG.</span>
            ${t.pi > 1 ? `<span class="pi-badge">×${t.pi}</span>` : ''}
          </div>
          ${canA ? `<button class="atk-btn" data-owner="${owner.id}" data-terr="${t.id}"><i class="ti ti-sword"></i>ATK</button>` : ''}
        </div>
        <div class="terr-owner" style="color:${owner ? owner.color : 'var(--text3)'}">${owner ? owner.name : 'Neutre'}</div>
        ${isAtked && !isCap ? `<div class="terr-status" style="color:${isMyT ? 'var(--def-color)' : '#d4a020'}">${isMyT ? '⚔ Défense auto' : '⚔ Sous attaque'}</div>` : ''}
        ${isCap ? `<div class="terr-status" style="color:var(--atk-color)">⚑ Capitulation</div>` : ''}
      </div>
    </div>`;
  }
  return `<div class="org-chip" style="border-color:${dc}44;background:${dc}11">
    <div class="org-dot" style="background:${dc};box-shadow:0 0 5px ${dc}99;clip-path:polygon(50% 0%,100% 50%,50% 100%,0% 50%)"></div>
    <div style="flex:1;min-width:0">
      <div class="org-name">${t.name}${t.pi > 1 ? ` <span class="org-pi">×${t.pi}PI</span>` : ''}</div>
      <div class="org-owner" style="color:${owner ? owner.color : 'var(--text3)'}">${owner ? owner.name : 'Neutre'}</div>
      ${isAtked && !isCap ? `<div class="terr-status" style="color:${isMyT ? 'var(--def-color)' : '#d4a020'};font-size:9px">${isMyT ? '⚔ Défense auto' : '⚔ Sous attaque'}</div>` : ''}
      ${isCap ? `<div class="terr-status" style="color:var(--atk-color);font-size:9px">⚑ Capitulation</div>` : ''}
    </div>
    ${canA ? `<button class="atk-btn" data-owner="${owner.id}" data-terr="${t.id}"><i class="ti ti-sword"></i>ATK</button>` : ''}
  </div>`;
}

function bindTerrButtons() {
  document.querySelectorAll('.atk-btn[data-owner]').forEach(btn =>
    btn.addEventListener('click', () => openAtkModalDirect(btn.dataset.owner, btn.dataset.terr))
  );
}

function renderPlayerPanel() {
  if (!me) return;
  const myT     = allT().filter(t => t.owner === me.id);
  const atks    = myAtks();
  const incoming = attacks.filter(a => a.target === me.id);
  const atkdT   = Object.values(ZONES).flatMap(z => z.territories)
    .filter(t => t.owner === me.id && incoming.some(a => a.territory === t.id));
  const needCap  = incoming.length >= 2 && atks.length >= 2 && !capitulation;
  const autoDef  = incoming.length > 0 && !(incoming.length >= 2 && atks.length >= 2);

  setPanel(`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <div class="d-avatar" style="width:32px;height:32px;font-size:10px;background:${me.color}22;color:${me.color};border-color:${me.color}55">
        ${me.avatar ? `<img src="${me.avatar}" alt="${me.name}">` : me.name.slice(0, 2).toUpperCase()}
      </div>
      <div>
        <div style="font-size:11px;font-weight:500;color:var(--text1)">${me.name}</div>
        <div style="font-size:9px;color:var(--text3)">${me.pi}PI · ${myT.length} territoire${myT.length > 1 ? 's' : ''}</div>
      </div>
    </div>

    ${needCap ? `<div class="notif notif-warn"><i class="ti ti-alert-triangle"></i> <b>Choix requis !</b> Sélectionnez le territoire à capituler.</div>` : ''}
    ${autoDef  ? `<div class="notif notif-info"><i class="ti ti-shield-check"></i> Défense automatique active</div>` : ''}

    <div class="sec">Mes attaques (${atks.length}/2)</div>
    ${[0, 1].map(i => {
      const a = atks[i];
      return `<div class="slot${a ? ' atk' : ''}">
        ${a
          ? `<div class="slot-text atk"><i class="ti ti-sword"></i> ${getD(a.target).name} — ${getT(a.territory)?.name || a.territory}</div>
             <button class="xbtn" data-idx="${i}"><i class="ti ti-x"></i></button>`
          : `<span class="slot-text">${i === 0 ? 'Sélectionner une divinité ennemie' : 'Slot 2 optionnel'}</span>`
        }
      </div>`;
    }).join('')}

    ${needCap ? `
      <div class="divider"></div>
      <div class="sec">Territoire à capituler</div>
      ${atkdT.map(t => `<button class="cap-choice${capitulation === t.id ? ' chosen' : ''}" data-tid="${t.id}">${capitulation === t.id ? '⚑ ' : ''}${t.name}</button>`).join('')}
    ` : ''}

    ${!needCap && atkdT.length > 0 ? `
      <div class="divider"></div>
      <div class="sec">Sous attaque — défense auto</div>
      ${atkdT.map(t => `<div class="slot def"><div class="slot-text def"><i class="ti ti-shield"></i> ${t.name}</div></div>`).join('')}
    ` : ''}

    <div class="divider"></div>
    <div class="sec">Mes territoires (${myT.length})</div>
    ${myT.slice(0, 6).map(t => `<div class="hentry">
      <span class="tag ${t.type === 'city' ? 'tag-city' : 'tag-org'}">${t.type === 'city' ? 'V' : 'O'}</span>
      ${t.name}
      ${t.pi > 1 ? `<span style="color:var(--text3);font-size:8px;margin-left:auto">×${t.pi}</span>` : ''}
    </div>`).join('')}
    ${myT.length > 6 ? `<div style="font-size:9px;color:var(--text4);padding:3px 0">+${myT.length - 6} autres</div>` : ''}
    <div class="divider"></div>
    <div class="rule-block"><div class="rule-text"><b>Règles :</b> max 2 attaques · 2 attaques ET 2 reçues → capitulation · Sinon défense auto.</div></div>
  `);

  // Events
  document.querySelectorAll('.xbtn[data-idx]').forEach(btn =>
    btn.addEventListener('click', () => removeAtk(parseInt(btn.dataset.idx)))
  );
  document.querySelectorAll('.cap-choice[data-tid]').forEach(btn =>
    btn.addEventListener('click', () => setCapitulation(btn.dataset.tid))
  );
}

function showPrompt() {
  setPanel(`<div class="prompt"><i class="ti ti-login"></i><span>Connectez-vous<br>puis cliquez un pays<br>ou une divinité</span></div>`);
}

function clearZone() {
  selZone = null; highlightZone(null);
  if (me) renderPlayerPanel(); else showPrompt();
}

// ---- ATTACKS -----------------------------------------------
function openAtkModal(targetId) {
  if (!me || myAtks().length >= 2) return;
  const d  = getD(targetId);
  const ts = allT().filter(t => t.owner === targetId);
  $('atk-title').innerHTML = `<i class="ti ti-sword"></i> Attaquer ${d.name}`;
  $('atk-body').innerHTML  = `
    <p style="font-size:9px;color:var(--text2);margin-bottom:8px">Territoire cible :</p>
    <select id="atk-terr">
      <option value="">— Choisir —</option>
      ${ts.map(t => `<option value="${t.id}">${t.name}${t.pi > 1 ? ` (×${t.pi}PI)` : ''}</option>`).join('')}
    </select>`;
  pendingAtk = { target: targetId };
  openModal('modal-atk');
}

function openAtkModalDirect(ownerId, terrId) {
  if (!me || myAtks().length >= 2) return;
  const d  = getD(ownerId);
  const ts = allT().filter(t => t.owner === ownerId);
  $('atk-title').innerHTML = `<i class="ti ti-sword"></i> Attaquer ${d.name}`;
  $('atk-body').innerHTML  = `
    <p style="font-size:9px;color:var(--text2);margin-bottom:8px">Territoire cible :</p>
    <select id="atk-terr">
      <option value="">— Choisir —</option>
      ${ts.map(t => `<option value="${t.id}"${t.id === terrId ? ' selected' : ''}>${t.name}${t.pi > 1 ? ` (×${t.pi}PI)` : ''}</option>`).join('')}
    </select>`;
  pendingAtk = { target: ownerId };
  openModal('modal-atk');
}

async function confirmAttack() {
  const sel = $('atk-terr');
  if (!sel?.value) { alert('Choisissez un territoire cible'); return; }

  const btn = $('atk-confirm');
  btn.disabled = true; btn.textContent = 'Envoi…';

  const res = await postScript({
    action: 'add_attack', cycle: CYCLE,
    attaquant: me.id, cible: pendingAtk.target, territoire_id: sel.value,
  });

  btn.disabled = false; btn.innerHTML = '<i class="ti ti-sword"></i> Confirmer l\'attaque';

  if (!res.ok) { alert(`Erreur : ${res.error}`); return; }

  attacks.push({ attacker: me.id, target: pendingAtk.target, territory: sel.value });
  capitulation = null;
  closeModal('modal-atk');
  renderDock(); refreshDotColors();

  if (selZone) renderZonePanel(selZone);
  else if (selTrans) renderTransPanel(selTrans);
  else renderPlayerPanel();
}

async function removeAtk(i) {
  const a = myAtks()[i];
  if (!a) return;
  const res = await postScript({ action: 'remove_attack', cycle: CYCLE, attaquant: me.id, territoire_id: a.territory });
  if (res.ok) attacks = attacks.filter(x => x !== a);
  capitulation = null;
  renderDock(); refreshDotColors(); renderPlayerPanel();
}

async function setCapitulation(tid) {
  capitulation = tid;
  await postScript({ action: 'set_capitulation', cycle: CYCLE, attaquant: me.id, territoire_id: tid });
  renderPlayerPanel(); refreshDotColors();
}

// ---- AUTH --------------------------------------------------
function openLogin() {
  const sel = $('login-sel');
  sel.innerHTML = '<option value="">— Votre divinité —</option>' +
    DEITIES.map(d => `<option value="${d.id}">${d.name}${d.player ? ` (${d.player})` : ''}</option>`).join('');
  $('login-pw').value = '';
  $('login-err').textContent = '';
  openModal('modal-login');
}

function doLogin() {
  const id = $('login-sel').value;
  const pw = $('login-pw').value;
  const d  = getD(id);
  if (!d || !d.pass || d.pass !== pw) {
    $('login-err').textContent = 'Identifiants incorrects';
    return;
  }
  me = d;
  closeModal('modal-login');
  const bl = $('btn-login');
  if (bl) bl.innerHTML = `<i class="ti ti-user-check"></i> ${d.name}`;
  const ba = $('btn-admin');
  if (ba) ba.style.display = 'inline-flex';
  selDeity = d.id;
  renderDock(); refreshDotColors(); renderPlayerPanel();
}

// ---- ADMIN -------------------------------------------------
function openAdminPanel() {
  const atks = attacks;
  $('admin-body').innerHTML = `
    <div style="font-size:9px;color:var(--text2);margin-bottom:9px">Cycle ${CYCLE} · ${atks.length} attaque(s)</div>
    <button class="btn btn-warn btn-full" style="margin-bottom:6px" id="admin-close-cycle"><i class="ti ti-gavel"></i> Clôturer le cycle & notifier Discord</button>
    <button class="btn btn-full" style="margin-bottom:6px" id="admin-refresh"><i class="ti ti-refresh"></i> Forcer synchronisation</button>
    <div class="divider"></div>
    <div class="sec">Attaques déclarées</div>
    ${atks.length
      ? atks.map(a => `<div class="hentry">
          <i class="ti ti-sword" style="color:var(--danger);font-size:9px"></i>
          ${getD(a.attacker).name} → ${getD(a.target).name} · ${getT(a.territory)?.name || a.territory}
          ${getT(a.territory)?.pi > 1 ? ` <span style="color:var(--text3)">×${getT(a.territory).pi}PI</span>` : ''}
        </div>`).join('')
      : '<div style="font-size:9px;color:var(--text4)">Aucune attaque</div>'
    }`;

  $('admin-close-cycle')?.addEventListener('click', closeCycle);
  $('admin-refresh')?.addEventListener('click', async () => { closeModal('modal-admin'); await fullRefresh(); });
  openModal('modal-admin');
}

async function closeCycle() {
  if (!confirm(`Clôturer le cycle ${CYCLE} et envoyer le résumé sur Discord ?`)) return;
  const divMap = Object.fromEntries(DEITIES.map(d => [d.id, { nom: d.name }]));
  const res = await postScript({ action: 'close_cycle', cycle: CYCLE, divinites: divMap });
  if (res.ok) {
    alert(`Cycle ${CYCLE} clôturé ! Résumé envoyé sur Discord.`);
    closeModal('modal-admin');
    await fullRefresh();
  } else {
    alert(`Erreur : ${res.error}`);
  }
}

// ---- MODAL HELPERS -----------------------------------------
function openModal(id)  { $(`${id}`)?.classList.add('open'); }
function closeModal(id) { $(`${id}`)?.classList.remove('open'); }

// ---- REFRESH -----------------------------------------------
async function fullRefresh() {
  const ok = await loadData();
  if (!ok) return;
  if (gDots)   buildDots();
  if (gBadges) { buildBadges(); applyZoom(curK); }
  renderDock();
  // Mettre à jour le highlight des pays
  if (gMap) {
    gMap.selectAll('.country').attr('class', d =>
      `country${COUNTRY_MAP[d.properties?.name] ? ' has-zone' : ''}${
        selZone && Object.entries(COUNTRY_MAP).filter(([,z]) => z === selZone).map(([c]) => c).includes(d.properties?.name) ? ' active' : ''
      }`
    );
  }
  if (selZone)       renderZonePanel(selZone);
  else if (selTrans) renderTransPanel(selTrans);
  else if (me)       renderPlayerPanel();
  else               showPrompt();
}

// ---- INIT --------------------------------------------------
async function init() {
  // Charger données sheets + topojson en parallèle
  const [dataOk, world] = await Promise.all([
    loadData(),
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(r => r.json()),
  ]);

  initMap(world);
  buildDots();
  buildBadges();
  // Start centered on Europe/Atlantic area
  const initT = d3.zoomIdentity.translate(W * 0.08, H * 0.04).scale(1.15);
  svgSel.call(zoomBeh.transform, initT);
  curK = 1.15;
  applyZoom(1.15);
  renderDock();
  showPrompt();

  // Auto-refresh
  refreshTimer = setInterval(fullRefresh, CFG.REFRESH_MIN * 60 * 1000);
}

// ---- EVENT LISTENERS ---------------------------------------
document.addEventListener('DOMContentLoaded', () => {

  // Login
  $('btn-login')?.addEventListener('click', openLogin);
  $('login-submit')?.addEventListener('click', doLogin);
  $('login-pw')?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

  // Admin
  $('btn-admin')?.addEventListener('click', openAdminPanel);

  // Refresh
  $('btn-refresh')?.addEventListener('click', fullRefresh);

  // Atk confirm
  $('atk-confirm')?.addEventListener('click', confirmAttack);

  // Zoom
  $('zoom-in')?.addEventListener('click',    () => svgSel.transition().duration(280).call(zoomBeh.scaleBy, 1.7));
  $('zoom-out')?.addEventListener('click',   () => svgSel.transition().duration(280).call(zoomBeh.scaleBy, .6));
  $('zoom-reset')?.addEventListener('click', () => svgSel.transition().duration(450).call(zoomBeh.transform, d3.zoomIdentity));

  // Transnationales
  const TRANS_MEMBERS = {
    'UE': ['France','Germany','Austria','Belgium','Netherlands','Luxembourg','Italy','Spain','Portugal',
           'Poland','Czech Republic','Hungary','Slovakia','Sweden','Denmark','Finland',
           'Greece','Bulgaria','Romania','Croatia','Slovenia','Estonia','Latvia','Lithuania',
           'Ireland','Cyprus','Malta'],
    'OTAN': ['United States of America','Canada','United Kingdom','France','Germany','Italy','Spain',
             'Netherlands','Belgium','Luxembourg','Norway','Denmark','Iceland','Poland','Czech Republic',
             'Hungary','Turkey','Greece','Portugal','Bulgaria','Romania','Slovakia','Slovenia',
             'Estonia','Latvia','Lithuania','Albania','Croatia','Montenegro','North Macedonia','Finland','Sweden'],
    'ONU': ['France','United States of America','United Kingdom','Russia','China',
            'Germany','Japan','India','Brazil','Canada','Australia','Italy','Spain'],
  };

  document.querySelectorAll('.tchip').forEach(chip =>
    chip.addEventListener('click', () => {
      const key = chip.dataset.zone;
      selTrans = key; selZone = null; selDeity = null;
      // Clear previous highlights
      if (gMap) {
        gMap.selectAll('.country').classed('active', false).classed('zone-member', false).classed('trans-member', false);
        // Highlight member countries
        const members = TRANS_MEMBERS[key] || [];
        members.forEach(cn => {
          gMap.selectAll('.country').filter(d => d.properties?.name === cn)
            .classed('trans-member', true);
        });
      }
      document.querySelectorAll('.tchip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderDock();
      renderTransPanel(key);
    })
  );

  // Fermer modals via [data-close]
  document.querySelectorAll('[data-close]').forEach(btn =>
    btn.addEventListener('click', () => closeModal(btn.dataset.close))
  );

  // Fermer modal en cliquant le fond
  document.querySelectorAll('.modal-bg').forEach(bg =>
    bg.addEventListener('click', e => { if (e.target === bg) bg.classList.remove('open'); })
  );

  init();
});
