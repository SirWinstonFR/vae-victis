/* ============================================================
   GRANDE SOCIÉTÉ — Module : Entreprises Américaines
   Ticker Wall Street + Dashboard économique
   Appelé par gsOpenModule('entreprises') dans grande_societe.js
   ============================================================ */

'use strict';

// ---- CONFIG ------------------------------------------------
const CORP_CFG = {
  SHEET_ID:    '1L9hbQuAD9A4WQFG1G47teZlUPM6-JkMmuuX2Ys-TYt8',
  APPS_SCRIPT: 'https://script.google.com/macros/s/AKfycbyCaQI2c5ds2uCmoeCw6_fALjh-8ii05fkOVgZmWPhbY64vyYbrNcFvqbFKRb7rUwyxwQ/exec',
  GIDS: {
    entreprises: '90258',
  },
};

// ---- DONNÉES STATIQUES BASE --------------------------------
// Logos via Clearbit Logo API (public, no CORS)
function corpLogo(domaine, couleur) {
  return `<img src="https://logo.clearbit.com/${domaine}" 
    style="width:28px;height:28px;object-fit:contain;border-radius:6px"
    onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
    alt=""/>
  <div style="display:none;width:28px;height:28px;border-radius:6px;background:${couleur}22;
    align-items:center;justify-content:center;font-size:14px;border:1px solid ${couleur}44">
    ${couleur === '#a0a8b8' ? '🍎' : '🏢'}
  </div>`;
}

