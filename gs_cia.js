/* ============================================================
   GRANDE SOCIÉTÉ — Module : NSA / CIA
   Interface d'espionnage style terminal — Sovereign uniquement
   Appelé par gsOpenModule('cia') dans grande_societe.js
   ============================================================ */

'use strict';

// ---- CONFIG ------------------------------------------------
const CIA_CFG = {
  SHEET_ID:    '1L9hbQuAD9A4WQFG1G47teZlUPM6-JkMmuuX2Ys-TYt8',
  APPS_SCRIPT: 'https://script.google.com/macros/s/AKfycbyCaQI2c5ds2uCmoeCw6_fALjh-8ii05fkOVgZmWPhbY64vyYbrNcFvqbFKRb7rUwyxwQ/exec',
  GIDS: {
    cia: '1248775428', // GID de l'onglet 'cia' — à renseigner
  },
  // Code d'accès global (peut être écrasé par le Sheet)
  CODE_ACCES: 'NSA-7749',
};

// ---- ÉTAT --------------------------------------------------
let ciaData        = { code: CIA_CFG.CODE_ACCES, dossiers: [] };
let ciaConnected   = false;
let ciaContainer   = null;
let ciaOpenDossier = null;
let ciaTypingTimer = null;

// ---- FETCH -------------------------------------------------
async function ciaFetch() {
  if (!CIA_CFG.GIDS.cia) return [];
  const url = `https://docs.google.com/spreadsheets/d/${CIA_CFG.SHEET_ID}/gviz/tq?tqx=out:json&gid=${CIA_CFG.GIDS.cia}`;
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
  } catch(e) { console.warn('[CIA] fetch:', e); return []; }
}

async function ciaLoadData() {
  const rows = await ciaFetch();
  ciaData.dossiers = [];

  rows.forEach(r => {
    const type = (r.type || '').trim().toLowerCase();
    if (type === 'code') {
      ciaData.code = (r.valeur || CIA_CFG.CODE_ACCES).trim();
    }
    if (type === 'dossier') {
      ciaData.dossiers.push({
        id:           (r.id          || '').trim(),
        operation:    (r.operation   || '').trim(),
        cible:        (r.cible       || '').trim(),
        faction:      (r.faction     || '').trim().toLowerCase(),
        classification:(r.classification || 'TOP SECRET').trim().toUpperCase(),
        resume:       (r.resume      || '').trim(),
        contenu:      (r.contenu     || '').trim(),
        date:         (r.date        || '').trim(),
        analyste:     (r.analyste    || 'ANONYME').trim(),
        statut:       (r.statut      || 'actif').trim().toLowerCase(),
      });
    }
  });
}

// ---- RENDER PRINCIPAL --------------------------------------
async function renderCIA(container, deityOverride) {
  if (!container) return;
  ciaContainer  = container;
  ciaConnected  = false;
  ciaOpenDossier = null;

  ciaInjectStyles();
  ciaShowLogin();
  await ciaLoadData();
}

