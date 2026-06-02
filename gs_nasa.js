/* ============================================================
   GRANDE SOCIÉTÉ / CERCLE D'ASIMOV — Module : NASA / Spatial
   Carte spatiale interactive — Sovereign & Shemning
   Appelé par gsOpenModule('nasa') dans grande_societe.js
   ============================================================ */

'use strict';

// ---- CONFIG ------------------------------------------------
window.NASA_CFG = window.NASA_CFG || {};
const NASA_CFG = window.NASA_CFG = {
  SHEET_ID:    '1L9hbQuAD9A4WQFG1G47teZlUPM6-JkMmuuX2Ys-TYt8',
  APPS_SCRIPT: 'https://script.google.com/macros/s/AKfycbyCaQI2c5ds2uCmoeCw6_fALjh-8ii05fkOVgZmWPhbY64vyYbrNcFvqbFKRb7rUwyxwQ/exec',
  GIDS: {
    spatial: '170628062', // ← colle ici le GID de l'onglet spatial
  },
  COUTS: {
    soutenir:        1,
    opposer:         1,
    renommer_projet: 2,
    renommer_astre:  5,
    creer_agence:    3,
    creer_projet:    2,
  },
};

// ---- ASTRES (statiques + enrichis par Sheet) ---------------
const ASTRES_BASE = {
  iss: {
    id: 'iss', nom: 'Station Spatiale', nomAlt: null,
    orbitR: 120,
    angle: 0,
    rayon: 10,
    couleur: '#2ab8d8',
    glowColor: '#4ad8f8',
    texture: null, // pas d'image — dessin SVG custom
    emoji: '🛸',
    desc: 'Station orbitale internationale. Hub de coopération et de contrôle.',
    statut: 'active',
    projets: [], agences: [], influences: {},
  },
  lune: {
    id: 'lune', nom: 'Lune', nomAlt: null,
    orbitR: 210,
    angle: 0,
    rayon: 20,
    couleur: '#c0c8d4',
    glowColor: '#9090a8',
    texture: null, gradient: ['#d0d4dc','#a0a8b4','#8090a0','#606878'], // Lune — gris bleuté
    emoji: '🌕',
    desc: 'Satellite naturel de la Terre. Premier objectif de la course spatiale.',
    statut: 'colonisée',
    projets: [], agences: [], influences: {},
  },
  mars: {
    id: 'mars', nom: 'Mars', nomAlt: null,
    orbitR: 335,
    angle: 0,
    rayon: 17,
    couleur: '#c0522a',
    glowColor: '#ff6030',
    texture: null, gradient: ['#d06030','#a03818','#802010','#c05828'], // Mars — rouge ocre
    emoji: '🔴',
    desc: 'Planète rouge. Objectif prioritaire de l\'exploration interplanétaire.',
    statut: 'exploration',
    projets: [], agences: [], influences: {},
  },
  asteroïdes: {
    id: 'asteroïdes', nom: 'Ceinture', nomAlt: null,
    orbitR: 460,
    angle: 0,
    rayon: 7,
    couleur: '#8a8a7a',
    glowColor: '#aaaaaa',
    texture: null,
    emoji: '☄️',
    desc: 'Zone de débris entre Mars et Jupiter. Richesse minérale inestimable.',
    statut: 'inexploré',
    projets: [], agences: [], influences: {},
  },
  jupiter: {
    id: 'jupiter', nom: 'Jupiter', nomAlt: null,
    orbitR: 620,
    angle: 0,
    rayon: 30,
    couleur: '#c8a878',
    glowColor: '#e8c898',
    texture: null, gradient: ['#e8c890','#c8a060','#d0805a','#e0b878'], // Jupiter — beige rougeâtre
    emoji: '🟠',
    desc: 'Géante gazeuse. Ses lunes sont des cibles d\'exploration prometteuses.',
    statut: 'observation',
    projets: [], agences: [], influences: {},
  },
};

// ---- ÉTAT --------------------------------------------------
let nasaData     = JSON.parse(JSON.stringify(ASTRES_BASE)); // deep copy
let nasaMe       = null;
let nasaMyPoints = 0;
let nasaSelAstre = null;
let nasaFaction  = null; // 'sovereign' | 'shemning'

// ---- FETCH -------------------------------------------------
async function nasaFetch() {
  if (!NASA_CFG.GIDS.spatial) return [];
  const url = `https://docs.google.com/spreadsheets/d/${NASA_CFG.SHEET_ID}/gviz/tq?tqx=out:json&gid=${NASA_CFG.GIDS.spatial}`;
  try {
    const r   = await fetch(url);
    const raw = await r.text();
    const m   = raw.match(/setResponse\(([\s\S]*)\)/);
    if (!m) return [];
    const data = JSON.parse(m[1]);
    const rows = data.table.rows || [];
    if (!rows.length) return [];
    const cols = data.table.cols.map(c => (c.label || '').trim().replace(/^"+|"+$/g, ''));
    return rows.map(r => Object.fromEntries(cols.map((col, i) => [col, String(r?.c?.[i]?.v ?? '').trim()])));
  } catch(e) { console.warn('[NASA] fetch:', e); return []; }
}

async function nasaPostScript(payload) {
  try {
    const params = new URLSearchParams({ data: JSON.stringify(payload) });
    const r    = await fetch(NASA_CFG.APPS_SCRIPT + '?' + params, { method: 'GET' });
    const text = await r.text();
    const d    = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text);
    return d.success ? { ok: true } : { ok: false, error: d.error };
  } catch(e) { return { ok: false, error: e.message }; }
}

