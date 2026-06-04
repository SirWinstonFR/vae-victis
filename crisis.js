// ================================================================
// crises.js — Gestion des crises nationales — Vae Victis
// Dépendances : app.js (me, getD, getFaction, FACTIONS, CFG,
//               postScript, nations, window.VV.situations)
// ================================================================

// ---- CHEFS DE PANTHÉON ----------------------------------------
window.PANTHEON_CHIEFS = window.PANTHEON_CHIEFS || {
  sovereign: 'liberty',
  olympien:  'zeus',
  shemning:  'entite',
};
const PANTHEON_CHIEFS = window.PANTHEON_CHIEFS;

// ---- INJECTION CSS --------------------------------------------
(function injectCriseStyles() {
  if (document.getElementById('vv-crises-style')) return;
  const s = document.createElement('style');
  s.id = 'vv-crises-style';
  s.textContent = `
    /* --- badges crises dans panel zone --- */
    .crise-section { padding: 0 12px 10px; }
    .crise-item {
      display:flex; align-items:flex-start; gap:8px;
      padding:7px 9px; border-radius:7px; margin-bottom:5px;
      background:rgba(255,255,255,.03); border:.5px solid rgba(255,255,255,.07);
      cursor:default;
    }
    .crise-dot {
      width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:4px;
    }
    .crise-info { flex:1;min-width:0; }
    .crise-label { font-size:11px;font-weight:600;font-family:Rajdhani,sans-serif; }
    .crise-zone  { font-size:10px;color:var(--c-text3); }
    .crise-desc  { font-size:10px;color:var(--c-text2);margin-top:2px;line-height:1.4; }
    .crise-btn {
      font-size:10px;font-weight:600;font-family:Rajdhani,sans-serif;
      padding:3px 8px;border-radius:5px;border:none;cursor:pointer;
      background:rgba(255,255,255,.08);color:var(--c-text1);
      transition:background .15s;white-space:nowrap;flex-shrink:0;
    }
    .crise-btn:hover { background:rgba(255,255,255,.15); }

    /* --- overlay de gestion --- */
    #crise-overlay {
      position:fixed;inset:0;z-index:2000;
      background:rgba(0,0,0,.7);
      display:flex;align-items:center;justify-content:center;
      backdrop-filter:blur(3px);
    }
    #crise-overlay.hidden { display:none; }
    .crise-modal {
      width:340px;max-height:88vh;overflow-y:auto;
      background:#0d1117;border:.5px solid rgba(255,255,255,.12);
      border-radius:13px;padding:0;box-shadow:0 20px 60px rgba(0,0,0,.8);
    }
    .cm-header {
      padding:14px 16px 12px;
      border-bottom:.5px solid rgba(255,255,255,.07);
    }
    .cm-close {
      float:right;background:none;border:none;color:var(--c-text3);
      font-size:15px;cursor:pointer;padding:0;line-height:1;
    }
    .cm-close:hover { color:var(--c-text1); }
    .cm-title { font-size:15px;font-weight:700;font-family:Rajdhani,sans-serif;color:#fff; }
    .cm-sub   { font-size:11px;color:var(--c-text3);margin-top:2px; }
    .cm-body  { padding:12px 16px 16px; }

    .cm-section-title {
      font-size:9px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;
      color:var(--c-text3);font-family:Rajdhani,sans-serif;margin:12px 0 6px;
    }
    .cm-section-title:first-child { margin-top:0; }

    /* options d'action */
    .cm-option {
      border:.5px solid rgba(255,255,255,.08);border-radius:9px;
      padding:10px 12px;margin-bottom:8px;cursor:pointer;
      transition:border-color .18s,background .18s;
      background:rgba(255,255,255,.02);
    }
    .cm-option:hover { border-color:rgba(255,255,255,.2);background:rgba(255,255,255,.05); }
    .cm-option.selected { border-color:#4a80cc;background:rgba(74,128,204,.08); }
    .cm-option.disabled { opacity:.4;cursor:not-allowed;pointer-events:none; }
    .cm-opt-title { font-size:12px;font-weight:600;font-family:Rajdhani,sans-serif;color:#fff;margin-bottom:3px;display:flex;align-items:center;gap:7px; }
    .cm-opt-icon { font-size:14px; }
    .cm-opt-desc { font-size:10px;color:var(--c-text2);line-height:1.45; }
    .cm-opt-badge { font-size:9px;padding:2px 6px;border-radius:4px;font-weight:700;letter-spacing:.05em; }
    .badge-auto   { background:#1a2e1a;color:#5ec95e;border:.5px solid #3d7a3d; }
    .badge-chef   { background:#2a1f10;color:#e8a030;border:.5px solid #7a5010; }
    .badge-block  { background:#2e1a1a;color:#e06060;border:.5px solid #7a3a3a; }

    /* liste invitations */
    .cm-deity-list { display:flex;flex-direction:column;gap:5px;margin-top:6px; }
    .cm-deity-row {
      display:flex;align-items:center;gap:8px;
      padding:6px 8px;border-radius:6px;
      background:rgba(255,255,255,.03);border:.5px solid rgba(255,255,255,.06);
      cursor:pointer;transition:background .15s;
    }
    .cm-deity-row:hover  { background:rgba(255,255,255,.07); }
    .cm-deity-row.checked{ background:rgba(74,128,204,.1);border-color:#4a80cc55; }
    .cm-deity-avatar { width:26px;height:26px;border-radius:50%;object-fit:cover;background:#1a2540;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0; }
    .cm-deity-name { font-size:11px;font-weight:600;color:var(--c-text1);flex:1; }
    .cm-deity-pi   { font-size:10px;color:var(--c-text3); }
    .cm-check { width:14px;height:14px;border-radius:3px;border:.5px solid rgba(255,255,255,.2);background:transparent;flex-shrink:0;display:flex;align-items:center;justify-content:center; }
    .cm-deity-row.checked .cm-check { background:#4a80cc;border-color:#4a80cc; }
    .cm-deity-row.checked .cm-check::after { content:'✓';font-size:9px;color:#fff; }

    /* idées bonus */
    .cm-idee-row {
      display:flex;align-items:center;gap:9px;padding:7px 9px;
      border-radius:7px;background:rgba(255,255,255,.03);
      border:.5px solid rgba(255,255,255,.06);
      cursor:pointer;margin-bottom:5px;transition:background .15s,border-color .15s;
    }
    .cm-idee-row:hover   { background:rgba(255,255,255,.07); }
    .cm-idee-row.selected{ background:rgba(94,201,94,.08);border-color:#3d9b3d55; }
    .cm-idee-img { width:36px;height:36px;border-radius:5px;object-fit:cover;flex-shrink:0; }
    .cm-idee-name{ font-size:11px;font-weight:600;color:var(--c-text1); }
    .cm-idee-effect{ font-size:10px;color:#5ec95e; }

    /* footer boutons */
    .cm-footer { padding:0 16px 14px;display:flex;gap:8px; }
    .cm-btn {
      flex:1;padding:8px;border-radius:7px;border:none;
      font-size:12px;font-weight:600;font-family:Rajdhani,sans-serif;
      cursor:pointer;transition:opacity .15s;
    }
    .cm-btn:disabled { opacity:.4;cursor:not-allowed; }
    .cm-btn-cancel { background:rgba(255,255,255,.07);color:var(--c-text1); }
    .cm-btn-cancel:hover:not(:disabled) { background:rgba(255,255,255,.12); }
    .cm-btn-confirm { background:#3a6ab0;color:#fff; }
    .cm-btn-confirm:hover:not(:disabled) { background:#4a80cc; }

    /* --- notifications badge --- */
    .notif-badge {
      position:absolute;top:-4px;right:-4px;
      width:16px;height:16px;border-radius:50%;
      background:#e06060;color:#fff;font-size:9px;font-weight:700;
      display:flex;align-items:center;justify-content:center;
      pointer-events:none;
    }
    #btn-notifs { position:relative; }

    /* --- panneau notifications --- */
    #notif-panel {
      position:fixed;top:54px;right:8px;z-index:1500;
      width:300px;max-height:70vh;overflow-y:auto;
      background:#0d1117;border:.5px solid rgba(255,255,255,.12);
      border-radius:11px;box-shadow:0 12px 40px rgba(0,0,0,.7);
    }
    #notif-panel.hidden { display:none; }
    .np-header { padding:10px 14px 8px;border-bottom:.5px solid rgba(255,255,255,.07);font-size:11px;font-weight:600;font-family:Rajdhani,sans-serif;color:var(--c-text1);letter-spacing:.05em; }
    .np-empty  { padding:14px;font-size:11px;color:var(--c-text3);text-align:center; }
    .np-item {
      padding:10px 14px;border-bottom:.5px solid rgba(255,255,255,.05);
    }
    .np-item:last-child { border-bottom:none; }
    .np-item-title { font-size:12px;font-weight:600;color:#fff;margin-bottom:3px; }
    .np-item-desc  { font-size:10px;color:var(--c-text2);line-height:1.4;margin-bottom:7px; }
    .np-item-btns  { display:flex;gap:6px; }
    .np-btn { flex:1;padding:5px;border-radius:5px;border:none;font-size:11px;font-weight:600;cursor:pointer;font-family:Rajdhani,sans-serif; }
    .np-btn-yes { background:#1a2e1a;color:#5ec95e; }
    .np-btn-yes:hover { background:#1f3a1f; }
    .np-btn-no  { background:#2e1a1a;color:#e06060; }
    .np-btn-no:hover  { background:#3a1f1f; }
    .np-item-read { font-size:10px;color:var(--c-text3);font-style:italic; }
  `;
  document.head.appendChild(s);
})();