// ---- ÉCRAN DE CONNEXION ------------------------------------
function ciaShowLogin() {
  ciaContainer.innerHTML = `
    <div class="cia-login-root" id="cia-login">
      <!-- Scanlines -->
      <div class="cia-scanlines"></div>

      <!-- Logo NSA -->
      <div class="cia-login-logo">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="40" cy="40" r="38" stroke="#cc3030" stroke-width="1.5"/>
          <circle cx="40" cy="40" r="30" stroke="#cc3030" stroke-width="0.5" opacity="0.4"/>
          <circle cx="40" cy="40" r="20" stroke="#cc3030" stroke-width="0.5" opacity="0.3"/>
          <!-- Aigle stylisé -->
          <ellipse cx="40" cy="36" rx="14" ry="10" fill="#cc3030" opacity="0.15"/>
          <path d="M 22,38 Q 40,28 58,38 Q 40,44 22,38 Z" fill="#cc3030" opacity="0.6"/>
          <circle cx="40" cy="36" r="4" fill="#cc3030" opacity="0.9"/>
          <!-- Flèches -->
          <line x1="26" y1="46" x2="34" y2="40" stroke="#cc3030" stroke-width="1" opacity="0.5"/>
          <line x1="54" y1="46" x2="46" y2="40" stroke="#cc3030" stroke-width="1" opacity="0.5"/>
        </svg>
      </div>

      <div class="cia-login-agency">NATIONAL SECURITY AGENCY</div>
      <div class="cia-login-subtitle">SECURE TERMINAL ACCESS — CLEARANCE REQUIRED</div>

      <!-- Terminal -->
      <div class="cia-terminal" id="cia-terminal">
        <div class="cia-terminal-line" id="cia-term-1"></div>
        <div class="cia-terminal-line" id="cia-term-2" style="display:none"></div>
        <div class="cia-terminal-line" id="cia-term-3" style="display:none"></div>
        <div class="cia-input-line" id="cia-input-line" style="display:none">
          <span class="cia-prompt">ACCESS_CODE ▶</span>
          <input type="password" id="cia-code-input" class="cia-code-input"
            placeholder="_ _ _ _ _ _ _ _" maxlength="16"
            autocomplete="off" spellcheck="false"/>
        </div>
        <div class="cia-terminal-line cia-error" id="cia-term-error" style="display:none"></div>
        <div class="cia-submit-wrap" id="cia-submit-wrap" style="display:none">
          <button class="cia-submit-btn" onclick="ciaSubmitCode()">VALIDER L'ACCÈS</button>
        </div>
      </div>

      <div class="cia-login-warning">
        ⚠ TOUTE TENTATIVE D'ACCÈS NON AUTORISÉE EST ENREGISTRÉE ET POURSUIVIE
      </div>
    </div>
  `;

  // Animation de boot terminal
  ciaTypeEffect('cia-term-1', 'NSA SECURE SHELL v4.2.1 — INITIALISATION...', 40, () => {
    setTimeout(() => {
      const t2 = document.getElementById('cia-term-2');
      if (t2) t2.style.display = 'block';
      ciaTypeEffect('cia-term-2', 'CONNEXION ÉTABLIE — AUTHENTIFICATION REQUISE', 35, () => {
        setTimeout(() => {
          const t3 = document.getElementById('cia-term-3');
          if (t3) t3.style.display = 'block';
          ciaTypeEffect('cia-term-3', 'ENTREZ VOTRE CODE D\'ACCÈS CLASSIFIÉ :', 30, () => {
            const il = document.getElementById('cia-input-line');
            const sw = document.getElementById('cia-submit-wrap');
            if (il) il.style.display = 'flex';
            if (sw) sw.style.display = 'block';
            const inp = document.getElementById('cia-code-input');
            if (inp) {
              inp.focus();
              inp.addEventListener('keydown', e => { if (e.key === 'Enter') ciaSubmitCode(); });
            }
          });
        }, 300);
      });
    }, 400);
  });
}

function ciaTypeEffect(elemId, text, speed, callback) {
  const el = document.getElementById(elemId);
  if (!el) return;
  el.textContent = '';
  let i = 0;
  const timer = setInterval(() => {
    el.textContent += text[i];
    i++;
    if (i >= text.length) {
      clearInterval(timer);
      if (callback) callback();
    }
  }, speed);
}

window.ciaSubmitCode = function() {
  const inp = document.getElementById('cia-code-input');
  if (!inp) return;
  const val = inp.value.trim().toUpperCase();

  if (val === ciaData.code.toUpperCase()) {
    // Accès accordé
    const err = document.getElementById('cia-term-error');
    if (err) { err.style.display = 'none'; }
    ciaShowGranted();
  } else {
    const err = document.getElementById('cia-term-error');
    if (err) {
      err.style.display = 'block';
      err.textContent = `⛔ ACCÈS REFUSÉ — CODE "${val}" NON RECONNU`;
      inp.value = '';
      inp.focus();
      // Shake
      const terminal = document.getElementById('cia-terminal');
      if (terminal) {
        terminal.classList.add('cia-shake');
        setTimeout(() => terminal.classList.remove('cia-shake'), 500);
      }
    }
  }
};