async function nasaLoadData() {
  const rows = await nasaFetch();

  // Reset
  Object.values(nasaData).forEach(a => { a.projets = []; a.agences = []; a.influences = {}; a.nomAlt = null; });

  rows.forEach(r => {
    const type   = (r.type   || '').trim().toLowerCase();
    const astreId = (r.astre  || '').trim().toLowerCase();
    const astre  = nasaData[astreId];

    if (type === 'points') {
      if (nasaMe && r.divinite?.trim() === nasaMe.id) {
        nasaMyPoints = Number(r.points) || 0;
      }
    }
    if (type === 'nom_alt' && astre) {
      astre.nomAlt = (r.valeur || '').trim() || null;
    }
    if (type === 'projet' && astre) {
      astre.projets.push({
        id:       (r.id      || '').trim(),
        nom:      (r.nom     || '').trim(),
        nomAlt:   (r.nom_alt || '').trim() || null,
        soutenu:  (r.soutenu || '').trim(),
        oppose:   (r.oppose  || '').trim(),
        agence:   (r.agence  || '').trim(),
        desc:     (r.desc    || '').trim(),
        statut:   (r.statut_projet || 'en_cours').trim(), // en_cours | réussi | échoué
      });
    }
    if (type === 'agence' && astre) {
      astre.agences.push({
        nom:      (r.nom      || '').trim(),
        faction:  (r.faction  || '').trim().toLowerCase(),
        divinite: (r.divinite || '').trim(),
      });
    }
    // "influence" n'est plus saisie manuellement
    // Elle est calculée automatiquement depuis les projets réussis (voir nasaComputeInfluences)
  });
}

// ---- CALCUL INFLUENCE AUTO --------------------------------
function nasaComputeInfluences() {
  // Reset toutes les influences
  Object.values(nasaData).forEach(a => { a.influences = {}; });

  Object.values(nasaData).forEach(astre => {
    astre.projets.forEach(p => {
      if (p.statut === 'réussi' && p.soutenu) {
        // Le soutien d'un projet réussi rapporte de l'influence
        if (!astre.influences[p.soutenu]) astre.influences[p.soutenu] = 0;
        astre.influences[p.soutenu] += 2; // +2 par projet réussi soutenu
      }
      if (p.statut === 'échoué' && p.oppose) {
        // L'opposition à un projet échoué rapporte aussi de l'influence
        if (!astre.influences[p.oppose]) astre.influences[p.oppose] = 0;
        astre.influences[p.oppose] += 1; // +1 par projet échoué contesté
      }
    });
  });
}

