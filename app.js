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
  if (isCap)           return '#cc3030';
  if (isAtked && isMe) return '#2a6aaa';
  if (isAtked)         return '#c87020';
  if (owner)           return isMe ? '#1a8a4a' : owner.color;
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
        idees:    [1,2,3,4].map(i => {
          const img  = (r[`idee${i}_img`]  || '').trim();
          const nom  = (r[`idee${i}_nom`]  || '').trim();
          const type = (r[`idee${i}_type`] || '').trim().toLowerCase();
          if (!img && !nom) return null;
          return {
            img,
            nom,
            type:  ['bonus','malus','neutre'].includes(type) ? type : 'neutre',
            court: (r[`idee${i}_court`] || '').trim(),
            long:  (r[`idee${i}_long`]  || '').trim(),
            effet: (r[`idee${i}_effet`] || '').trim(),
          };
        }),
      };
    });

    window.VV.NATIONS = nations; // pour mapmode-influence.js

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
    ${canA?`<button class="btn btn-danger btn-full" style="margin-top:10px" id="panel-atk-btn"><i class="ti ti-sword"></i> Déclarer une attaque</button>`:''}
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

// ---- IDÉES NATIONALES --------------------------------------
(function injectIdeeStyles() {
  if (document.getElementById('vv-idees-style')) return;
  const s = document.createElement('style');
  s.id = 'vv-idees-style';
  s.textContent = `
    .idees-section { padding: 0 12px 10px; }
    .idees-label { font-size:9px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--c-text3);font-family:Rajdhani,sans-serif;margin-bottom:6px; }
    .idees-row { display:flex;gap:8px;align-items:flex-start; }
    .idee-slot { position:relative;width:58px;height:58px;flex-shrink:0;cursor:pointer; }
    .idee-slot .pw { width:58px;height:58px;position:relative;transition:transform .28s cubic-bezier(.34,1.56,.64,1);filter:drop-shadow(0 2px 6px rgba(0,0,0,.6)); }
    .idee-slot:hover .pw { transform:scale(1.18) translateY(-4px); }
    .idee-slot .pimg { position:absolute;top:0;left:0;width:58px;height:58px;clip-path:polygon(50% 4%,97% 33%,79% 92%,21% 92%,3% 33%);overflow:hidden; }
    .idee-slot .pimg img { width:100%;height:100%;object-fit:cover;transition:transform .28s ease; }
    .idee-slot:hover .pimg img { transform:scale(1.1); }
    .idee-slot .pborder { position:absolute;top:0;left:0;width:58px;height:58px;pointer-events:none; }
    .idee-slot .povl { position:absolute;top:0;left:0;width:58px;height:58px;clip-path:polygon(50% 4%,97% 33%,79% 92%,21% 92%,3% 33%);opacity:0;transition:opacity .2s; }
    .idee-slot:hover .povl { opacity:1; }
    .idee-slot.bonus .pw { animation:pvBonus 3s ease-in-out infinite; }
    .idee-slot.malus .pw { animation:pvMalus 2.6s ease-in-out infinite; }
    .idee-slot.neutre .pw { animation:pvNeutre 3.4s ease-in-out infinite; }
    @keyframes pvBonus { 0%,100%{filter:drop-shadow(0 2px 6px rgba(0,0,0,.6))} 50%{filter:drop-shadow(0 2px 12px rgba(60,180,60,.5))} }
    @keyframes pvMalus { 0%,100%{filter:drop-shadow(0 2px 6px rgba(0,0,0,.6))} 50%{filter:drop-shadow(0 2px 12px rgba(200,60,60,.5))} }
    @keyframes pvNeutre { 0%,100%{filter:drop-shadow(0 2px 6px rgba(0,0,0,.6))} 50%{filter:drop-shadow(0 2px 12px rgba(60,130,220,.4))} }
    .idee-slot .itt { position:fixed;width:180px;background:#111820;border:.5px solid rgba(255,255,255,.12);border-radius:9px;padding:9px 11px;pointer-events:none;opacity:0;transition:opacity .18s;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.85); }
    .idee-slot:hover .itt { opacity:1; }
    .itt-name { font-size:11px;font-weight:600;color:#fff;margin-bottom:3px;display:flex;align-items:center;gap:5px; }
    .itt-badge { font-size:8px;font-weight:700;letter-spacing:.06em;padding:1px 5px;border-radius:3px;text-transform:uppercase; }
    .bd-bonus{background:#1f3a1f;color:#5ec95e;border:.5px solid #3d7a3d;}
    .bd-malus{background:#3a1a1a;color:#e06060;border:.5px solid #7a3a3a;}
    .bd-neutre{background:#1a2540;color:#6aabdd;border:.5px solid #3a5f80;}
    .itt-desc { font-size:10px;color:#8a9ab0;line-height:1.45;margin-bottom:4px; }
    .itt-effet { font-size:10px;font-weight:500; }
    .itt-effet.bonus{color:#5ec95e;} .itt-effet.malus{color:#e06060;} .itt-effet.neutre{color:#6aabdd;}
    .idee-empty .pw { animation:none!important; }
    .idee-detail-panel { margin:0 12px 10px;background:rgba(255,255,255,.03);border:.5px solid rgba(255,255,255,.07);border-radius:9px;overflow:hidden;display:none; }
    .idee-detail-panel.open { display:block; }
    .idp-card { display:flex;gap:9px;align-items:flex-start;padding:9px 10px 8px; }
    .idp-thumb { width:52px;height:52px;flex-shrink:0;overflow:hidden;border-radius:6px; }
    .idp-thumb img { width:100%;height:100%;object-fit:cover;display:block; }
    .idp-right { flex:1;min-width:0; }
    .idp-head { display:flex;align-items:flex-start;justify-content:space-between;gap:4px;margin-bottom:3px; }
    .idp-title { font-size:12px;font-weight:700;font-family:Rajdhani,sans-serif;color:var(--c-text1);line-height:1.3; }
    .idp-court { font-size:10px;color:var(--c-text3);margin-bottom:5px;line-height:1.4; }
    .idp-close { background:none;border:none;color:var(--c-text3);cursor:pointer;font-size:12px;padding:0;line-height:1;flex-shrink:0; }
    .idp-close:hover { color:var(--c-text1); }
    .idp-desc { font-size:10px;color:var(--c-text2);line-height:1.55;margin:6px 10px 7px;padding-top:6px;border-top:.5px solid rgba(255,255,255,.06); }
    .idp-effet { font-size:10px;font-weight:500;padding:4px 8px;border-radius:5px;display:inline-flex;align-items:center;gap:4px;margin:0 10px 9px; }
    .idp-effet.bonus{background:#1a2e1a;color:#5ec95e;} .idp-effet.malus{background:#2e1a1a;color:#e06060;} .idp-effet.neutre{background:#1a2333;color:#6aabdd;}
  `;
  document.head.appendChild(s);
})();