const CORP_BASE = {
  apple:     { ticker:'AAPL', nom:'Apple Inc.',         secteur:'Big Tech',  couleur:'#a0a8b8', logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/240px-Apple_logo_black.svg.png', icon:'🍎', desc:'Devices, logiciels et services premium. Capitalisation la plus haute au monde.' },
  microsoft: { ticker:'MSFT', nom:'Microsoft Corp.',    secteur:'Big Tech',  couleur:'#4a8ad4', logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/240px-Microsoft_logo.svg.png', icon:'🪟', desc:'Cloud Azure, Office 365, Xbox. Domination du marché B2B mondial.' },
  google:    { ticker:'GOOGL', nom:'Alphabet Inc.',     secteur:'Big Tech',  couleur:'#e8b030', logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/240px-Google_2015_logo.svg.png', icon:'🔍', desc:'Moteur de recherche, YouTube, publicité numérique et IA.' },
  amazon:    { ticker:'AMZN', nom:'Amazon.com Inc.',    secteur:'Big Tech',  couleur:'#f0a020', logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/240px-Amazon_logo.svg.png', icon:'📦', desc:'E-commerce mondial, cloud AWS, logistique et streaming.' },
  meta:      { ticker:'META', nom:'Meta Platforms',     secteur:'Big Tech',  couleur:'#1a7adc', logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Meta_Platforms_Inc._logo.svg/240px-Meta_Platforms_Inc._logo.svg.png', icon:'👁', desc:'Facebook, Instagram, WhatsApp. 3 milliards d\'utilisateurs actifs.' },
  nvidia:    { ticker:'NVDA', nom:'NVIDIA Corp.',       secteur:'Big Tech',  couleur:'#76b900', logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Nvidia_logo.svg/240px-Nvidia_logo.svg.png', icon:'⚡', desc:'Puces GPU, IA et data centers. Moteur de la révolution IA.' },
  exxon:     { ticker:'XOM',  nom:'ExxonMobil Corp.',   secteur:'Énergie',   couleur:'#cc3030', logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/ExxonMobil_Logo.svg/240px-ExxonMobil_Logo.svg.png', icon:'🛢', desc:'Première major pétrolière américaine. Présence dans 50+ pays.' },
  jpmorgan:  { ticker:'JPM',  nom:'JPMorgan Chase',     secteur:'Finance',   couleur:'#2a6aaa', logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/J_P_Morgan_Logo_2008_1.svg/240px-J_P_Morgan_Logo_2008_1.svg.png', icon:'🏦', desc:'Première banque américaine. 3,9 trillions de dollars d\'actifs.' },
  lockheed:  { ticker:'LMT',  nom:'Lockheed Martin',    secteur:'Défense',   couleur:'#5a7a9a', logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Lockheed_Martin_logo.svg/240px-Lockheed_Martin_logo.svg.png', icon:'🚀', desc:'Premier contractant de défense américain. F-35, missiles, spatial.' },
};

const SECTEUR_COULEUR = {
  'Big Tech': '#4a8ad4',
  'Énergie':  '#cc3030',
  'Finance':  '#2a6aaa',
  'Défense':  '#5a7a9a',
};

// ---- ÉTAT --------------------------------------------------
let corpData = {
  entreprises: [],  // depuis Sheet
  macro: {},        // PIB, dette, etc.
};
let corpSelectedId = null;
let corpContainer  = null;

// ---- FETCH -------------------------------------------------
async function corpFetch() {
  if (!CORP_CFG.GIDS.entreprises) return [];
  const url = `https://docs.google.com/spreadsheets/d/${CORP_CFG.SHEET_ID}/gviz/tq?tqx=out:json&gid=${CORP_CFG.GIDS.entreprises}`;
  try {
    const r   = await fetch(url);
    const raw = await r.text();
    const m   = raw.match(/setResponse\(([\s\S]*)\)/);
    if (!m) return [];
    const data = JSON.parse(m[1]);
    const rows = data.table.rows || [];
    if (!rows.length) return [];
    let cols = data.table.cols.map(c => (c.label || '').trim().replace(/^"+|"+$/g, ''));
    if (!cols.some(c => c.length > 0)) {
      cols = rows[0].c.map(c => String(c?.v ?? '').trim());
      return rows.slice(1).map(r => Object.fromEntries(cols.map((col, i) => [col, String(r?.c?.[i]?.v ?? '').trim()])));
    }
    return rows.map(r => Object.fromEntries(cols.map((col, i) => [col, String(r?.c?.[i]?.v ?? '').trim()])));
  } catch(e) { console.warn('[CORP] fetch:', e); return []; }
}

async function corpLoadData() {
  const rows = await corpFetch();
  corpData.entreprises = [];
  corpData.macro = {};

  rows.forEach(r => {
    const type = (r.type || '').trim().toLowerCase();

    if (type === 'macro') {
      corpData.macro[(r.cle || '').trim()] = (r.valeur || '').trim();
    }

    if (type === 'entreprise') {
      const id   = (r.id || '').trim().toLowerCase();
      const base = CORP_BASE[id] || {};
      corpData.entreprises.push({
        id,
        logo:       (r.logo       || base.logo    || '').trim(),
        ticker:     (r.ticker     || base.ticker  || id.toUpperCase()).trim(),
        nom:        (r.nom        || base.nom      || id).trim(),
        secteur:    (r.secteur    || base.secteur  || '').trim(),
        couleur:    (r.couleur    || base.couleur  || '#4a8ad4').trim(),
        icon:       base.icon || '🏢',
        desc:       (r.desc       || base.desc     || '').trim(),
        capMrd:     (r.cap_mrd    || '0').trim(),      // capitalisation en Mrd$
        variation:  (r.variation  || '0').trim(),      // % variation
        ca:         (r.ca_mrd     || '').trim(),       // chiffre d'affaires
        employes:   (r.employes   || '').trim(),
        pays:       (r.pays       || 'USA').trim(),
        influence:  (r.influence  || '').trim(),       // impact géopolitique
      });
    }
  });

  // Trier par capitalisation décroissante
  corpData.entreprises.sort((a, b) => parseFloat(b.capMrd) - parseFloat(a.capMrd));
}

// ---- RENDER PRINCIPAL --------------------------------------
async function renderEntreprises(container, deityOverride) {
  if (!container) return;
  corpContainer  = container;
  corpSelectedId = null;

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100%;
      color:#c8a84b;font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:.1em;gap:10px">
      <div style="width:6px;height:6px;border-radius:50%;background:#c8a84b;animation:corp-blink 1s infinite"></div>
      CONNEXION AU RÉSEAU FINANCIER…
    </div>`;

  corpInjectStyles();
  await corpLoadData();
  corpRenderInterface();
}

function corpRenderInterface() {
  const macro = corpData.macro;
  const total = corpData.entreprises.reduce((s, e) => s + (parseFloat(e.capMrd) || 0), 0);

  // Ticker items
  const tickerItems = corpData.entreprises.map(e => {
    const v    = parseFloat(e.variation) || 0;
    const sign = v >= 0 ? '+' : '';
    const col  = v >= 0 ? '#2a8a3a' : '#cc3030';
    return `<span class="corp-tick-item">
      <span class="corp-tick-ticker" style="color:#c8a84b">${e.ticker}</span>
      <span class="corp-tick-cap">${parseFloat(e.capMrd).toLocaleString('fr-FR')} Md$</span>
      <span class="corp-tick-var" style="color:${col}">${sign}${v}%</span>
    </span>
    <span class="corp-tick-sep">◆</span>`;
  }).join('');

  corpContainer.innerHTML = `
    <div class="corp-root">

      <!-- TICKER WALL STREET -->
      <div class="corp-ticker-wrap">
        <div class="corp-ticker-label">NYSE · NASDAQ</div>
        <div class="corp-ticker-track">
          <div class="corp-ticker-content">
            ${tickerItems}${tickerItems}
          </div>
        </div>
        <div class="corp-ticker-time" id="corp-clock"></div>
      </div>

      <!-- HEADER MACRO -->
      <div class="corp-macro-bar">
        ${corpMacroStat('PIB américain', macro.pib || '28,8 T$', '#c8a84b')}
        ${corpMacroStat('Dette nationale', macro.dette || '34,5 T$', '#cc3030')}
        ${corpMacroStat('Cap. boursière totale', total.toLocaleString('fr-FR') + ' Md$', '#4a8ad4')}
        ${corpMacroStat('Part PIB mondial', macro.part_pib || '26%', '#2a8a3a')}
        ${corpMacroStat('Taux Fed', macro.taux_fed || '5,25%', '#c8a84b')}
        ${corpMacroStat('Chômage', macro.chomage || '3,9%', '#2a8a3a')}
      </div>

      <!-- CORPS -->
      <div class="corp-body">

        <!-- TREEMAP / LISTE ENTREPRISES -->
        <div class="corp-left">
          <div class="corp-section-title">CHAMPIONS AMÉRICAINS — CAPITALISATION BOURSIÈRE</div>
          <div class="corp-grid" id="corp-grid">
            ${corpRenderGrid()}
          </div>
        </div>

        <!-- FICHE ENTREPRISE -->
        <div class="corp-right" id="corp-fiche">
          ${corpRenderFicheVide()}
        </div>

      </div>
    </div>
  `;

  // Horloge
  corpStartClock();

  // Bind clics
  document.querySelectorAll('.corp-card').forEach(el => {
    el.addEventListener('click', () => corpOpenFiche(el.dataset.id));
  });
}

function corpMacroStat(label, valeur, couleur) {
  return `
    <div class="corp-macro-stat">
      <div class="corp-macro-val" style="color:${couleur}">${valeur}</div>
      <div class="corp-macro-label">${label}</div>
    </div>`;
}

function corpRenderGrid() {
  if (!corpData.entreprises.length) {
    return `<div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:#2a3a54;padding:20px;text-align:center">
      Aucune entreprise dans le Sheet — ajoutez des lignes type=entreprise
    </div>`;
  }

  const maxCap = Math.max(...corpData.entreprises.map(e => parseFloat(e.capMrd) || 0));

  return corpData.entreprises.map(e => {
    const cap    = parseFloat(e.capMrd) || 0;
    const v      = parseFloat(e.variation) || 0;
    const sign   = v >= 0 ? '+' : '';
    const vCol   = v >= 0 ? '#2a8a3a' : '#cc3030';
    const sizePct= Math.max(20, Math.round(cap / maxCap * 100));
    const sc     = SECTEUR_COULEUR[e.secteur] || e.couleur;
    const isOpen = corpSelectedId === e.id;

    return `
      <div class="corp-card${isOpen ? ' corp-card-active' : ''}" data-id="${e.id}"
        style="--corp-color:${e.couleur};border-color:${isOpen ? e.couleur : e.couleur + '33'}">
        <div class="corp-card-top">
          <div class="corp-card-icon" style="width:28px;height:28px;display:flex;align-items:center;justify-content:center">
          ${e.logo
            ? `<img src="${e.logo}"
                style="width:28px;height:28px;object-fit:contain;border-radius:6px"
                onerror="this.style.display='none'" alt="${e.ticker}"/>`
            : `<span style="font-size:20px">${e.icon}</span>`
          }
        </div>
          <div style="flex:1;min-width:0">
            <div class="corp-card-ticker" style="color:${e.couleur}">${e.ticker}</div>
            <div class="corp-card-nom">${e.nom}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div class="corp-card-cap">${parseFloat(e.capMrd).toLocaleString('fr-FR')} Md$</div>
            <div class="corp-card-var" style="color:${vCol}">${sign}${v}%</div>
          </div>
        </div>
        <!-- Barre de capitalisation relative -->
        <div class="corp-cap-bar-wrap">
          <div class="corp-cap-bar" style="width:${sizePct}%;background:${e.couleur}"></div>
        </div>
        <div class="corp-card-secteur" style="color:${sc}">${e.secteur}</div>
      </div>`;
  }).join('');
}

function corpRenderFicheVide() {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
      height:100%;gap:10px;opacity:.3">
      <div style="font-size:32px">📊</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:#2a3a54;letter-spacing:.1em;text-align:center">
        SÉLECTIONNEZ UNE ENTREPRISE
      </div>
    </div>`;
}

function corpOpenFiche(id) {
  corpSelectedId = id;
  const e = corpData.entreprises.find(x => x.id === id);
  if (!e) return;

  // Mettre à jour la grille
  document.querySelectorAll('.corp-card').forEach(el => {
    el.classList.toggle('corp-card-active', el.dataset.id === id);
    el.style.borderColor = el.dataset.id === id ? (CORP_BASE[el.dataset.id]?.couleur || '#c8a84b') : (CORP_BASE[el.dataset.id]?.couleur || '#c8a84b') + '33';
  });

  const v    = parseFloat(e.variation) || 0;
  const sign = v >= 0 ? '+' : '';
  const vCol = v >= 0 ? '#2a8a3a' : '#cc3030';
  const sc   = SECTEUR_COULEUR[e.secteur] || e.couleur;

  const fiche = document.getElementById('corp-fiche');
  if (!fiche) return;

  fiche.innerHTML = `
    <div class="corp-fiche-inner" style="animation:corp-fadein .25s ease">

      <!-- En-tête -->
      <div class="corp-fiche-header" style="border-color:${e.couleur}44">
        <div class="corp-fiche-icon" style="width:48px;height:48px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
        ${e.logo
          ? `<img src="${e.logo}"
              style="width:48px;height:48px;object-fit:contain;border-radius:10px"
              onerror="this.style.display='none'" alt="${e.ticker}"/>`
          : `<span style="font-size:32px">${e.icon}</span>`
        }
      </div>
        <div style="flex:1;min-width:0">
          <div class="corp-fiche-nom" style="color:${e.couleur}">${e.nom}</div>
          <div class="corp-fiche-ticker-line">
            <span class="corp-fiche-ticker" style="border-color:${e.couleur}44;color:${e.couleur}">${e.ticker}</span>
            <span class="corp-fiche-secteur" style="color:${sc}">${e.secteur}</span>
            <span style="font-size:9px;color:#3a5060;font-family:'Share Tech Mono',monospace">${e.pays}</span>
          </div>
        </div>
      </div>

      <!-- Chiffres clés -->
      <div class="corp-fiche-stats">
        <div class="corp-fiche-stat">
          <div class="corp-fiche-stat-val" style="color:${e.couleur}">${parseFloat(e.capMrd).toLocaleString('fr-FR')} Md$</div>
          <div class="corp-fiche-stat-label">Capitalisation</div>
        </div>
        <div class="corp-fiche-stat">
          <div class="corp-fiche-stat-val" style="color:${vCol}">${sign}${v}%</div>
          <div class="corp-fiche-stat-label">Variation cycle</div>
        </div>
        ${e.ca ? `<div class="corp-fiche-stat">
          <div class="corp-fiche-stat-val" style="color:#8a9ab0">${e.ca} Md$</div>
          <div class="corp-fiche-stat-label">Chiffre d'affaires</div>
        </div>` : ''}
        ${e.employes ? `<div class="corp-fiche-stat">
          <div class="corp-fiche-stat-val" style="color:#8a9ab0">${parseInt(e.employes).toLocaleString('fr-FR')}</div>
          <div class="corp-fiche-stat-label">Employés</div>
        </div>` : ''}
      </div>

      <!-- Barre de poids relatif -->
      <div style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-family:'Share Tech Mono',monospace;font-size:8px;color:#2a3a54;letter-spacing:.1em">POIDS RELATIF</span>
          <span style="font-family:'Share Tech Mono',monospace;font-size:8px;color:${e.couleur}">${Math.round(parseFloat(e.capMrd) / corpData.entreprises.reduce((s,x) => s + (parseFloat(x.capMrd)||0), 0) * 100)}%</span>
        </div>
        <div style="height:6px;background:#0a1628;border-radius:3px;overflow:hidden">
          <div style="height:100%;border-radius:3px;background:${e.couleur};
            width:${Math.round(parseFloat(e.capMrd) / Math.max(...corpData.entreprises.map(x => parseFloat(x.capMrd)||0)) * 100)}%;
            transition:width .6s ease"></div>
        </div>
      </div>

      <!-- Description -->
      ${e.desc ? `
        <div class="corp-section-title">À PROPOS</div>
        <div style="font-size:10px;color:#5a7a9a;line-height:1.7;margin-bottom:14px">${e.desc}</div>
      ` : ''}

      <!-- Influence géopolitique -->
      ${e.influence ? `
        <div class="corp-section-title">INFLUENCE GÉOPOLITIQUE</div>
        <div style="background:#060e1c;border:1px solid ${e.couleur}22;border-radius:6px;padding:10px 12px;
          font-size:10px;color:#8a9ab0;line-height:1.7">${e.influence}</div>
      ` : ''}

    </div>
  `;
}

// ---- HORLOGE -----------------------------------------------
function corpStartClock() {
  function update() {
    const el = document.getElementById('corp-clock');
    if (!el) return;
    const now = new Date();
    // Heure NYSE (UTC-5 ou -4)
    const nyse = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const h = String(nyse.getHours()).padStart(2, '0');
    const m = String(nyse.getMinutes()).padStart(2, '0');
    const s = String(nyse.getSeconds()).padStart(2, '0');
    const open = nyse.getHours() >= 9 && nyse.getHours() < 16;
    el.innerHTML = `<span style="color:${open ? '#2a8a3a' : '#cc3030'}">${open ? '● OUVERT' : '○ FERMÉ'}</span> NYSE ${h}:${m}:${s}`;
  }
  update();
  setInterval(update, 1000);
}

// ---- STYLES ------------------------------------------------
function corpInjectStyles() {
  if (document.getElementById('gs-corp-style')) return;
  const style = document.createElement('style');
  style.id = 'gs-corp-style';
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;600&family=Share+Tech+Mono&display=swap');

    @keyframes corp-blink  { 0%,100%{opacity:1} 50%{opacity:.2} }
    @keyframes corp-ticker { from{transform:translateX(0)} to{transform:translateX(-50%)} }
    @keyframes corp-fadein { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

    .corp-root {
      display:flex;flex-direction:column;height:100%;
      font-family:'Oswald',sans-serif;background:#04080f;color:#cfe4f7;
    }

    /* TICKER */
    .corp-ticker-wrap {
      display:flex;align-items:center;gap:0;flex-shrink:0;
      background:#060a14;border-bottom:1px solid #c8a84b33;height:32px;overflow:hidden;
    }
    .corp-ticker-label {
      font-family:'Share Tech Mono',monospace;font-size:9px;font-weight:700;
      color:#c8a84b;letter-spacing:.12em;padding:0 14px;flex-shrink:0;
      border-right:1px solid #c8a84b33;height:100%;display:flex;align-items:center;
      background:#060c18;
    }
    .corp-ticker-track { flex:1;overflow:hidden;height:100%;position:relative; }
    .corp-ticker-content {
      display:flex;align-items:center;height:100%;
      white-space:nowrap;
      animation:corp-ticker 30s linear infinite;
    }
    .corp-tick-item {
      display:inline-flex;align-items:center;gap:8px;padding:0 16px;
      font-family:'Share Tech Mono',monospace;font-size:10px;
    }
    .corp-tick-ticker { font-weight:700;letter-spacing:.06em; }
    .corp-tick-cap    { color:#8a9ab0; }
    .corp-tick-var    { font-weight:600; }
    .corp-tick-sep    { color:#1a2844;font-size:8px;padding:0 4px; }
    .corp-ticker-time {
      font-family:'Share Tech Mono',monospace;font-size:9px;
      padding:0 14px;flex-shrink:0;border-left:1px solid #c8a84b33;
      height:100%;display:flex;align-items:center;gap:6px;color:#5a7a9a;
      background:#060c18;white-space:nowrap;
    }

    /* MACRO BAR */
    .corp-macro-bar {
      display:flex;gap:0;border-bottom:1px solid #1a2844;flex-shrink:0;
      background:#06080e;overflow-x:auto;
    }
    .corp-macro-stat {
      flex:1;min-width:110px;padding:8px 14px;border-right:1px solid #1a2844;
      display:flex;flex-direction:column;gap:2px;
    }
    .corp-macro-val   { font-size:14px;font-weight:600;letter-spacing:.04em; }
    .corp-macro-label { font-family:'Share Tech Mono',monospace;font-size:8px;color:#2a3a54;letter-spacing:.08em; }

    /* CORPS */
    .corp-body { display:grid;grid-template-columns:1fr 300px;flex:1;min-height:0;overflow:hidden; }

    .corp-left {
      padding:14px;overflow-y:auto;border-right:1px solid #1a2844;
      display:flex;flex-direction:column;gap:10px;
    }
    .corp-section-title {
      font-family:'Share Tech Mono',monospace;font-size:9px;color:#2a3a54;
      letter-spacing:.14em;text-transform:uppercase;margin-bottom:6px;
      border-bottom:1px solid #0e1e30;padding-bottom:4px;
    }

    /* GRILLE */
    .corp-grid { display:flex;flex-direction:column;gap:6px; }
    .corp-card {
      border:1px solid;border-radius:8px;padding:10px 12px;cursor:pointer;
      background:#060a14;transition:all .2s;
    }
    .corp-card:hover       { background:#080e1c;transform:translateX(3px); }
    .corp-card.corp-card-active { background:#080e1c; }
    .corp-card-top { display:flex;align-items:flex-start;gap:10px;margin-bottom:6px; }
    .corp-card-icon{ font-size:20px;flex-shrink:0;line-height:1; }
    .corp-card-ticker{ font-family:'Share Tech Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.06em; }
    .corp-card-nom  { font-size:11px;color:#8a9ab0;margin-top:1px; }
    .corp-card-cap  { font-size:12px;font-weight:600;letter-spacing:.04em;color:#cfe4f7; }
    .corp-card-var  { font-family:'Share Tech Mono',monospace;font-size:9px;font-weight:600; }
    .corp-cap-bar-wrap { height:3px;background:#0a1628;border-radius:2px;overflow:hidden;margin-bottom:5px; }
    .corp-cap-bar   { height:100%;border-radius:2px;transition:width .6s ease; }
    .corp-card-secteur { font-family:'Share Tech Mono',monospace;font-size:8px;letter-spacing:.08em; }

    /* FICHE */
    .corp-right { overflow-y:auto;background:#040810; }
    .corp-fiche-inner  { padding:16px; }
    .corp-fiche-header {
      display:flex;align-items:flex-start;gap:12px;
      padding-bottom:12px;border-bottom:1px solid;margin-bottom:14px;
    }
    .corp-fiche-icon   { font-size:32px;flex-shrink:0; }
    .corp-fiche-nom    { font-size:15px;font-weight:600;letter-spacing:.04em;margin-bottom:5px; }
    .corp-fiche-ticker-line { display:flex;align-items:center;gap:8px;flex-wrap:wrap; }
    .corp-fiche-ticker {
      font-family:'Share Tech Mono',monospace;font-size:9px;font-weight:700;
      letter-spacing:.1em;padding:2px 7px;border-radius:3px;border:1px solid;
    }
    .corp-fiche-secteur { font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:.08em; }

    .corp-fiche-stats {
      display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;
    }
    .corp-fiche-stat {
      background:#060a14;border:1px solid #1a2844;border-radius:6px;padding:8px 10px;
    }
    .corp-fiche-stat-val   { font-size:14px;font-weight:600;letter-spacing:.04em;margin-bottom:2px; }
    .corp-fiche-stat-label { font-family:'Share Tech Mono',monospace;font-size:8px;color:#2a3a54;letter-spacing:.08em; }
  `;
  document.head.appendChild(style);
}

// ---- EXPORT ------------------------------------------------
window.gsRenderEntreprises = renderEntreprises;