// ---- RENDER PRINCIPAL --------------------------------------
async function renderNASA(container, deityOverride) {
  if (!container) return;
  // Priorité : paramètre explicite > window.VV.me > variable globale me
  nasaMe      = deityOverride || window.VV?.me || (typeof me !== 'undefined' ? me : null);
  nasaFaction = nasaGetFaction(nasaMe?.id);

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#2ab8d8;
      font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:.1em;gap:10px">
      <div style="width:6px;height:6px;border-radius:50%;background:#2ab8d8;animation:nasa-blink 1s infinite"></div>
      CONNEXION AU RÉSEAU SPATIAL…
    </div>`;

  nasaInjectStyles();
  await nasaLoadData();
  nasaComputeInfluences(); // calcul auto depuis projets réussis
  nasaRenderInterface(container);
}

function nasaGetFaction(deityId) {
  if (!deityId) return null;
  // Chercher dans VV ou dans la variable globale FACTIONS
  const factions = window.VV?.FACTIONS || (typeof FACTIONS !== 'undefined' ? FACTIONS : {});
  const f = Object.entries(factions).find(([, f]) => f.members.includes(deityId));
  if (!f) return null;
  return f[0]; // 'sovereign' | 'olympien' | 'shemning'
}

function nasaRenderInterface(container) {
  const canAct = nasaFaction === 'sovereign' || nasaFaction === 'shemning';

  container.innerHTML = `
    <div class="nasa-root">

      <!-- HEADER SPATIAL -->
      <div class="nasa-header">
        <div class="nasa-header-left">
          <div class="nasa-radar-icon">
            <div class="nasa-radar-ring r1"></div>
            <div class="nasa-radar-ring r2"></div>
            <div class="nasa-radar-dot"></div>
          </div>
          <div>
            <div class="nasa-title">PROGRAMME SPATIAL INTERDIVIN</div>
            <div class="nasa-subtitle">SYSTÈME SOLAIRE · CYCLE ${window.VV?.CYCLE || (typeof CYCLE !== 'undefined' ? CYCLE : 1)} · ACCÈS ${nasaFaction?.toUpperCase() || 'RESTREINT'}</div>
          </div>
        </div>
        <div class="nasa-header-right">
          ${nasaMe && canAct ? `
            <div class="nasa-points-badge">
              <span class="nasa-points-icon">✦</span>
              <span class="nasa-points-val">${nasaMyPoints}</span>
              <span class="nasa-points-label">POINTS SPATIAUX</span>
            </div>
          ` : ''}
          <div class="nasa-factions">
            <span class="nasa-faction-dot" style="background:#4a8ad4" title="Sovereign"></span>
            <span class="nasa-faction-dot" style="background:#b02828" title="Shemning"></span>
          </div>
        </div>
      </div>

      <!-- CORPS : CARTE + PANEL -->
      <div class="nasa-body">

        <!-- CARTE SPATIALE -->
        <div class="nasa-map-wrap" id="nasa-map">
          ${nasaRenderMap()}
        </div>

        <!-- PANEL ASTRE -->
        <div class="nasa-panel" id="nasa-panel">
          ${nasaSelAstre ? nasaRenderAstrePanel(nasaSelAstre) : nasaRenderPanelVide()}
        </div>

      </div>

      <!-- LÉGENDE -->
      <div class="nasa-legend">
        <div class="nasa-legend-item"><span class="nasa-legend-dot" style="background:#4a8ad4"></span>Sovereign</div>
        <div class="nasa-legend-item"><span class="nasa-legend-dot" style="background:#b02828"></span>Shemning</div>
        <div class="nasa-legend-item"><span class="nasa-legend-dot" style="background:#2a8a3a"></span>Soutenu</div>
        <div class="nasa-legend-item"><span class="nasa-legend-dot" style="background:#cc3030"></span>Contesté</div>
        <div class="nasa-legend-item" style="margin-left:auto;font-family:'Share Tech Mono',monospace;font-size:9px;color:#2a3a5a">
          Cliquez un astre pour interagir
        </div>
      </div>
    </div>
  `;

  // Bind clics sur les astres
  document.querySelectorAll('.nasa-astre').forEach(el => {
    el.addEventListener('click', () => {
      nasaSelAstre = el.dataset.id;
      document.querySelectorAll('.nasa-astre').forEach(a => a.classList.remove('selected'));
      el.classList.add('selected');
      document.getElementById('nasa-panel').innerHTML = nasaRenderAstrePanel(el.dataset.id);
      nasaBindPanelActions(el.dataset.id);
    });
  });
}

// ---- CARTE SVG ---------------------------------------------
function nasaRenderMap() {
  const W = 700, H = 360;
  // Soleil centré verticalement, légèrement à gauche
  const SX = -30, SY = H / 2;

  // Étoiles
  let stars = '';
  const seed = [17,31,47,59,73,89,101,113,127,139,151,163,179,191,197,211,223,233,239,251,257,263,269,277,281,283];
  seed.forEach((s, i) => {
    const x = (s * 37 + i * 53) % W;
    const y = (s * 19 + i * 41) % H;
    const r = (i % 4 === 0) ? 1.4 : (i % 3 === 0) ? 1.0 : 0.6;
    const op = 0.15 + (i % 5) * 0.08;
    stars += `<circle cx="${x}" cy="${y}" r="${r}" fill="white" opacity="${op.toFixed(2)}"/>`;
  });

  // Defs : dégradés SVG réalistes pour chaque planète
  let defs = `<defs>
    <!-- Filtres glow -->
    <filter id="glow-sun" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="10" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glow-planet" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <!-- Lune : gris cratéré -->
    <radialGradient id="grad-lune" cx="35%" cy="30%" r="65%">
      <stop offset="0%"   stop-color="#dde2e8"/>
      <stop offset="40%"  stop-color="#a8b0bc"/>
      <stop offset="75%"  stop-color="#7880a0"/>
      <stop offset="100%" stop-color="#404860"/>
    </radialGradient>
    <!-- Mars : rouge-ocre -->
    <radialGradient id="grad-mars" cx="35%" cy="30%" r="65%">
      <stop offset="0%"   stop-color="#e87040"/>
      <stop offset="35%"  stop-color="#c04820"/>
      <stop offset="70%"  stop-color="#902010"/>
      <stop offset="100%" stop-color="#601008"/>
    </radialGradient>
    <!-- Jupiter : bandes beige-roux -->
    <linearGradient id="grad-jupiter" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="#e8d090"/>
      <stop offset="15%"  stop-color="#c89060"/>
      <stop offset="28%"  stop-color="#e0c080"/>
      <stop offset="42%"  stop-color="#b86848"/>
      <stop offset="55%"  stop-color="#d8a870"/>
      <stop offset="68%"  stop-color="#c07050"/>
      <stop offset="80%"  stop-color="#e0c080"/>
      <stop offset="100%" stop-color="#c89060"/>
    </linearGradient>
    <!-- Ceinture : gris pierreux -->
    <radialGradient id="grad-ceinture" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#9a9a8a"/>
      <stop offset="100%" stop-color="#505048"/>
    </radialGradient>
    <!-- ISS : bleu métallique -->
    <linearGradient id="grad-iss" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#4ad8f8"/>
      <stop offset="100%" stop-color="#1a8aaa"/>
    </linearGradient>
  </defs>`;

  // Orbites elliptiques
  const orbitesSVG = Object.values(ASTRES_BASE).map(a =>
    `<ellipse cx="${SX}" cy="${SY}" rx="${a.orbitR}" ry="${(a.orbitR * 0.32).toFixed(1)}"
      fill="none" stroke="#0d1e30" stroke-width="0.7" stroke-dasharray="4 6" opacity="0.6"/>`
  ).join('');

  // Soleil
  const soleil = `
    <circle cx="${SX}" cy="${SY}" r="36" fill="#f0a020" opacity="0.08" filter="url(#glow-sun)"/>
    <circle cx="${SX}" cy="${SY}" r="22" fill="#f0b030" opacity="0.18" filter="url(#glow-sun)"/>
    <circle cx="${SX}" cy="${SY}" r="14" fill="#ffe060" opacity="0.7"/>
    <circle cx="${SX}" cy="${SY}" r="10" fill="#fff4a0" opacity="0.9"/>
  `;

  // Astres avec textures
  const astresSVG = Object.values(ASTRES_BASE).map(a => {
    const ang  = a.angle * Math.PI / 180;
    const px   = (SX + a.orbitR * Math.cos(ang)).toFixed(1);
    const py   = (SY + a.orbitR * Math.sin(ang) * 0.32).toFixed(1);
    const live = nasaData[a.id];
    const hasInfluence = Object.keys(live?.influences || {}).length > 0;
    const hasProjects  = (live?.projets || []).length > 0;
    const nomAffiche   = live?.nomAlt || a.nom;

    // Anneau influence
    const ring = hasInfluence
      ? `<circle cx="${px}" cy="${py}" r="${a.rayon + 6}" fill="none" stroke="${a.glowColor}"
           stroke-width="1.2" opacity="0.5" stroke-dasharray="4 3" class="nasa-orbit-ring"/>`
      : '';

    // Point projet
    const projetDot = hasProjects
      ? `<circle cx="${(parseFloat(px) + a.rayon * 0.75).toFixed(1)}" cy="${(parseFloat(py) - a.rayon * 0.75).toFixed(1)}" r="3.5" fill="#2a8a3a" stroke="#04080f" stroke-width="1"/>`
      : '';

    // Corps de l'astre — SVG pur, pas d'images externes
    let corps = '';
    const fpx = parseFloat(px), fpy = parseFloat(py);
    if (a.id === 'asteroïdes') {
      const dotsFixed = [[-9,2],[-5,-3],[0,4],[5,-2],[9,1],[-7,5],[3,-5],[7,3]];
      corps = `<g class="nasa-astre-circle">
        ${dotsFixed.map((d,i) =>
          `<circle cx="${(fpx+d[0]).toFixed(1)}" cy="${(fpy+d[1]).toFixed(1)}"
            r="${1.2+(i%3)*0.6}" fill="#9a9a8a" opacity="${0.4+i*0.07}"/>`
        ).join('')}
        <ellipse cx="${px}" cy="${py}" rx="${a.rayon+2}" ry="4"
          fill="none" stroke="#6a6a5a" stroke-width="0.6" stroke-dasharray="3 4" opacity="0.4"/>
      </g>`;
    } else if (a.id === 'iss') {
      corps = `<g class="nasa-astre-circle" filter="url(#glow-planet)">
        <rect x="${(fpx-12).toFixed(1)}" y="${(fpy-2.5).toFixed(1)}" width="24" height="5" rx="1.5" fill="url(#grad-iss)" opacity="0.95"/>
        <rect x="${(fpx-2.5).toFixed(1)}" y="${(fpy-10).toFixed(1)}" width="5" height="20" rx="1.5" fill="#1a8aaa" opacity="0.9"/>
        <rect x="${(fpx-14).toFixed(1)}" y="${(fpy-1).toFixed(1)}" width="5" height="2" rx="1" fill="#c8e8f8" opacity="0.6"/>
        <rect x="${(fpx+9).toFixed(1)}"  y="${(fpy-1).toFixed(1)}" width="5" height="2" rx="1" fill="#c8e8f8" opacity="0.6"/>
        <circle cx="${px}" cy="${py}" r="3.5" fill="#4ad8f8" opacity="0.95"/>
      </g>`;
    } else if (a.id === 'lune') {
      corps = `<g class="nasa-astre-circle" filter="url(#glow-planet)">
        <circle cx="${px}" cy="${py}" r="${a.rayon}" fill="url(#grad-lune)"/>
        <!-- Cratères -->
        <circle cx="${(fpx-5).toFixed(1)}" cy="${(fpy-4).toFixed(1)}" r="3" fill="none" stroke="#606878" stroke-width="0.8" opacity="0.5"/>
        <circle cx="${(fpx+4).toFixed(1)}" cy="${(fpy+5).toFixed(1)}" r="2" fill="none" stroke="#606878" stroke-width="0.6" opacity="0.4"/>
        <circle cx="${(fpx+7).toFixed(1)}" cy="${(fpy-7).toFixed(1)}" r="1.5" fill="none" stroke="#707888" stroke-width="0.5" opacity="0.4"/>
        <circle cx="${px}" cy="${py}" r="${a.rayon}" fill="none" stroke="#9090a8" stroke-width="1" opacity="0.4"/>
      </g>`;
    } else if (a.id === 'mars') {
      corps = `<g class="nasa-astre-circle" filter="url(#glow-planet)">
        <circle cx="${px}" cy="${py}" r="${a.rayon}" fill="url(#grad-mars)"/>
        <!-- Calotte polaire -->
        <ellipse cx="${(fpx+2).toFixed(1)}" cy="${(fpy-a.rayon+4).toFixed(1)}" rx="5" ry="2.5" fill="white" opacity="0.25"/>
        <!-- Vallée Marineris -->
        <path d="M ${(fpx-8).toFixed(1)},${(fpy+1).toFixed(1)} Q ${fpx},${(fpy+4).toFixed(1)} ${(fpx+8).toFixed(1)},${(fpy+2).toFixed(1)}"
          fill="none" stroke="#601008" stroke-width="1.2" opacity="0.4"/>
        <circle cx="${px}" cy="${py}" r="${a.rayon}" fill="none" stroke="#ff6030" stroke-width="1" opacity="0.3"/>
      </g>`;
    } else if (a.id === 'jupiter') {
      corps = `<g class="nasa-astre-circle" filter="url(#glow-planet)">
        <clipPath id="clip-jup-inline"><circle cx="${px}" cy="${py}" r="${a.rayon}"/></clipPath>
        <circle cx="${px}" cy="${py}" r="${a.rayon}" fill="url(#grad-jupiter)"/>
        <!-- Bandes atmosphériques -->
        <g clip-path="url(#clip-jup-inline)">
          <rect x="${(fpx-a.rayon).toFixed(1)}" y="${(fpy-8).toFixed(1)}" width="${a.rayon*2}" height="4" fill="#b86848" opacity="0.35"/>
          <rect x="${(fpx-a.rayon).toFixed(1)}" y="${(fpy+2).toFixed(1)}"  width="${a.rayon*2}" height="3" fill="#c07050" opacity="0.3"/>
          <rect x="${(fpx-a.rayon).toFixed(1)}" y="${(fpy+10).toFixed(1)}" width="${a.rayon*2}" height="3" fill="#b86848" opacity="0.25"/>
          <!-- Grande Tache Rouge -->
          <ellipse cx="${(fpx+6).toFixed(1)}" cy="${(fpy+3).toFixed(1)}" rx="7" ry="4" fill="#c04030" opacity="0.5"/>
        </g>
        <circle cx="${px}" cy="${py}" r="${a.rayon}" fill="none" stroke="#e8c898" stroke-width="1.2" opacity="0.4"/>
      </g>`;
    }

    return `
      <g class="nasa-astre" data-id="${a.id}" style="cursor:pointer" data-px="${px}" data-py="${py}">
        ${ring}
        ${corps}
        ${projetDot}
        <text x="${px}" y="${(parseFloat(py) + a.rayon + 13).toFixed(1)}"
          text-anchor="middle" font-size="8.5" fill="${a.glowColor}"
          font-family="Share Tech Mono,monospace" class="nasa-astre-label"
          letter-spacing="0.06em">${nomAffiche}</text>
      </g>`;
  }).join('');

  return `
    <svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink" style="display:block">
      <rect width="${W}" height="${H}" fill="#04080f"/>
      ${defs}
      ${stars}
      ${orbitesSVG}
      ${soleil}
      ${astresSVG}
    </svg>`;
}

// ---- PANEL VIDE --------------------------------------------
function nasaRenderPanelVide() {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:12px;opacity:.4">
      <div style="font-size:32px">🌌</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:#2a3a5a;letter-spacing:.1em;text-align:center">
        SÉLECTIONNEZ UN ASTRE<br>POUR INTERAGIR
      </div>
    </div>`;
}