const IDEE_PTS = '50,4 97,33 79,92 21,92 3,33';

function renderIdeeNationales(idees, zoneKey) {
  const filled = (idees||[]).filter(Boolean);
  const slots  = [...filled, ...Array(4 - filled.length).fill(null)];

  const slotsHTML = slots.map((idea, i) => {
    if (!idea) {
      return `<div class="idee-slot idee-empty">
        <div class="pw">
          <svg class="pborder" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <polygon points="${IDEE_PTS}" fill="#1e2a38" stroke="#2e3e50" stroke-width="1.5" stroke-dasharray="4 2"/>
            <text x="50" y="57" text-anchor="middle" fill="#2e3e50" font-size="22">+</text>
          </svg>
        </div>
      </div>`;
    }
    const bl  = idea.type==='bonus' ? 'Bonus' : idea.type==='malus' ? 'Malus' : 'Neutre';
    const arr = idea.type==='bonus' ? '\u25b2' : idea.type==='malus' ? '\u25bc' : '\u25c6';
    return `<div class="idee-slot ${idea.type}" data-idee="${i}" data-zone="${zoneKey}">
      <div class="pw">
        <div class="pimg"><img src="${idea.img}" alt="${idea.nom}" loading="lazy"></div>
        <div class="pborder"></div>
      </div>
      <div class="itt">
        <div class="itt-name">${idea.nom}<span class="itt-badge bd-${idea.type}">${bl}</span></div>
        ${idea.court ? `<div class="itt-desc">${idea.court}</div>` : ''}
        ${idea.effet ? `<div class="itt-effet ${idea.type}">${arr} ${idea.effet}</div>` : ''}
      </div>
    </div>`;
  }).join('');

  return `
    <div class="idees-section">
      <div class="idees-label">Id\u00e9es nationales</div>
      <div class="idees-row" id="idees-row-${zoneKey}">${slotsHTML}</div>
    </div>
    <div class="idee-detail-panel" id="idee-detail-${zoneKey}"></div>
  `;
}