function ciaShowGranted() {
  const terminal = document.getElementById('cia-terminal');
  if (!terminal) return;
  terminal.innerHTML = `
    <div class="cia-terminal-line cia-success" id="cia-granted-line"></div>
  `;
  ciaTypeEffect('cia-granted-line', 'ACCÈS ACCORDÉ — BIENVENUE, AGENT CLASSIFIÉ', 25, () => {
    setTimeout(() => {
      ciaConnected = true;
      ciaShowInterface();
    }, 800);
  });
}

// ---- INTERFACE PRINCIPALE ----------------------------------
function ciaShowInterface() {
  const dem = ciaData.dossiers.filter(d => d.faction === 'olympiens' || d.faction === 'shemning' || d.faction === 'général' || !d.faction);

  const classifColor = {
    'TOP SECRET':          '#cc3030',
    'SECRET':              '#c8a84b',
    'CONFIDENTIEL':        '#4a8ad4',
    'NON CLASSIFIÉ':       '#3a8a5a',
  };

  const factionColor = {
    'olympiens': '#c8901a',
    'shemning':  '#b02828',
    'général':   '#5a7a9a',
    '':          '#5a7a9a',
  };

  ciaContainer.innerHTML = `
    <div class="cia-root">
      <div class="cia-scanlines"></div>

      <!-- HEADER -->
      <div class="cia-header">
        <div class="cia-header-left">
          <div class="cia-blink-dot"></div>
          <div>
            <div class="cia-header-title">NSA / CIA — CENTRE DE RENSEIGNEMENT CLASSIFIÉ</div>
            <div class="cia-header-sub">SOVEREIGN NETWORK · ${ciaData.dossiers.length} DOSSIER(S) DISPONIBLE(S) · SESSION ACTIVE</div>
          </div>
        </div>
        <div class="cia-header-right">
          <div class="cia-agent-badge">AGENT CONNECTÉ</div>
          <button class="cia-logout-btn" onclick="ciaLogout()">DÉCONNEXION</button>
        </div>
      </div>

      <!-- CORPS -->
      <div class="cia-body">

        <!-- LISTE DOSSIERS -->
        <div class="cia-dossiers-col" id="cia-dossiers-col">
          <div class="cia-col-title">
            <span>DOSSIERS CLASSIFIÉS</span>
            <div style="display:flex;gap:6px">
              <button class="cia-filter-btn active" data-faction="tous" onclick="ciaFilter('tous',this)">TOUS</button>
              <button class="cia-filter-btn" data-faction="olympiens" onclick="ciaFilter('olympiens',this)" style="color:#c8901a;border-color:#c8901a44">OLYMPIENS</button>
              <button class="cia-filter-btn" data-faction="shemning"  onclick="ciaFilter('shemning',this)"  style="color:#b02828;border-color:#b0282844">SHEMNING</button>
            </div>
          </div>

          <div class="cia-dossiers-list" id="cia-dossiers-list">
            ${ciaRenderDossierList(ciaData.dossiers, classifColor, factionColor)}
          </div>
        </div>

        <!-- DOSSIER OUVERT -->
        <div class="cia-dossier-view" id="cia-dossier-view">
          ${ciaRenderDossierVide()}
        </div>

      </div>
    </div>
  `;
}