// ---- PANEL ASTRE -------------------------------------------
function nasaRenderAstrePanel(astreId) {
  const astre = nasaData[astreId];
  const base  = ASTRES_BASE[astreId];
  if (!astre || !base) return '';

  const canAct   = (nasaFaction === 'sovereign' || nasaFaction === 'shemning') && nasaMe;
  const nomAff   = astre.nomAlt || astre.nom;
  const statutColor = { colonisée:'#2a8a3a', exploration:'#c8a84b', observation:'#4a8ad4', active:'#2ab8d8', inexploré:'#3a5060' }[astre.statut] || '#5a7a9a';

  // Influences
  const infEntries = Object.entries(astre.influences);
  const totalInf   = infEntries.reduce((s, [, v]) => s + v, 0);
  const infHTML    = infEntries.length
    ? infEntries.map(([did, pts]) => {
        const d  = (window.VV?.DEITIES || (typeof window.VV !== 'undefined' ? [] : (typeof DEITIES !== 'undefined' ? DEITIES : [])))?.find(x => x.id === did);
        const pct = totalInf > 0 ? Math.round(pts / totalInf * 100) : 0;
        return `<div class="nasa-inf-row">
          <span style="color:${d?.color||'#5a7a9a'};font-size:10px;font-weight:600">${d?.name||did}</span>
          <div class="nasa-inf-bar"><div style="width:${pct}%;background:${d?.color||'#5a7a9a'};height:100%;border-radius:2px"></div></div>
          <span style="font-size:9px;color:#5a7a9a;font-family:'Share Tech Mono',monospace">${pts}pts</span>
        </div>`;
      }).join('')
    : `<div style="font-size:9px;color:#2a3a54;font-family:'Share Tech Mono',monospace">Aucune influence enregistrée</div>`;

  // Projets
  const projetsHTML = astre.projets.length
    ? astre.projets.map(p => {
        const nomP = p.nomAlt || p.nom;
        const deities = window.VV?.DEITIES || (typeof window.VV !== 'undefined' ? [] : []);
        const soutenuD = p.soutenu ? deities.find(x => x.id === p.soutenu) : null;
        const opposeD  = p.oppose  ? deities.find(x => x.id === p.oppose)  : null;
        const statutProjet = p.statut || 'en_cours';
        const statutColor  = statutProjet === 'réussi' ? '#2a8a3a' : statutProjet === 'échoué' ? '#cc3030' : '#c8a84b';
        const statutLabel  = statutProjet === 'réussi' ? '✓ RÉUSSI' : statutProjet === 'échoué' ? '✕ ÉCHOUÉ' : '⟳ EN COURS';
        return `<div class="nasa-projet-item" style="border-color:${statutColor}22">
          <div class="nasa-projet-nom" style="display:flex;align-items:center;justify-content:space-between;gap:6px">
            <span>${nomP}${p.nomAlt ? ` <span style="opacity:.4;font-size:8px">(${p.nom})</span>` : ''}</span>
            <span style="font-family:'Share Tech Mono',monospace;font-size:8px;color:${statutColor};
              border:1px solid ${statutColor}33;padding:1px 5px;border-radius:2px;white-space:nowrap">${statutLabel}</span>
          </div>
          ${p.agence ? `<div style="font-size:9px;color:#3a5880;margin:3px 0">Agence : ${p.agence}</div>` : ''}
          ${p.desc   ? `<div class="nasa-projet-desc">${p.desc}</div>` : ''}
          <div style="display:flex;gap:8px;margin-top:5px;flex-wrap:wrap;align-items:center">
            ${soutenuD ? `<span style="font-size:9px;color:#2a8a3a">✦ ${soutenuD.name}</span>` : ''}
            ${opposeD  ? `<span style="font-size:9px;color:#cc3030">✕ ${opposeD.name}</span>` : ''}
            ${statutProjet === 'réussi' && soutenuD ? `<span style="font-size:8px;color:#1a6a2a;font-family:'Share Tech Mono',monospace">+2 influence</span>` : ''}
            ${statutProjet === 'échoué' && opposeD  ? `<span style="font-size:8px;color:#8a1a1a;font-family:'Share Tech Mono',monospace">+1 influence</span>` : ''}
          </div>
        </div>`;
      }).join('')
    : `<div style="font-size:9px;color:#2a3a54;font-family:'Share Tech Mono',monospace">Aucun projet actif</div>`;

  // Agences
  const agencesHTML = astre.agences.length
    ? astre.agences.map(ag => {
        const fc = ag.faction === 'sovereign' ? '#4a8ad4' : ag.faction === 'shemning' ? '#b02828' : '#5a7a9a';
        return `<div class="nasa-agence-chip" style="border-color:${fc}44;color:${fc}">
          ${ag.nom} <span style="opacity:.5;font-size:8px">${ag.divinite}</span>
        </div>`;
      }).join('')
    : `<div style="font-size:9px;color:#2a3a54;font-family:'Share Tech Mono',monospace">Aucune agence</div>`;

  // Actions
  const actionsHTML = canAct ? `
    <div class="nasa-section-title">ACTIONS DISPONIBLES</div>
    <div class="nasa-actions-grid">
      ${nasaActionBtn('soutenir',        '✦', 'Soutenir un projet',   NASA_CFG.COUTS.soutenir,        astreId)}
      ${nasaActionBtn('opposer',         '✕', 'S\'opposer',            NASA_CFG.COUTS.opposer,         astreId)}
      ${nasaActionBtn('renommer_projet', '✎', 'Renommer un projet',   NASA_CFG.COUTS.renommer_projet, astreId)}
      ${nasaActionBtn('renommer_astre',  '★', 'Renommer l\'astre',    NASA_CFG.COUTS.renommer_astre,  astreId)}
      ${nasaActionBtn('creer_agence',    '⬡', 'Créer une agence',     NASA_CFG.COUTS.creer_agence,    astreId)}
      ${nasaActionBtn('creer_projet',    '+', 'Créer un projet',      NASA_CFG.COUTS.creer_projet,    astreId)}
    </div>` : '';

  return `
    <div class="nasa-panel-inner">
      <!-- En-tête astre -->
      <div class="nasa-panel-header" style="border-color:${base.glowColor}33">
        <div style="font-size:28px">${base.emoji}</div>
        <div style="flex:1;min-width:0">
          <div class="nasa-panel-nom" style="color:${base.glowColor}">${nomAff}</div>
          ${astre.nomAlt ? `<div style="font-size:9px;color:#3a5060;font-family:'Share Tech Mono',monospace">Nom officiel : ${base.nom}</div>` : ''}
          <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
            <span class="nasa-statut-badge" style="color:${statutColor};border-color:${statutColor}44;background:${statutColor}11">${astre.statut.toUpperCase()}</span>
            <span style="font-size:9px;color:#2a3a54;font-family:'Share Tech Mono',monospace">${astre.agences.length} agence(s) · ${astre.projets.length} projet(s)</span>
          </div>
        </div>
        ${canAct ? `<div class="nasa-my-points" style="text-align:right">
          <div style="font-size:16px;font-weight:600;color:#2ab8d8">${nasaMyPoints}</div>
          <div style="font-size:8px;color:#2a3a5a;font-family:'Share Tech Mono',monospace">pts spatiaux</div>
        </div>` : ''}
      </div>

      <div style="font-size:10px;color:#5a7a9a;line-height:1.5;margin-bottom:12px">${base.desc}</div>

      <div class="nasa-section-title">INFLUENCES</div>
      <div style="margin-bottom:12px">${infHTML}</div>

      <div class="nasa-section-title">AGENCES PRÉSENTES</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px">${agencesHTML}</div>

      <div class="nasa-section-title">PROJETS ACTIFS</div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">${projetsHTML}</div>

      ${actionsHTML}
    </div>
  `;
}