function bindIdeeClicks(zoneKey, idees) {
  const row    = document.getElementById(`idees-row-${zoneKey}`);
  const detail = document.getElementById(`idee-detail-${zoneKey}`);
  if (!row || !detail) return;
  let openIdx = null;
  const filled = (idees||[]).filter(Boolean);
  row.querySelectorAll('.idee-slot[data-idee]').forEach(el => {
    const i    = parseInt(el.dataset.idee);
    const idea = filled[i];
    if (!idea) return;
    el.addEventListener('mouseenter', () => {
      const tt  = el.querySelector('.itt');
      if (!tt) return;
      const r   = el.getBoundingClientRect();
      const ttW = 180;
      let left  = r.left + r.width/2 - ttW/2;
      left = Math.max(8, Math.min(left, window.innerWidth - ttW - 8));
      tt.style.left = left + 'px';
      tt.style.top  = (r.top - tt.offsetHeight - 10) + 'px';
    });
    el.addEventListener('click', () => {
      if (openIdx === i) { detail.classList.remove('open'); openIdx = null; return; }
      openIdx = i;
      const arr = idea.type==='bonus' ? '\u25b2' : idea.type==='malus' ? '\u25bc' : '\u25c6';
      detail.innerHTML = `
        <div class="idp-card">
          <div class="idp-thumb"><img src="${idea.img}" alt="${idea.nom}" loading="lazy"></div>
          <div class="idp-right">
            <div class="idp-head">
              <div class="idp-title">${idea.nom}</div>
              <button class="idp-close" onclick="this.closest('.idee-detail-panel').classList.remove('open')">✕</button>
            </div>
            ${idea.court ? `<div class="idp-court">${idea.court}</div>` : ''}
            ${idea.effet ? `<div class="idp-effet ${idea.type}" style="margin:0;padding:3px 7px">${arr} ${idea.effet}</div>` : ''}
          </div>
        </div>
        ${idea.long ? `<div class="idp-desc">${idea.long}</div>` : ''}`;
      detail.classList.add('open');
    });
  });
}

// ---- ÉTAT LOCAL CRISES
let _criseModal = null;

function getChefPantheon(dieuId) {
  const faction = getFaction(dieuId);
  if (!faction) return null;
  const key = Object.keys(FACTIONS).find(k => FACTIONS[k].name === faction.name);
  return key ? getD(PANTHEON_CHIEFS[key]) : null;
}

function getBonusIdees(zoneName) {
  const nation = nations[zoneName] || {};
  return (nation.idees || []).filter(Boolean).filter(i => i.type === 'bonus');
}

function getAllDeities() {
  return window.VV.DEITIES.filter(d => d.id !== me?.id && d.pi > 0);
}

function piEcart(dieuId) {
  if (!me) return 999;
  const chef = getChefPantheon(dieuId);
  if (!chef) return 0;
  return Math.abs(me.pi - chef.pi);
}

function addLocalNotif(notif) {
  _notifications.unshift({ ...notif, id: Date.now() });
  updateNotifBadge();
}