// ---- ÉTAT LOCAL -----------------------------------------------
let _criseModal  = null;   // état de l'overlay ouvert
let _notifPanel  = null;   // référence DOM panel notifs
let _notifications = [];   // notifs en mémoire pour la session

// ---- HELPERS --------------------------------------------------
function getCrisesForZone(zoneName) {
  return (window.VV.situations || []).filter(s => s.zone === zoneName);
}

function getChefPantheon(dieuId) {
  const faction = getFaction(dieuId);
  if (!faction) return null;
  const key = Object.keys(FACTIONS).find(k => FACTIONS[k].name === faction.name);
  return key ? getD(PANTHEON_CHIEFS[key]) : null;
}

function getMyPantheonMates() {
  if (!me) return [];
  const faction = getFaction(me.id);
  if (!faction) return [];
  const key = Object.keys(FACTIONS).find(k => FACTIONS[k].name === faction.name);
  if (!key) return [];
  return FACTIONS[key].members
    .filter(id => id !== me.id)
    .map(id => getD(id))
    .filter(d => d && d.pi > 0);
}

function getAllDeities() {
  return window.VV.DEITIES.filter(d => d.id !== me?.id && d.pi > 0);
}

function canSacrifice(zoneName) {
  const nation = nations[zoneName] || {};
  return (nation.idees || []).filter(Boolean).some(i => i.type === 'bonus');
}