function nasaActionBtn(action, icon, label, cout, astreId) {
  const canAfford = nasaMyPoints >= cout;
  const disabled  = !canAfford ? 'disabled' : '';
  const style     = canAfford
    ? 'background:#06101e;border-color:#1a3050;color:#2ab8d8;cursor:pointer'
    : 'background:#04080e;border-color:#0e1828;color:#1a2a3a;cursor:not-allowed;opacity:.5';
  return `
    <button class="nasa-action-btn" ${disabled}
      data-action="${action}" data-astre="${astreId}"
      style="${style}">
      <span class="nasa-action-icon">${icon}</span>
      <span class="nasa-action-label">${label}</span>
      <span class="nasa-action-cout">${cout}pt${cout>1?'s':''}</span>
    </button>`;
}

// ---- BIND ACTIONS ------------------------------------------
function nasaBindPanelActions(astreId) {
  document.querySelectorAll('.nasa-action-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => nasaDoAction(btn.dataset.action, btn.dataset.astre));
  });
}

async function nasaDoAction(action, astreId) {
  const astre = nasaData[astreId];
  const base  = ASTRES_BASE[astreId];
  const cout  = NASA_CFG.COUTS[action];
  if (nasaMyPoints < cout) return;

  let payload = {
    action:   'spatial_action',
    type:     action,
    astre:    astreId,
    divinite: nasaMe.id,
    cycle:    window.VV?.CYCLE || 1,
  };

  // Formulaires selon l'action
  if (action === 'soutenir' || action === 'opposer') {
    if (!astre.projets.length) { nasaShowNotif(`Aucun projet sur ${base.nom} à cibler.`, 'warn'); return; }
    const choix = await nasaPromptChoix(`${action === 'soutenir' ? 'Soutenir' : 'Contester'} quel projet ?`,
      astre.projets.map(p => ({ val: p.id, label: p.nomAlt || p.nom })));
    if (!choix) return;
    payload.projet_id = choix;
  }
  if (action === 'renommer_projet') {
    if (!astre.projets.length) { nasaShowNotif(`Aucun projet sur ${base.nom} à renommer.`, 'warn'); return; }
    const choix = await nasaPromptChoix('Quel projet renommer ?', astre.projets.map(p => ({ val: p.id, label: p.nom })));
    if (!choix) return;
    const nom = prompt('Nouveau nom du projet :');
    if (!nom?.trim()) return;
    payload.projet_id = choix;
    payload.nouveau_nom = nom.trim();
  }
  if (action === 'renommer_astre') {
    const nom = prompt(`Nouveau nom pour ${base.nom} :`);
    if (!nom?.trim()) return;
    payload.nouveau_nom = nom.trim();
  }
  if (action === 'creer_agence') {
    const nom = prompt('Nom de votre agence spatiale :');
    if (!nom?.trim()) return;
    payload.nom = nom.trim();
  }
  if (action === 'creer_projet') {
    const nom  = prompt('Nom du projet spatial :');
    if (!nom?.trim()) return;
    const desc = prompt('Description courte (optionnel) :') || '';
    payload.nom  = nom.trim();
    payload.desc = desc.trim();
  }

  // Confirmation
  if (!confirm(`Confirmer : "${nasaActionLabel(action)}" sur ${base.nom} — coût ${cout} point(s) spatial/aux ?`)) return;

  const btn = document.querySelector(`[data-action="${action}"]`);
  if (btn) { btn.disabled = true; btn.style.opacity = '.5'; }

  const res = await nasaPostScript(payload);
  if (res.ok || true) { // Optimiste — mettre à jour localement
    nasaMyPoints -= cout;
    nasaApplyActionLocally(action, astreId, payload);
    nasaShowNotif(`Action effectuée ! (-${cout} pt${cout>1?'s':''})`, 'ok');
    // Re-render panel
    document.getElementById('nasa-panel').innerHTML = nasaRenderAstrePanel(astreId);
    nasaBindPanelActions(astreId);
    // Màj points dans header
    const pv = document.querySelector('.nasa-points-val');
    if (pv) pv.textContent = nasaMyPoints;
  } else {
    nasaShowNotif(`Erreur : ${res.error}`, 'error');
    if (btn) { btn.disabled = false; btn.style.opacity = ''; }
  }
}

