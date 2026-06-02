/* ============================================================
   EXPERREDUCTI — Parlement Olympien v2.1
   Interface du Conseil des Experreducti
   S'ouvre par-dessus le globe quand un Olympien clique
   sur "Experreducti" dans le Conseil de Faction
   ============================================================ */

'use strict';

const EXP_CFG = {
  SHEET_ID: '1L9hbQuAD9A4WQFG1G47teZlUPM6-JkMmuuX2Ys-TYt8',
  APPS_SCRIPT: 'https://script.google.com/macros/s/AKfycbyCaQI2c5ds2uCmoeCw6_fALjh-8ii05fkOVgZmWPhbY64vyYbrNcFvqbFKRb7rUwyxwQ/exec',
  GIDS: {
    lois: '153355188',
    pnj:  '336206576',
  },
};

// State
let expLocked   = true; // Interface verrouillée par défaut
const EXP_UNLOCK_CODE = 'OLYMPE2025'; // Code admin pour débloquer
let expPNJ      = [];
let expLois     = [];
let expMe       = null; // divinité connectée
let selPNJ      = null;
let hellenScore = 0;
let cycleRejects = {}; // pnjId -> true si rejeté ce cycle
let cycleScenes  = {}; // pnjId -> true si scène lancée ce cycle

// ---- FETCH -------------------------------------------------
async function expFetch(gid) {
  const url = `https://docs.google.com/spreadsheets/d/${EXP_CFG.SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`;
  const r = await fetch(url);
  const raw = await r.text();
  const m = raw.match(/setResponse\(([\s\S]*)\)/);
  if (!m) return [];
  const data = JSON.parse(m[1]);
  const rows = data.table.rows || [];
  if (!rows.length) return [];
  let cols = data.table.cols.map(c => (c.label||'').trim());
  if (!cols.some(c => c)) {
    cols = rows[0].c.map(c => String(c?.v??'').trim());
    return rows.slice(1).map(r => {
      const obj = Object.fromEntries(cols.map((col,i) => [col, String(r?.c?.[i]?.v??'').trim()]));
      // Fix portrait URLs with comma instead of dot
      if (obj.portrait_url) obj.portrait_url = obj.portrait_url.replace(/,png$/i, '.png').replace(/,jpg$/i, '.jpg');
      return obj;
    });
  }
  return rows.map(r => {
    const obj = Object.fromEntries(cols.map((col,i) => [col, String(r?.c?.[i]?.v??'').trim()]));
    if (obj.portrait_url) obj.portrait_url = obj.portrait_url.replace(/,png$/i, '.png').replace(/,jpg$/i, '.jpg');
    return obj;
  });
}