function ciaRenderDossierList(dossiers, classifColor, factionColor) {
  if (!dossiers.length) {
    return `<div class="cia-empty">AUCUN DOSSIER DISPONIBLE — REVENEZ PLUS TARD</div>`;
  }

  return dossiers.map((d, i) => {
    const cc = classifColor[d.classification] || '#5a7a9a';
    const fc = factionColor[d.faction] || '#5a7a9a';
    const isOpen = ciaOpenDossier === i;
    return `
      <div class="cia-dossier-item${isOpen ? ' cia-dossier-active' : ''}"
        onclick="ciaOpenDossierPanel(${i})" data-idx="${i}">
        <div class="cia-dossier-classif" style="color:${cc};border-color:${cc}44;background:${cc}11">
          ${d.classification}
        </div>
        <div class="cia-dossier-meta">
          <div class="cia-dossier-op">OPÉRATION ${d.operation || 'SANS NOM'}</div>
          <div class="cia-dossier-cible" style="color:${fc}">
            ${d.cible ? `CIBLE : ${d.cible.toUpperCase()}` : ''}
            ${d.faction ? ` · ${d.faction.toUpperCase()}` : ''}
          </div>
        </div>
        <div class="cia-dossier-statut" style="color:${d.statut === 'actif' ? '#2a8a3a' : '#cc3030'}">
          ${d.statut === 'actif' ? '● ACTIF' : '○ ARCHIVÉ'}
        </div>
      </div>
    `;
  }).join('');
}

function ciaRenderDossierVide() {
  return `
    <div class="cia-dossier-vide">
      <div style="font-size:28px;margin-bottom:12px;opacity:.3">🗂</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:#1a2a3a;letter-spacing:.14em">
        SÉLECTIONNEZ UN DOSSIER
      </div>
    </div>
  `;
}

window.ciaOpenDossierPanel = function(idx) {
  ciaOpenDossier = idx;
  const d = ciaData.dossiers[idx];
  if (!d) return;

  // Mettre en surbrillance le dossier actif
  document.querySelectorAll('.cia-dossier-item').forEach((el, i) => {
    el.classList.toggle('cia-dossier-active', i === idx);
  });

  const classifColor = {
    'TOP SECRET': '#cc3030', 'SECRET': '#c8a84b',
    'CONFIDENTIEL': '#4a8ad4', 'NON CLASSIFIÉ': '#3a8a5a',
  };
  const cc = classifColor[d.classification] || '#5a7a9a';
  const factionColor = { olympiens: '#c8901a', shemning: '#b02828' };
  const fc = factionColor[d.faction] || '#5a7a9a';

  const view = document.getElementById('cia-dossier-view');
  if (!view) return;

  view.innerHTML = `
    <div class="cia-dossier-content" id="cia-doc-inner">
      <!-- En-tête dossier -->
      <div class="cia-doc-header" style="border-color:${cc}44">
        <div class="cia-doc-stamp" style="color:${cc};border-color:${cc}">
          ${d.classification}
        </div>
        <div style="flex:1;min-width:0">
          <div class="cia-doc-op" style="color:${cc}">OPÉRATION ${d.operation || 'SANS NOM'}</div>
          ${d.cible ? `<div class="cia-doc-cible">CIBLE : <span style="color:${fc}">${d.cible.toUpperCase()}</span>${d.faction ? ` · <span style="color:${fc}">${d.faction.toUpperCase()}</span>` : ''}</div>` : ''}
        </div>
        <div class="cia-doc-meta-right">
          ${d.date ? `<div class="cia-doc-date">DATE : ${d.date}</div>` : ''}
          <div class="cia-doc-analyste">ANALYSTE : ${d.analyste}</div>
          <div class="cia-doc-statut" style="color:${d.statut==='actif'?'#2a8a3a':'#cc3030'}">
            ${d.statut === 'actif' ? '● ACTIF' : '○ ARCHIVÉ'}
          </div>
        </div>
      </div>

      <!-- Ligne de séparation estampillée -->
      <div class="cia-doc-divider" style="border-color:${cc}22">
        <span style="color:${cc}44;font-size:8px;letter-spacing:.2em">
          ████ DOCUMENT CLASSIFIÉ — DIFFUSION RESTREINTE ████
        </span>
      </div>

      <!-- Résumé -->
      ${d.resume ? `
        <div class="cia-doc-section">
          <div class="cia-doc-section-title">RÉSUMÉ EXÉCUTIF</div>
          <div class="cia-doc-section-body cia-typewriter" id="cia-resume-text"></div>
        </div>
      ` : ''}

      <!-- Contenu complet -->
      ${d.contenu ? `
        <div class="cia-doc-section">
          <div class="cia-doc-section-title">RAPPORT COMPLET</div>
          <div class="cia-doc-section-body">${d.contenu.replace(/\n/g, '<br>')}</div>
        </div>
      ` : ''}

      <!-- Pied de page -->
      <div class="cia-doc-footer">
        <span>NSA/CSS FORM 1234-B · REF: ${d.id || 'UNKNOWN'}</span>
        <span>ACCÈS LIMITÉ AUX SOVEREIGN AUTORISÉS</span>
      </div>
    </div>
  `;

  // Effet machine à écrire sur le résumé
  if (d.resume) {
    setTimeout(() => {
      const el = document.getElementById('cia-resume-text');
      if (el) ciaTypeEffect('cia-resume-text', d.resume, 18, null);
    }, 100);
  }
};