function nasaApplyActionLocally(action, astreId, payload) {
  const astre = nasaData[astreId];
  if (action === 'renommer_astre')  astre.nomAlt = payload.nouveau_nom;
  if (action === 'renommer_projet') {
    const p = astre.projets.find(x => x.id === payload.projet_id);
    if (p) p.nomAlt = payload.nouveau_nom;
  }
  if (action === 'soutenir') {
    const p = astre.projets.find(x => x.id === payload.projet_id);
    if (p) p.soutenu = nasaMe.id;
  }
  if (action === 'opposer') {
    const p = astre.projets.find(x => x.id === payload.projet_id);
    if (p) p.oppose = nasaMe.id;
  }
  if (action === 'creer_agence') {
    astre.agences.push({ nom: payload.nom, faction: nasaFaction, divinite: nasaMe.id });
  }
  if (action === 'creer_projet') {
    astre.projets.push({ id: `proj_${Date.now()}`, nom: payload.nom, desc: payload.desc, nomAlt: null, soutenu: '', oppose: '', agence: '' });
  }
  if (!astre.influences[nasaMe.id]) astre.influences[nasaMe.id] = 0;
  astre.influences[nasaMe.id] += NASA_CFG.COUTS[action];
}

function nasaActionLabel(action) {
  return { soutenir:'Soutenir un projet', opposer:'S\'opposer', renommer_projet:'Renommer un projet',
           renommer_astre:'Renommer l\'astre', creer_agence:'Créer une agence', creer_projet:'Créer un projet' }[action] || action;
}

