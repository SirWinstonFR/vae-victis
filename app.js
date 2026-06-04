/* ============================================================
   VAE VICTIS — app.js
   Logique principale : données, panels, dock, attaques, auth
   ============================================================ */

'use strict';

window.VV = window.VV || {};

// ---- CONFIG ------------------------------------------------
const CFG = {
  SHEET_ID:    '1L9hbQuAD9A4WQFG1G47teZlUPM6-JkMmuuX2Ys-TYt8',
  APPS_SCRIPT: 'https://script.google.com/macros/s/AKfycbyCaQI2c5ds2uCmoeCw6_fALjh-8ii05fkOVgZmWPhbY64vyYbrNcFvqbFKRb7rUwyxwQ/exec',
  FANDOM_URL:  'https://vae-victis.fandom.com/fr/wiki/Wiki_Vae_Victis',
  REFRESH_MIN: 5,
  GIDS: {
    divinites:    '855807094',
    territoires:  '658049216',
    attaques:     '2093054741',
    cycles:       '1122856746',
    zones_config: '851605217',
    situations:   '1166964994',
    nations:      '1443319453',
    historique:   '1432315292',
    points:       '0',
  },
};

// ---- FACTIONS ----------------------------------------------
const FACTIONS = {
  sovereign: { name: 'Sovereign', color: '#3a7acc', members: ['liberty','capital','judgment','union','manifest','wrath','industry','old media','new media','vigil','science'] },
  olympien:  { name: 'Olympiens', color: '#c8901a', members: ['zeus','hera','poseidon','demeter','persephone','athena','artemis','ares','hades','apollon','hermes','dionysos','hestia','hephaistos','aphrodite'] },
  shemning:  { name: 'Shemning',  color: '#b02828', members: ['entite','isis','seth','osiris','hel','tyr','loki','shiva','vishnu','brahma','amaterasu'] },
};

const FACTION_ORDER = ['sovereign', 'olympien', 'shemning'];

window.VV.SITUATION_TYPES = {
  crise:       { label:'Crise',        icon:'!',  levels:[{intensity:1,color:'#ff9944'},{intensity:2,color:'#ff5500'},{intensity:3,color:'#cc1100'}] },
  guerre:      { label:'Guerre',       icon:'X',  levels:[{intensity:1,color:'#ff3030'},{intensity:2,color:'#cc0000'},{intensity:3,color:'#880000'}] },
  pandemie:    { label:'Pandémie',     icon:'P',  levels:[{intensity:1,color:'#44cc44'},{intensity:2,color:'#228822'},{intensity:3,color:'#115511'}] },
  catastrophe: { label:'Catastrophe',  icon:'C',  levels:[{intensity:1,color:'#ffcc00'},{intensity:2,color:'#ff8800'},{intensity:3,color:'#ff4400'}] },
  occupation:  { label:'Occupation',   icon:'O',  levels:[{intensity:1,color:'#9966cc'},{intensity:2,color:'#6633aa'},{intensity:3,color:'#441188'}] },
};

window.VV.getSituationColor = function(type, intensity) {
  const st = window.VV.SITUATION_TYPES[type];
  if (!st) return null;
  return (st.levels.find(l => l.intensity === Number(intensity)) || st.levels[0]).color;
};

// ---- STATE -------------------------------------------------
window.VV.DEITIES     = [];
window.VV.ZONES       = {};
window.VV.COUNTRY_MAP = {};
window.VV.attacks     = [];
window.VV.situations  = [];
window.VV.showSituations = false;
window.VV.mapColorMode = 'divine'; // 'divine' | 'faction'
let histMode = false;
let histCycle = null;
let histData  = {}; // cycle -> { territoire_id: proprietaire }

const TRANS_ZONES = {
  UE:   { icon:'🇪🇺', name:'Union Européenne', territories:[] },
  OTAN: { icon:'🛡️',  name:'OTAN',             territories:[] },
  ONU:  { icon:'🌐',  name:'ONU',              territories:[] },
};
let nations = {};
let CYCLE = 1;
let me = null;
let capitulation = null;
let pendingAtk = null;
let selDeity = null, selZone = null, selTrans = null;

const N = 'neutral';
const $ = id => document.getElementById(id);

// ---- HELPERS -----------------------------------------------
window.VV.getD = id => window.VV.DEITIES.find(d => d.id === id) || { id, name:id, color:'#3a5a7a', pi:0, avatar:'', logo:'' };
const getD = window.VV.getD;
const getT = id => allT().find(t => t.id === id);
const allT = () => [
  ...Object.values(window.VV.ZONES).flatMap(z => z.territories),
  ...Object.values(TRANS_ZONES).flatMap(z => z.territories),
];
const atkOn  = did => window.VV.attacks.filter(a => a.target === did).length;
const myAtks = ()  => me ? window.VV.attacks.filter(a => a.attacker === me.id) : [];

window.VV.tzMap = function() {
  const m = {};
  Object.entries(window.VV.ZONES).forEach(([z, d]) => d.territories.forEach(t => { m[t.id] = z; }));
  return m;
};

function getFaction(id) {
  return Object.values(FACTIONS).find(f => f.members.includes(id)) || null;
}

window.VV.dotColor = function(t) {
  const isMe    = me && t.owner === me.id;
  const isAtked = window.VV.attacks.some(a => a.territory === t.id);
  const isCap   = capitulation === t.id;
  const owner   = t.owner && t.owner !== N ? getD(t.owner) : null;

  // Priorités communes aux deux modes
  if (isCap)           return '#cc3030';
  if (isAtked && isMe) return '#2a6aaa';
  if (isAtked)         return '#c87020';

  if (window.VV.mapColorMode === 'faction') {
    if (!owner) return '#2a4060'; // neutre
    const myFaction  = me ? getFaction(me.id) : null;
    const ownFaction = getFaction(owner.id);
    if (!ownFaction) return '#2a4060';
    if (isMe) return '#1a8a4a'; // mes territoires = vert
    if (myFaction && ownFaction.name === myFaction.name) return '#c8901a'; // alliés faction = orange
    // Couleur par faction
    const FC = { 'Sovereign':'#3a7acc', 'Olympiens':'#c8901a', 'Shemning':'#b02828' };
    return FC[ownFaction.name] || owner.color;
  }

  // Mode divin (défaut)
  if (owner) return isMe ? '#1a8a4a' : owner.color;
  return '#2a4060';
};

// ---- GOOGLE SHEETS -----------------------------------------
function gvizUrl(tab) {
  return `https://docs.google.com/spreadsheets/d/${CFG.SHEET_ID}/gviz/tq?tqx=out:json&gid=${CFG.GIDS[tab]||'0'}`;
}

function parseGviz(raw) {
  const m = raw.match(/setResponse\(([\s\S]*)\)/);
  if (!m) return [];
  const data = JSON.parse(m[1]);
  const rows = data.table.rows || [];
  if (!rows.length) return [];
  let cols = data.table.cols.map(c => (c.label || '').trim());
  const hasLabels = cols.some(c => c.length > 0);
  if (!hasLabels) {
    cols = rows[0].c.map(c => String(c?.v ?? '').trim());
    return rows.slice(1).map(r => Object.fromEntries(cols.map((col,i) => [col, String(r?.c?.[i]?.v ?? '').trim()])));
  }
  return rows.map(r => Object.fromEntries(cols.map((col,i) => [col, String(r?.c?.[i]?.v ?? '').trim()])));
}

async function fetchTab(tab) {
  try {
    const r = await fetch(gvizUrl(tab));
    return parseGviz(await r.text());
  } catch(e) {
    console.warn(`[VV] Onglet ${tab}:`, e);
    return [];
  }
}

function setSyncState(state, label) {
  const dot = $('sync-dot'), lbl = $('sync-label');
  if (dot) dot.className = `sync-dot ${state}`;
  if (lbl) lbl.textContent = label;
}

async function loadData() {
  setSyncState('loading', 'Sync…');
  try {
    const [div, terr, atk, cyc, zones, situ, nats] = await Promise.all([
      fetchTab('divinites'), fetchTab('territoires'), fetchTab('attaques'),
      fetchTab('cycles'), fetchTab('zones_config'), fetchTab('situations'), fetchTab('nations'),
    ]);

    // Divinités
    window.VV.DEITIES = div.filter(r => r.id).map(r => ({
      id:     r.id.trim(),
      name:   (r.nom || r.id).trim(),
      player: (r.joueur || '').trim(),
      pi:     Number(r.pi) || 0,
      color:  (r.couleur || '#4a8ad4').trim(),
      pass:   (r.pass || '').trim(),
      avatar: (r.avatar_url || '').trim(),
      logo:   (r.logo_url || '').trim(),
    }));

    // Zones config
    window.VV.COUNTRY_MAP = {};
    const cx = {}, cy = {};
    zones.filter(r => r.zone).forEach(r => {
      cx[r.zone] = Number(r.cx) || 0;
      cy[r.zone] = Number(r.cy) || 0;
      (r.pays_associes || '').split(',').forEach(p => {
        p = p.trim();
        if (p) window.VV.COUNTRY_MAP[p] = r.zone.trim();
      });
    });

    // Fallback mapping complet
    const FB = {
      'United States of America':'USA','Greenland':'USA','Canada':'Canada',
      'Mexico':'Amérique Centrale','Guatemala':'Amérique Centrale','Belize':'Amérique Centrale',
      'Honduras':'Amérique Centrale','El Salvador':'Amérique Centrale','Nicaragua':'Amérique Centrale',
      'Costa Rica':'Amérique Centrale','Panama':'Amérique Centrale','Cuba':'Amérique Centrale',
      'Haiti':'Amérique Centrale','Dominican Republic':'Amérique Centrale','Jamaica':'Amérique Centrale',
      'Brazil':'Brésil','France':'France',
      'Spain':'Espagne','Portugal':'Espagne',
      'Germany':'Allemagne','Austria':'Allemagne',
      'Belgium':'BeNeLux','Netherlands':'BeNeLux','Luxembourg':'BeNeLux',
      'United Kingdom':'Royaume-Uni','Ireland':'Royaume-Uni',
      'Italy':'Italie','Malta':'Italie',
      'Greece':'Grèce & Balkans','Albania':'Grèce & Balkans','Bosnia and Herzegovina':'Grèce & Balkans',
      'Serbia':'Grèce & Balkans','Montenegro':'Grèce & Balkans','Kosovo':'Grèce & Balkans',
      'North Macedonia':'Grèce & Balkans','Croatia':'Grèce & Balkans','Slovenia':'Grèce & Balkans','Bulgaria':'Grèce & Balkans',
      'Poland':'Visegrad','Czech Republic':'Visegrad','Czechia':'Visegrad','Slovakia':'Visegrad','Hungary':'Visegrad',
      'Sweden':'Scandinavie','Norway':'Scandinavie','Denmark':'Scandinavie','Finland':'Scandinavie','Iceland':'Scandinavie',
      'Ukraine':'Ruthenie','Estonia':'Ruthenie','Latvia':'Ruthenie','Lithuania':'Ruthenie','Romania':'Ruthenie','Moldova':'Ruthenie','Belarus':'Ruthenie',
      'Iraq':'Arabie','Syria':'Arabie','Saudi Arabia':'Arabie','Yemen':'Arabie','Oman':'Arabie',
      'United Arab Emirates':'Arabie','Qatar':'Arabie','Kuwait':'Arabie','Bahrain':'Arabie','Jordan':'Arabie','Lebanon':'Arabie','Israel':'Arabie',
      'Iran':'Perse','Georgia':'Perse','Armenia':'Perse','Azerbaijan':'Perse',
      'Kazakhstan':'Steppes Centrales','Uzbekistan':'Steppes Centrales','Turkmenistan':'Steppes Centrales',
      'Tajikistan':'Steppes Centrales','Kyrgyzstan':'Steppes Centrales','Afghanistan':'Steppes Centrales',
      'Russia':'Russie',
      'China':'Chine','Taiwan':'Chine',
      'Japan':'Japon','South Korea':'Japon','North Korea':'Japon',
      'India':'Inde','Pakistan':'Inde','Bangladesh':'Inde','Sri Lanka':'Inde','Nepal':'Inde','Bhutan':'Inde',
      'Australia':'Océanie','New Zealand':'Océanie','Papua New Guinea':'Océanie',
      'Morocco':'Maghreb','Algeria':'Maghreb','Tunisia':'Maghreb','Libya':'Maghreb','Egypt':'Maghreb','Western Sahara':'Maghreb',
    };
    Object.entries(FB).forEach(([c,z]) => { if (!window.VV.COUNTRY_MAP[c]) window.VV.COUNTRY_MAP[c] = z; });

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
      if (transKeys.includes(zone)) { TRANS_ZONES[zone].territories.push(t); }
      else {
        if (!newZones[zone]) newZones[zone] = { cx: cx[zone]||0, cy: cy[zone]||0, territories:[] };
        newZones[zone].territories.push(t);
      }
    });
    window.VV.ZONES = newZones;

    // Cycle
    const active = cyc.find(r => r.statut?.trim() === 'actif');
    if (active) CYCLE = Number(active.numero);
    const cb = $('cycle-badge');
    if (cb) cb.textContent = `CYCLE ${CYCLE}`;

    // Attaques
    window.VV.attacks = atk
      .filter(r => Number(r.cycle) === CYCLE && r.statut?.trim() === 'déclarée')
      .map(r => ({
        attacker:     r.attaquant.trim(),
        target:       r.cible.trim(),
        territory:    r.territoire_id.trim(),
        capitulation: (r.capitulation || '').trim(),
      }));

    // Restaurer la capitulation du joueur connecté depuis le sheet
    if (me) {
      const myCapRow = window.VV.attacks.find(a => a.attacker === me.id && a.capitulation);
      capitulation = myCapRow ? myCapRow.capitulation : null;
    }

    // Nations
    nations = {};
    nats.filter(r => r.zone).forEach(r => {
      nations[r.zone.trim()] = {
        leader:   (r.leader || '').trim(),
        portrait: (r.portrait_url || '').trim(),
        image:    (r.image_url || '').trim(),
        desc:     (r.description || '').trim(),
        alignX:   parseFloat(r.alignement_x) || 0.5,
        alignY:   parseFloat(r.alignement_y) || 0.5,
        dieu1:    (r.dieu1 || '').trim(),
        dieu2:    (r.dieu2 || '').trim(),
        bio:      (r.leader_bio || '').trim(),
        idees:    [1,2,3,4].map(i => ({
          img:   (r[`idee${i}_img`]   || '').trim(),
          nom:   (r[`idee${i}_nom`]   || '').trim(),
          type:  (r[`idee${i}_type`]  || '').trim(),
          court: (r[`idee${i}_court`] || '').trim(),
          long:  (r[`idee${i}_long`]  || '').trim(),
          effet: (r[`idee${i}_effet`] || '').trim(),
        })).filter(i => i.nom),
      };
    });

    // Exposer nations sur window.VV pour mapmode-influence.js
    window.VV.NATIONS = nations;
    // Exposer aussi sur window pour crisis.js
    window.nations = nations;

    // Situations
    window.VV.situations = situ.filter(r => r.zone && r.type).map(r => ({
      zone:      r.zone.trim(),
      type:      r.type.trim().toLowerCase(),
      intensity: Number(r.intensite) || 1,
      desc:      (r.description || '').trim(),
    }));

    setSyncState('ok', `Sync ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`);
    return true;
  } catch(e) {
    console.error('[VV] loadData:', e);
    setSyncState('error', 'Erreur');
    return false;
  }
}