window.ciaFilter = function(faction, btn) {
  document.querySelectorAll('.cia-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const filtered = faction === 'tous'
    ? ciaData.dossiers
    : ciaData.dossiers.filter(d => d.faction === faction);

  const list = document.getElementById('cia-dossiers-list');
  if (list) {
    list.innerHTML = ciaRenderDossierList(filtered, {
      'TOP SECRET':'#cc3030','SECRET':'#c8a84b','CONFIDENTIEL':'#4a8ad4','NON CLASSIFIÉ':'#3a8a5a'
    }, { 'olympiens':'#c8901a','shemning':'#b02828','général':'#5a7a9a','':'#5a7a9a' });
  }

  // Rebind clics avec les bons indices
  document.querySelectorAll('.cia-dossier-item').forEach(el => {
    el.onclick = () => ciaOpenDossierPanel(parseInt(el.dataset.idx));
  });
};

window.ciaLogout = function() {
  ciaConnected   = false;
  ciaOpenDossier = null;
  ciaShowLogin();
};

// ---- STYLES ------------------------------------------------
function ciaInjectStyles() {
  if (document.getElementById('gs-cia-style')) return;
  const style = document.createElement('style');
  style.id = 'gs-cia-style';
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Oswald:wght@400;600&display=swap');

    @keyframes cia-blink    { 0%,100%{opacity:1} 50%{opacity:0} }
    @keyframes cia-scanmove { from{transform:translateY(-100%)} to{transform:translateY(100%)} }
    @keyframes cia-shake    { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
    @keyframes cia-fadein   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

    .cia-scanlines {
      position:absolute;inset:0;pointer-events:none;z-index:1;
      background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.06) 3px,rgba(0,0,0,0.06) 4px);
    }

    /* LOGIN */
    .cia-login-root {
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      height:100%;background:#04080c;position:relative;gap:16px;padding:30px;
    }
    .cia-login-logo { animation:cia-fadein .6s ease; }
    .cia-login-agency {
      font-family:'Share Tech Mono',monospace;font-size:14px;font-weight:700;
      letter-spacing:.22em;color:#cc3030;text-transform:uppercase;
    }
    .cia-login-subtitle {
      font-family:'Share Tech Mono',monospace;font-size:9px;color:#3a1a1a;
      letter-spacing:.14em;margin-top:-8px;
    }
    .cia-terminal {
      width:100%;max-width:560px;background:#020608;border:1px solid #cc303044;
      border-radius:6px;padding:18px 20px;font-family:'Share Tech Mono',monospace;
      min-height:120px;display:flex;flex-direction:column;gap:8px;
    }
    .cia-terminal.cia-shake { animation:cia-shake .4s ease; }
    .cia-terminal-line {
      font-size:11px;color:#cc3030;letter-spacing:.06em;line-height:1.5;
    }
    .cia-terminal-line.cia-error  { color:#ff4444;margin-top:4px; }
    .cia-terminal-line.cia-success{ color:#2a8a3a; }
    .cia-input-line {
      display:flex;align-items:center;gap:10px;margin-top:6px;
    }
    .cia-prompt { font-size:11px;color:#cc3030;white-space:nowrap;letter-spacing:.06em; }
    .cia-code-input {
      background:none;border:none;border-bottom:1px solid #cc303066;
      color:#cc3030;font-family:'Share Tech Mono',monospace;font-size:13px;
      letter-spacing:.18em;outline:none;flex:1;padding:2px 0;
      text-transform:uppercase;
    }
    .cia-code-input::placeholder { color:#3a1a1a; }
    .cia-submit-wrap { margin-top:10px; }
    .cia-submit-btn {
      background:none;border:1px solid #cc3030;border-radius:4px;
      color:#cc3030;font-family:'Share Tech Mono',monospace;font-size:10px;
      letter-spacing:.14em;padding:6px 18px;cursor:pointer;
      transition:all .15s;
    }
    .cia-submit-btn:hover { background:#cc303018;box-shadow:0 0 12px #cc303044; }
    .cia-login-warning {
      font-family:'Share Tech Mono',monospace;font-size:8px;color:#2a0a0a;
      letter-spacing:.08em;text-align:center;max-width:500px;line-height:1.5;
    }

    /* INTERFACE */
    .cia-root {
      display:flex;flex-direction:column;height:100%;
      background:#04080c;position:relative;font-family:'Share Tech Mono',monospace;
    }
    .cia-header {
      padding:10px 18px;border-bottom:1px solid #cc303033;
      background:linear-gradient(90deg,#08040c,#04080c);
      display:flex;align-items:center;justify-content:space-between;flex-shrink:0;
    }
    .cia-header-left  { display:flex;align-items:center;gap:12px; }
    .cia-header-title { font-size:11px;font-weight:700;letter-spacing:.14em;color:#cc3030;text-transform:uppercase; }
    .cia-header-sub   { font-size:8px;color:#3a1a1a;letter-spacing:.1em;margin-top:2px; }
    .cia-header-right { display:flex;align-items:center;gap:10px; }
    .cia-blink-dot    { width:7px;height:7px;border-radius:50%;background:#cc3030;animation:cia-blink 1.2s infinite;flex-shrink:0; }
    .cia-agent-badge  { font-size:8px;color:#2a8a3a;border:1px solid #1a5a2a;padding:2px 8px;border-radius:2px;letter-spacing:.1em; }
    .cia-logout-btn   { background:none;border:1px solid #3a1a1a;border-radius:4px;color:#5a2a2a;
      font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:.08em;padding:3px 10px;cursor:pointer;
      transition:all .15s; }
    .cia-logout-btn:hover { border-color:#cc3030;color:#cc3030; }

    .cia-body {
      display:grid;grid-template-columns:320px 1fr;flex:1;min-height:0;overflow:hidden;
    }

    /* LISTE DOSSIERS */
    .cia-dossiers-col {
      border-right:1px solid #cc303022;overflow-y:auto;display:flex;flex-direction:column;
    }
    .cia-col-title {
      padding:10px 14px;border-bottom:1px solid #cc303022;
      font-size:9px;color:#3a1a1a;letter-spacing:.14em;
      display:flex;align-items:center;justify-content:space-between;flex-shrink:0;
      flex-wrap:wrap;gap:6px;
    }
    .cia-filter-btn {
      background:none;border:1px solid #2a1a1a;border-radius:3px;
      color:#2a1a1a;font-family:'Share Tech Mono',monospace;font-size:7px;
      letter-spacing:.08em;padding:2px 6px;cursor:pointer;transition:all .15s;
    }
    .cia-filter-btn.active { border-color:#cc3030;color:#cc3030;background:#cc303011; }
    .cia-dossiers-list { flex:1;overflow-y:auto; }
    .cia-empty { padding:20px;font-size:9px;color:#1a0a0a;text-align:center;letter-spacing:.1em; }

    .cia-dossier-item {
      padding:12px 14px;border-bottom:1px solid #cc303011;cursor:pointer;
      display:flex;align-items:flex-start;gap:8px;transition:background .15s;
    }
    .cia-dossier-item:hover   { background:#0c0408; }
    .cia-dossier-item.cia-dossier-active { background:#100408;border-left:2px solid #cc3030; }
    .cia-dossier-classif {
      font-size:7px;font-weight:700;letter-spacing:.1em;
      padding:2px 5px;border-radius:2px;border:1px solid;flex-shrink:0;white-space:nowrap;
      margin-top:2px;
    }
    .cia-dossier-meta { flex:1;min-width:0; }
    .cia-dossier-op   { font-size:10px;font-weight:700;color:#cc3030;letter-spacing:.06em;margin-bottom:2px; }
    .cia-dossier-cible{ font-size:8px;letter-spacing:.06em;opacity:.8; }
    .cia-dossier-statut{ font-size:8px;letter-spacing:.06em;flex-shrink:0;margin-top:2px; }

    /* DOSSIER OUVERT */
    .cia-dossier-view {
      overflow-y:auto;background:#030608;
      display:flex;flex-direction:column;
    }
    .cia-dossier-vide {
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      height:100%;gap:8px;
    }
    .cia-dossier-content {
      padding:20px 24px;animation:cia-fadein .3s ease;
    }
    .cia-doc-header {
      display:flex;align-items:flex-start;gap:14px;margin-bottom:14px;
      padding-bottom:14px;border-bottom:1px solid;
    }
    .cia-doc-stamp {
      font-size:10px;font-weight:700;letter-spacing:.14em;
      border:2px solid;padding:4px 10px;border-radius:2px;
      transform:rotate(-3deg);flex-shrink:0;white-space:nowrap;
      font-family:'Oswald',sans-serif;
    }
    .cia-doc-op      { font-size:15px;font-weight:600;letter-spacing:.1em;font-family:'Oswald',sans-serif;margin-bottom:4px; }
    .cia-doc-cible   { font-size:10px;letter-spacing:.08em;color:#5a4a4a; }
    .cia-doc-meta-right { text-align:right;flex-shrink:0; }
    .cia-doc-date    { font-size:9px;color:#3a2a2a;letter-spacing:.06em;margin-bottom:2px; }
    .cia-doc-analyste{ font-size:9px;color:#3a2a2a;letter-spacing:.06em;margin-bottom:4px; }
    .cia-doc-statut  { font-size:8px;letter-spacing:.08em; }

    .cia-doc-divider {
      border-top:1px solid;margin:14px 0;display:flex;align-items:center;justify-content:center;
    }

    .cia-doc-section       { margin-bottom:18px; }
    .cia-doc-section-title {
      font-size:9px;font-weight:700;letter-spacing:.16em;color:#cc303077;
      margin-bottom:8px;border-bottom:1px solid #cc303022;padding-bottom:4px;
    }
    .cia-doc-section-body  { font-size:11px;color:#8a6a6a;line-height:1.8;letter-spacing:.04em; }

    .cia-doc-footer {
      margin-top:20px;padding-top:10px;border-top:1px solid #1a0808;
      display:flex;justify-content:space-between;
      font-size:8px;color:#1a0808;letter-spacing:.06em;
    }
  `;
  document.head.appendChild(style);
}

// ---- EXPORT ------------------------------------------------
window.gsRenderCIA = renderCIA;