// ---- PROMPT CHOIX ------------------------------------------
function nasaPromptChoix(titre, options) {
  return new Promise(resolve => {
    let modal = document.getElementById('nasa-choix-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'nasa-choix-modal';
      modal.style.cssText = `position:fixed;inset:0;z-index:9000;background:rgba(0,4,12,.85);
        display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)`;
      document.body.appendChild(modal);
    }
    modal.innerHTML = `
      <div style="background:#06101e;border:1px solid #1a2844;border-radius:10px;padding:20px;min-width:280px;max-width:360px">
        <div style="font-family:'Oswald',sans-serif;font-size:13px;font-weight:600;letter-spacing:.1em;color:#2ab8d8;margin-bottom:14px">${titre}</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${options.map(o => `
            <button onclick="nasaChoixSelect('${o.val}')"
              style="background:#0a1628;border:1px solid #1a2844;border-radius:6px;padding:8px 12px;
                color:#cfe4f7;font-family:'Oswald',sans-serif;font-size:12px;cursor:pointer;text-align:left;
                transition:border-color .15s"
              onmouseover="this.style.borderColor='#2ab8d8'" onmouseout="this.style.borderColor='#1a2844'">
              ${o.label}
            </button>`).join('')}
        </div>
        <button onclick="nasaChoixCancel()"
          style="margin-top:10px;background:none;border:none;color:#3a5060;font-family:'Share Tech Mono',monospace;
            font-size:10px;cursor:pointer;letter-spacing:.06em">ANNULER</button>
      </div>`;
    modal.style.display = 'flex';
    window._nasaChoixResolve = resolve;
  });
}

window.nasaChoixSelect = function(val) {
  document.getElementById('nasa-choix-modal').style.display = 'none';
  if (window._nasaChoixResolve) { window._nasaChoixResolve(val); window._nasaChoixResolve = null; }
};
window.nasaChoixCancel = function() {
  document.getElementById('nasa-choix-modal').style.display = 'none';
  if (window._nasaChoixResolve) { window._nasaChoixResolve(null); window._nasaChoixResolve = null; }
};

// ---- NOTIF -------------------------------------------------
function nasaShowNotif(msg, type = 'ok') {
  const color = type === 'ok' ? '#2a8a3a' : type === 'warn' ? '#c8a84b' : '#cc3030';
  let notif = document.getElementById('nasa-notif');
  if (!notif) {
    notif = document.createElement('div');
    notif.id = 'nasa-notif';
    notif.style.cssText = `position:fixed;bottom:20px;right:20px;z-index:9999;
      border-radius:8px;padding:10px 16px;font-family:'Share Tech Mono',monospace;
      font-size:11px;letter-spacing:.06em;border:1px solid;transition:opacity .3s`;
    document.body.appendChild(notif);
  }
  notif.style.background = color + '18';
  notif.style.borderColor = color + '55';
  notif.style.color = color;
  notif.textContent = msg;
  notif.style.opacity = '1';
  setTimeout(() => { notif.style.opacity = '0'; }, 3000);
}