function getBonusIdees(zoneName) {
  const nation = nations[zoneName] || {};
  return (nation.idees || []).filter(Boolean).filter(i => i.type === 'bonus');
}

function piEcart(dieuId) {
  if (!me) return 999;
  const chef = getChefPantheon(dieuId);
  if (!chef) return 0;
  return Math.abs(me.pi - chef.pi);
}

// ---- RENDU DES CRISES DANS LE PANEL ZONE ----------------------
function renderCrisesInPanel(zoneName) {
  const crises = getCrisesForZone(zoneName);
  if (!crises.length) return '';

  const items = crises.map(s => {
    const color = window.VV.getSituationColor(s.type, s.intensity) || '#ff9944';
    const st    = window.VV.SITUATION_TYPES[s.type];
    const label = st ? st.label : s.type;
    const canManage = !!me;
    return `
      <div class="crise-item" data-crise-zone="${zoneName}" data-crise-type="${s.type}" data-crise-intensity="${s.intensity}">
        <div class="crise-dot" style="background:${color};box-shadow:0 0 5px ${color}"></div>
        <div class="crise-info">
          <div class="crise-label" style="color:${color}">${label} — Intensité ${s.intensity}</div>
          ${s.desc ? `<div class="crise-desc">${s.desc}</div>` : ''}
        </div>
        ${canManage ? `<button class="crise-btn" onclick="openCriseModal('${zoneName}','${s.type}',${s.intensity})">Gérer</button>` : ''}
      </div>`;
  }).join('');

  return `
    <div class="crise-section">
      <div class="idees-label" style="color:#ff7744">⚠ Crises actives</div>
      ${items}
    </div>`;
}

// ---- OVERLAY MODAL --------------------------------------------
window.openCriseModal = function(zoneName, criseType, criseIntensity) {
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
};

window.selectCriseOption = function(opt) {
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
};

window.toggleInvite = function(dieuId) {
  const idx = _criseModal.invites.indexOf(dieuId);
  if (idx === -1) _criseModal.invites.push(dieuId);
  else _criseModal.invites.splice(idx, 1);
  document.getElementById(`cm-d-${dieuId}`)?.classList.toggle('checked', idx === -1);
  document.getElementById('cm-confirm-btn').disabled = _criseModal.invites.length === 0;
};

window.selectIdee = function(i) {
  _criseModal.ideeIdx = i;
  document.querySelectorAll('.cm-idee-row').forEach((el, j) => el.classList.toggle('selected', j === i));
  document.getElementById('cm-confirm-btn').disabled = false;
};

window.closeCriseModal = function() {
  const overlay = document.getElementById('crise-overlay');
  if (overlay) overlay.className = 'hidden';
  _criseModal = null;
};

window.confirmCrise = async function() {
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
};

// ---- SYSTÈME DE NOTIFICATIONS ---------------------------------
function addLocalNotif(notif) {
  _notifications.unshift({ ...notif, id: Date.now() });
  updateNotifBadge();
}

