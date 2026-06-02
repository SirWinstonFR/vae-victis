/* ============================================================
   GRANDE SOCIÉTÉ — Interface Sovereign
   Hub d'accès aux sphères d'influence américaines
   S'ouvre par-dessus le globe quand un Sovereign clique
   sur "Grande Société" dans le Conseil de Faction
   ============================================================ */

'use strict';

const GS_CFG = {
  SHEET_ID: '1L9hbQuAD9A4WQFG1G47teZlUPM6-JkMmuuX2Ys-TYt8',
  APPS_SCRIPT: 'https://script.google.com/macros/s/AKfycbyCaQI2c5ds2uCmoeCw6_fALjh-8ii05fkOVgZmWPhbY64vyYbrNcFvqbFKRb7rUwyxwQ/exec',
  GIDS: {
    gouvernement: '', // À renseigner
    nasa:         '',
    cia:          '',
    entreprises:  '',
    bonus:        '',
  },
};

// State
let gsMe          = null; // divinité connectée
let gsActiveModule = null; // 'gouvernement' | 'nasa' | 'cia' | 'entreprises' | 'bonus'

// ---- FETCH -------------------------------------------------
async function gsFetch(gid) {
  if (!gid) return [];
  const url = `https://docs.google.com/spreadsheets/d/${GS_CFG.SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`;
  const r   = await fetch(url);
  const raw = await r.text();
  const m   = raw.match(/setResponse\(([\s\S]*)\)/);
  if (!m) return [];
  const data = JSON.parse(m[1]);
  const rows = data.table.rows || [];
  if (!rows.length) return [];
  let cols = data.table.cols.map(c => (c.label || '').trim());
  if (!cols.some(c => c)) {
    cols = rows[0].c.map(c => String(c?.v ?? '').trim());
    return rows.slice(1).map(r => Object.fromEntries(cols.map((col, i) => [col, String(r?.c?.[i]?.v ?? '').trim()])));
  }
  return rows.map(r => Object.fromEntries(cols.map((col, i) => [col, String(r?.c?.[i]?.v ?? '').trim()])));
}