function openCriseModal(zoneName, criseType, criseIntensity) {
  if (!me) return;

  const st      = window.VV.SITUATION_TYPES[criseType] || {};
  const color   = window.VV.getSituationColor(criseType, criseIntensity) || '#ff9944';
  const ecart   = piEcart(me.id);
  const autoSacr = ecart <= 10;
  const bonusIdees = getBonusIdees(zoneName);
  const allDeities = getAllDeities();

  _criseModal = { zoneName, criseType, criseIntensity, option: null, invites: [], ideeIdx: null };

  // Overlay
  let overlay = document.getElementById('crise-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'crise-overlay';
    document.body.appendChild(overlay);
  }
  overlay.className = '';

  overlay.innerHTML = `
    <div class="crise-modal">
      <div class="cm-header">
        <button class="cm-close" onclick="closeCriseModal()">✕</button>
        <div class="cm-title">Gestion de crise</div>
        <div class="cm-sub">
          <span style="color:${color}">● ${st.label||criseType} niv.${criseIntensity}</span>
          &nbsp;·&nbsp; ${zoneName}
        </div>
      </div>
      <div class="cm-body">
        <div class="cm-section-title">Choisir une action</div>

        <!-- Option 1 : Inviter des alliés -->
        <div class="cm-option" id="cm-opt-invite" onclick="selectCriseOption('invite')">
          <div class="cm-opt-title">
            <span class="cm-opt-icon">🤝</span> Inviter des alliés
          </div>
          <div class="cm-opt-desc">Lance une coalition. Les divinités invitées reçoivent une notification. Personne ne peut intervenir seul tant que la coalition est active. La liste des participants est visible par tous.</div>
        </div>

        <!-- Option 2 : Gérer solo -->
        <div class="cm-option" id="cm-opt-solo" onclick="selectCriseOption('solo')">
          <div class="cm-opt-title">
            <span class="cm-opt-icon">⚡</span> Gérer solo
          </div>
          <div class="cm-opt-desc">Action immédiate. Aucune intervention extérieure possible. Bloque une de tes attaques ce round.</div>
        </div>

        <!-- Option 3 : Sacrifier un bonus national -->
        <div class="cm-option ${bonusIdees.length === 0 ? 'disabled' : ''}" id="cm-opt-sacrifice" onclick="selectCriseOption('sacrifice')">
          <div class="cm-opt-title">
            <span class="cm-opt-icon">🔥</span> Sacrifier un bonus national
            ${autoSacr
              ? `<span class="cm-opt-badge badge-auto">Auto-validé</span>`
              : `<span class="cm-opt-badge badge-chef">Aval du chef requis</span>`}
          </div>
          <div class="cm-opt-desc">
            ${bonusIdees.length === 0
              ? 'Aucun bonus national disponible sur ce territoire.'
              : autoSacr
                ? `Écart de ${ecart} PI avec le chef (≤10). Validation automatique. La crise est gérée sans action et ton attaque est libérée ce round.`
                : `Écart de ${ecart} PI avec le chef (>10). Le chef de panthéon devra approuver. Si accepté : aucune action requise et ton attaque est libérée.`
            }
          </div>
        </div>

        <!-- Sous-section invite : liste divinités -->
        <div id="cm-invite-section" style="display:none">
          <div class="cm-section-title">Sélectionner les divinités à inviter</div>
          <div class="cm-deity-list">
            ${allDeities.map(d => `
              <div class="cm-deity-row" id="cm-d-${d.id}" onclick="toggleInvite('${d.id}')">
                <div class="cm-deity-avatar">${d.avatar ? `<img src="${d.avatar}" style="width:26px;height:26px;border-radius:50%;object-fit:cover">` : d.name.slice(0,2).toUpperCase()}</div>
                <div class="cm-deity-name">${d.name}</div>
                <div class="cm-deity-pi">${d.pi} PI</div>
                <div class="cm-check"></div>
              </div>`).join('')}
          </div>
        </div>

        <!-- Sous-section sacrifice : liste bonus -->
        <div id="cm-sacrifice-section" style="display:none">
          <div class="cm-section-title">Choisir le bonus à sacrifier</div>
          ${bonusIdees.map((idee, i) => `
            <div class="cm-idee-row" id="cm-idee-${i}" onclick="selectIdee(${i})">
              ${idee.img ? `<img class="cm-idee-img" src="${idee.img}" alt="${idee.nom}">` : ''}
              <div>
                <div class="cm-idee-name">${idee.nom}</div>
                <div class="cm-idee-effect">▲ ${idee.effet || ''}</div>
              </div>
            </div>`).join('')}
        </div>

      </div>
      <div class="cm-footer">
        <button class="cm-btn cm-btn-cancel" onclick="closeCriseModal()">Annuler</button>
        <button class="cm-btn cm-btn-confirm" id="cm-confirm-btn" disabled onclick="confirmCrise()">Confirmer</button>
      </div>
    </div>`;
}

function selectCriseOption(opt) {
  _criseModal.option  = opt;
  _criseModal.invites = [];
  _criseModal.ideeIdx = null;

  ['invite','solo','sacrifice'].forEach(o => {
    document.getElementById(`cm-opt-${o}`)?.classList.toggle('selected', o === opt);
  });
  document.getElementById('cm-invite-section').style.display   = opt === 'invite'   ? 'block' : 'none';
  document.getElementById('cm-sacrifice-section').style.display = opt === 'sacrifice' ? 'block' : 'none';

  const btn = document.getElementById('cm-confirm-btn');
  if (opt === 'solo') { btn.disabled = false; return; }
  btn.disabled = true;
}

function toggleInvite(dieuId) {
  const idx = _criseModal.invites.indexOf(dieuId);
  if (idx === -1) _criseModal.invites.push(dieuId);
  else _criseModal.invites.splice(idx, 1);
  document.getElementById(`cm-d-${dieuId}`)?.classList.toggle('checked', idx === -1);
  document.getElementById('cm-confirm-btn').disabled = _criseModal.invites.length === 0;
}

function selectIdee(i) {
  _criseModal.ideeIdx = i;
  document.querySelectorAll('.cm-idee-row').forEach((el, j) => el.classList.toggle('selected', j === i));
  document.getElementById('cm-confirm-btn').disabled = false;
}