async function expPostScript(payload) {
  try {
    const params = new URLSearchParams({ data: JSON.stringify(payload) });
    const r = await fetch(EXP_CFG.APPS_SCRIPT + '?' + params, { method: 'GET' });
    const text = await r.text();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return { ok: false, error: 'Réponse invalide du serveur' };
    const d = JSON.parse(match[0]);
    return d.success ? { ok: true } : { ok: false, error: d.error || 'Erreur inconnue' };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

// ---- OPEN / CLOSE ------------------------------------------
function renderExpLockScreen() {
  const inner = document.getElementById('exp-inner');
  if (!inner) return;

  // L'interface se charge normalement puis est recouverte d'un overlay flou
  inner.style.cssText = `
    width:100%;max-width:1200px;height:85vh;max-height:800px;
    background:linear-gradient(160deg,#04080f 0%,#060d1a 60%,#08101e 100%);
    border:1px solid #c8901a44;border-radius:12px;
    display:flex;align-items:center;justify-content:center;
    position:relative;overflow:hidden;font-family:'Rajdhani',sans-serif;
  `;

  inner.innerHTML = `
    <!-- Fond flouté qui ressemble à l'interface -->
    <div style="position:absolute;inset:0;filter:blur(6px);opacity:.4;pointer-events:none;z-index:0">
      <div style="padding:14px 20px;border-bottom:1px solid #1a2e4a;display:flex;align-items:center;gap:12px">
        <div style="width:32px;height:32px;border-radius:50%;background:#c8901a;display:flex;align-items:center;justify-content:center;font-size:16px">⚡</div>
        <div style="font-size:16px;font-weight:700;color:#f0c060;letter-spacing:.12em">EXPERREDUCTI</div>
      </div>
      <div style="display:grid;grid-template-columns:260px 1fr;height:calc(100% - 60px)">
        <div style="border-right:1px solid #1a2e4a;padding:20px">
          ${[1,2,3].map(()=>`<div style="height:60px;background:#0a1628;border-radius:6px;margin-bottom:10px;border:1px solid #1a2e4a"></div>`).join('')}
        </div>
        <div style="padding:20px">
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px">
            ${[1,2,3].map(()=>`<div style="height:120px;background:#0a1628;border-radius:8px;border:1px solid #1a2e4a"></div>`).join('')}
          </div>
          <div style="height:200px;background:#04080f;border-radius:8px;border:1px solid #1a2e4a;display:flex;align-items:center;justify-content:center">
            <div style="width:300px;height:150px;border-radius:50% 50% 0 0;background:#0a1628;border:1px solid #1a2e4a"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Overlay message -->
    <div style="position:relative;z-index:10;display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center;padding:40px;max-width:480px">
      <div style="font-size:48px;margin-bottom:4px">🏛️</div>
      <div style="font-family:Cinzel,serif;font-size:18px;font-weight:700;color:#c8901a;letter-spacing:.12em">EXPERREDUCTI</div>
      <div style="font-size:11px;color:#3a5a7a;letter-spacing:.1em;text-transform:uppercase;margin-top:-8px">Conseil Parlementaire Olympien</div>
      <div style="width:40px;height:1px;background:linear-gradient(90deg,transparent,#c8901a,transparent);margin:4px 0"></div>
      <div style="font-size:13px;color:#7a9aaa;line-height:1.8;font-style:italic">
        "Ce contenu n'est pas encore disponible.<br>
        Profitez de découvrir bien d'autres choses<br>
        avant d'en arriver là..."
      </div>
      <div style="font-size:10px;color:#2a4a6a;margin-top:8px;letter-spacing:.08em">— Les Experreducti</div>
      <button onclick="closeExperreducti()"
        style="margin-top:16px;padding:8px 20px;border-radius:6px;border:1px solid #1a2e4a;background:none;color:#3a5a7a;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:600;letter-spacing:.06em;transition:all .15s"
        onmouseover="this.style.borderColor='#c8901a44';this.style.color='#c8901a'"
        onmouseout="this.style.borderColor='#1a2e4a';this.style.color='#3a5a7a'">
        REVENIR PLUS TARD
      </button>
    </div>
  `;
}

function expTryUnlock() {
  expLocked = false;
  openExperreducti(window._expLastDeityId);
}

async function openExperreducti(deityId) {
  window._expLastDeityId = deityId;
  expMe = window.VV?.DEITIES?.find(d => d.id === deityId) || null;

  // Create modal if needed
  let modal = document.getElementById('exp-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'exp-modal';
    modal.innerHTML = `<div id="exp-inner"></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) closeExperreducti(); });
  }

  modal.style.cssText = `
    position:fixed;inset:0;z-index:2000;
    background:rgba(0,2,8,.92);
    backdrop-filter:blur(6px);
    display:flex;align-items:center;justify-content:center;
    padding:20px;
  `;

  // Afficher écran de verrouillage si locked
  if (expLocked) {
    // Create modal first
    let modal = document.getElementById('exp-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'exp-modal';
      modal.innerHTML = `<div id="exp-inner"></div>`;
      document.body.appendChild(modal);
      modal.addEventListener('click', e => { if (e.target === modal) closeExperreducti(); });
    }
    modal.style.cssText = `position:fixed;inset:0;z-index:2000;background:rgba(0,2,8,.92);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;`;
    renderExpLockScreen();
    return;
  }

  document.getElementById('exp-inner').innerHTML = `
    <div style="width:12px;height:12px;background:#c8901a;border-radius:50%;margin:0 auto 20px;animation:exp-pulse 1s infinite"></div>
    <div style="color:#c8901a;font-family:Cinzel,Rajdhani,sans-serif;font-size:13px;letter-spacing:.15em">CHARGEMENT…</div>
  `;

  const [pnjData, loisData] = await Promise.all([
    expFetch(EXP_CFG.GIDS.pnj),
    expFetch(EXP_CFG.GIDS.lois),
  ]);

  expPNJ  = pnjData;
  expLois = loisData;
  hellenScore = expLois.filter(l => l.statut?.trim()==='adoptée' && l.type?.trim()==='hellenisation')
    .reduce((s,l) => s + (Number(l.hellenisation)||0), 0);

  renderExperreducti();
}

function closeExperreducti() {
  const modal = document.getElementById('exp-modal');
  if (modal) modal.style.display = 'none';
}

// ---- MAIN RENDER -------------------------------------------
function renderExperreducti() {
  const inner = document.getElementById('exp-inner');
  if (!inner) return;

  const maxHellen = 100;
  const hellenPct = Math.min(100, Math.round(hellenScore / maxHellen * 100));
  const isOlympien = expMe ? Object.values(window.VV?.FACTIONS||{}).find(f=>f.name==='Olympiens')?.members.includes(expMe.id) : false;
  const isAdmin = false; // À brancher si besoin

  inner.style.cssText = `
    width:100%;max-width:1200px;height:85vh;max-height:800px;
    background:linear-gradient(160deg,#04080f 0%,#060d1a 60%,#08101e 100%);
    border:1px solid #c8901a44;border-radius:12px;
    box-shadow:0 0 60px #c8901a22,0 30px 80px rgba(0,0,0,.8);
    display:grid;
    grid-template-rows:auto auto 1fr auto;
    overflow:hidden;
    position:relative;
    font-family:'Rajdhani',sans-serif;
  `;

  inner.innerHTML = `
    <!-- Décoration dorée -->
    <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#c8901a,#f0c060,#c8901a,transparent);opacity:.8"></div>
    <div style="position:absolute;bottom:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,#c8901a44,transparent)"></div>

    <!-- HEADER -->
    <div style="padding:14px 20px;border-bottom:1px solid #1a2e4a;display:flex;align-items:center;gap:12px">
      <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#c8901a,#f0c060);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">⚡</div>
      <div>
        <div style="font-family:Cinzel,Rajdhani,sans-serif;font-size:16px;font-weight:700;letter-spacing:.12em;color:#f0c060">EXPERREDUCTI</div>
        <div style="font-size:10px;color:#6a8aaa;letter-spacing:.1em">CONSEIL PARLEMENTAIRE OLYMPIEN · CYCLE ${window.VV?.CYCLE||1}</div>
      </div>
      <div style="margin-left:auto;display:flex;align-items:center;gap:16px">
        ${expMe ? `<div style="display:flex;align-items:center;gap:8px">
          <div style="width:26px;height:26px;border-radius:50%;overflow:hidden;border:1px solid #c8901a44;background:#0d2040;flex-shrink:0">
            ${expMe.avatar?`<img src="${expMe.avatar}" style="width:100%;height:100%;object-fit:cover">`:`<span style="display:flex;align-items:center;justify-content:center;height:100%;font-size:9px;font-weight:700;color:#c8901a">${expMe.name.slice(0,2).toUpperCase()}</span>`}
          </div>
          <span style="font-size:12px;font-weight:600;color:#c8901a">${expMe.name}</span>
        </div>` : ''}
        <button onclick="closeExperreducti()" style="background:none;border:1px solid #2a3a4a;border-radius:6px;color:#6a8aaa;padding:5px 10px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:11px;font-weight:600;letter-spacing:.06em;transition:all .12s" onmouseover="this.style.borderColor='#c8901a';this.style.color='#f0c060'" onmouseout="this.style.borderColor='#2a3a4a';this.style.color='#6a8aaa'">FERMER</button>
      </div>
    </div>

    <!-- BARRE HELLENISATION -->
    <div style="padding:10px 20px;border-bottom:1px solid #1a2e4a;background:#040810">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="font-size:10px;font-weight:700;letter-spacing:.1em;color:#c8901a;white-space:nowrap;text-transform:uppercase">Hellénisation de la Société</div>
        <div style="flex:1;height:8px;background:#0a1628;border-radius:4px;border:1px solid #1a2e4a;overflow:hidden;position:relative">
          <div style="height:100%;width:${hellenPct}%;background:linear-gradient(90deg,#c8901a,#f0c060);border-radius:4px;transition:width .6s ease;position:relative">
            <div style="position:absolute;right:0;top:0;bottom:0;width:20px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.3));border-radius:0 4px 4px 0"></div>
          </div>
        </div>
        <div style="font-size:12px;font-weight:700;color:#f0c060;white-space:nowrap;min-width:40px;text-align:right">${hellenPct}%</div>
      </div>
    </div>

    <!-- CORPS PRINCIPAL -->
    <div style="display:grid;grid-template-columns:260px 1fr ${selPNJ?'280px':'0px'};overflow:hidden;transition:grid-template-columns .3s">

      <!-- GAUCHE : LOIS -->
      <div style="border-right:1px solid #1a2e4a;overflow-y:auto;display:flex;flex-direction:column" id="exp-lois-panel">
        <div style="padding:10px 14px;border-bottom:1px solid #1a2e4a;font-size:10px;font-weight:700;letter-spacing:.1em;color:#6a8aaa;text-transform:uppercase;display:flex;align-items:center;gap:6px">
          <span style="color:#c8901a">⚖</span> Propositions de Loi
        </div>
        ${renderLoisList(isOlympien, isAdmin)}
      </div>

      <!-- CENTRE : PNJ + HEMICYCLE -->
      <div style="display:flex;flex-direction:column;overflow:hidden">

        <!-- PNJ ROW -->
        <div style="padding:14px 16px;border-bottom:1px solid #1a2e4a;background:#040810">
          <div style="font-size:10px;font-weight:700;letter-spacing:.1em;color:#6a8aaa;text-transform:uppercase;margin-bottom:12px">Entités Divines du Conseil</div>
          <div style="display:grid;grid-template-columns:repeat(${Math.min(expPNJ.length,4)},1fr);gap:10px" id="exp-pnj-row">
            ${renderPNJCards()}
          </div>
        </div>

        <!-- HEMICYCLE -->
        <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:16px;overflow:hidden" id="exp-hemicycle-wrap">
          ${renderHemicycle()}
        </div>
      </div>

      <!-- DROITE : DETAIL PNJ -->
      <div style="border-left:1px solid #1a2e4a;overflow-y:auto;${selPNJ?'':'display:none'}" id="exp-pnj-detail">
        ${selPNJ ? renderPNJDetail(selPNJ) : ''}
      </div>
    </div>

    <!-- FOOTER -->
    <div style="padding:8px 20px;border-top:1px solid #1a2e4a;display:flex;align-items:center;justify-content:space-between;background:#040810">
      <div style="font-size:9px;color:#2a4a6a;letter-spacing:.06em">${expLois.length} propositions · ${expPNJ.length} entités · Données en direct</div>
      <button onclick="expRefresh()" style="background:none;border:1px solid #1a2e4a;border-radius:4px;color:#6a8aaa;padding:3px 10px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:10px;font-weight:600;letter-spacing:.05em" onmouseover="this.style.borderColor='#c8901a44';this.style.color='#c8901a'" onmouseout="this.style.borderColor='#1a2e4a';this.style.color='#6a8aaa'">⟳ ACTUALISER</button>
    </div>
  `;

  // Add CSS animation
  if (!document.getElementById('exp-style')) {
    const style = document.createElement('style');
    style.id = 'exp-style';
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');
      @keyframes exp-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }
      @keyframes exp-glow  { 0%,100%{box-shadow:0 0 6px #c8901a44} 50%{box-shadow:0 0 14px #c8901a88} }
      @keyframes seat-appear { from{opacity:0} to{opacity:var(--final-op,.85)} }
      .exp-pnj-card { cursor:pointer; transition:all .15s; }
      .exp-pnj-card:hover { transform:translateY(-2px); }
      .exp-pnj-card.active { border-color:#c8901a !important; box-shadow:0 0 12px #c8901a44; }
      .exp-loi-item { cursor:pointer; transition:background .12s; }
      .exp-loi-item:hover { background:#0d1e30 !important; }
      .exp-loi-item.active { background:#0d1e2a !important; border-left:2px solid #c8901a !important; }
      .exp-action-btn { transition:all .15s; cursor:pointer; }
      .exp-action-btn:hover { filter:brightness(1.2); transform:translateY(-1px); }
      .exp-action-btn:disabled { opacity:.35; cursor:not-allowed; transform:none; filter:none; }
    `;
    document.head.appendChild(style);
  }
}

// ---- PNJ CARDS ---------------------------------------------
function renderPNJCards() {
  if (!expPNJ.length) return `<div style="grid-column:1/-1;text-align:center;color:#2a4a6a;font-size:11px;padding:20px">Aucune entité — remplissez l'onglet PNJ Experreducti</div>`;

  return expPNJ.filter(p => p.fonction?.trim() !== 'UEPresident').slice(0,4).map(p => {
    const isActive = selPNJ?.id === p.id;
    const approKey = expMe ? `appro_${expMe.id}` : 'approbation';
    const appro = Number(p[approKey] || p.approbation || p.approbation_base || 50);
    const approColor = appro >= 70 ? '#2a9a4a' : appro >= 40 ? '#c8901a' : '#cc3030';
    const isRejected = cycleRejects[p.id];
    const hasScene = cycleScenes[p.id];

    return `<div class="exp-pnj-card${isActive?' active':''}" onclick="expSelectPNJ('${p.id}')"
      style="background:#0a1628;border:1px solid ${isActive?'#c8901a':'#1a2e4a'};border-radius:8px;padding:12px 10px;display:flex;flex-direction:column;align-items:center;gap:8px;position:relative;${isRejected?'opacity:.5;filter:grayscale(.6)':''}">
      ${isRejected?`<div style="position:absolute;top:4px;right:4px;font-size:9px;color:#cc3030;font-weight:700;letter-spacing:.06em">REJETÉ</div>`:''}
      ${hasScene?`<div style="position:absolute;top:4px;left:4px;font-size:9px;background:#c8901a;color:#04080f;font-weight:700;border-radius:3px;padding:1px 4px;letter-spacing:.04em">SCÈNE</div>`:''}
      <div style="width:52px;height:52px;border-radius:50%;overflow:hidden;border:2px solid ${approColor}55;background:#0d2040;flex-shrink:0;position:relative">
        ${p.portrait_url?`<img src="${p.portrait_url}" style="width:100%;height:100%;object-fit:cover">`
          :`<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:Cinzel,serif;font-size:16px;font-weight:700;color:#c8901a">${(p.nom||'?').slice(0,1)}</div>`}
      </div>
      <div style="text-align:center">
        <div style="font-size:12px;font-weight:700;color:#cfe4f7;letter-spacing:.04em">${p.nom||'?'}</div>
        <div style="font-size:9px;color:#6a8aaa;margin-top:1px">${p.fonction||''}</div>
      </div>
      <div style="width:100%;height:3px;background:#0a1628;border-radius:2px;overflow:hidden;border:1px solid #1a2e4a">
        <div style="height:100%;width:${appro}%;background:linear-gradient(90deg,${approColor},${approColor}cc);border-radius:2px;transition:width .4s"></div>
      </div>
      <div style="font-size:9px;color:${approColor};font-weight:700">${appro}% approbation</div>
    </div>`;
  }).join('');
}

// ---- PNJ DETAIL --------------------------------------------
function renderPNJDetail(pnjId) {
  const p = expPNJ.find(x => x.id === pnjId);
  if (!p) return '';
  const approKey = expMe ? `appro_${expMe.id}` : 'approbation';
  const appro = Number(p[approKey] || p.approbation || p.approbation_base || 50);
  const approColor = appro >= 70 ? '#2a9a4a' : appro >= 40 ? '#c8901a' : '#cc3030';
  const isRejected = cycleRejects[pnjId];
  const hasScene = cycleScenes[pnjId];
  const canAct = expMe && !isRejected && !hasScene;

  return `
    <div style="padding:14px">
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px">
        <div style="width:64px;height:64px;border-radius:50%;overflow:hidden;border:2px solid #c8901a44;background:#0d2040;flex-shrink:0">
          ${p.portrait_url?`<img src="${p.portrait_url}" style="width:100%;height:100%;object-fit:cover">`
            :`<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:Cinzel,serif;font-size:22px;font-weight:700;color:#c8901a">${(p.nom||'?').slice(0,1)}</div>`}
        </div>
        <div>
          <div style="font-family:Cinzel,Rajdhani,sans-serif;font-size:14px;font-weight:700;color:#f0c060;margin-bottom:2px">${p.nom||'?'}</div>
          <div style="font-size:10px;color:#6a8aaa;margin-bottom:6px">${p.fonction||''}</div>
          <div style="display:flex;align-items:center;gap:6px">
            <div style="height:6px;flex:1;background:#0a1628;border-radius:3px;border:1px solid #1a2e4a;overflow:hidden">
              <div style="height:100%;width:${appro}%;background:linear-gradient(90deg,${approColor},${approColor}cc);border-radius:3px"></div>
            </div>
            <span style="font-size:10px;font-weight:700;color:${approColor}">${appro}%</span>
          </div>
        </div>
      </div>

      ${p.bio?`<div style="font-size:11px;color:#7a9aaa;line-height:1.6;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #1a2e4a">${p.bio}</div>`:''}

      <div style="font-size:10px;font-weight:700;letter-spacing:.08em;color:#6a8aaa;text-transform:uppercase;margin-bottom:8px">Actions ce cycle</div>

      ${isRejected?`<div style="font-size:11px;color:#cc3030;background:#140404;border:1px solid #2a0808;border-radius:6px;padding:8px;text-align:center;margin-bottom:8px">Autorité rejetée ce cycle</div>`:''}
      ${hasScene?`<div style="font-size:11px;color:#c8901a;background:#14100a;border:1px solid #2a1e08;border-radius:6px;padding:8px;text-align:center;margin-bottom:8px">⚔ Scène lancée ce cycle</div>`:''}

      ${canAct?`
        <button class="exp-action-btn" onclick="expLancerScene('${p.id}')"
          style="width:100%;padding:9px;border-radius:6px;border:1px solid #c8901a44;background:#14100a;color:#f0c060;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;letter-spacing:.06em;margin-bottom:8px;display:flex;align-items:center;justify-content:center;gap:6px">
          ⚔ LANCER UNE SCÈNE
        </button>
        <button class="exp-action-btn" onclick="expRejeter('${p.id}')"
          style="width:100%;padding:9px;border-radius:6px;border:1px solid #cc303044;background:#140404;color:#f07070;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;letter-spacing:.06em;display:flex;align-items:center;justify-content:center;gap:6px">
          ✕ REJETER L'AUTORITÉ
        </button>
      `:`<div style="font-size:10px;color:#2a4a6a;text-align:center;padding:8px">${!expMe?'Connectez-vous pour agir':'Action déjà effectuée'}</div>`}
    </div>
  `;
}

// ---- LOIS LIST ---------------------------------------------
function renderLoisList(isOlympien, isAdmin) {
  if (!expLois.length) return `<div style="padding:20px;text-align:center;color:#2a4a6a;font-size:11px">Aucune loi — remplissez l'onglet Experreducti</div>`;

  return expLois.map(l => {
    const statut = (l.statut||'proposée').trim();
    const statutColor = statut==='adoptée'?'#2a9a4a':statut==='rejetée'?'#cc3030':statut==='en_vote'?'#c8901a':'#3a6a8a';
    const type = (l.type||'politique').trim();
    const typeColor = type==='hellenisation'?'#c8901a':type==='economique'?'#2a7acc':'#6a8aaa';

    return `<div class="exp-loi-item" id="loi-${l.id}"
      style="padding:10px 14px;border-bottom:1px solid #0d1a28;border-left:2px solid transparent"
      onclick="expSelectLoi('${l.id}')">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <span style="font-size:9px;font-weight:700;letter-spacing:.06em;color:${typeColor};background:${typeColor}18;border:1px solid ${typeColor}33;border-radius:3px;padding:1px 5px;text-transform:uppercase">${type}</span>
        <span style="font-size:9px;font-weight:700;color:${statutColor};margin-left:auto">${statut.toUpperCase()}</span>
      </div>
      <div style="font-size:12px;font-weight:600;color:#cfe4f7;line-height:1.3">${l.titre||l.title||'?'}</div>
      ${l.hellenisation&&Number(l.hellenisation)>0?`<div style="font-size:9px;color:#c8901a;margin-top:3px">+${l.hellenisation}% Hellénisation si adoptée</div>`:''}
    </div>`;
  }).join('');
}

// ---- HEMICYCLE ---------------------------------------------
function renderHemicycle() {
  const TOTAL_SEATS = 705;
  const W = 480, H = 260;
  const cx = W / 2, cy = H - 40;
  const rows = 6;
  const innerR = 42, outerR = 155;

  // Build seat positions
  const seatsData = [];
  for (let row = 0; row < rows; row++) {
    const r = innerR + (outerR - innerR) * (row / (rows - 1));
    const n = Math.round(Math.PI * r / 12);
    for (let i = 0; i < n; i++) {
      const angle = Math.PI - (i / (n - 1)) * Math.PI;
      seatsData.push({
        x: cx + r * Math.cos(angle),
        y: cy - r * Math.sin(angle),
      });
    }
  }
  const actualSeats = seatsData.length;

  // Find active law
  const activeLois = expLois.filter(l => l.statut?.trim() === 'en_vote');
  let pctPour = 0, pctContre = 0, pctAbst = 0;
  if (activeLois.length > 0) {
    activeLois.forEach(l => {
      pctPour   += Number(l.pct_pour || 0);
      pctContre += Number(l.pct_contre || 0);
      pctAbst   += Number(l.pct_abstention || 0);
    });
    pctPour   = Math.round(pctPour / activeLois.length);
    pctContre = Math.round(pctContre / activeLois.length);
    pctAbst   = Math.round(pctAbst / activeLois.length);
  }

  const nContre  = Math.round(actualSeats * pctContre / 100);
  const nAbst    = Math.round(actualSeats * pctAbst / 100);
  const nPour    = Math.round(actualSeats * pctPour / 100);
  const nNonVot  = actualSeats - nPour - nContre - nAbst;

  const seats = seatsData.map((s, idx) => {
    let color, op;
    if (idx < nContre)                        { color = '#cc3030'; op = .9; }
    else if (idx < nContre + nAbst)           { color = '#3a5a7a'; op = .7; }
    else if (idx < nContre + nAbst + nNonVot) { color = '#1a2e40'; op = .5; }
    else                                       { color = '#2a9a4a'; op = .9; }
    const delay = Math.round(idx * 0.6);
    return `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="3.8" fill="${color}" opacity="0" style="animation:seat-appear .25s ease forwards ${delay}ms;--final-op:${op}"/>`;
  }).join('');

  // President PNJ
  const pres = expPNJ.find(p => p.fonction?.trim() === 'UEPresident');
  const presR = 22;
  const presCy = cy - presR - 10;
  const presEl = pres ? `
    <defs>
      <clipPath id="pres-clip">
        <circle cx="${cx}" cy="${presCy}" r="${presR}"/>
      </clipPath>
    </defs>
    <circle cx="${cx}" cy="${presCy}" r="${presR + 12}" fill="#04080f" stroke="none"/>
    ${pres.portrait_url
      ? `<image href="${pres.portrait_url}" x="${cx - presR}" y="${presCy - presR}" width="${presR*2}" height="${presR*2}" clip-path="url(#pres-clip)" style="cursor:pointer" onclick="expSelectPNJ('${pres.id}')"/>`
      : `<text x="${cx}" y="${presCy}" text-anchor="middle" dominant-baseline="central" font-size="16" font-family="Cinzel,serif" fill="#c8901a" font-weight="700">${(pres.nom||'?').slice(0,1)}</text>`
    }
    <circle cx="${cx}" cy="${presCy}" r="${presR}" fill="none" stroke="#c8901a" stroke-width="2" style="cursor:pointer" onclick="expSelectPNJ('${pres.id}')"/>
    <circle cx="${cx}" cy="${presCy}" r="${presR + 6}" fill="none" stroke="#c8901a55" stroke-width="1" stroke-dasharray="4,3"/>
  ` : `
    <circle cx="${cx}" cy="${presCy}" r="${presR}" fill="#0a1628" stroke="#c8901a55" stroke-width="1.5"/>
    <text x="${cx}" y="${presCy}" text-anchor="middle" dominant-baseline="central" font-size="8" font-family="Cinzel,serif" fill="#c8901a" font-weight="700">EXP</text>
  `;

  const realPour   = Math.round(705 * pctPour / 100);
  const realContre = Math.round(705 * pctContre / 100);
  const realAbst   = Math.round(705 * pctAbst / 100);
  const realNonVot = 705 - realPour - realContre - realAbst;
  const loiLabel   = activeLois[0] ? (activeLois[0].titre || activeLois[0].title || '') : '';

  return `
    <div style="width:100%;display:flex;flex-direction:column;align-items:center;gap:8px;padding:0 10px">
      ${loiLabel
        ? `<div style="font-size:10px;font-weight:700;color:#c8901a;letter-spacing:.1em;text-transform:uppercase;text-align:center">${loiLabel}</div>`
        : `<div style="font-size:10px;color:#2a4a6a;letter-spacing:.06em">Aucune loi en vote actuellement</div>`}
      <div style="width:100%;overflow:hidden">
        <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" xmlns="http://www.w3.org/2000/svg">
          <path d="M ${cx - outerR - 8},${cy} A ${outerR + 8},${outerR + 8} 0 0,1 ${cx + outerR + 8},${cy}" fill="#04080f" stroke="#1a2e4a" stroke-width="1"/>
          ${seats}
          ${presEl}
          <line x1="${cx - outerR - 8}" y1="${cy}" x2="${cx + outerR + 8}" y2="${cy}" stroke="#1a3050" stroke-width="1.5"/>
        </svg>
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">
        ${[
          {label:'Pour',        val:realPour,   pct:pctPour,                        color:'#2a9a4a'},
          {label:'Contre',      val:realContre, pct:pctContre,                      color:'#cc3030'},
          {label:'Abstention',  val:realAbst,   pct:pctAbst,                        color:'#3a5a7a'},
          {label:'Non-votants', val:realNonVot, pct:100-pctPour-pctContre-pctAbst,  color:'#1a2e40'},
        ].map(s => `<div style="display:flex;align-items:center;gap:5px">
          <div style="width:8px;height:8px;border-radius:50%;background:${s.color};flex-shrink:0"></div>
          <span style="font-size:10px;color:${s.color};font-family:Rajdhani,sans-serif;font-weight:600">${s.label} — ${s.val} (${s.pct}%)</span>
        </div>`).join('')}
      </div>
    </div>
  `;
}


// ---- ACTIONS -----------------------------------------------
function expSelectPNJ(id) {
  selPNJ = selPNJ === id ? null : id;
  renderExperreducti();
}

function expSelectLoi(id) {
  document.querySelectorAll('.exp-loi-item').forEach(el => el.classList.remove('active'));
  const el = document.getElementById('loi-' + id);
  if (el) el.classList.add('active');
  const loi = expLois.find(l => l.id === id);
  if (!loi) return;
  // Show description in a tooltip-like area
  const wrap = document.getElementById('exp-lois-panel');
  if (!wrap) return;
  let desc = wrap.querySelector('#loi-desc');
  if (!desc) {
    desc = document.createElement('div');
    desc.id = 'loi-desc';
    desc.style.cssText = 'position:sticky;bottom:0;background:#060d1a;border-top:1px solid #1a2e4a;padding:10px 14px;';
    wrap.appendChild(desc);
  }
  const canPropose = expMe && !loi.statut?.includes('adoptée') && !loi.statut?.includes('en_vote');
  desc.innerHTML = `
    <div style="font-size:11px;font-weight:700;color:#f0c060;margin-bottom:4px">${loi.titre||loi.title||'?'}</div>
    <div style="font-size:10px;color:#7a9aaa;line-height:1.5;margin-bottom:8px">${loi.description||'Aucune description.'}</div>
    ${canPropose?`<button class="exp-action-btn" onclick="expProposerLoi('${id}')"
      style="width:100%;padding:7px;border-radius:5px;border:1px solid #c8901a44;background:#14100a;color:#f0c060;font-family:Rajdhani,sans-serif;font-size:11px;font-weight:700;letter-spacing:.05em">
      SOUMETTRE AU VOTE
    </button>`:`<div style="font-size:9px;color:#2a4a6a;text-align:center">Statut : ${loi.statut||'?'}</div>`}
  `;
}

async function expLancerScene(pnjId) {
  if (!expMe || cycleScenes[pnjId]) return;
  const p = expPNJ.find(x => x.id === pnjId);
  const myAtks = window.VV.attacks.filter(a => a.attacker === expMe.id);
  if (myAtks.length >= 2) {
    alert('Vous avez déjà 2 actions déclarées ce cycle.');
    return;
  }
  if (!confirm(`Lancer une scène avec ${p?.nom||pnjId} ?\nCela compte comme l'un de vos 2 slots d'attaque.`)) return;

  const res = await expPostScript({
    action: 'add_attack',
    cycle: window.VV?.CYCLE || 1,
    attaquant: expMe.id,
    cible: pnjId,
    territoire_id: `scene_${pnjId}`,
  });

  if (res.ok) {
    cycleScenes[pnjId] = true;
    // Ajouter dans VV.attacks pour que le slot s'affiche sur la carte
    window.VV.attacks.push({
      attacker:  expMe.id,
      target:    pnjId,
      territory: `scene_${pnjId}`,
      capitulation: '',
    });
    // Mettre à jour le dock et le panel de la carte principale
    if (typeof renderDock === 'function')        renderDock();
    if (typeof renderPlayerPanel === 'function') renderPlayerPanel();
    if (typeof updateWarningTicker === 'function') updateWarningTicker();
    selPNJ = pnjId;
    renderExperreducti();
  } else {
    alert('Erreur : ' + res.error);
  }
}

async function expRejeter(pnjId) {
  if (!expMe || cycleRejects[pnjId]) return;
  const p = expPNJ.find(x => x.id === pnjId);
  if (!confirm(`Rejeter l'autorité de ${p?.nom||pnjId} pour ce cycle ?`)) return;
  cycleRejects[pnjId] = true;
  selPNJ = null;
  renderExperreducti();
}

async function expProposerLoi(loiId) {
  if (!expMe) return;
  const loi = expLois.find(l => l.id === loiId);
  if (!loi) return;
  if (!confirm(`Soumettre "${loi.titre||loi.title}" au vote du Parlement ?`)) return;
  // Update via Apps Script
  await expPostScript({
    action: 'update_loi',
    loi_id: loiId,
    statut: 'en_vote',
    proposant: expMe.id,
  });
  loi.statut = 'en_vote';
  renderExperreducti();
}

async function expRefresh() {
  const [pnjData, loisData] = await Promise.all([
    expFetch(EXP_CFG.GIDS.pnj),
    expFetch(EXP_CFG.GIDS.lois),
  ]);
  expPNJ  = pnjData;
  expLois = loisData;
  hellenScore = expLois.filter(l => l.statut?.trim()==='adoptée' && l.type?.trim()==='hellenisation')
    .reduce((s,l) => s + (Number(l.hellenisation)||0), 0);
  renderExperreducti();
}

// ---- EXPORT ------------------------------------------------
window.openExperreducti  = openExperreducti;
window.expTryUnlock      = expTryUnlock;
window.closeExperreducti = closeExperreducti;
window.expSelectPNJ      = expSelectPNJ;
window.expSelectLoi      = expSelectLoi;
window.expLancerScene    = expLancerScene;
window.expRejeter        = expRejeter;
window.expProposerLoi    = expProposerLoi;
window.expRefresh        = expRefresh;