function updateNotifBadge() {
  const unread = _notifications.filter(n => !n.read).length;
  let badge = document.querySelector('#btn-notifs .notif-badge');
  const btn = document.getElementById('btn-notifs');
  if (!btn) return;
  if (unread > 0) {
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'notif-badge';
      btn.style.position = 'relative';
      btn.appendChild(badge);
    }
    badge.textContent = unread > 9 ? '9+' : unread;
  } else if (badge) {
    badge.remove();
  }
}

function renderNotifPanel() {
  let panel = document.getElementById('notif-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'notif-panel';
    document.body.appendChild(panel);
    _notifPanel = panel;
  }

  if (_notifications.length === 0) {
    panel.innerHTML = `<div class="np-header">Notifications</div><div class="np-empty">Aucune notification</div>`;
    return;
  }

  const items = _notifications.map(n => {
    if (n.read) {
      return `<div class="np-item"><div class="np-item-title">${n.title}</div><div class="np-item-read">${n.desc}</div></div>`;
    }
    return `
      <div class="np-item" id="np-${n.id}">
        <div class="np-item-title">${n.title}</div>
        <div class="np-item-desc">${n.desc}</div>
        <div class="np-item-btns">
          <button class="np-btn np-btn-yes" onclick="repondreNotif(${n.id},'yes')">✓ Accepter</button>
          <button class="np-btn np-btn-no"  onclick="repondreNotif(${n.id},'no')">✕ Refuser</button>
        </div>
      </div>`;
  }).join('');

  panel.innerHTML = `<div class="np-header">Notifications (${_notifications.filter(n=>!n.read).length} nouvelles)</div>${items}`;
}

window.repondreNotif = async function(id, rep) {
  const notif = _notifications.find(n => n.id === id);
  if (!notif) return;
  notif.read = true;
  updateNotifBadge();
  renderNotifPanel();

  if (notif.payload) {
    await postScript({
      action:   'notif_response',
      notif_id: notif.payload.notif_id,
      reponse:  rep,
      dieu:     me?.id,
      cycle:    window.VV.CYCLE || CYCLE,
    });
  }
};

// ---- CHARGEMENT DES NOTIFS DEPUIS LE SHEET -------------------
async function loadNotifications() {
  if (!me) return;
  try {
    const params = new URLSearchParams({ data: JSON.stringify({ action: 'get_notifs', dieu: me.id }) });
    const r    = await fetch(CFG.APPS_SCRIPT + '?' + params, { method: 'GET' });
    const text = await r.text();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return;
    const d = JSON.parse(match[0]);
    if (d.notifs && Array.isArray(d.notifs)) {
      d.notifs.forEach(n => {
        _notifications.push({
          id:      n.id || Date.now() + Math.random(),
          title:   n.title || 'Notification',
          desc:    n.desc  || '',
          read:    false,
          payload: n,
        });
      });
      updateNotifBadge();
    }
  } catch(e) {
    console.warn('[VV Notifs]', e);
  }
}

// ---- BOUTON NOTIFS DANS LA TOPBAR ----------------------------
function injectNotifButton() {
  // Cherche la topbar pour y ajouter le bouton notifs
  const topbar = document.querySelector('.topbar, #topbar, .top-bar');
  if (!topbar || document.getElementById('btn-notifs')) return;

  const btn = document.createElement('button');
  btn.id        = 'btn-notifs';
  btn.className = 'tb-btn';
  btn.title     = 'Notifications';
  btn.innerHTML = '<i class="ti ti-bell"></i>';
  btn.style.position = 'relative';

  btn.addEventListener('click', () => {
    const panel = document.getElementById('notif-panel');
    if (!panel) { renderNotifPanel(); return; }
    const isHidden = panel.classList.contains('hidden') || panel.style.display === 'none';
    if (isHidden) {
      panel.classList.remove('hidden');
      panel.style.display = '';
      renderNotifPanel();
      _notifications.filter(n => !n.read && !n.payload).forEach(n => n.read = true);
      updateNotifBadge();
    } else {
      panel.classList.add('hidden');
    }
  });

  topbar.appendChild(btn);
}

// Fermer notif-panel si clic extérieur
document.addEventListener('click', e => {
  const panel = document.getElementById('notif-panel');
  if (!panel || panel.classList.contains('hidden')) return;
  if (!panel.contains(e.target) && e.target.id !== 'btn-notifs' && !e.target.closest('#btn-notifs')) {
    panel.classList.add('hidden');
  }
});

// ---- EXPORT GLOBAL -------------------------------------------
window.VV = window.VV || {};
window.VV.crises = Object.assign(window.VV.crises || {}, {
  renderInPanel: renderCrisesInPanel,
  loadNotifs:    loadNotifications,
  injectNotifBtn: injectNotifButton,
});