function closeCriseModal() {
  const overlay = document.getElementById('crise-overlay');
  if (overlay) overlay.className = 'hidden';
  _criseModal = null;
}

async function confirmCrise() {
  if (!_criseModal || !me) return;
  const { zoneName, criseType, criseIntensity, option, invites, ideeIdx } = _criseModal;
  const btn = document.getElementById('cm-confirm-btn');
  btn.disabled = true;
  btn.textContent = '…';

  try {
    if (option === 'invite') {
      // Envoyer notifs à chaque divinité invitée
      await postScript({
        action:      'crise_invitation',
        zone:        zoneName,
        crise_type:  criseType,
        initiateur:  me.id,
        invites:     invites,
        cycle:       window.VV.CYCLE || CYCLE,
      });
      // Notif locale de confirmation
      addLocalNotif({
        title: 'Coalition lancée',
        desc:  `Invitations envoyées à ${invites.length} divinité(s) pour la crise de ${zoneName}.`,
        read:  true,
      });

    } else if (option === 'solo') {
      await postScript({
        action:     'crise_solo',
        zone:       zoneName,
        crise_type: criseType,
        dieu:       me.id,
        cycle:      window.VV.CYCLE || CYCLE,
      });

    } else if (option === 'sacrifice') {
      const nation    = nations[zoneName] || {};
      const bonusIdees = (nation.idees || []).filter(Boolean).filter(i => i.type === 'bonus');
      const idee      = bonusIdees[ideeIdx];
      const autoSacr  = piEcart(me.id) <= 10;
      const chef      = getChefPantheon(me.id);

      await postScript({
        action:      'crise_sacrifice',
        zone:        zoneName,
        crise_type:  criseType,
        dieu:        me.id,
        idee_nom:    idee.nom,
        auto:        autoSacr,
        chef_id:     chef?.id || '',
        cycle:       window.VV.CYCLE || CYCLE,
      });

      if (!autoSacr && chef) {
        // Notif au chef côté serveur — envoyer notification
        await postScript({
          action:      'notif_chef',
          destinataire: chef.id,
          type:        'sacrifice_approval',
          zone:        zoneName,
          crise_type:  criseType,
          dieu:        me.id,
          idee_nom:    idee.nom,
          cycle:       window.VV.CYCLE || CYCLE,
        });
        addLocalNotif({
          title: 'Approbation requise',
          desc:  `Le chef ${chef.name} doit approuver le sacrifice de "${idee.nom}". En attente…`,
          read:  true,
        });
      } else {
        addLocalNotif({
          title: 'Sacrifice validé',
          desc:  `"${idee.nom}" sera retiré à la fin du tour. Ton attaque est libérée ce round.`,
          read:  true,
        });
      }
    }

    closeCriseModal();
  } catch(e) {
    btn.disabled = false;
    btn.textContent = 'Confirmer';
    console.error('[VV Crises]', e);
  }
}

// ---- EXPOSITION GLOBALE DES FONCTIONS CRISES ---------------
window.openCriseModal     = openCriseModal;
window.selectCriseOption  = selectCriseOption;
window.toggleInvite       = toggleInvite;
window.selectIdee         = selectIdee;
window.closeCriseModal    = closeCriseModal;
window.confirmCrise       = confirmCrise;