// ---- HISTORIQUE --------------------------------------------
async function loadHistorique() {
  try {
    const rows = await fetchTab('historique');
    histData = {};
    rows.forEach(r => {
      const c = Number(r.cycle);
      if (!histData[c]) histData[c] = {};
      histData[c][r.territoire_id] = (r.proprietaire || 'neutral').trim();
    });
    console.log('[VV] Historique chargé — cycles:', Object.keys(histData).join(', '));
    return Object.keys(histData).map(Number).sort((a,b) => a-b);
  } catch(e) {
    console.warn('[VV] Historique:', e);
    return [];
  }
}

function enterHistMode(cycle) {
  histMode  = true;
  histCycle = cycle;
  // Remplacer les propriétaires par ceux du snapshot
  const snap = histData[cycle] || {};
  Object.values(window.VV.ZONES).flatMap(z => z.territories).forEach(t => {
    t._ownerReal = t.owner; // backup
    t.owner = snap[t.id] ?? t.owner;
  });
  window.VV.globe.buildDots();
  window.VV.globe.buildBadges();
  // Bandeau mode historique
  showHistBanner(cycle);
  renderRankingPanel();
}

function exitHistMode() {
  if (!histMode) return;
  // Restaurer les propriétaires réels
  Object.values(window.VV.ZONES).flatMap(z => z.territories).forEach(t => {
    if (t._ownerReal !== undefined) { t.owner = t._ownerReal; delete t._ownerReal; }
  });
  histMode = false; histCycle = null;
  window.VV.globe.buildDots();
  window.VV.globe.buildBadges();
  hideHistBanner();
  renderRankingPanel();
  if (me) renderPlayerPanel(); else showPrompt();
}

function showHistBanner(cycle) {
  let banner = document.getElementById('hist-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'hist-banner';
    banner.style.cssText = `
      position:fixed;top:0;left:0;right:0;z-index:500;
      background:linear-gradient(90deg,#1a0a00,#2a1400,#1a0a00);
      border-bottom:1px solid #c87020;
      padding:6px 16px;
      display:flex;align-items:center;justify-content:space-between;
      font-family:Rajdhani,sans-serif;font-size:12px;font-weight:600;letter-spacing:.06em;
      color:#f0b830;
    `;
    document.body.appendChild(banner);
    // Push app down
    document.getElementById('app').style.marginTop = '33px';
  }
  banner.innerHTML = `
    <span>MODE HISTORIQUE — CYCLE ${cycle} (lecture seule)</span>
    <button onclick="exitHistMode()" style="background:#1a0a00;border:1px solid #c87020;border-radius:4px;
      color:#f0b830;padding:3px 10px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:11px;font-weight:600">
      Retour au cycle actuel
    </button>
  `;
  banner.style.display = 'flex';
}

function hideHistBanner() {
  const banner = document.getElementById('hist-banner');
  if (banner) banner.style.display = 'none';
  document.getElementById('app').style.marginTop = '';
}

function openHistModal(cycles) {
  let modal = document.getElementById('modal-hist');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-hist';
    modal.className = 'modal-bg';
    modal.innerHTML = `
      <div class="modal">
        <h2><i class="ti ti-history"></i>Historique des cycles</h2>
        <p style="font-size:10px;color:var(--c-text3);margin-bottom:12px">
          Sélectionnez un cycle pour voir l'état des territoires à cette époque.
        </p>
        <div id="hist-cycles" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px"></div>
        <div class="modal-foot">
          <button class="btn" onclick="document.getElementById('modal-hist').classList.remove('open')">Fermer</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target===modal) modal.classList.remove('open'); });
  }

  const container = document.getElementById('hist-cycles');
  container.innerHTML = cycles.map(c => `
    <button onclick="selectHistCycle(${c})" style="
      padding:8px 14px;border-radius:6px;cursor:pointer;
      font-family:Rajdhani,sans-serif;font-size:13px;font-weight:700;letter-spacing:.06em;
      border:1px solid ${c===CYCLE?'var(--c-accent)':'var(--c-border2)'};
      background:${c===CYCLE?'var(--c-accent2)':'var(--c-bg3)'};
      color:${c===CYCLE?'white':'var(--c-text2)'};
      ${c===CYCLE?'cursor:not-allowed;opacity:.6;':''}
    " ${c===CYCLE?'disabled':''}>
      CYCLE ${c}
    </button>
  `).join('');

  modal.classList.add('open');
}

function selectHistCycle(cycle) {
  document.getElementById('modal-hist')?.classList.remove('open');
  enterHistMode(cycle);
}


// ---- INFLUENCE SOCIETALE -----------------------------------
let pointsData = []; // Toutes les lignes du sheet Points

const INFLUENCE_CRITERIA = [
  { key: null, label: 'Célébrations récurrentes',           icon: '🕯️', desc: 'Fêtes, rituels, célébrations régulières dans la société' },
  { key: null, label: 'Enseignement obligatoire',           icon: '📚', desc: 'Présence dans les cursus scolaires et universitaires' },
  { key: null, label: "Opposition d'autres cultes",        icon: '⚔️', desc: "Capacité à contrer ou affaiblir les cultes rivaux" },
  { key: null, label: 'Intégration politique ou juridique', icon: '⚖️', desc: 'Influence sur les lois et institutions politiques' },
  { key: null, label: 'Présence culturelle massive',        icon: '🎭', desc: "Arts, médias, culture populaire imprégnés de l'influence" },
  { key: null, label: 'Héritage idéologique ou scientifique', icon: '🔬', desc: 'Impact sur la pensée, la science et les idéologies' },
  { key: null, label: 'Utilité concrète pour la population', icon: '🤝', desc: 'Services, aides et bénéfices directs aux fidèles' },
  { key: null, label: 'Transmission familiale et sociale',  icon: '👨‍👩‍👧', desc: 'Transmission de génération en génération dans les familles' },
  { key: null, label: 'Présence matérielle visible',        icon: '🏛️', desc: "Temples, monuments, symboles visibles dans l'espace public" },
  { key: null, label: 'Peur ou menace associée',            icon: '⚡', desc: 'Crainte inspirée, influence par la menace ou le respect' },
];

async function loadPointsData() {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${CFG.SHEET_ID}/gviz/tq?tqx=out:json&gid=${CFG.GIDS.points}`;
    const r = await fetch(url);
    const raw = await r.text();
    const m = raw.match(/setResponse\(([\s\S]*)\)/);
    if (!m) return;
    const data = JSON.parse(m[1]);
    const cols = data.table.cols.map(c => (c.label||'').trim());
    const rows = data.table.rows || [];
    pointsData = rows.map(r => Object.fromEntries(cols.map((col,i) => [col, String(r?.c?.[i]?.v??'').trim()])));
    // Map criteria to column keys from AG onwards
    const agCols = cols.slice(32); // AG = index 32
    INFLUENCE_CRITERIA.forEach((c, i) => { c.key = agCols[i] || null; });
    console.log('[VV] Points chargés:', pointsData.length, 'divinités, critères:', agCols.slice(0,10));
  } catch(e) {
    console.warn('[VV] Points:', e);
  }
}