// ---- OPEN / CLOSE ------------------------------------------
async function openGrandeSociete(deityId) {
  // Récupérer me depuis toutes les sources disponibles
  gsMe = window.VV?.DEITIES?.find(d => d.id === deityId)
      || window.VV?.me
      || (typeof me !== 'undefined' ? me : null)
      || null;
  gsActiveModule = null;

  // Créer le modal si besoin
  let modal = document.getElementById('gs-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'gs-modal';
    modal.innerHTML = `<div id="gs-inner"></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) closeGrandeSociete(); });
  }

  modal.style.cssText = `
    position:fixed;inset:0;z-index:2000;
    background:rgba(0,2,10,.94);
    backdrop-filter:blur(6px);
    display:flex;align-items:center;justify-content:center;
    padding:20px;
  `;

  // Écran de chargement
  document.getElementById('gs-inner').innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:14px">
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
        <circle cx="22" cy="22" r="20" stroke="#c8a84b" stroke-width="1"/>
        <polygon points="22,8 25,17 35,17 27,23 30,32 22,26 14,32 17,23 9,17 19,17" fill="#c8a84b" opacity="0.8"/>
      </svg>
      <div style="color:#c8a84b;font-family:'Oswald',sans-serif;font-size:13px;letter-spacing:.15em">CONNEXION AU RÉSEAU…</div>
    </div>
  `;

  gsInjectStyles();
  renderGrandeSociete();
}

function closeGrandeSociete() {
  const modal = document.getElementById('gs-modal');
  if (modal) modal.style.display = 'none';
}

// ---- RENDER PRINCIPAL --------------------------------------
function renderGrandeSociete() {
  const inner = document.getElementById('gs-inner');
  if (!inner) return;

  const isSovereign = gsMe
    ? Object.values(window.VV?.FACTIONS || {}).find(f => f.name === 'Sovereign')?.members.includes(gsMe.id)
    : false;

  inner.style.cssText = `
    width:100%;max-width:1100px;height:85vh;max-height:780px;
    background:#0a0e1a;
    border:1px solid #c8a84b44;border-radius:12px;
    box-shadow:0 0 60px #c8a84b18,0 30px 80px rgba(0,0,0,.85);
    display:grid;
    grid-template-rows:auto 1fr auto;
    overflow:hidden;
    position:relative;
    font-family:'Oswald',sans-serif;
  `;

  inner.innerHTML = `
    <!-- Ligne dorée haut -->
    <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#c8a84b,#e8c86b,#c8a84b,transparent);opacity:.7;z-index:5"></div>

    <!-- Coins décoratifs -->
    <div class="gs-corner gs-corner-tl"></div>
    <div class="gs-corner gs-corner-tr"></div>
    <div class="gs-corner gs-corner-bl"></div>
    <div class="gs-corner gs-corner-br"></div>

    <!-- Scanlines -->
    <div class="gs-scanlines"></div>

    <!-- HEADER -->
    <div style="padding:14px 22px;border-bottom:1px solid #1a2844;background:linear-gradient(90deg,#0d1428 0%,#111c38 50%,#0d1428 100%);display:flex;align-items:center;gap:14px;position:relative;z-index:2">
      <svg width="40" height="40" viewBox="0 0 44 44" fill="none" style="flex-shrink:0">
        <circle cx="22" cy="22" r="20" stroke="#c8a84b" stroke-width="1"/>
        <circle cx="22" cy="22" r="15" stroke="#c8a84b" stroke-width="0.5" opacity="0.4"/>
        <polygon points="22,8 25,17 35,17 27,23 30,32 22,26 14,32 17,23 9,17 19,17" fill="#c8a84b" opacity="0.85"/>
      </svg>
      <div>
        <div style="font-size:18px;font-weight:600;letter-spacing:.18em;color:#c8a84b;text-transform:uppercase;line-height:1">The Great Society</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:#3a5880;letter-spacing:.1em;margin-top:3px">SOVEREIGN FACTION — ACCÈS RESTREINT — CYCLE ${window.VV?.CYCLE || 1}</div>
      </div>
      <div style="margin-left:auto;display:flex;align-items:center;gap:14px">
        ${gsMe ? `
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:26px;height:26px;border-radius:50%;overflow:hidden;border:1px solid #c8a84b44;background:#0d2040;flex-shrink:0">
              ${gsMe.avatar
                ? `<img src="${gsMe.avatar}" style="width:100%;height:100%;object-fit:cover">`
                : `<span style="display:flex;align-items:center;justify-content:center;height:100%;font-size:9px;font-weight:700;color:#4a8ad4">${gsMe.name.slice(0, 2).toUpperCase()}</span>`}
            </div>
            <span style="font-size:12px;font-weight:600;color:#4a8ad4">${gsMe.name}</span>
          </div>
        ` : ''}
        <div style="display:flex;align-items:center;gap:6px;font-family:'Share Tech Mono',monospace;font-size:10px;color:#2a8a3a">
          <div class="gs-blink-dot" style="background:#2a8a3a"></div>
          SYSTÈME EN LIGNE
        </div>
        <button onclick="closeGrandeSociete()"
          style="background:none;border:1px solid #2a3a54;border-radius:6px;color:#5a7a9a;padding:5px 12px;cursor:pointer;font-family:'Oswald',sans-serif;font-size:11px;font-weight:600;letter-spacing:.08em;transition:all .12s"
          onmouseover="this.style.borderColor='#c8a84b';this.style.color='#c8a84b'"
          onmouseout="this.style.borderColor='#2a3a54';this.style.color='#5a7a9a'">FERMER</button>
      </div>
    </div>

    <!-- CORPS -->
    <div style="position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px 24px 20px;gap:28px;overflow-y:auto" id="gs-body">
      <div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:#2a3a5a;letter-spacing:.22em;text-transform:uppercase">
        // Sélectionnez une sphère d'influence //
      </div>

      <!-- GRILLE DES 5 CERCLES -->
      <div style="display:flex;justify-content:center;align-items:flex-start;gap:22px;flex-wrap:wrap">
        ${gsRenderNodeLocked('gouvernement', '🏛', 'Gouvernement', 'Américain', 'AUTORITÉ EXÉCUTIVE', '#1e4080', '#4a8ad4')}
        ${gsRenderNodeLocked('nasa', '🚀', 'NASA', '', 'PROGRAMME SPATIAL', '#0d5a6e', '#2ab8d8')}
        ${gsRenderNode('cia', '👁', 'NSA / CIA', '', 'RENSEIGNEMENT', '#6e1414', '#cc3030')}
        ${gsRenderNodeLocked('entreprises', '📈', 'Entreprises', 'Américaines', 'PUISSANCE ÉCON.', '#6e5200', '#c8a84b')}
        ${gsRenderNodeLocked('bonus', '⭐', 'Bonus', 'Organismes', 'AVANTAGES ACTIFS', '#1a5030', '#3a8a5a')}
      </div>

      <!-- BANDE DÉFILANTE -->
      <div style="width:100%;overflow:hidden;border-top:1px solid #1a2844;border-bottom:1px solid #1a2844;padding:6px 0">
        <div class="gs-ticker">
          <span>SOVEREIGN NETWORK ACTIVE</span>
          <span style="color:#c8a84b;margin:0 24px">◆</span>
          <span>GREAT SOCIETY PROTOCOL v2.1</span>
          <span style="color:#c8a84b;margin:0 24px">◆</span>
          <span>CLEARANCE LEVEL : SOVEREIGN</span>
          <span style="color:#c8a84b;margin:0 24px">◆</span>
          <span>TOUTES LES ACTIVITÉS SONT ENREGISTRÉES</span>
          <span style="color:#c8a84b;margin:0 24px">◆</span>
        </div>
      </div>
    </div>

    <!-- FOOTER -->
    <div style="padding:8px 22px;border-top:1px solid #1a2844;background:#060a12;display:flex;align-items:center;justify-content:space-between;position:relative;z-index:2">
      <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:#1a2a44;letter-spacing:.08em">VAE VICTIS // GRANDE SOCIÉTÉ // 5 MODULES DISPONIBLES</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:#c8a84b;border:1px solid #3a2a0a;padding:2px 10px;border-radius:2px;letter-spacing:.12em">CLEARANCE : SOVEREIGN</div>
    </div>
  `;
}

// ---- RENDER NODE -------------------------------------------
function gsRenderNode(id, icon, label1, label2, sub, borderColor, accentColor) {
  return `
    <div class="gs-node" onclick="gsOpenModule('${id}')" style="--gs-border:${borderColor};--gs-accent:${accentColor}">
      <div class="gs-circle-wrap">
        <div class="gs-ring" style="border-color:${accentColor}33"></div>
        <div class="gs-circle" style="background:#050810;border:2px solid ${borderColor}">
          <span style="font-size:28px;line-height:1;display:block;margin-bottom:4px">${icon}</span>
          <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:${accentColor};opacity:.55;letter-spacing:.04em">${id.toUpperCase().slice(0,6).padEnd(6,'-')}</span>
        </div>
      </div>
      <div class="gs-node-label" style="color:${accentColor}">${label1}${label2 ? '<br>' + label2 : ''}</div>
      <div class="gs-node-sub">${sub}</div>
    </div>
  `;
}

// ---- RENDER NODE LOCKED (Coming Soon) ---------------------
function gsRenderNodeLocked(id, icon, label1, label2, sub, borderColor, accentColor) {
  return `
    <div class="gs-node" style="--gs-border:${borderColor};--gs-accent:${accentColor};opacity:.5;cursor:not-allowed;position:relative">
      <div class="gs-circle-wrap">
        <div class="gs-ring" style="border-color:${accentColor}22"></div>
        <div class="gs-circle" style="background:#050810;border:2px solid ${borderColor}44;position:relative">
          <span style="font-size:28px;line-height:1;display:block;margin-bottom:4px;filter:grayscale(1);opacity:.4">${icon}</span>
          <!-- Cadenas -->
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px">
            <span style="font-size:20px">🔒</span>
            <span style="font-family:'Share Tech Mono',monospace;font-size:7px;color:#3a5060;letter-spacing:.1em">COMING SOON</span>
          </div>
        </div>
      </div>
      <div class="gs-node-label" style="color:#2a3a54">${label1}${label2 ? '<br>' + label2 : ''}</div>
      <div class="gs-node-sub" style="color:#1a2a3a">${sub}</div>
    </div>
  `;
}

// ---- OPEN MODULE -------------------------------------------
function gsOpenModule(moduleId) {
  gsActiveModule = moduleId;

  const labels = {
    gouvernement: 'Gouvernement Américain',
    nasa:         'NASA — Programme Spatial',
    cia:          'NSA / CIA — Renseignement',
    entreprises:  'Entreprises Américaines',
    bonus:        'Bonus Organismes',
  };

  const body = document.getElementById('gs-body');
  if (!body) return;

  body.innerHTML = `
    <div style="width:100%;height:100%;display:flex;flex-direction:column;gap:0;overflow:hidden">
      <!-- Barre de navigation -->
      <div style="display:flex;align-items:center;gap:12px;padding:10px 18px;border-bottom:1px solid #1a2844;flex-shrink:0">
        <button onclick="gsRetourHub()"
          style="background:none;border:1px solid #2a3a54;border-radius:6px;color:#5a7a9a;padding:5px 12px;cursor:pointer;font-family:'Oswald',sans-serif;font-size:11px;font-weight:600;letter-spacing:.08em;transition:all .12s"
          onmouseover="this.style.borderColor='#c8a84b';this.style.color='#c8a84b'"
          onmouseout="this.style.borderColor='#2a3a54';this.style.color='#5a7a9a'">
          ← RETOUR
        </button>
        <div style="font-size:14px;font-weight:600;letter-spacing:.12em;color:#c8a84b;text-transform:uppercase">
          ${labels[moduleId] || moduleId}
        </div>
      </div>
      <!-- Contenu du module -->
      <div id="gs-module-content" style="flex:1;overflow:hidden;display:flex;flex-direction:column"></div>
    </div>
  `;

  // Charger le bon module
  const content = document.getElementById('gs-module-content');
  if (moduleId === 'gouvernement' && typeof gsRenderGouvernement === 'function') {
    const deity = window.VV?.me || (typeof me !== 'undefined' ? me : null);
    gsRenderGouvernement(content, deity);
  } else if (moduleId === 'nasa' && typeof gsRenderNASA === 'function') {
    // Passer me explicitement — window.VV peut être indisponible dans ce contexte
    const deity = window.VV?.me || (typeof me !== 'undefined' ? me : null);
    gsRenderNASA(content, deity);
  } else if (moduleId === 'cia' && typeof gsRenderCIA === 'function') {
    const deity = window.VV?.me || (typeof me !== 'undefined' ? me : null);
    gsRenderCIA(content, deity);
  } else if (moduleId === 'entreprises' && typeof gsRenderEntreprises === 'function') {
    const deity = window.VV?.me || (typeof me !== 'undefined' ? me : null);
    gsRenderEntreprises(content, deity);
  } else {
    content.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:14px">
        <div style="font-size:32px">🚧</div>
        <div style="font-size:14px;font-weight:600;color:#5a7a9a;letter-spacing:.1em">MODULE À VENIR</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:#2a3a54;letter-spacing:.06em">
          « ${labels[moduleId]} » sera développé prochainement.
        </div>
      </div>`;
  }
}

function gsRetourHub() {
  gsActiveModule = null;
  renderGrandeSociete();
}

// ---- STYLES ------------------------------------------------
function gsInjectStyles() {
  if (document.getElementById('gs-style')) return;
  const style = document.createElement('style');
  style.id = 'gs-style';
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;600&family=Share+Tech+Mono&display=swap');

    @keyframes gs-blink  { 0%,100%{opacity:1} 50%{opacity:.2} }
    @keyframes gs-ticker { from{transform:translateX(0)} to{transform:translateX(-50%)} }
    @keyframes gs-ring-pulse { 0%,100%{transform:scale(1);opacity:.4} 50%{transform:scale(1.12);opacity:.8} }

    #gs-modal { animation: gs-fadein .25s ease; }
    @keyframes gs-fadein { from{opacity:0} to{opacity:1} }

    .gs-scanlines {
      position:absolute;inset:0;pointer-events:none;z-index:1;
      background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.07) 3px,rgba(0,0,0,0.07) 4px);
    }

    .gs-corner {
      position:absolute;width:16px;height:16px;
      border-color:#c8a84b;border-style:solid;opacity:.35;z-index:6;
    }
    .gs-corner-tl { top:8px;left:8px;border-width:2px 0 0 2px; }
    .gs-corner-tr { top:8px;right:8px;border-width:2px 2px 0 0; }
    .gs-corner-bl { bottom:8px;left:8px;border-width:0 0 2px 2px; }
    .gs-corner-br { bottom:8px;right:8px;border-width:0 2px 2px 0; }

    .gs-blink-dot {
      width:6px;height:6px;border-radius:50%;
      animation:gs-blink 1.8s ease-in-out infinite;
    }

    .gs-ticker {
      display:inline-flex;align-items:center;
      white-space:nowrap;
      font-family:'Share Tech Mono',monospace;font-size:9px;
      color:#2a3a5a;letter-spacing:.12em;
      animation:gs-ticker 24s linear infinite;
    }
    .gs-ticker span { margin-right:8px; }

    .gs-node {
      display:flex;flex-direction:column;align-items:center;
      cursor:pointer;
      transition:transform .2s;
    }
    .gs-node:hover { transform:translateY(-4px); }

    .gs-circle-wrap {
      position:relative;width:112px;height:112px;
    }

    .gs-ring {
      position:absolute;inset:-7px;border-radius:50%;
      border:1px solid transparent;
      transition:all .3s;
      animation:gs-ring-pulse 3s ease-in-out infinite;
    }
    .gs-node:hover .gs-ring {
      transform:scale(1.1) !important;
      animation:none;
    }

    .gs-circle {
      width:112px;height:112px;border-radius:50%;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      transition:all .25s;
    }
    .gs-node:hover .gs-circle {
      box-shadow:0 0 28px var(--gs-accent, #4a8ad4)44;
      border-color:var(--gs-accent, #4a8ad4) !important;
      background:#0c1220 !important;
    }

    .gs-node-label {
      margin-top:10px;
      font-size:11px;font-weight:600;letter-spacing:.1em;
      text-align:center;text-transform:uppercase;line-height:1.3;
      max-width:106px;transition:opacity .2s;
    }
    .gs-node-sub {
      font-family:'Share Tech Mono',monospace;font-size:9px;
      margin-top:3px;letter-spacing:.07em;text-align:center;
      color:#2a3a5a;
    }
  `;
  document.head.appendChild(style);
}

// ---- EXPORT ------------------------------------------------
window.openGrandeSociete  = openGrandeSociete;
window.closeGrandeSociete = closeGrandeSociete;
window.gsOpenModule       = gsOpenModule;
window.gsRetourHub        = gsRetourHub;