function renderCrisesPanel(zoneName) {
  const sits = (window.VV.situations || []).filter(s => s.zone === zoneName);
  if (!sits.length) return;

  const canManage = !!me;
  const items = sits.map(s => {
    const color = window.VV.getSituationColor(s.type, s.intensity) || '#ff9944';
    const st    = window.VV.SITUATION_TYPES[s.type] || {};
    return `
      <div class="crise-item">
        <div class="crise-dot" style="background:${color};box-shadow:0 0 5px ${color}"></div>
        <div class="crise-info">
          <div class="crise-label" style="color:${color}">${st.label||s.type} — Intensité ${s.intensity}</div>
          ${s.desc ? `<div class="crise-desc">${s.desc}</div>` : ''}
        </div>
        ${canManage ? `<button class="crise-btn" onclick="openCriseModal('${zoneName}','${s.type}',${s.intensity})">Gérer</button>` : ''}
      </div>`;
  }).join('');

  const section = document.createElement('div');
  section.className = 'crise-section';
  section.innerHTML = `
    <div class="idees-label" style="color:#ff7744;font-size:9px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;font-family:Rajdhani,sans-serif;padding:10px 12px 4px">⚠ Crises actives</div>
    <div style="padding:0 12px 10px">${items}</div>
  `;

  // Insérer avant les idées nationales si elles existent, sinon à la fin du panel
  const ideeSection = document.querySelector('#panel-inner .idees-section');
  const panelInner  = document.getElementById('panel-inner');
  if (ideeSection) {
    ideeSection.parentNode.insertBefore(section, ideeSection);
  } else if (panelInner) {
    panelInner.appendChild(section);
  }

  // Injecter les styles si pas encore présents
  if (!document.getElementById('vv-crises-style-local')) {
    const st = document.createElement('style');
    st.id = 'vv-crises-style-local';
    st.textContent = `
      .crise-item { display:flex;align-items:flex-start;gap:8px;padding:7px 9px;border-radius:7px;margin-bottom:5px;background:rgba(255,255,255,.03);border:.5px solid rgba(255,255,255,.07); }
      .crise-dot  { width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:3px; }
      .crise-info { flex:1;min-width:0; }
      .crise-label{ font-size:11px;font-weight:600;font-family:Rajdhani,sans-serif; }
      .crise-desc { font-size:10px;color:var(--c-text2);margin-top:2px;line-height:1.4; }
      .crise-btn  { font-size:10px;font-weight:600;font-family:Rajdhani,sans-serif;padding:3px 8px;border-radius:5px;border:none;cursor:pointer;background:rgba(255,120,60,.15);color:#ff9955;border:.5px solid rgba(255,120,60,.3);transition:background .15s;white-space:nowrap;flex-shrink:0; }
      .crise-btn:hover { background:rgba(255,120,60,.28); }
    `;
    document.head.appendChild(st);
  }
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
    ${renderIdeeNationales(nation.idees||[], zoneName)}`;

  setPanel(`
    <button class="back-btn" id="back-btn"><i class="ti ti-arrow-left"></i> Vue globale</button>
    ${nationHTML}
    <div class="sec">${zoneName.toUpperCase()} · ${data.territories.length} TERRITOIRE${data.territories.length>1?'S':''}</div>
    ${data.territories.map(t => terrCard(t)).join('')}
  `);

  $('back-btn')?.addEventListener('click', clearZone);
  bindTerrButtons();
  bindIdeeClicks(zoneName, nation.idees);
  renderCrisesPanel(zoneName);
  renderRankingPanel(); // Update active state
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
        <stop offset="0%" stop-color="#c8901a" stop-opacity=".9"/>
        <stop offset="100%" stop-color="#c8901a" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="gS" cx="${left[0]/W}" cy="${left[1]/H}" r="0.85" gradientUnits="objectBoundingBox">
        <stop offset="0%" stop-color="#3a7acc" stop-opacity=".9"/>
        <stop offset="100%" stop-color="#3a7acc" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="gSh" cx="${right[0]/W}" cy="${right[1]/H}" r="0.85" gradientUnits="objectBoundingBox">
        <stop offset="0%" stop-color="#b02828" stop-opacity=".9"/>
        <stop offset="100%" stop-color="#b02828" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <polygon points="${pts}" fill="#06101e" stroke="#1e3048" stroke-width="1"/>
    <polygon points="${pts}" fill="url(#gO)"  clip-path="url(#tc)"/>
    <polygon points="${pts}" fill="url(#gS)"  clip-path="url(#tc)"/>
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
  // Chercher la capitulation directement dans toutes les attaques
  const capAtk = window.VV.attacks.find(a => a.capitulation && a.capitulation === t.id);
  const myCapAtk = me ? window.VV.attacks.find(a => a.attacker===me.id && a.capitulation) : null;
  const capTerr  = myCapAtk ? myCapAtk.capitulation : (capitulation || null);
  const isCap    = capTerr === t.id || (capAtk && me && capAtk.attacker === me.id);
  if (t.id === 'cn_entreprises') console.log('[CAP DEBUG]', t.id, 'capTerr:', capTerr, 'isCap:', isCap, 'me:', me?.id, 'myCapAtk:', myCapAtk, 'capitulation var:', capitulation);
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

  // Org chip avec shatter si capitulation
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

function renderPlayerPanel() {
  if (!me) return;
  const myT = allT().filter(t => t.owner===me.id);
  const atks = myAtks();
  const incoming = window.VV.attacks.filter(a => a.target===me.id);
  const atkdT = Object.values(window.VV.ZONES).flatMap(z=>z.territories).filter(t=>t.owner===me.id&&incoming.some(a=>a.territory===t.id));
  const needCap = incoming.length>=2 && atks.length>=2 && !capitulation;
  const autoDef = incoming.length>0 && !(incoming.length>=2 && atks.length>=2);
  const faction = getFaction(me.id);

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
      </div>
    </div>

    ${needCap?`<div class="notif notif-warn"><b>Choix requis !</b> Sélectionnez le territoire à capituler.</div>`:''}
    ${autoDef?`<div class="notif notif-info">Défense automatique active</div>`:''}

    <div class="sec">Mes attaques (${atks.length}/2)</div>
    ${[0,1].map(i => {
      const a = atks[i];
      return `<div class="slot${a?' atk':''}">
        ${a?`<div class="slot-text atk"><i class="ti ti-sword"></i> ${getD(a.target).name} — ${getT(a.territory)?.name||a.territory}</div>
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
        ${nation.portrait
          ? `<img src="${nation.portrait}" alt="${nation.leader}" style="width:100%;height:100%;object-fit:cover">`
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:28px;color:var(--c-text4)"><i class="ti ti-user"></i></div>`
        }
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-family:Rajdhani,sans-serif;font-size:18px;font-weight:700;color:var(--c-text1);margin-bottom:2px">${nation.leader}</div>
        <div style="font-family:Rajdhani,sans-serif;font-size:12px;color:var(--c-text3);margin-bottom:6px">Leader — ${zoneName}</div>
        ${(d1||d2) ? `<div style="display:flex;gap:6px;align-items:center">
          <span style="font-size:9px;color:var(--c-text4);font-family:Rajdhani,sans-serif;letter-spacing:.06em">INFLUENCES</span>
          ${d1?`<span style="font-size:10px;color:${d1.color};font-family:Rajdhani,sans-serif;font-weight:600">${d1.name}</span>`:''}
          ${d1&&d2?`<span style="color:var(--c-text4)">·</span>`:''}
          ${d2?`<span style="font-size:10px;color:${d2.color};font-family:Rajdhani,sans-serif;font-weight:600">${d2.name}</span>`:''}
        </div>` : ''}
      </div>
    </div>
    ${nation.bio
      ? `<div style="font-size:11px;color:var(--c-text2);line-height:1.7;border-top:1px solid var(--c-border);padding-top:12px">${nation.bio}</div>`
      : `<div style="font-size:10px;color:var(--c-text4);text-align:center;padding:8px 0;border-top:1px solid var(--c-border)">Aucune biographie disponible</div>`
    }
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

// ---- onZoneClick (appelé par globe.js) ---------------------
window.VV.onZoneClick = function(zoneName) {
  if (!zoneName) return;
  window.VV.globe.highlightZone(zoneName);
  selDeity = null; selTrans = null;
  renderDock();
  document.querySelectorAll('.tchip').forEach(c => c.classList.remove('active'));
  renderZonePanel(zoneName);
};

// ---- TICKER ------------------------------------------------
function updateWarningTicker() {
  const ticker = $('warning-ticker');
  if (!ticker) return;
  if (!me) { ticker.className = 'ticker-calm'; ticker.style.display='none'; return; }

  const incoming = window.VV.attacks.filter(a => a.target===me.id);
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

// ---- ATTACKS -----------------------------------------------
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
  btn.disabled = false; btn.innerHTML = '<i class="ti ti-sword"></i> Confirmer l\'attaque';
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

// ---- AUTH --------------------------------------------------
function openLogin() {
  $('login-sel').innerHTML = '<option value="">— Votre divinité —</option>' +
    window.VV.DEITIES.map(d=>`<option value="${d.id}">${d.name}${d.player?` (${d.player})`:''}</option>`).join('');
  $('login-pw').value = '';
  $('login-err').textContent = '';
  openModal('modal-login');
}

function doLogin() {
  const id = $('login-sel').value;
  const pw = $('login-pw').value;
  const d  = getD(id);
  if (!d?.pass || d.pass !== pw) { $('login-err').textContent = 'Identifiants incorrects'; return; }
  me = d;
  closeModal('modal-login');
  const bl = $('btn-login');
  if (bl) bl.innerHTML = `<i class="ti ti-user-check"></i> ${d.name}`;
  const ba = $('btn-admin');
  if (ba) ba.style.display = 'inline-flex';
  selDeity = d.id;
  // Restaurer la capitulation depuis le sheet
  const myCapRow = window.VV.attacks.find(a => a.attacker === d.id && a.capitulation);
  capitulation = myCapRow ? myCapRow.capitulation : null;
  renderDock();
  window.VV.globe.buildDots();
  renderPlayerPanel();
  updateWarningTicker();
  // Charger les notifications de crise
  window.VV.crises?.loadNotifs();
  window.VV.crises?.injectNotifBtn();
  // Afficher le bouton de faction
  showFactionOrgBtn(d.id);
}

function showFactionOrgBtn(deityId) {
  const faction = getFaction(deityId);
  const trigger = document.getElementById('faction-dropdown-trigger');
  const dot = document.getElementById('faction-trigger-dot');
  const label = document.getElementById('faction-trigger-label');

  if (!faction) {
    // Verrouiller tout
    if (trigger) trigger.classList.add('locked');
    ['btn-grande-societe','btn-experreducti','btn-cercle-asimov'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.classList.add('locked'); el.querySelector('.lock-icon')?.style && (el.querySelector('.lock-icon').style.display=''); }
    });
    return;
  }

  // Déverrouiller le trigger
  if (trigger) trigger.classList.remove('locked');
  if (dot) dot.style.background = faction.color;
  if (label) label.textContent = faction.name;

  // Déverrouiller uniquement le bon bouton
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

// ---- ADMIN -------------------------------------------------
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

// ---- MODALS ------------------------------------------------
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

// ---- REFRESH -----------------------------------------------
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

// ---- INIT --------------------------------------------------
async function init() {
  const [, world] = await Promise.all([
    loadData(),
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(r=>r.json()),
  ]);

  window.VV.globe.init(world);
  renderDock();
  renderRankingPanel();
  // Afficher France par défaut
  if (window.VV.ZONES['France']) {
    window.VV.onZoneClick('France');
  } else {
    showPrompt();
  }
  setInterval(fullRefresh, CFG.REFRESH_MIN * 60 * 1000);
}

// ---- EVENTS ------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {

  // Faction filters
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

  // Fandom
  // Historique
  $('btn-hist')?.addEventListener('click', async () => {
    const cycles = await loadHistorique();
    if (!cycles.length) { alert('Aucun historique disponible. Les cycles doivent être clôturés pour créer un historique.'); return; }
    openHistModal(cycles);
  });

  $('btn-fandom')?.addEventListener('click', () => window.open(CFG.FANDOM_URL, '_blank'));

  // Situations
  $('btn-situation')?.addEventListener('click', function() {
    window.VV.showSituations = !window.VV.showSituations;
    this.classList.toggle('active', window.VV.showSituations);
    if (!window.VV.showSituations) {
      window.VV.globe.resetCountryColors(); // redraw inclus
    } else {
      window.VV.globe.drawSituations();
    }
    updateSituationLegend();
  });

  // Login
  $('btn-login')?.addEventListener('click', openLogin);
  $('login-submit')?.addEventListener('click', doLogin);
  $('login-pw')?.addEventListener('keydown', e => { if (e.key==='Enter') doLogin(); });

  // Admin + refresh (protégé par mot de passe)
  $('btn-admin')?.addEventListener('click', () => {
    const pw = prompt('Mot de passe admin :');
    if (pw !== 'VaeVictis2025!') { alert('Mot de passe incorrect.'); return; }
    openAdminPanel();
  });
  $('btn-refresh')?.addEventListener('click', fullRefresh);

  // Attaque
  $('atk-confirm')?.addEventListener('click', confirmAttack);

  // Zoom
  $('zoom-in')?.addEventListener('click',    () => window.VV.globe.zoomIn());
  $('zoom-out')?.addEventListener('click',   () => window.VV.globe.zoomOut());
  $('zoom-reset')?.addEventListener('click', () => window.VV.globe.zoomReset());

  // Transnationales
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

  // Dropdown faction — position fixe pour passer au-dessus du ticker
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
      menu.style.top = (rect.bottom + 6) + 'px';
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

  // Boutons faction (placeholder — fonctionnalité à définir)
  document.getElementById('btn-grande-societe')?.addEventListener('click', () => {
    alert('La Grande Société — fonctionnalité à venir.');
  });
  document.getElementById('btn-experreducti')?.addEventListener('click', () => {
    if (typeof openExperreducti === 'function') {
      openExperreducti(me?.id || null);
    }
  });
  document.getElementById('btn-cercle-asimov')?.addEventListener('click', () => {
    alert("Cercle d'Asimov — fonctionnalité à venir.");
  });

  // Fermer modals
  document.querySelectorAll('[data-close]').forEach(btn =>
    btn.addEventListener('click', () => closeModal(btn.dataset.close))
  );
  document.querySelectorAll('.modal-bg').forEach(bg =>
    bg.addEventListener('click', e => { if (e.target===bg) bg.classList.remove('open'); })
  );

  init();
});