function openInfluenceModal(deityId) {
  const d = getD(deityId);
  const faction = getFaction(deityId);
  const row = pointsData.find(r => (r.id||r.ID||Object.values(r)[0])?.toLowerCase() === deityId.toLowerCase()) || {};

  // Get scores
  const scores = INFLUENCE_CRITERIA.map(c => ({
    ...c,
    val: Number(row[c.key] || 0),
  }));
  const total = scores.reduce((s, c) => s + c.val, 0);
  const maxScore = 20;
  const pct = Math.round(total / maxScore * 100);
  const scoreColor = total >= 16 ? '#f0c060' : total >= 12 ? '#c8901a' : total >= 6 ? '#3a7acc' : '#cc3030';
  const scoreLabel = total >= 16 ? 'Dominant' : total >= 12 ? 'Majeur' : total >= 6 ? 'Émergent' : 'Marginal';

  // Radar points (10 criteria in a circle)
  const radarSize = 120;
  const cx = radarSize, cy = radarSize;
  const maxR = 90;
  const radarPoints = scores.map((s, i) => {
    const angle = (i / scores.length) * Math.PI * 2 - Math.PI / 2;
    const r = (s.val / 2) * maxR;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), lx: cx + (maxR + 18) * Math.cos(angle), ly: cy + (maxR + 18) * Math.sin(angle) };
  });
  const radarPath = radarPoints.map((p, i) => `${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';
  const gridPath = [1,2].map(g => {
    const r = (g/2) * maxR;
    return scores.map((_, i) => {
      const angle = (i / scores.length) * Math.PI * 2 - Math.PI / 2;
      return `${i===0?'M':'L'}${(cx + r*Math.cos(angle)).toFixed(1)},${(cy + r*Math.sin(angle)).toFixed(1)}`;
    }).join(' ') + ' Z';
  }).join(' ');
  const gridLines = scores.map((_, i) => {
    const angle = (i / scores.length) * Math.PI * 2 - Math.PI / 2;
    return `<line x1="${cx}" y1="${cy}" x2="${(cx + maxR*Math.cos(angle)).toFixed(1)}" y2="${(cy + maxR*Math.sin(angle)).toFixed(1)}" stroke="#1a2e4a" stroke-width=".8"/>`;
  }).join('');

  let modal = document.getElementById('modal-influence');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-influence';
    modal.className = 'modal-bg';
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
  }

  modal.innerHTML = `
    <div style="
      background:linear-gradient(160deg,#04080f,#060d1a,#08101e);
      border:1px solid ${d.color}44;
      border-radius:12px;
      width:700px;max-width:95vw;max-height:90vh;
      overflow-y:auto;
      box-shadow:0 0 40px ${d.color}22,0 24px 60px rgba(0,0,0,.8);
      font-family:'Rajdhani',sans-serif;
      position:relative;
    ">
      <!-- Ligne déco -->
      <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,${d.color},transparent);border-radius:12px 12px 0 0"></div>

      <!-- HEADER -->
      <div style="padding:18px 22px 14px;border-bottom:1px solid #1a2e4a;display:flex;align-items:center;gap:14px">
        <div style="width:44px;height:44px;border-radius:50%;overflow:hidden;border:2px solid ${d.color}66;background:#0d2040;flex-shrink:0;display:flex;align-items:center;justify-content:center">
          ${d.avatar?`<img src="${d.avatar}" style="width:100%;height:100%;object-fit:cover">`:`<span style="font-size:14px;font-weight:700;color:${d.color}">${d.name.slice(0,2).toUpperCase()}</span>`}
        </div>
        <div>
          <div style="font-size:16px;font-weight:700;color:#cfe4f7;letter-spacing:.06em">${d.name}</div>
          <div style="font-size:10px;color:${faction?.color||'#6a8aaa'};letter-spacing:.08em;text-transform:uppercase">${faction?.name||''} · Influence Sociétale</div>
        </div>
        <div style="margin-left:auto;text-align:right">
          <div style="font-size:28px;font-weight:700;color:${scoreColor};line-height:1">${total}<span style="font-size:14px;color:#3a5a7a">/${maxScore}</span></div>
          <div style="font-size:10px;font-weight:700;color:${scoreColor};letter-spacing:.08em;text-transform:uppercase">${scoreLabel}</div>
        </div>
        <button onclick="document.getElementById('modal-influence').classList.remove('open')"
          style="background:none;border:1px solid #1a2e4a;border-radius:6px;color:#6a8aaa;padding:5px 10px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:11px;margin-left:10px">✕</button>
      </div>

      <!-- JAUGE GLOBALE -->
      <div style="padding:14px 22px;border-bottom:1px solid #1a2e4a;background:#040810">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="font-size:10px;font-weight:700;letter-spacing:.1em;color:#3a5a7a;text-transform:uppercase;white-space:nowrap">Emprise sur la société</div>
          <div style="flex:1;height:10px;background:#0a1628;border-radius:5px;border:1px solid #1a2e4a;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,${d.color},${scoreColor});border-radius:5px;transition:width .6s ease;position:relative">
              <div style="position:absolute;right:0;top:0;bottom:0;width:20px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.25));border-radius:0 5px 5px 0"></div>
            </div>
          </div>
          <div style="font-size:13px;font-weight:700;color:${scoreColor};white-space:nowrap">${pct}%</div>
        </div>
      </div>

      <!-- CORPS : CRITÈRES + RADAR -->
      <div style="display:grid;grid-template-columns:1fr 260px;gap:0;padding:0">

        <!-- CRITÈRES -->
        <div style="padding:16px 22px;border-right:1px solid #1a2e4a">
          <div style="font-size:10px;font-weight:700;letter-spacing:.1em;color:#3a5a7a;text-transform:uppercase;margin-bottom:12px">Critères d'influence</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${scores.map(s => {
              const dotColor = s.val === 2 ? '#f0c060' : s.val === 1 ? d.color : '#1a2e4a';
              const bgColor  = s.val === 2 ? '#f0c06012' : s.val === 1 ? d.color+'0e' : 'transparent';
              const label    = s.val === 2 ? 'STRONGHOLD' : s.val === 1 ? 'PRÉSENT' : 'ABSENT';
              const lColor   = s.val === 2 ? '#f0c060' : s.val === 1 ? d.color : '#1a2e4a';
              return `<div style="display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:6px;border:1px solid ${s.val>0?dotColor+'33':'#0d1828'};background:${bgColor}">
                <span style="font-size:16px;flex-shrink:0">${s.icon}</span>
                <div style="flex:1;min-width:0">
                  <div style="font-size:12px;font-weight:600;color:${s.val>0?'#cfe4f7':'#2a4a6a'}">${s.label}</div>
                  <div style="font-size:9px;color:#2a4a6a;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.desc}</div>
                </div>
                <div style="display:flex;gap:4px;align-items:center;flex-shrink:0">
                  <div style="width:9px;height:9px;border-radius:50%;background:${s.val>=1?dotColor:'#0a1628'};border:1px solid ${s.val>=1?dotColor:'#1a2e4a'};box-shadow:${s.val>=1?'0 0 4px '+dotColor+'88':'none'}"></div>
                  <div style="width:9px;height:9px;border-radius:50%;background:${s.val>=2?dotColor:'#0a1628'};border:1px solid ${s.val>=2?dotColor:'#1a2e4a'};box-shadow:${s.val>=2?'0 0 4px '+dotColor+'88':'none'}"></div>
                </div>
                <div style="font-size:8px;font-weight:700;letter-spacing:.06em;color:${lColor};width:62px;text-align:right">${label}</div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <!-- RADAR -->
        <div style="padding:16px;display:flex;flex-direction:column;align-items:center;gap:12px">
          <div style="font-size:10px;font-weight:700;letter-spacing:.1em;color:#3a5a7a;text-transform:uppercase">Profil d'influence</div>
          <svg viewBox="0 0 ${radarSize*2} ${radarSize*2}" style="width:220px;height:220px" xmlns="http://www.w3.org/2000/svg">
            <!-- Grille -->
            <path d="${gridPath}" fill="none" stroke="#1a2e4a" stroke-width=".8" opacity=".6"/>
            ${gridLines}
            <!-- Zone remplie -->
            <path d="${radarPath}" fill="${d.color}33" stroke="${d.color}" stroke-width="1.5" stroke-linejoin="round"/>
            <!-- Points -->
            ${radarPoints.map((p,i) => scores[i].val > 0 ? `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="${scores[i].val===2?'#f0c060':d.color}" stroke="#04080f" stroke-width="1"/>` : '').join('')}
            <!-- Icônes au bord -->
            ${radarPoints.map((p,i) => `<text x="${p.lx.toFixed(1)}" y="${p.ly.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="12">${scores[i].icon}</text>`).join('')}
          </svg>
          <!-- Légende niveaux -->
          <div style="display:flex;flex-direction:column;gap:6px;width:100%">
            ${[{v:2,label:'Stronghold',color:'#f0c060'},{v:1,label:'Présent',color:d.color},{v:0,label:'Absent',color:'#1a2e4a'}].map(l=>`
              <div style="display:flex;align-items:center;gap:8px">
                <div style="display:flex;gap:3px">
                  <div style="width:8px;height:8px;border-radius:50%;background:${l.v>=1?l.color:'#0a1628'};border:1px solid ${l.color}"></div>
                  <div style="width:8px;height:8px;border-radius:50%;background:${l.v>=2?l.color:'#0a1628'};border:1px solid ${l.color}"></div>
                </div>
                <span style="font-size:10px;font-weight:600;color:${l.color};letter-spacing:.06em">${l.label}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
  modal.classList.add('open');
}

// ---- APPS SCRIPT -------------------------------------------
async function postScript(payload) {
  try {
    const params = new URLSearchParams({ data: JSON.stringify(payload) });
    const r = await fetch(CFG.APPS_SCRIPT + '?' + params, { method:'GET' });
    const text = await r.text();
    const d = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text);
    if (!d.success) throw new Error(d.error || 'Erreur inconnue');
    return { ok:true };
  } catch(e) {
    return { ok:false, error:e.message };
  }
}

// ---- RANKING PANEL -----------------------------------------
function renderRankingPanel() {
  const el = $('ranking-panel');
  if (!el) return;
  const maxPI = Math.max(...Object.values(window.VV.ZONES).map(z => z.territories.reduce((s,t) => s+(t.pi||1),0)), 1);
  const sorted = Object.entries(window.VV.ZONES).map(([name,zd]) => {
    const pi = zd.territories.reduce((s,t) => s+(t.pi||1),0);
    const n  = nations[name] || {};
    return { name, pi, image:n.image||'', leader:n.leader||'' };
  }).sort((a,b) => b.pi - a.pi);

  el.innerHTML = `<div class="ranking-header"><i class="ti ti-trophy"></i> Nations</div>` +
    sorted.map((z,i) => `
      <div class="ranking-item${selZone===z.name?' active':''}" data-zone="${z.name}">
        <div class="ranking-rank">${i+1}</div>
        <div class="ranking-img" style="${z.image?`background-image:url('${z.image}')`:'background:var(--c-bg3)'}">
          ${!z.image?`<i class="ti ti-map" style="font-size:13px;color:var(--c-text4)"></i>`:''}
        </div>
        <div class="ranking-info">
          <div class="ranking-name">${z.name}</div>
          <div class="ranking-pi">${z.pi} PI</div>
          <div class="ranking-pi-bar"><div class="ranking-pi-fill" style="width:${Math.round(z.pi/maxPI*100)}%"></div></div>
        </div>
      </div>
    `).join('');

  el.querySelectorAll('.ranking-item').forEach(item =>
    item.addEventListener('click', () => {
      window.VV.onZoneClick(item.dataset.zone);
    })
  );
}

// ---- DOCK --------------------------------------------------
function renderDock(filterFaction = null) {
  const dock = $('dock');
  if (!dock) return;
  const attackersOnMe = me ? [...new Set(window.VV.attacks.filter(a => a.target===me.id).map(a=>a.attacker))] : [];

  let html = '';
  FACTION_ORDER.forEach((fkey, fi) => {
    const faction = FACTIONS[fkey];
    let deities = window.VV.DEITIES.filter(d => faction.members.includes(d.id));
    if (filterFaction && faction.name !== filterFaction) deities = [];
    if (!deities.length) return;
    if (fi > 0) html += `<div class="dock-sep"></div>`;
    html += deities.map(d => {
      const n = atkOn(d.id);
      const locked = n >= 2 && (!me || d.id !== me.id);
      const isActive = selDeity === d.id;
      const isAtkMe = attackersOnMe.includes(d.id);
      const fc = faction.color;
      return `<div class="dchip${isActive?' active':''}${locked?' locked':''}${isAtkMe?' attacking-me':''}"
        data-id="${d.id}" title="${d.name} · ${d.pi}PI · ${faction.name}">
        ${n>0 ? `<div class="abadge">${n}</div>` : ''}
        ${isAtkMe ? `<div class="alert-badge">!</div>` : ''}
        <div class="av" style="border-color:${isActive?fc:'transparent'}">
          ${d.avatar?`<img src="${d.avatar}" alt="${d.name}" class="av-avatar" onerror="this.style.display='none'">`:''}
          ${d.logo?`<img src="${d.logo}" alt="${d.name}" class="av-logo" onerror="this.style.display='none'">`:''}
          ${!d.avatar?`<span class="av-initials" style="color:${fc}">${d.name.slice(0,2).toUpperCase()}</span>`:''}
        </div>
        <div class="dn" style="color:${isActive?fc:'var(--c-text2)'}">${d.name}</div>
        <div class="dp" style="color:${fc}88">${faction.name}</div>
      </div>`;
    }).join('');
  });

  dock.innerHTML = html;
  dock.querySelectorAll('.dchip:not(.locked)').forEach(el =>
    el.addEventListener('click', () => selectDeity(el.dataset.id))
  );
}

function selectDeity(id) {
  if (atkOn(id) >= 2 && me && id !== me.id) return;
  selDeity = id; selZone = null; selTrans = null;
  window.VV.globe.highlightZone(null);
  document.querySelectorAll('.tchip').forEach(c => c.classList.remove('active'));
  renderDock();
  if (me && id === me.id) { renderPlayerPanel(); return; }
  renderDeityPanel(getD(id));
}

// ---- PANELS ------------------------------------------------
function setPanel(html) { const p=$('panel-inner'); if(p) p.innerHTML=html; }

function renderDeityPanel(d) {
  const myT = allT().filter(t => t.owner===d.id);
  const n   = atkOn(d.id);
  const canA = me && d.id!==me.id && myAtks().length<2 && n<2;
  const faction = getFaction(d.id);

  setPanel(`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <div class="d-avatar" style="background:${d.color}20;border-color:${d.color}55;color:${d.color}">
        ${d.avatar?`<img src="${d.avatar}" alt="${d.name}">`:''}
        ${!d.avatar?d.name.slice(0,2).toUpperCase():''}
      </div>
      <div>
        <div style="font-family:Rajdhani,sans-serif;font-size:15px;font-weight:700;color:var(--c-text1)">${d.name}</div>
        <div style="font-size:10px;color:${faction?faction.color:'var(--c-text3)'}">${faction?.name||''}</div>
        <div style="font-size:10px;color:var(--c-text3)">${d.player?d.player+' · ':''}${d.pi}PI · ${myT.length} territoires</div>
      </div>
    </div>
    <div class="info-row"><span class="ik">Attaques reçues</span><span class="iv" style="color:${n>0?'var(--c-danger)':'var(--c-text1)'}">${n}/2</span></div>
    ${n>=2?`<div class="notif notif-warn" style="margin-top:6px">Verrouillé — 2 attaques reçues</div>`:''}
    <button class="btn btn-info btn-full" style="margin-top:10px" onclick="openDeityHub('${d.id}')"><i class="ti ti-chart-donut"></i> Tableau de bord</button>
    ${canA?`<button class="btn btn-danger btn-full" style="margin-top:6px" id="panel-atk-btn"><i class="ti ti-sword"></i> Déclarer une attaque</button>`:''}
    ${!me?`<div style="font-size:10px;color:var(--c-text4);text-align:center;margin-top:10px">Connectez-vous pour interagir</div>`:''}
    <div class="divider"></div>
    <div class="sec">Territoires (${myT.length})</div>
    ${myT.map(t=>`<div class="hentry">
      <span class="tag ${t.type==='city'?'tag-city':'tag-org'}">${t.type==='city'?'V':'O'}</span>
      ${t.name}
      ${t.pi>1?`<span style="color:var(--c-text3);font-size:9px;margin-left:auto">×${t.pi}</span>`:''}
    </div>`).join('')}
  `);
  if (canA) $('panel-atk-btn')?.addEventListener('click', () => openAtkModal(d.id));
}

function renderTransPanel(key) {
  const z = TRANS_ZONES[key];
  if (!z) return;
  setPanel(`
    <div style="display:flex;align-items:center;gap:9px;margin-bottom:12px">
      <span style="font-size:24px">${z.icon}</span>
      <div>
        <div style="font-family:Rajdhani,sans-serif;font-size:15px;font-weight:700;color:var(--c-text1)">${z.name}</div>
        <div style="font-size:10px;color:var(--c-text3)">${z.territories.length} points d'influence</div>
      </div>
    </div>
    <div class="divider"></div>
    ${z.territories.map(t => terrCard(t)).join('')}
  `);
  bindTerrButtons();
}

function renderZonePanel(zoneName) {
  selZone = zoneName;
  const data   = window.VV.ZONES[zoneName];
  const nation = nations[zoneName] || {};

  if (!data || data.territories.length===0) {
    setPanel(`<button class="back-btn" id="back-btn"><i class="ti ti-arrow-left"></i> Vue globale</button>
      <div style="font-size:11px;color:var(--c-text4);text-align:center;margin-top:20px">Aucun point d'influence ici</div>`);
    $('back-btn')?.addEventListener('click', clearZone);
    return;
  }

  const totalPI = data.territories.reduce((s,t) => s+(t.pi||1), 0);
  const d1 = nation.dieu1 ? getD(nation.dieu1) : null;
  const d2 = nation.dieu2 ? getD(nation.dieu2) : null;

  const nationHTML = `
    <div class="nation-header">
      <div class="nation-banner-wrap">
        ${nation.image?`<div class="nation-banner" style="background-image:url('${nation.image}')"></div>`:''}
        <div class="nation-identity">
          ${nation.portrait?`
            <div class="nation-leader-portrait${nation.leader?' clickable-leader':''}"
              ${nation.leader?`onclick="openLeaderModal('${zoneName}')" title="Voir le profil de ${nation.leader}"`:''}
            >
              <img src="${nation.portrait}" alt="${nation.leader}">
              ${nation.leader?`<div class="leader-hover-overlay"><i class="ti ti-user-circle"></i></div>`:''}
            </div>`
          :''}
          <div class="nation-meta">
            <div class="nation-name">${zoneName}</div>
            ${nation.leader?`<div class="nation-leader-name">${nation.leader}</div>`:''}
          </div>
        </div>
        ${nation.desc?`<div class="nation-desc">${nation.desc}</div>`:''}
        <div class="nation-pi-total">${totalPI} PI · ${data.territories.length} territoires</div>
      </div>
      <div class="nation-bottom-row">
        <div class="nation-align-row">
          <div class="nation-triangle-wrap">
            ${renderAlignTriangle(nation.alignX??0.5, nation.alignY??0.5)}
          </div>
          <div class="nation-gods-col">
            <div style="font-size:9px;color:var(--c-text3);font-family:Rajdhani,sans-serif;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px">Influences</div>
            ${d1?`<div class="nation-god-chip" title="${d1.name}" style="border-color:${d1.color}55;margin-bottom:5px">
              ${d1.logo?`<img src="${d1.logo}" alt="${d1.name}">`:`<span style="color:${d1.color};font-family:Rajdhani,sans-serif;font-size:11px;font-weight:700">${d1.name.slice(0,2).toUpperCase()}</span>`}
              <span style="font-size:10px;color:${d1.color};font-family:Rajdhani,sans-serif;font-weight:600;margin-left:5px">${d1.name}</span>
            </div>`:''}
            ${d2?`<div class="nation-god-chip" title="${d2.name}" style="border-color:${d2.color}55">
              ${d2.logo?`<img src="${d2.logo}" alt="${d2.name}">`:`<span style="color:${d2.color};font-family:Rajdhani,sans-serif;font-size:11px;font-weight:700">${d2.name.slice(0,2).toUpperCase()}</span>`}
              <span style="font-size:10px;color:${d2.color};font-family:Rajdhani,sans-serif;font-weight:600;margin-left:5px">${d2.name}</span>
            </div>`:''}
          </div>
        </div>
      </div>
    </div>
    \${(() => {
      const idees = nation.idees || [];
      const TYPE_COLOR = { bonus: '#2a9a4a', malus: '#cc3030', neutre: '#3a7acc' };
      const PENTAGON = 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)';
      const slots = [0,1,2,3].map(i => {
        const id = idees[i];
        const col = id ? (TYPE_COLOR[id.type] || '#3a5a7a') : '#1a2e4a';
        if (!id) return \`<div style="display:flex;flex-direction:column;align-items:center;gap:4px">
          <div style="width:48px;height:48px;clip-path:\${PENTAGON};background:#0a1422;display:flex;align-items:center;justify-content:center">
            <span style="font-size:13px;opacity:.2;color:#3a5a7a">?</span>
          </div>
          <div style="font-size:8px;color:#1a2e4a;font-family:Rajdhani,sans-serif">Vide</div>
        </div>\`;
        return \`<div style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer"
          onclick="(function(el){const d=el.nextElementSibling;d.style.display=d.style.display==='none'?'block':'none'})(this)"
          title="\${id.nom}">
          <div style="width:48px;height:48px;clip-path:\${PENTAGON};background:\${col}55;display:flex;align-items:center;justify-content:center">
            \${id.img?\`<img src="\${id.img}" style="width:38px;height:38px;object-fit:cover;clip-path:\${PENTAGON}" onerror="this.style.display='none'">\`:\`<span style="font-size:18px">\${id.type==='bonus'?'★':id.type==='malus'?'✕':'○'}</span>\`}
          </div>
          <div style="font-size:8px;color:\${col};font-family:Rajdhani,sans-serif;text-align:center;max-width:52px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">\${id.nom}</div>
        </div>
        <div style="display:none;grid-column:1/-1;padding:7px 9px;border-radius:var(--radius);border:1px solid \${col}33;background:\${col}0a;font-size:10px;color:var(--c-text2);line-height:1.6;margin-top:2px">
          <div style="font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;color:\${col};margin-bottom:3px">\${id.nom}</div>
          \${id.court?\`<div>\${id.court}</div>\`:''}
          \${id.effet?\`<div style="color:\${col};margin-top:2px">▲ \${id.effet}</div>\`:''}
        </div>\`;
      }).join('');
      return \`<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--c-border)">
        <div class="sec" style="margin-bottom:8px"><i class="ti ti-star"></i> Idées nationales</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">\${slots}</div>
      </div>\`;
    })()}`;


  const ideesHTML = window.VV.renderIdeesHTML ? window.VV.renderIdeesHTML(nation.idees) : '';

  setPanel(`
    <button class="back-btn" id="back-btn"><i class="ti ti-arrow-left"></i> Vue globale</button>
    ${nationHTML}
    ${ideesHTML}
    <div class="sec">${zoneName.toUpperCase()} · ${data.territories.length} TERRITOIRE${data.territories.length>1?'S':''}</div>
    ${data.territories.map(t => terrCard(t)).join('')}
  `);

  $('back-btn')?.addEventListener('click', clearZone);
  bindTerrButtons();
  renderRankingPanel();
}

function renderAlignTriangle(ax=0.5, ay=0.5) {
  const W=130, H=112;
  const top=[W/2,7], left=[6,H-6], right=[W-6,H-6];
  const wO=1-ay, wS=ay*(1-ax), wSh=ay*ax;
  const px=Math.max(12,Math.min(W-12, top[0]*wO+left[0]*wS+right[0]*wSh));
  const py=Math.max(12,Math.min(H-12, top[1]*wO+left[1]*wS+right[1]*wSh));
  const pts=`${top[0]},${top[1]} ${left[0]},${left[1]} ${right[0]},${right[1]}`;
  return `<svg class="align-triangle" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
    <defs>
      <clipPath id="tc"><polygon points="${pts}"/></clipPath>
      <radialGradient id="gO" cx="${top[0]/W}" cy="${top[1]/H}" r="0.85" gradientUnits="objectBoundingBox">
        <stop offset="0%" stop-color="#c8901a" stop-opacity=".9"/><stop offset="100%" stop-color="#c8901a" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="gS" cx="${left[0]/W}" cy="${left[1]/H}" r="0.85" gradientUnits="objectBoundingBox">
        <stop offset="0%" stop-color="#3a7acc" stop-opacity=".9"/><stop offset="100%" stop-color="#3a7acc" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="gSh" cx="${right[0]/W}" cy="${right[1]/H}" r="0.85" gradientUnits="objectBoundingBox">
        <stop offset="0%" stop-color="#b02828" stop-opacity=".9"/><stop offset="100%" stop-color="#b02828" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <polygon points="${pts}" fill="#06101e" stroke="#1e3048" stroke-width="1"/>
    <polygon points="${pts}" fill="url(#gO)" clip-path="url(#tc)"/>
    <polygon points="${pts}" fill="url(#gS)" clip-path="url(#tc)"/>
    <polygon points="${pts}" fill="url(#gSh)" clip-path="url(#tc)"/>
    <text x="${top[0]}" y="${top[1]-4}" text-anchor="middle" font-size="9" fill="#c8901a" font-family="Rajdhani,sans-serif" font-weight="700">Olympiens</text>
    <text x="${left[0]-2}" y="${left[1]+10}" text-anchor="start" font-size="8" fill="#3a7acc" font-family="Rajdhani,sans-serif" font-weight="700">Sovereign</text>
    <text x="${right[0]+2}" y="${right[1]+10}" text-anchor="end" font-size="8" fill="#b02828" font-family="Rajdhani,sans-serif" font-weight="700">Shemning</text>
    <circle cx="${px}" cy="${py}" r="4.5" fill="white" stroke="#050b14" stroke-width="1.5" opacity=".95" style="filter:drop-shadow(0 0 4px rgba(255,255,255,.8))"/>
  </svg>`;
}

function terrCard(t) {
  const owner   = t.owner && t.owner!==N ? getD(t.owner) : null;
  const isAtked = window.VV.attacks.some(a => a.territory===t.id);
  const capAtk  = window.VV.attacks.find(a => a.capitulation && a.capitulation === t.id);
  const myCapAtk = me ? window.VV.attacks.find(a => a.attacker===me.id && a.capitulation) : null;
  const capTerr  = myCapAtk ? myCapAtk.capitulation : (capitulation || null);
  const isCap    = capTerr === t.id || (capAtk && me && capAtk.attacker === me.id);
  const isMyT   = me && t.owner===me.id;
  const canA    = me && owner && owner.id!==me.id && myAtks().length<2 && atkOn(owner.id)<2;
  const dc      = window.VV.dotColor(t);

  const shatterOverlay = (capTerr === t.id) ? `<div class="shatter-overlay">
    <img src="https://i.imgur.com/Arc20Xl.png" style="width:100%;height:100%;object-fit:cover;mix-blend-mode:screen;opacity:.85">
  </div>` : '';

  if (t.type==='city') {
    return `<div class="terr-card${isAtked?' under-attack':''}${isCap?' capitulated':''}">
      <div style="position:relative">
      ${t.img?`<img class="terr-img" src="${t.img}" alt="${t.name}" loading="lazy">`
        :`<div class="terr-ph" style="background:${dc}14;border-bottom:2px solid ${dc}33"><i class="ti ti-building-skyscraper" style="color:${dc};font-size:22px"></i></div>`}
      ${shatterOverlay}
      </div>
      <div class="terr-body">
        <div class="terr-row">
          <div style="display:flex;align-items:center;gap:5px;min-width:0">
            <div class="dot" style="background:${dc};box-shadow:0 0 4px ${dc}88"></div>
            <span class="terr-name">${t.name}</span>
            <span class="tag tag-city">VILLE</span>
            ${t.pi>1?`<span class="pi-badge">×${t.pi}</span>`:''}
          </div>
          ${canA?`<button class="atk-btn" data-owner="${owner.id}" data-terr="${t.id}"><i class="ti ti-sword"></i> ATK</button>`:''}
        </div>
        <div class="terr-owner" style="color:${owner?owner.color:'var(--c-text3)'}">${owner?owner.name:'Neutre'}</div>
        ${isAtked&&!isCap?`<div class="terr-status" style="color:${isMyT?'var(--c-info)':'var(--c-warn)'}">${isMyT?'Défense auto':'Sous attaque'}</div>`:''}
        ${isCap?`<div class="terr-status" style="color:var(--c-danger)">Capitulation</div>`:''}
      </div>
    </div>`;
  }

  if (t.img) {
    return `<div class="terr-card${isAtked?' under-attack':''}" style="border-color:${dc}33">
      <img class="terr-img" src="${t.img}" alt="${t.name}" loading="lazy">
      <div class="terr-body">
        <div class="terr-row">
          <div style="display:flex;align-items:center;gap:5px;min-width:0">
            <div class="dot" style="background:${dc};clip-path:polygon(50% 0%,100% 50%,50% 100%,0% 50%)"></div>
            <span class="terr-name">${t.name}</span>
            <span class="tag tag-org">ORG.</span>
            ${t.pi>1?`<span class="pi-badge">×${t.pi}</span>`:''}
          </div>
          ${canA?`<button class="atk-btn" data-owner="${owner.id}" data-terr="${t.id}"><i class="ti ti-sword"></i> ATK</button>`:''}
        </div>
        <div class="terr-owner" style="color:${owner?owner.color:'var(--c-text3)'}">${owner?owner.name:'Neutre'}</div>
        ${isAtked&&!isCap?`<div class="terr-status" style="color:${isMyT?'var(--c-info)':'var(--c-warn)'}">${isMyT?'Défense auto':'Sous attaque'}</div>`:''}
        ${isCap?`<div class="terr-status" style="color:var(--c-danger)">Capitulation</div>`:''}
      </div>
    </div>`;
  }

  const orgShatter = (capTerr === t.id) ? `
    <div style="position:absolute;inset:0;pointer-events:none;z-index:2;overflow:hidden;border-radius:6px">
      <img src="https://i.imgur.com/Arc20Xl.png" style="width:100%;height:100%;object-fit:cover;mix-blend-mode:screen;opacity:.85">
    </div>` : '';

  return `<div class="org-chip${capTerr===t.id?' capitulated':''}" style="border-color:${capTerr===t.id?'var(--c-danger)':dc+'33'};position:relative;overflow:hidden">
    ${orgShatter}
    <div class="org-dot" style="background:${dc};box-shadow:0 0 4px ${dc}99"></div>
    <div style="flex:1;min-width:0">
      <div class="org-name">${t.name}${t.pi>1?` <span class="org-pi">×${t.pi}PI</span>`:''}</div>
      <div class="org-owner" style="color:${owner?owner.color:'var(--c-text3)'}">${owner?owner.name:'Neutre'}</div>
      ${isAtked&&!(capTerr===t.id)?`<div class="terr-status" style="color:${isMyT?'var(--c-info)':'var(--c-warn)'};font-size:9px">${isMyT?'Défense auto':'Sous attaque'}</div>`:''}
      ${capTerr===t.id?`<div class="terr-status" style="color:var(--c-danger);font-size:9px">⚑ Capitulation</div>`:''}
    </div>
    ${canA?`<button class="atk-btn" data-owner="${owner.id}" data-terr="${t.id}"><i class="ti ti-sword"></i> ATK</button>`:''}
  </div>`;
}

function bindTerrButtons() {
  document.querySelectorAll('.atk-btn[data-owner]').forEach(btn =>
    btn.addEventListener('click', () => openAtkModalDirect(btn.dataset.owner, btn.dataset.terr))
  );
}

function getDeityPoints(deityId) {
  const row = pointsData.find(r => {
    const firstVal = Object.values(r)[0];
    return firstVal?.toLowerCase?.() === deityId.toLowerCase();
  }) || {};
  return {
    territoire:   Number(row['Territoire']  || row['territoire']  || 0),
    organisation: Number(row['Organisation'] || row['organisation'] || 0),
    societal:     Number(row['Sociétal']    || row['societal']    || row['Societal'] || 0),
  };
}

function renderPlayerPanel() {
  if (!me) return;
  const myT      = allT().filter(t => t.owner===me.id);
  const atks     = myAtks();
  const incoming = window.VV.attacks.filter(a => a.target===me.id);
  const atkdT    = Object.values(window.VV.ZONES).flatMap(z=>z.territories).filter(t=>t.owner===me.id&&incoming.some(a=>a.territory===t.id));
  const needCap  = incoming.length>=2 && atks.length>=2 && !capitulation;
  const autoDef  = incoming.length>0 && !(incoming.length>=2 && atks.length>=2);
  const faction  = getFaction(me.id);

  setPanel(`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <div class="d-avatar" style="background:${me.color}20;border-color:${me.color}55;color:${me.color}">
        ${me.avatar?`<img src="${me.avatar}" alt="${me.name}">`:''}
        ${!me.avatar?me.name.slice(0,2).toUpperCase():''}
      </div>
      <div>
        <div style="font-family:Rajdhani,sans-serif;font-size:15px;font-weight:700;color:var(--c-text1)">${me.name}</div>
        <div style="font-size:10px;color:${faction?faction.color:'var(--c-text3)'}">${faction?.name||''}</div>
        <div style="font-size:10px;color:var(--c-text3)">${me.pi}PI · ${myT.length} territoire${myT.length>1?'s':''}</div>
        <button class="btn btn-info" style="margin-top:5px;font-size:10px;padding:3px 8px" onclick="openDeityHub('${me.id}')"><i class="ti ti-chart-donut"></i> Mon tableau de bord</button>
      </div>
    </div>

    ${(() => {
      const pts = getDeityPoints(me.id);
      const total = pts.territoire + pts.organisation + pts.societal;
      const maxVal = Math.max(pts.territoire, pts.organisation, pts.societal, 1);
      const bars = [
        { label:'Territoires',   icon:'ti-map-pin', val:pts.territoire,   color:'#3a7acc' },
        { label:'Organisations', icon:'ti-building', val:pts.organisation, color:'#c8901a' },
        { label:'Sociétal',      icon:'ti-users',    val:pts.societal,     color:'#2a9a4a' },
      ];
      return `<div style="background:var(--c-bg2);border:1px solid var(--c-border);border-radius:var(--radius);padding:10px 12px;margin-bottom:10px">
        <div style="font-family:Rajdhani,sans-serif;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--c-text3);margin-bottom:10px;display:flex;align-items:center;justify-content:space-between">
          <span><i class="ti ti-chart-bar" style="margin-right:4px"></i>Décomposition des points</span>
          <span style="color:var(--c-text1);font-size:13px">${total} PI total</span>
        </div>
        ${bars.map(b => `
          <div style="margin-bottom:8px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px">
              <div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--c-text2)">
                <i class="ti ${b.icon}" style="font-size:12px;color:${b.color}"></i>
                ${b.label}
              </div>
              <span style="font-size:12px;font-weight:600;color:${b.color}">${b.val} PI</span>
            </div>
            <div style="height:5px;background:var(--c-bg);border-radius:3px;overflow:hidden;border:1px solid var(--c-border)">
              <div style="height:100%;width:${Math.round(b.val/maxVal*100)}%;background:${b.color};border-radius:3px;transition:width .4s ease"></div>
            </div>
          </div>
        `).join('')}
      </div>`;
    })()}

    ${needCap?`<div class="notif notif-warn"><b>Choix requis !</b> Sélectionnez le territoire à capituler.</div>`:''}
    ${autoDef?`<div class="notif notif-info">Défense automatique active</div>`:''}

    <div class="sec">Mes attaques (${atks.length}/2)</div>
    ${[0,1].map(i => {
      const a = atks[i];
      return `<div class="slot${a?' atk':''}">
        ${a?`<div class="slot-text atk">
          <i class="ti ti-${a.territory?.startsWith('scene_')?'masks-theater':'sword'}"></i>
          ${getD(a.target).name}${a.territory?.startsWith('scene_')?' — Scène RP':' — '+(getT(a.territory)?.name||a.territory)}
        </div>
             <button class="xbtn" data-idx="${i}"><i class="ti ti-x"></i></button>`
          :`<span class="slot-text">${i===0?'Sélectionner une divinité ennemie':'Slot 2 optionnel'}</span>`}
      </div>`;
    }).join('')}

    ${needCap?`<div class="divider"></div><div class="sec">Territoire à capituler</div>
      ${atkdT.map(t=>{
        const isChosen = capitulation===t.id;
        const isLocked = capitulation && !isChosen;
        return `<button class="cap-choice${isChosen?' chosen':''}"
          data-tid="${t.id}"
          ${isLocked?'disabled style="opacity:.3;cursor:not-allowed"':''}
        >${isChosen?'⚑ ':''}${t.name}</button>`;
      }).join('')}
      ${capitulation ? terrCard(atkdT.find(t=>t.id===capitulation)||{id:capitulation,name:capitulation,type:'org',owner:me?.id,pi:1,lon:0,lat:0,img:''}) : ''}
    `:''}

    ${!needCap&&atkdT.length>0?`<div class="divider"></div><div class="sec">Sous attaque — défense auto</div>
      ${atkdT.map(t=>terrCard(t)).join('')}
    `:''}

    <div class="divider"></div>
    <div class="sec">Mes territoires (${myT.length})</div>
    ${myT.slice(0,8).map(t=>`<div class="hentry">
      <span class="tag ${t.type==='city'?'tag-city':'tag-org'}">${t.type==='city'?'V':'O'}</span>
      ${t.name}
      ${t.pi>1?`<span style="color:var(--c-text3);font-size:9px;margin-left:auto">×${t.pi}</span>`:''}
    </div>`).join('')}
    ${myT.length>8?`<div style="font-size:10px;color:var(--c-text4);padding:4px 0">+${myT.length-8} autres</div>`:''}
    <div class="divider"></div>
    <div class="rule-block"><div class="rule-text"><b>Règles :</b> max 2 attaques · 2 attaques ET 2 reçues → capitulation · Sinon défense auto</div></div>
  `);

  document.querySelectorAll('.xbtn[data-idx]').forEach(btn =>
    btn.addEventListener('click', () => removeAtk(parseInt(btn.dataset.idx)))
  );
  document.querySelectorAll('.cap-choice[data-tid]').forEach(btn =>
    btn.addEventListener('click', () => setCapitulation(btn.dataset.tid))
  );
}

function openLeaderModal(zoneName) {
  const nation = nations[zoneName] || {};
  if (!nation.leader) return;
  let modal = document.getElementById('modal-leader');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-leader';
    modal.className = 'modal-bg';
    modal.innerHTML = `<div class="modal" id="modal-leader-inner" style="max-width:420px;width:92vw"></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
  }
  const d1 = nation.dieu1 ? getD(nation.dieu1) : null;
  const d2 = nation.dieu2 ? getD(nation.dieu2) : null;
  document.getElementById('modal-leader-inner').innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:14px">
      <div style="width:72px;height:72px;border-radius:50%;overflow:hidden;border:2px solid var(--c-border3);flex-shrink:0;background:var(--c-bg3)">
        ${nation.portrait?`<img src="${nation.portrait}" alt="${nation.leader}" style="width:100%;height:100%;object-fit:cover">`:`<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:28px;color:var(--c-text4)"><i class="ti ti-user"></i></div>`}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-family:Rajdhani,sans-serif;font-size:18px;font-weight:700;color:var(--c-text1);margin-bottom:2px">${nation.leader}</div>
        <div style="font-family:Rajdhani,sans-serif;font-size:12px;color:var(--c-text3);margin-bottom:6px">Leader — ${zoneName}</div>
        ${(d1||d2)?`<div style="display:flex;gap:6px;align-items:center">
          <span style="font-size:9px;color:var(--c-text4);font-family:Rajdhani,sans-serif;letter-spacing:.06em">INFLUENCES</span>
          ${d1?`<span style="font-size:10px;color:${d1.color};font-family:Rajdhani,sans-serif;font-weight:600">${d1.name}</span>`:''}
          ${d1&&d2?`<span style="color:var(--c-text4)">·</span>`:''}
          ${d2?`<span style="font-size:10px;color:${d2.color};font-family:Rajdhani,sans-serif;font-weight:600">${d2.name}</span>`:''}
        </div>`:''}
      </div>
    </div>
    ${nation.bio?`<div style="font-size:11px;color:var(--c-text2);line-height:1.7;border-top:1px solid var(--c-border);padding-top:12px">${nation.bio}</div>`:`<div style="font-size:10px;color:var(--c-text4);text-align:center;padding:8px 0;border-top:1px solid var(--c-border)">Aucune biographie disponible</div>`}
    <div style="margin-top:14px;display:flex;justify-content:flex-end">
      <button class="btn" onclick="document.getElementById('modal-leader').classList.remove('open')">Fermer</button>
    </div>
  `;
  modal.classList.add('open');
}

function showPrompt() {
  setPanel(`<div class="prompt"><i class="ti ti-login"></i><span>Connectez-vous<br>puis cliquez un pays<br>ou une divinité</span></div>`);
}

function clearZone() {
  selZone = null;
  window.VV.globe.highlightZone(null);
  if (me) renderPlayerPanel(); else showPrompt();
  renderRankingPanel();
}

window.VV.onZoneClick = function(zoneName) {
  if (!zoneName) return;
  window.VV.globe.highlightZone(zoneName);
  selDeity = null; selTrans = null;
  renderDock();
  document.querySelectorAll('.tchip').forEach(c => c.classList.remove('active'));
  renderZonePanel(zoneName);
};

function updateWarningTicker() {
  const ticker = $('warning-ticker');
  if (!ticker) return;
  if (!me) { ticker.className = 'ticker-calm'; ticker.style.display='none'; return; }
  const incoming  = window.VV.attacks.filter(a => a.target===me.id);
  const myAtkList = window.VV.attacks.filter(a => a.attacker===me.id);
  const tc = ticker.querySelector('.ticker-content');
  ticker.style.display = 'flex';
  if (!incoming.length && !myAtkList.length) {
    ticker.className = 'ticker-calm';
    if (tc) tc.textContent = `Aucune menace · CYCLE ${CYCLE} · Situation stable · `.repeat(4);
    return;
  }
  ticker.className = 'ticker-alert';
  const parts = [
    ...myAtkList.map(a => `Attaque sur ${getT(a.territory)?.name||a.territory} (${getD(a.target).name})`),
    ...incoming.map(a => `ALERTE — ${getT(a.territory)?.name||a.territory} est sous attaque`),
  ];
  const text = parts.join('   ·   ') + '   ·   ';
  if (tc) tc.textContent = text.repeat(4);
}

function updateSituationLegend() {
  const leg = $('situation-legend');
  if (!leg) return;
  const sits = window.VV.situations || [];
  if (!window.VV.showSituations || !sits.length) { leg.style.display='none'; return; }
  leg.style.display = 'flex';
  leg.innerHTML = sits.map(s => {
    const color = window.VV.getSituationColor(s.type, s.intensity);
    const st = window.VV.SITUATION_TYPES[s.type];
    return `<div class="sit-item">
      <div class="sit-dot" style="background:${color};box-shadow:0 0 4px ${color}"></div>
      <div class="sit-info">
        <span class="sit-zone">${s.zone}</span>
        <span class="sit-type" style="color:${color}">${st?.label||s.type} niv.${s.intensity}</span>
        ${s.desc?`<span class="sit-desc">${s.desc}</span>`:''}
      </div>
    </div>`;
  }).join('');
}

function openAtkModal(targetId) {
  if (histMode) { alert('Mode historique actif — retournez au cycle actuel pour attaquer.'); return; }
  if (!me || myAtks().length>=2) return;
  if (window.VV.attacks.some(a => a.attacker===me.id && a.target===targetId)) {
    alert(`Vous avez déjà attaqué ${getD(targetId).name} ce cycle.`);
    return;
  }
  const d = getD(targetId);
  const ts = allT().filter(t => t.owner===targetId);
  $('atk-title').innerHTML = `<i class="ti ti-sword"></i> Attaquer ${d.name}`;
  $('atk-body').innerHTML  = `<p style="font-size:10px;color:var(--c-text2);margin-bottom:8px">Territoire cible :</p>
    <select id="atk-terr"><option value="">— Choisir —</option>
    ${ts.map(t=>`<option value="${t.id}">${t.name}${t.pi>1?` (×${t.pi}PI)`:''}</option>`).join('')}
    </select>`;
  pendingAtk = { target:targetId };
  openModal('modal-atk');
}

function openAtkModalDirect(ownerId, terrId) {
  if (!me || myAtks().length>=2) return;
  if (window.VV.attacks.some(a => a.attacker===me.id && a.target===ownerId)) {
    alert(`Vous avez déjà attaqué ${getD(ownerId).name} ce cycle.`);
    return;
  }
  const d = getD(ownerId);
  const ts = allT().filter(t => t.owner===ownerId);
  $('atk-title').innerHTML = `<i class="ti ti-sword"></i> Attaquer ${d.name}`;
  $('atk-body').innerHTML  = `<p style="font-size:10px;color:var(--c-text2);margin-bottom:8px">Territoire cible :</p>
    <select id="atk-terr"><option value="">— Choisir —</option>
    ${ts.map(t=>`<option value="${t.id}"${t.id===terrId?' selected':''}>${t.name}${t.pi>1?` (×${t.pi}PI)`:''}</option>`).join('')}
    </select>`;
  pendingAtk = { target:ownerId };
  openModal('modal-atk');
}

async function confirmAttack() {
  const sel = $('atk-terr');
  if (!sel?.value) { alert('Choisissez un territoire cible'); return; }
  const btn = $('atk-confirm');
  btn.disabled = true; btn.textContent = 'Envoi…';
  const res = await postScript({ action:'add_attack', cycle:CYCLE, attaquant:me.id, cible:pendingAtk.target, territoire_id:sel.value });
  btn.disabled = false; btn.innerHTML = "<i class='ti ti-sword'></i> Confirmer l'attaque";
  if (!res.ok) { alert(`Erreur : ${res.error}`); return; }
  window.VV.attacks.push({ attacker:me.id, target:pendingAtk.target, territory:sel.value });
  capitulation = null;
  closeModal('modal-atk');
  renderDock(); window.VV.globe.buildDots();
  if (selZone) renderZonePanel(selZone);
  else if (selTrans) renderTransPanel(selTrans);
  else renderPlayerPanel();
  updateWarningTicker();
}

async function removeAtk(i) {
  const a = myAtks()[i];
  if (!a) return;
  const res = await postScript({ action:'remove_attack', cycle:CYCLE, attaquant:me.id, territoire_id:a.territory });
  if (res.ok) window.VV.attacks = window.VV.attacks.filter(x => x!==a);
  capitulation = null;
  renderDock(); window.VV.globe.buildDots(); renderPlayerPanel(); updateWarningTicker();
}

async function setCapitulation(tid) {
  capitulation = tid;
  await postScript({ action:'set_capitulation', cycle:CYCLE, attaquant:me.id, territoire_id:tid });
  renderPlayerPanel(); window.VV.globe.buildDots();
}

function openLogin() {
  let loginScreen = document.getElementById('vv-login-screen');
  if (!loginScreen) {
    loginScreen = document.createElement('div');
    loginScreen.id = 'vv-login-screen';
    document.body.appendChild(loginScreen);
  }

  const factions = [
    { key:'sovereign', name:'Sovereign', color:'#3a7acc', members:['liberty','capital','judgment','union','manifest','wrath','industry','old media','new media','vigil','science'] },
    { key:'olympien',  name:'Olympiens', color:'#c8901a', members:['zeus','hera','poseidon','demeter','persephone','athena','artemis','ares','hades','apollon','hermes','dionysos','hestia','hephaistos','aphrodite'] },
    { key:'shemning',  name:'Shemning',  color:'#b02828', members:['entite','isis','seth','osiris','hel','tyr','loki','shiva','vishnu','brahma','amaterasu'] },
  ];

  loginScreen.style.cssText = 'position:fixed;inset:0;z-index:5000;background:#020508;display:flex;align-items:center;justify-content:center;font-family:Rajdhani,sans-serif;animation:login-fade-in .4s ease;overflow-y:auto;overflow-x:hidden;';

  const deityCards = factions.map(f => `
    <div style="margin-bottom:16px">
      <div style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${f.color};background:${f.color}18;border:1px solid ${f.color}33;border-radius:3px;padding:2px 8px;display:inline-block;margin-bottom:10px">${f.name}</div>
      <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;scrollbar-width:thin;scrollbar-color:${f.color}44 transparent">
        ${window.VV.DEITIES.filter(d => f.members.includes(d.id)).map(d => `
          <div onclick="loginSelectDeity('${d.id}','${f.color}')"
            id="lcard-${d.id}"
            style="flex-shrink:0;width:76px;display:flex;flex-direction:column;align-items:center;gap:5px;padding:8px 4px;border-radius:8px;border:1px solid #1a2e4a;cursor:pointer;transition:all .15s;background:rgba(255,255,255,.02)"
            onmouseover="this.style.background='rgba(255,255,255,.06)'"
            onmouseout="if(window._loginSelId!=='${d.id}')this.style.background='rgba(255,255,255,.02)'">
            <div style="width:42px;height:42px;border-radius:50%;overflow:hidden;background:${f.color}18;display:flex;align-items:center;justify-content:center;border:2px solid ${f.color}44;font-size:12px;font-weight:700;color:${f.color}">
              ${d.avatar?`<img src="${d.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.style.display='none'">`:''}
              ${!d.avatar?d.name.slice(0,2).toUpperCase():''}
            </div>
            <div style="font-size:10px;font-weight:600;color:#7a9aaa;text-align:center;line-height:1.2;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.name}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  loginScreen.innerHTML = `
    <style>
      @keyframes login-fade-in{from{opacity:0}to{opacity:1}}
      @keyframes login-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
      @keyframes login-glow{0%,100%{opacity:.3}50%{opacity:.8}}
    </style>
    <div style="position:absolute;inset:0;overflow:hidden;pointer-events:none">
      ${Array.from({length:25},(_,i)=>`<div style="position:absolute;width:${Math.random()<.5?1:2}px;height:${Math.random()<.5?1:2}px;border-radius:50%;background:#c8901a;opacity:${(Math.random()*.5+.1).toFixed(2)};left:${(Math.random()*100).toFixed(1)}%;top:${(Math.random()*100).toFixed(1)}%;animation:login-glow ${(Math.random()*3+2).toFixed(1)}s ease-in-out infinite ${(Math.random()*2).toFixed(1)}s"></div>`).join('')}
    </div>
    <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#c8901a,#f0c060,#c8901a,transparent)"></div>
    <div style="width:100%;max-width:700px;padding:30px 24px;display:flex;flex-direction:column;align-items:center;gap:0">
      <div style="display:flex;flex-direction:column;align-items:center;gap:12px;margin-bottom:32px;animation:login-float 4s ease-in-out infinite">
        <img src="https://imgur.com/3VqtRdh.png" style="width:72px;height:72px;border-radius:14px;border:1px solid #c8901a44;box-shadow:0 0 30px #c8901a44" onerror="this.style.display='none'">
        <div style="text-align:center">
          <div style="font-family:Cinzel,serif;font-size:30px;font-weight:700;letter-spacing:.2em;color:#f0c060;text-shadow:0 0 24px #c8901a66">VAE VICTIS</div>
          <div style="font-size:11px;color:#3a5a7a;letter-spacing:.15em;text-transform:uppercase;margin-top:6px">Salle de Guerre · Cycle <span id="ls-cycle">—</span></div>
        </div>
      </div>
      <div style="width:100%;margin-bottom:20px">
        <div style="font-size:10px;font-weight:700;letter-spacing:.12em;color:#3a5a7a;text-transform:uppercase;text-align:center;margin-bottom:16px">Choisissez votre divinité</div>
        ${deityCards}
      </div>
      <div style="width:100%;max-width:340px;position:relative;margin-bottom:12px">
        <input id="ls-pw" type="password" placeholder="Code secret" autocomplete="current-password"
          style="width:100%;padding:13px 44px 13px 16px;border-radius:8px;border:1px solid #1a3a5a;background:rgba(255,255,255,.04);color:#cfe4f7;font-family:Rajdhani,sans-serif;font-size:14px;font-weight:600;letter-spacing:.08em;outline:none;text-align:center;transition:border-color .2s;box-sizing:border-box"
          onkeydown="if(event.key==='Enter')loginScreenSubmit()">
        <button onclick="loginTogglePw()" style="position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;color:#3a5a7a;cursor:pointer;font-size:18px;line-height:1;padding:0"><i class="ti ti-eye" id="ls-eye"></i></button>
      </div>
      <div id="ls-err" style="font-size:11px;color:#cc3030;min-height:16px;margin-bottom:10px;text-align:center"></div>
      <button id="ls-btn" onclick="loginScreenSubmit()" disabled
        style="width:100%;max-width:340px;padding:14px;border-radius:10px;font-family:Cinzel,Rajdhani,sans-serif;font-size:14px;font-weight:700;letter-spacing:.12em;cursor:pointer;border:none;background:linear-gradient(135deg,#c8901a,#f0c060);color:#04080f;transition:all .2s;opacity:.4"
      >ENTRER DANS LE CONSEIL</button>
      <div id="ls-display" style="margin-top:14px;font-size:11px;color:#2a4a6a;letter-spacing:.06em;text-align:center;min-height:16px"></div>
    </div>
  `;

  const cycleEl = document.getElementById('ls-cycle');
  if (cycleEl) cycleEl.textContent = window.VV?.CYCLE || CYCLE || '—';
  window._loginSelId = null;
}

window.loginSelectDeity = function(id, color) {
  window._loginSelId = id;
  document.querySelectorAll('[id^="lcard-"]').forEach(c => {
    c.style.borderColor = '#1a2e4a';
    c.style.background  = 'rgba(255,255,255,.02)';
    c.style.boxShadow   = 'none';
  });
  const card = document.getElementById('lcard-' + id);
  if (card) {
    card.style.borderColor = color;
    card.style.background  = 'rgba(10,15,25,1)';
    card.style.boxShadow   = '0 0 10px ' + color + '55, inset 0 -2px 0 ' + color;
  }
  const d    = window.VV.DEITIES.find(x => x.id === id);
  const disp = document.getElementById('ls-display');
  if (disp && d) disp.textContent = d.name + (d.player ? ' · ' + d.player : '');
  const btn = document.getElementById('ls-btn');
  if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.boxShadow = '0 4px 20px ' + color + '66'; }
};

window.loginTogglePw = function() {
  const pw  = document.getElementById('ls-pw');
  const eye = document.getElementById('ls-eye');
  if (!pw) return;
  pw.type = pw.type === 'password' ? 'text' : 'password';
  if (eye) eye.className = pw.type === 'password' ? 'ti ti-eye' : 'ti ti-eye-off';
};

window.loginScreenSubmit = function() {
  const id  = window._loginSelId;
  const pw  = document.getElementById('ls-pw')?.value;
  const err = document.getElementById('ls-err');
  const btn = document.getElementById('ls-btn');
  if (!id) { if (err) err.textContent = 'Sélectionnez votre divinité.'; return; }
  const d = window.VV.getD(id);
  if (!d?.pass || d.pass !== pw) {
    if (err) err.textContent = 'Code secret incorrect.';
    const p = document.getElementById('ls-pw');
    if (p) { p.style.borderColor = '#cc3030'; setTimeout(() => { if (p) p.style.borderColor = '#1a3a5a'; }, 800); }
    return;
  }
  if (btn) { btn.textContent = 'CONNEXION…'; btn.disabled = true; }
  const screen = document.getElementById('vv-login-screen');
  if (screen) {
    screen.style.transition = 'opacity .5s ease';
    screen.style.opacity = '0';
    setTimeout(() => {
      screen.style.display = 'none';
      me = d;
      const bl = $('btn-login');
      if (bl) bl.innerHTML = `<i class="ti ti-user-check"></i> ${d.name}`;
      const ba = $('btn-admin');
      if (ba) ba.style.display = 'inline-flex';
      selDeity = d.id;
      const myCapRow = window.VV.attacks.find(a => a.attacker === d.id && a.capitulation);
      capitulation = myCapRow ? myCapRow.capitulation : null;
      renderDock();
      window.VV.globe.buildDots();
      renderPlayerPanel();
      updateWarningTicker();
      showFactionOrgBtn(d.id);
      window.VV.onZoneClick('France');
    }, 500);
  }
};

function doLogin() {
  const id = $('login-sel')?.value;
  const pw = $('login-pw')?.value;
  const d  = getD(id);
  if (!d?.pass || d.pass !== pw) { if ($('login-err')) $('login-err').textContent = 'Identifiants incorrects'; return; }
  me = d;
  closeModal('modal-login');
  const bl = $('btn-login');
  if (bl) bl.innerHTML = `<i class="ti ti-user-check"></i> ${d.name}`;
  const ba = $('btn-admin');
  if (ba) ba.style.display = 'inline-flex';
  selDeity = d.id;
  const myCapRow = window.VV.attacks.find(a => a.attacker === d.id && a.capitulation);
  capitulation = myCapRow ? myCapRow.capitulation : null;
  renderDock();
  window.VV.globe.buildDots();
  renderPlayerPanel();
  updateWarningTicker();
  showFactionOrgBtn(d.id);
}

function showFactionOrgBtn(deityId) {
  const faction  = getFaction(deityId);
  const trigger  = document.getElementById('faction-dropdown-trigger');
  const dot      = document.getElementById('faction-trigger-dot');
  const label    = document.getElementById('faction-trigger-label');
  if (!faction) {
    if (trigger) trigger.classList.add('locked');
    ['btn-grande-societe','btn-experreducti','btn-cercle-asimov'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.classList.add('locked'); }
    });
    return;
  }
  if (trigger) trigger.classList.remove('locked');
  if (dot)   dot.style.background = faction.color;
  if (label) label.textContent = faction.name;
  const map = { 'Sovereign':'btn-grande-societe', 'Olympiens':'btn-experreducti', 'Shemning':'btn-cercle-asimov' };
  ['btn-grande-societe','btn-experreducti','btn-cercle-asimov'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === map[faction.name]) {
      el.classList.remove('locked');
      const li = el.querySelector('.lock-icon');
      if (li) li.style.display = 'none';
    } else {
      el.classList.add('locked');
      const li = el.querySelector('.lock-icon');
      if (li) li.style.display = '';
    }
  });
}

function openAdminPanel() {
  $('admin-body').innerHTML = `
    <div style="font-size:10px;color:var(--c-text2);margin-bottom:10px">Cycle ${CYCLE} · ${window.VV.attacks.length} attaque(s)</div>
    <button class="btn btn-warn btn-full" style="margin-bottom:6px" id="admin-close-cycle"><i class="ti ti-gavel"></i> Clôturer le cycle & notifier Discord</button>
    <button class="btn btn-full" style="margin-bottom:6px" id="admin-refresh"><i class="ti ti-refresh"></i> Forcer synchronisation</button>
    <div class="divider"></div>
    <div class="sec">Attaques déclarées</div>
    ${window.VV.attacks.length
      ? window.VV.attacks.map(a=>`<div class="hentry">
          <i class="ti ti-sword" style="color:var(--c-danger);font-size:10px"></i>
          ${getD(a.attacker).name} → ${getD(a.target).name} · ${getT(a.territory)?.name||a.territory}
          ${getT(a.territory)?.pi>1?` <span style="color:var(--c-text3)">×${getT(a.territory).pi}PI</span>`:''}
        </div>`).join('')
      : '<div style="font-size:10px;color:var(--c-text4)">Aucune attaque</div>'
    }`;
  $('admin-close-cycle')?.addEventListener('click', closeCycle);
  $('admin-refresh')?.addEventListener('click', async () => { closeModal('modal-admin'); await fullRefresh(); });
  openModal('modal-admin');
}

async function closeCycle() {
  if (!confirm(`Clôturer le cycle ${CYCLE} et envoyer le résumé sur Discord ?`)) return;
  const divMap = Object.fromEntries(window.VV.DEITIES.map(d => [d.id, { nom:d.name }]));
  const res = await postScript({ action:'close_cycle', cycle:CYCLE, divinites:divMap });
  if (res.ok) { alert(`Cycle ${CYCLE} clôturé !`); closeModal('modal-admin'); await fullRefresh(); }
  else alert(`Erreur : ${res.error}`);
}

function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

async function fullRefresh() {
  const ok = await loadData();
  if (!ok) return;
  window.VV.globe.buildDots();
  window.VV.globe.buildBadges();
  window.VV.globe.redraw();
  renderDock();
  renderRankingPanel();
  updateWarningTicker();
  updateSituationLegend();
  if (selZone)       renderZonePanel(selZone);
  else if (selTrans) renderTransPanel(selTrans);
  else if (me)       renderPlayerPanel();
  else               showPrompt();
}

async function init() {
  const [, world] = await Promise.all([
    loadData().then(() => loadPointsData()),
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(r=>r.json()),
  ]);
  window.VV.globe.init(world);
  renderDock();
  renderRankingPanel();
  showPrompt();
  openLogin();
  setInterval(fullRefresh, CFG.REFRESH_MIN * 60 * 1000);
}

document.addEventListener('DOMContentLoaded', () => {

  let activeFaction = null;
  document.querySelectorAll('.faction-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      const f = btn.dataset.faction;
      if (activeFaction === f) {
        activeFaction = null;
        document.querySelectorAll('.faction-btn').forEach(b => b.classList.remove('active'));
        renderDock(null);
      } else {
        activeFaction = f;
        document.querySelectorAll('.faction-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderDock(f);
      }
    })
  );

  $('btn-hist')?.addEventListener('click', async () => {
    const cycles = await loadHistorique();
    if (!cycles.length) { alert('Aucun historique disponible.'); return; }
    openHistModal(cycles);
  });

  $('btn-news')?.addEventListener('click', () => {
    if (typeof openNews === 'function') openNews();
  });

  $('btn-fandom')?.addEventListener('click', () => window.open(CFG.FANDOM_URL, '_blank'));

  $('btn-mapmode')?.addEventListener('click', function() {
    window.VV.mapColorMode = window.VV.mapColorMode === 'divine' ? 'faction' : 'divine';
    const isFaction = window.VV.mapColorMode === 'faction';
    this.classList.toggle('active', isFaction);
    this.title = isFaction ? 'Mode Faction actif — cliquer pour revenir au mode Divin' : 'Mode Divin — cliquer pour mode Faction';
    const icon = this.querySelector('i');
    if (icon) icon.className = isFaction ? 'ti ti-flag' : 'ti ti-palette';
    window.VV.globe.buildDots();
    const leg = document.getElementById('legend');
    if (leg) {
      if (isFaction) {
        leg.innerHTML = '<div class="li"><div class="ld" style="background:#1a8a4a"></div>Vos territoires</div>'
          + '<div class="li"><div class="ld" style="background:#c8901a"></div>Votre faction</div>'
          + '<div class="li"><div class="ld" style="background:#3a7acc"></div>Sovereign</div>'
          + '<div class="li"><div class="ld" style="background:#b02828"></div>Shemning</div>'
          + '<div class="li"><div class="ld" style="background:#2a4060"></div>Neutre</div>'
          + '<div class="li"><div class="ld" style="background:#c87020"></div>Sous attaque</div>';
      } else {
        leg.innerHTML = '<div class="li"><div class="ld" style="background:#1a8a4a"></div>Votre divinité</div>'
          + '<div class="li"><div class="ld" style="background:#3a7acc"></div>Autre divinité</div>'
          + '<div class="li"><div class="ld" style="background:#3d6480"></div>Neutre</div>'
          + '<div class="li"><div class="ld" style="background:#c87020"></div>Sous attaque</div>'
          + '<div class="li"><div class="ld" style="background:#cc3030"></div>Capitulation</div>'
          + '<div class="li"><div class="ld" style="background:#3a7acc"></div>Organisation</div>';
      }
    }
  });

  $('btn-situation')?.addEventListener('click', function() {
    window.VV.showSituations = !window.VV.showSituations;
    this.classList.toggle('active', window.VV.showSituations);
    if (!window.VV.showSituations) {
      window.VV.globe.resetCountryColors();
    } else {
      window.VV.globe.drawSituations();
    }
    updateSituationLegend();
  });

  $('btn-login')?.addEventListener('click', openLogin);
  $('login-submit')?.addEventListener('click', doLogin);
  $('login-pw')?.addEventListener('keydown', e => { if (e.key==='Enter') doLogin(); });

  $('btn-admin')?.addEventListener('click', () => {
    const pw = prompt('Mot de passe admin :');
    if (pw !== 'VaeVictis2025!') { alert('Mot de passe incorrect.'); return; }
    openAdminPanel();
  });
  $('btn-refresh')?.addEventListener('click', fullRefresh);

  $('atk-confirm')?.addEventListener('click', confirmAttack);

  $('zoom-in')?.addEventListener('click',    () => window.VV.globe.zoomIn());
  $('zoom-out')?.addEventListener('click',   () => window.VV.globe.zoomOut());
  $('zoom-reset')?.addEventListener('click', () => window.VV.globe.zoomReset());

  const TRANS_MEMBERS = {
    'UE':   ['France','Germany','Austria','Belgium','Netherlands','Luxembourg','Italy','Spain','Portugal','Poland','Czech Republic','Hungary','Slovakia','Sweden','Denmark','Finland','Greece','Bulgaria','Romania','Croatia','Slovenia','Estonia','Latvia','Lithuania','Ireland','Cyprus','Malta'],
    'OTAN': ['United States of America','Canada','United Kingdom','France','Germany','Italy','Spain','Netherlands','Belgium','Luxembourg','Norway','Denmark','Iceland','Poland','Czech Republic','Hungary','Turkey','Greece','Portugal','Bulgaria','Romania','Slovakia','Slovenia','Estonia','Latvia','Lithuania','Albania','Croatia','Montenegro','North Macedonia','Finland','Sweden'],
    'ONU':  ['France','United States of America','United Kingdom','Russia','China','Germany','Japan','India','Brazil','Canada','Australia','Italy','Spain'],
  };

  document.querySelectorAll('.tchip').forEach(chip =>
    chip.addEventListener('click', () => {
      const key = chip.dataset.zone;
      selTrans = key; selZone = null; selDeity = null;
      window.VV.globe.highlightTransMembers(TRANS_MEMBERS[key] || []);
      document.querySelectorAll('.tchip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderDock();
      renderTransPanel(key);
    })
  );

  document.getElementById('faction-dropdown-trigger')?.addEventListener('click', function() {
    if (this.classList.contains('locked')) return;
    const menu = document.getElementById('faction-dropdown-menu');
    if (!menu) return;
    const isOpen = menu.style.display !== 'none';
    if (isOpen) {
      menu.style.display = 'none';
    } else {
      const rect = this.getBoundingClientRect();
      menu.style.position = 'fixed';
      menu.style.top  = (rect.bottom + 6) + 'px';
      menu.style.left = rect.left + 'px';
      menu.style.zIndex = '9999';
      menu.style.display = 'block';
    }
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('#faction-dropdown-wrap')) {
      const menu = document.getElementById('faction-dropdown-menu');
      if (menu) menu.style.display = 'none';
    }
  });

  document.getElementById('btn-grande-societe')?.addEventListener('click', () => {
    alert('La Grande Société — fonctionnalité à venir.');
  });
  document.getElementById('btn-experreducti')?.addEventListener('click', () => {
    if (typeof openExperreducti === 'function') openExperreducti(me?.id || null);
  });
  document.getElementById('btn-cercle-asimov')?.addEventListener('click', () => {
    alert("Cercle d'Asimov — fonctionnalité à venir.");
  });

  document.querySelectorAll('[data-close]').forEach(btn =>
    btn.addEventListener('click', () => closeModal(btn.dataset.close))
  );
  document.querySelectorAll('.modal-bg').forEach(bg =>
    bg.addEventListener('click', e => { if (e.target===bg) bg.classList.remove('open'); })
  );

  init();
});

// ============================================================
// DEITY HUB — Tableau de bord personnel
// ============================================================

let _hubDeityId = null;
let _hubView    = 'main';

function openDeityHub(deityId) {
  _hubDeityId = deityId;
  _hubView    = 'main';
  let modal = document.getElementById('hub-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'hub-modal';
    modal.className = 'modal-bg';
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
  }
  if (!document.getElementById('hub-style')) {
    const s = document.createElement('style');
    s.id = 'hub-style';
    s.textContent = `
      #hub-modal .modal { width:820px; max-width:96vw; max-height:88vh; overflow-y:auto; padding:0; border-radius:12px; }
      .hub-back { background:none;border:none;color:var(--c-text3);cursor:pointer;font-family:Rajdhani,sans-serif;font-size:11px;font-weight:600;letter-spacing:.08em;padding:0;display:flex;align-items:center;gap:5px;transition:color .12s; }
      .hub-back:hover { color:var(--c-text1); }
      .hub-terr-card { border:1px solid var(--c-border);border-radius:var(--radius);overflow:hidden;cursor:default;transition:border-color .12s; }
      .hub-terr-card:hover { border-color:var(--c-border2); }
      @keyframes hub-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
      .hub-anim { animation:hub-in .2s ease; }
    `;
    document.head.appendChild(s);
  }
  modal.classList.add('open');
  renderHubMain();
}

function renderHubMain() {
  const modal = document.getElementById('hub-modal');
  if (!modal) return;
  _hubView = 'main';
  const d       = getD(_hubDeityId);
  const faction = getFaction(_hubDeityId);
  const pts     = getDeityPoints(_hubDeityId);
  const total   = pts.territoire + pts.organisation + pts.societal || 1;

  const cx = 100, cy = 100, R = 75, r = 44;
  const segments = [
    { label:'Territoires',   val:pts.territoire,   color:'#3a7acc', icon:'ti-map-pin',  view:'territoires' },
    { label:'Organisations', val:pts.organisation, color:'#c8901a', icon:'ti-building', view:'organisations' },
    { label:'Sociétal',      val:pts.societal,     color:'#2a9a4a', icon:'ti-users',    view:'societal' },
  ];

  function polarToCart(angle, radius) {
    return { x: cx + radius * Math.cos(angle - Math.PI/2), y: cy + radius * Math.sin(angle - Math.PI/2) };
  }
  function makeArcPath(startAngle, endAngle, outerR, innerR) {
    const s1=polarToCart(startAngle,outerR), e1=polarToCart(endAngle,outerR);
    const s2=polarToCart(endAngle,innerR),   e2=polarToCart(startAngle,innerR);
    const large = endAngle-startAngle > Math.PI ? 1 : 0;
    return [`M ${s1.x.toFixed(2)} ${s1.y.toFixed(2)}`,`A ${outerR} ${outerR} 0 ${large} 1 ${e1.x.toFixed(2)} ${e1.y.toFixed(2)}`,`L ${s2.x.toFixed(2)} ${s2.y.toFixed(2)}`,`A ${innerR} ${innerR} 0 ${large} 0 ${e2.x.toFixed(2)} ${e2.y.toFixed(2)}`,'Z'].join(' ');
  }

  const GAP = 0.001;
  const nonZero = segments.filter(s => s.val > 0);
  let startAngle = 0;
  const paths = segments.map(seg => {
    if (seg.val === 0) return { ...seg, path:null, lx:0, ly:0, pct:0, sweep:0 };
    const pct  = seg.val / total;
    const sweep = nonZero.length === 1 ? 2*Math.PI - GAP : pct * 2*Math.PI - GAP;
    const endAngle = startAngle + sweep;
    const midAngle = startAngle + sweep/2;
    const lp   = polarToCart(midAngle, (R+r)/2);
    const path = makeArcPath(startAngle, endAngle, R, r);
    startAngle = startAngle + pct * 2*Math.PI;
    return { ...seg, path, lx:lp.x, ly:lp.y, pct, sweep };
  });

  modal.innerHTML = `
    <div class="modal hub-anim" style="background:var(--c-bg1)">
      <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,${d.color},transparent);border-radius:12px 12px 0 0"></div>
      <div style="padding:16px 22px;border-bottom:1px solid var(--c-border);display:flex;align-items:center;gap:14px">
        <div style="width:46px;height:46px;border-radius:50%;overflow:hidden;border:2px solid ${d.color}55;background:var(--c-bg3);display:flex;align-items:center;justify-content:center;flex-shrink:0">
          ${d.avatar?`<img src="${d.avatar}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">`:`<span style="font-size:14px;font-weight:700;color:${d.color}">${d.name.slice(0,2).toUpperCase()}</span>`}
        </div>
        <div>
          <div style="font-family:Rajdhani,sans-serif;font-size:17px;font-weight:700;color:var(--c-text1)">${d.name}</div>
          <div style="font-size:11px;color:${faction?.color||'var(--c-text3)'};">${faction?.name||''} · ${total} PI total</div>
        </div>
        <button onclick="document.getElementById('hub-modal').classList.remove('open')"
          style="margin-left:auto;background:none;border:1px solid var(--c-border);border-radius:6px;color:var(--c-text3);padding:5px 12px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:11px">FERMER</button>
      </div>
      <div style="padding:22px;display:grid;grid-template-columns:220px 1fr;gap:24px;align-items:start">
        <div style="display:flex;flex-direction:column;align-items:center;gap:12px">
          <svg viewBox="0 0 200 200" style="width:200px;height:200px;overflow:visible" xmlns="http://www.w3.org/2000/svg">
            ${paths.filter(p=>p.path).map(p=>`
              <path d="${p.path}" fill="${p.color}" opacity=".85" stroke="var(--c-bg1)" stroke-width="2"
                style="cursor:pointer;transition:opacity .15s"
                onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='.85'"
                onclick="hubGoTo('${p.view}')"/>
              ${p.val>0&&p.sweep>0.3?`<text x="${p.lx.toFixed(1)}" y="${p.ly.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="700" fill="white" pointer-events="none">${Math.round(p.pct*100)}%</text>`:''}`).join('')}
            <circle cx="100" cy="100" r="40" fill="var(--c-bg1)" stroke="var(--c-border)" stroke-width="1"/>
            <text x="100" y="94" text-anchor="middle" font-size="18" font-weight="700" fill="var(--c-text1)" font-family="Rajdhani,sans-serif">${total}</text>
            <text x="100" y="110" text-anchor="middle" font-size="9" fill="var(--c-text3)" font-family="Rajdhani,sans-serif" letter-spacing=".06em">PI TOTAL</text>
          </svg>
          <div style="font-size:10px;color:var(--c-text4);font-family:Rajdhani,sans-serif;letter-spacing:.06em;text-align:center">Cliquez une part pour le détail</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${segments.map(seg=>`
            <div onclick="hubGoTo('${seg.view}')"
              style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:var(--radius);border:1px solid var(--c-border);background:var(--c-bg2);cursor:pointer;transition:all .15s"
              onmouseover="this.style.borderColor='${seg.color}55';this.style.background='var(--c-bg3)'"
              onmouseout="this.style.borderColor='var(--c-border)';this.style.background='var(--c-bg2)'">
              <div style="width:36px;height:36px;border-radius:50%;background:${seg.color}18;border:1px solid ${seg.color}44;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                <i class="ti ${seg.icon}" style="font-size:16px;color:${seg.color}"></i>
              </div>
              <div style="flex:1">
                <div style="font-family:Rajdhani,sans-serif;font-size:13px;font-weight:700;color:var(--c-text1);margin-bottom:3px">${seg.label}</div>
                <div style="height:5px;background:var(--c-bg);border-radius:3px;overflow:hidden;border:1px solid var(--c-border)">
                  <div style="height:100%;width:${Math.round(seg.val/total*100)}%;background:${seg.color};border-radius:3px"></div>
                </div>
              </div>
              <div style="text-align:right;flex-shrink:0">
                <div style="font-size:18px;font-weight:700;color:${seg.color};font-family:Rajdhani,sans-serif">${seg.val}</div>
                <div style="font-size:9px;color:var(--c-text4)">PI</div>
              </div>
              <i class="ti ti-chevron-right" style="font-size:14px;color:var(--c-text4)"></i>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function hubGoTo(view) {
  _hubView = view;
  if (view === 'societal')      { renderHubSocietal();     return; }
  if (view === 'territoires')   { renderHubTerritoires();  return; }
  if (view === 'organisations') { renderHubOrganisations(); return; }
}

function hubHeader(title, icon) {
  return `
    <div style="padding:14px 22px;border-bottom:1px solid var(--c-border);display:flex;align-items:center;gap:12px;flex-shrink:0">
      <button class="hub-back" onclick="renderHubMain()"><i class="ti ti-arrow-left"></i> Retour</button>
      <div style="width:1px;height:20px;background:var(--c-border);margin:0 4px"></div>
      <i class="ti ${icon}" style="font-size:16px;color:var(--c-accent)"></i>
      <span style="font-family:Rajdhani,sans-serif;font-size:14px;font-weight:700;color:var(--c-text1);letter-spacing:.06em">${title}</span>
      <button onclick="document.getElementById('hub-modal').classList.remove('open')"
        style="margin-left:auto;background:none;border:1px solid var(--c-border);border-radius:6px;color:var(--c-text3);padding:4px 10px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:11px">✕</button>
    </div>
  `;
}

function renderHubTerritoires() {
  const modal = document.getElementById('hub-modal');
  if (!modal) return;
  const d   = getD(_hubDeityId);
  const myT = allT().filter(t => t.owner === _hubDeityId && t.type === 'city');
  modal.innerHTML = `
    <div class="modal hub-anim" style="background:var(--c-bg1);display:flex;flex-direction:column">
      <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#3a7acc,transparent);border-radius:12px 12px 0 0"></div>
      ${hubHeader(`Territoires de ${d.name} (${myT.length})`, 'ti-map-pin')}
      <div style="padding:18px 22px;overflow-y:auto;flex:1">
        ${myT.length===0
          ? `<div style="text-align:center;color:var(--c-text4);font-family:Rajdhani,sans-serif;font-size:13px;padding:40px">Aucun territoire contrôlé</div>`
          : `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
              ${myT.map(t => {
                const zone = Object.entries(window.VV.ZONES||{}).find(([,z])=>z.territories.some(x=>x.id===t.id))?.[0]||'';
                return `<div class="hub-terr-card">
                  ${t.img?`<img src="${t.img}" style="width:100%;height:80px;object-fit:cover;display:block" loading="lazy" onerror="this.style.display='none'">`:`<div style="height:80px;background:var(--c-bg3);display:flex;align-items:center;justify-content:center"><i class="ti ti-building-skyscraper" style="font-size:24px;color:var(--c-text4)"></i></div>`}
                  <div style="padding:8px 10px;background:var(--c-bg2)">
                    <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px">
                      <div style="width:7px;height:7px;border-radius:50%;background:#3a7acc;box-shadow:0 0 4px #3a7acc88;flex-shrink:0"></div>
                      <span style="font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;color:var(--c-text1);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.name}</span>
                      ${t.pi>1?`<span style="font-size:9px;color:var(--c-accent);background:var(--c-bg);border:1px solid var(--c-border2);border-radius:3px;padding:1px 5px">×${t.pi}</span>`:''}
                    </div>
                    <div style="font-size:10px;color:var(--c-text3)">${zone}</div>
                  </div>
                </div>`;
              }).join('')}
            </div>`}
      </div>
    </div>`;
}

function renderHubOrganisations() {
  const modal = document.getElementById('hub-modal');
  if (!modal) return;
  const d   = getD(_hubDeityId);
  const myO = allT().filter(t => t.owner === _hubDeityId && t.type === 'org');
  modal.innerHTML = `
    <div class="modal hub-anim" style="background:var(--c-bg1);display:flex;flex-direction:column">
      <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#c8901a,transparent);border-radius:12px 12px 0 0"></div>
      ${hubHeader(`Organisations de ${d.name} (${myO.length})`, 'ti-building')}
      <div style="padding:18px 22px;overflow-y:auto;flex:1">
        ${myO.length===0
          ? `<div style="text-align:center;color:var(--c-text4);font-family:Rajdhani,sans-serif;font-size:13px;padding:40px">Aucune organisation contrôlée</div>`
          : `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
              ${myO.map(t => {
                const zone = Object.entries(window.VV.ZONES||{}).find(([,z])=>z.territories.some(x=>x.id===t.id))?.[0]||'';
                return `<div class="hub-terr-card">
                  ${t.img?`<img src="${t.img}" style="width:100%;height:80px;object-fit:cover;display:block" loading="lazy" onerror="this.style.display='none'">`:`<div style="height:80px;background:var(--c-bg3);display:flex;align-items:center;justify-content:center"><div style="width:18px;height:18px;background:#c8901a44;clip-path:polygon(50% 0%,100% 50%,50% 100%,0% 50%)"></div></div>`}
                  <div style="padding:8px 10px;background:var(--c-bg2)">
                    <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px">
                      <div style="width:7px;height:7px;background:#c8901a;clip-path:polygon(50% 0%,100% 50%,50% 100%,0% 50%);flex-shrink:0"></div>
                      <span style="font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;color:var(--c-text1);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.name}</span>
                      ${t.pi>1?`<span style="font-size:9px;color:#c8901a;background:var(--c-bg);border:1px solid var(--c-border2);border-radius:3px;padding:1px 5px">×${t.pi}</span>`:''}
                    </div>
                    <div style="font-size:10px;color:var(--c-text3)">${zone}</div>
                  </div>
                </div>`;
              }).join('')}
            </div>`}
      </div>
    </div>`;
}

function renderHubSocietal() {
  const modal = document.getElementById('hub-modal');
  if (!modal) return;
  const d       = getD(_hubDeityId);
  const faction = getFaction(_hubDeityId);
  const row     = pointsData.find(r => Object.values(r)[0]?.toLowerCase?.() === _hubDeityId.toLowerCase()) || {};
  const scores  = INFLUENCE_CRITERIA.map(c => ({ ...c, val: Number(row[c.key] || 0) }));
  const total   = scores.reduce((s,c) => s + c.val, 0);
  const pct     = Math.round(total / 20 * 100);
  const scoreColor = total>=16?'#f0c060':total>=12?'#c8901a':total>=6?'#3a7acc':'#cc3030';
  const scoreLabel = total>=16?'Dominant':total>=12?'Majeur':total>=6?'Émergent':'Marginal';

  const radarSize=110, cx=110, cy=110, maxR=82;
  const radarPoints = scores.map((s,i)=>{
    const angle=(i/scores.length)*Math.PI*2-Math.PI/2;
    const r=(s.val/2)*maxR;
    return { x:cx+r*Math.cos(angle), y:cy+r*Math.sin(angle), lx:cx+(maxR+18)*Math.cos(angle), ly:cy+(maxR+18)*Math.sin(angle) };
  });
  const radarPath = radarPoints.map((p,i)=>`${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')+' Z';
  const gridPath  = [1,2].map(g=>{
    const rg=g/2*maxR;
    return scores.map((_,i)=>{const a=(i/scores.length)*Math.PI*2-Math.PI/2;return `${i===0?'M':'L'}${(cx+rg*Math.cos(a)).toFixed(1)},${(cy+rg*Math.sin(a)).toFixed(1)}`;}).join(' ')+' Z';
  }).join(' ');
  const gridLines = scores.map((_,i)=>{const a=(i/scores.length)*Math.PI*2-Math.PI/2;return `<line x1="${cx}" y1="${cy}" x2="${(cx+maxR*Math.cos(a)).toFixed(1)}" y2="${(cy+maxR*Math.sin(a)).toFixed(1)}" stroke="var(--c-border)" stroke-width=".8"/>`;}).join('');

  modal.innerHTML = `
    <div class="modal hub-anim" style="background:var(--c-bg1);display:flex;flex-direction:column">
      <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#2a9a4a,transparent);border-radius:12px 12px 0 0"></div>
      ${hubHeader(`Influence Sociétale — ${d.name}`, 'ti-chart-radar')}
      <div style="padding:14px 22px 6px;background:var(--c-bg2);border-bottom:1px solid var(--c-border);display:flex;align-items:center;gap:12px">
        <div style="font-size:10px;font-weight:700;letter-spacing:.1em;color:var(--c-text3);text-transform:uppercase;white-space:nowrap">Emprise sur la société</div>
        <div style="flex:1;height:8px;background:var(--c-bg);border-radius:4px;border:1px solid var(--c-border);overflow:hidden">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#2a9a4a,${scoreColor});border-radius:4px"></div>
        </div>
        <div style="font-size:13px;font-weight:700;color:${scoreColor};white-space:nowrap">${total}/20 — ${scoreLabel}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 240px;flex:1;overflow:hidden;min-height:0">
        <div style="padding:14px 22px;overflow-y:auto;display:flex;flex-direction:column;gap:7px">
          ${scores.map(s=>{
            const dotColor=s.val===2?'#f0c060':s.val===1?d.color:'var(--c-border)';
            const bg=s.val===2?'#f0c06012':s.val===1?d.color+'0e':'transparent';
            const label=s.val===2?'STRONGHOLD':s.val===1?'PRÉSENT':'ABSENT';
            return `<div style="display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:var(--radius);border:1px solid ${s.val>0?dotColor+'33':'var(--c-border)'};background:${bg}">
              <span style="font-size:15px;flex-shrink:0">${s.icon}</span>
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;font-weight:600;color:${s.val>0?'var(--c-text1)':'var(--c-text4)'}">${s.label}</div>
                <div style="font-size:9px;color:var(--c-text4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.desc}</div>
              </div>
              <div style="display:flex;gap:4px;flex-shrink:0">
                <div style="width:8px;height:8px;border-radius:50%;background:${s.val>=1?dotColor:'var(--c-bg)'};border:1px solid ${s.val>=1?dotColor:'var(--c-border)'}"></div>
                <div style="width:8px;height:8px;border-radius:50%;background:${s.val>=2?dotColor:'var(--c-bg)'};border:1px solid ${s.val>=2?dotColor:'var(--c-border)'}"></div>
              </div>
              <div style="font-size:8px;font-weight:700;color:${dotColor};width:60px;text-align:right;font-family:Rajdhani,sans-serif;letter-spacing:.05em">${label}</div>
            </div>`;
          }).join('')}
        </div>
        <div style="border-left:1px solid var(--c-border);padding:16px;display:flex;flex-direction:column;align-items:center;gap:12px">
          <div style="font-size:10px;font-weight:700;letter-spacing:.1em;color:var(--c-text3);text-transform:uppercase">Profil radar</div>
          <svg viewBox="0 0 ${radarSize*2} ${radarSize*2}" style="width:200px;height:200px" xmlns="http://www.w3.org/2000/svg">
            <path d="${gridPath}" fill="none" stroke="var(--c-border)" stroke-width=".8" opacity=".6"/>
            ${gridLines}
            <path d="${radarPath}" fill="${d.color}33" stroke="${d.color}" stroke-width="1.5" stroke-linejoin="round"/>
            ${radarPoints.map((p,i)=>scores[i].val>0?`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="${scores[i].val===2?'#f0c060':d.color}" stroke="var(--c-bg1)" stroke-width="1"/>`:'').join('')}
            ${radarPoints.map((p,i)=>`<text x="${p.lx.toFixed(1)}" y="${p.ly.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="11">${scores[i].icon}</text>`).join('')}
          </svg>
        </div>
      </div>
    </div>
  `;
}