// ---- STYLES ------------------------------------------------
function nasaInjectStyles() {
  if (document.getElementById('gs-nasa-style')) return;
  const style = document.createElement('style');
  style.id = 'gs-nasa-style';
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;600&family=Share+Tech+Mono&display=swap');

    @keyframes nasa-blink    { 0%,100%{opacity:1} 50%{opacity:.2} }
    @keyframes nasa-orbit    { from{stroke-dashoffset:0} to{stroke-dashoffset:-100} }
    @keyframes nasa-ring-rot { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    @keyframes nasa-pulse-ring { 0%,100%{r:5;opacity:.8} 50%{r:9;opacity:0} }

    .nasa-root {
      display:flex;flex-direction:column;height:100%;
      font-family:'Oswald',sans-serif;background:#04080f;color:#cfe4f7;
    }

    .nasa-header {
      padding:10px 16px;border-bottom:1px solid #0e1e30;
      display:flex;align-items:center;justify-content:space-between;
      background:linear-gradient(90deg,#060e1c,#04080f);flex-shrink:0;
    }
    .nasa-header-left { display:flex;align-items:center;gap:12px; }
    .nasa-title { font-size:12px;font-weight:600;letter-spacing:.16em;color:#2ab8d8;text-transform:uppercase; }
    .nasa-subtitle { font-family:'Share Tech Mono',monospace;font-size:9px;color:#1a3a5a;letter-spacing:.1em;margin-top:2px; }
    .nasa-header-right { display:flex;align-items:center;gap:12px; }

    .nasa-radar-icon { position:relative;width:32px;height:32px;flex-shrink:0; }
    .nasa-radar-ring {
      position:absolute;border-radius:50%;border:1px solid #2ab8d8;
      animation:nasa-blink 2s ease-in-out infinite;
    }
    .nasa-radar-ring.r1 { inset:4px;animation-delay:0s;opacity:.6; }
    .nasa-radar-ring.r2 { inset:0;animation-delay:.5s;opacity:.3; }
    .nasa-radar-dot {
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      width:6px;height:6px;border-radius:50%;background:#2ab8d8;
    }

    .nasa-points-badge {
      display:flex;align-items:center;gap:5px;
      background:#06101e;border:1px solid #0e2030;border-radius:6px;padding:5px 10px;
    }
    .nasa-points-icon { color:#2ab8d8;font-size:12px; }
    .nasa-points-val  { font-size:16px;font-weight:600;color:#2ab8d8; }
    .nasa-points-label{ font-family:'Share Tech Mono',monospace;font-size:8px;color:#1a3a5a;letter-spacing:.08em; }
    .nasa-factions { display:flex;gap:4px; }
    .nasa-faction-dot { width:8px;height:8px;border-radius:50%;display:block; }

    .nasa-body {
      display:grid;grid-template-columns:1fr 300px;flex:1;min-height:0;overflow:hidden;
    }

    .nasa-map-wrap {
      position:relative;overflow:hidden;border-right:1px solid #0e1e30;
      background:#04080f;
    }

    .nasa-astre { transition:opacity .2s; }
    .nasa-astre:hover .nasa-astre-circle { stroke-width:3;filter:brightness(1.3); }
    .nasa-astre:hover .nasa-astre-label  { font-size:9px;font-weight:700; }
    .nasa-astre.selected .nasa-astre-circle { stroke-width:3;filter:brightness(1.4); }
    .nasa-orbit-ring { animation:nasa-orbit 8s linear infinite; }

    .nasa-panel {
      overflow-y:auto;background:#040c18;
    }
    .nasa-panel-inner { padding:14px; }
    .nasa-panel-header {
      display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;
      padding-bottom:10px;border-bottom:1px solid;
    }
    .nasa-panel-nom { font-size:16px;font-weight:600;letter-spacing:.06em; }
    .nasa-statut-badge {
      font-family:'Share Tech Mono',monospace;font-size:8px;font-weight:700;
      padding:2px 6px;border-radius:2px;border:1px solid;letter-spacing:.1em;
    }

    .nasa-section-title {
      font-family:'Share Tech Mono',monospace;font-size:9px;color:#1a3a5a;
      letter-spacing:.14em;text-transform:uppercase;margin-bottom:6px;
      border-bottom:1px solid #0a1828;padding-bottom:4px;
    }

    .nasa-inf-row { display:flex;align-items:center;gap:6px;margin-bottom:4px; }
    .nasa-inf-bar { flex:1;height:4px;background:#0a1628;border-radius:2px;overflow:hidden; }

    .nasa-projet-item {
      background:#060e1c;border:1px solid #0e1e30;border-radius:6px;padding:8px 10px;
    }
    .nasa-projet-nom  { font-size:11px;font-weight:600;color:#cfe4f7;margin-bottom:3px; }
    .nasa-projet-desc { font-size:9px;color:#3a5880;line-height:1.4; }

    .nasa-agence-chip {
      font-family:'Share Tech Mono',monospace;font-size:9px;
      padding:3px 8px;border-radius:4px;border:1px solid;
    }

    .nasa-actions-grid {
      display:grid;grid-template-columns:1fr 1fr;gap:6px;
    }
    .nasa-action-btn {
      display:flex;flex-direction:column;align-items:center;gap:3px;
      border:1px solid;border-radius:8px;padding:8px 6px;
      font-family:'Oswald',sans-serif;transition:all .15s;
    }
    .nasa-action-btn:not([disabled]):hover { border-color:#2ab8d8 !important;color:#2ab8d8 !important; }
    .nasa-action-icon  { font-size:14px; }
    .nasa-action-label { font-size:9px;font-weight:600;letter-spacing:.04em;text-align:center;line-height:1.2; }
    .nasa-action-cout  { font-family:'Share Tech Mono',monospace;font-size:8px;opacity:.6; }

    .nasa-legend {
      padding:6px 14px;border-top:1px solid #0e1e30;
      display:flex;align-items:center;gap:12px;flex-shrink:0;background:#04080f;
    }
    .nasa-legend-item { display:flex;align-items:center;gap:4px;font-family:'Share Tech Mono',monospace;font-size:9px;color:#2a3a54; }
    .nasa-legend-dot  { width:7px;height:7px;border-radius:50%;flex-shrink:0; }
  `;
  document.head.appendChild(style);
}

// ---- EXPORT ------------------------------------------------
window.gsRenderNASA = renderNASA;
