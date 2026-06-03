// ---- INJECTION CSS NOTIFS + MODAL --------------------------
(function injectCrisesStyles() {
  if (document.getElementById('vv-crises-modal-style')) return;
  const s = document.createElement('style');
  s.id = 'vv-crises-modal-style';
  s.textContent = `
    /* --- Panel notifications --- */
    #notif-panel {
      position: fixed;
      top: 50px; right: 12px;
      z-index: 9999;
      width: 320px;
      max-height: 70vh;
      overflow-y: auto;
      background: #0b0f18;
      border: 0.5px solid rgba(255,255,255,.1);
      border-radius: 13px;
      box-shadow: 0 16px 48px rgba(0,0,0,.8), 0 0 0 1px rgba(255,255,255,.04);
    }
    #notif-panel.hidden { display: none !important; }
    .np-header {
      padding: 12px 16px 10px;
      border-bottom: 0.5px solid rgba(255,255,255,.07);
      font-size: 10px; font-weight: 700;
      letter-spacing: .1em; text-transform: uppercase;
      color: rgba(255,255,255,.4);
      font-family: Rajdhani, sans-serif;
    }
    .np-empty {
      padding: 20px 16px;
      font-size: 12px; color: rgba(255,255,255,.25);
      text-align: center;
    }
    .np-item {
      padding: 12px 16px;
      border-bottom: 0.5px solid rgba(255,255,255,.05);
    }
    .np-item:last-child { border-bottom: none; }
    .np-item-title {
      font-size: 12px; font-weight: 700;
      font-family: Rajdhani, sans-serif;
      color: #fff; margin-bottom: 4px;
      letter-spacing: .02em;
    }
    .np-item-desc {
      font-size: 11px; color: rgba(255,255,255,.45);
      line-height: 1.5; margin-bottom: 10px;
    }
    .np-item-read {
      font-size: 10px; color: rgba(255,255,255,.25);
      font-style: italic;
    }
    .np-item-btns { display: flex; gap: 6px; }
    .np-btn {
      flex: 1; padding: 7px 10px;
      border-radius: 7px; border: none;
      font-size: 11px; font-weight: 700;
      font-family: Rajdhani, sans-serif;
      cursor: pointer; letter-spacing: .04em;
      transition: opacity .15s, transform .1s;
    }
    .np-btn:hover { opacity: .85; transform: translateY(-1px); }
    .np-btn:active { transform: scale(.97); }
    .np-btn-yes {
      background: linear-gradient(135deg, #1a3a1a, #1f4a1f);
      color: #6edc6e;
      border: 0.5px solid rgba(110,220,110,.2);
    }
    .np-btn-no {
      background: linear-gradient(135deg, #3a1a1a, #4a1f1f);
      color: #dc6e6e;
      border: 0.5px solid rgba(220,110,110,.2);
    }
    /* --- Badge cloche --- */
    .notif-badge {
      position: absolute; top: -5px; right: -5px;
      min-width: 17px; height: 17px;
      border-radius: 9px;
      background: #e05050;
      color: #fff; font-size: 9px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      padding: 0 3px;
      box-shadow: 0 0 8px rgba(220,80,80,.6);
      pointer-events: none;
      font-family: Rajdhani, sans-serif;
    }
    /* --- Modal gestion crise --- */
    #crise-overlay {
      position: fixed; inset: 0; z-index: 2000;
      background: rgba(0,0,0,.65);
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(4px);
    }
    #crise-overlay.hidden { display: none !important; }
    .crise-modal {
      width: 360px; max-height: 88vh; overflow-y: auto;
      background: #0b0f18;
      border: 0.5px solid rgba(255,255,255,.1);
      border-radius: 14px;
      box-shadow: 0 24px 64px rgba(0,0,0,.85), 0 0 0 1px rgba(255,255,255,.04);
    }
    .cm-header {
      padding: 16px 18px 13px;
      border-bottom: 0.5px solid rgba(255,255,255,.07);
    }
    .cm-close {
      float: right; background: none; border: none;
      color: rgba(255,255,255,.3); font-size: 14px;
      cursor: pointer; padding: 0; line-height: 1;
      transition: color .15s;
    }
    .cm-close:hover { color: rgba(255,255,255,.8); }
    .cm-title {
      font-size: 16px; font-weight: 700;
      font-family: Rajdhani, sans-serif;
      color: #fff; letter-spacing: .03em;
    }
    .cm-sub { font-size: 11px; color: rgba(255,255,255,.35); margin-top: 3px; }
    .cm-body { padding: 14px 18px 6px; }
    .cm-section-title {
      font-size: 9px; font-weight: 700; letter-spacing: .1em;
      text-transform: uppercase; color: rgba(255,255,255,.3);
      font-family: Rajdhani, sans-serif; margin: 14px 0 7px;
    }
    .cm-section-title:first-child { margin-top: 0; }
    .cm-option {
      border: 0.5px solid rgba(255,255,255,.07);
      border-radius: 10px; padding: 11px 13px; margin-bottom: 7px;
      cursor: pointer; transition: border-color .18s, background .18s;
      background: rgba(255,255,255,.02);
    }
    .cm-option:hover { border-color: rgba(255,255,255,.18); background: rgba(255,255,255,.05); }
    .cm-option.selected { border-color: #4a7acc; background: rgba(74,122,204,.1); }
    .cm-option.disabled { opacity: .35; cursor: not-allowed; pointer-events: none; }
    .cm-opt-title {
      font-size: 13px; font-weight: 700;
      font-family: Rajdhani, sans-serif;
      color: #fff; margin-bottom: 4px;
      display: flex; align-items: center; gap: 8px;
    }
    .cm-opt-icon { font-size: 15px; }
    .cm-opt-desc { font-size: 10px; color: rgba(255,255,255,.35); line-height: 1.5; }
    .cm-opt-badge {
      font-size: 9px; padding: 2px 7px; border-radius: 4px;
      font-weight: 700; letter-spacing: .05em; margin-left: auto;
    }
    .badge-auto  { background: rgba(60,160,60,.15); color: #6edc6e; border: 0.5px solid rgba(60,160,60,.3); }
    .badge-chef  { background: rgba(220,160,40,.12); color: #e8b840; border: 0.5px solid rgba(220,160,40,.25); }
    .badge-block { background: rgba(220,60,60,.12); color: #dc6060; border: 0.5px solid rgba(220,60,60,.25); }
    .cm-deity-list { display: flex; flex-direction: column; gap: 5px; margin-top: 6px; }
    .cm-deity-row {
      display: flex; align-items: center; gap: 9px;
      padding: 7px 9px; border-radius: 7px;
      background: rgba(255,255,255,.03);
      border: 0.5px solid rgba(255,255,255,.06);
      cursor: pointer; transition: background .15s;
    }
    .cm-deity-row:hover { background: rgba(255,255,255,.07); }
    .cm-deity-row.checked { background: rgba(74,122,204,.1); border-color: rgba(74,122,204,.35); }
    .cm-deity-avatar {
      width: 28px; height: 28px; border-radius: 50%;
      background: #1a2540; display: flex; align-items: center;
      justify-content: center; font-size: 10px; font-weight: 700;
      flex-shrink: 0; overflow: hidden;
    }
    .cm-deity-name { font-size: 11px; font-weight: 600; color: #fff; flex: 1; }
    .cm-deity-pi   { font-size: 10px; color: rgba(255,255,255,.3); }
    .cm-check {
      width: 15px; height: 15px; border-radius: 4px;
      border: 0.5px solid rgba(255,255,255,.2);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .cm-deity-row.checked .cm-check { background: #4a7acc; border-color: #4a7acc; }
    .cm-deity-row.checked .cm-check::after { content: '✓'; font-size: 9px; color: #fff; }
    .cm-idee-row {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 10px; border-radius: 8px;
      background: rgba(255,255,255,.03);
      border: 0.5px solid rgba(255,255,255,.06);
      cursor: pointer; margin-bottom: 5px;
      transition: background .15s, border-color .15s;
    }
    .cm-idee-row:hover { background: rgba(255,255,255,.07); }
    .cm-idee-row.selected { background: rgba(60,160,60,.08); border-color: rgba(60,160,60,.3); }
    .cm-idee-img { width: 38px; height: 38px; border-radius: 6px; object-fit: cover; flex-shrink: 0; }
    .cm-idee-name { font-size: 12px; font-weight: 600; color: #fff; }
    .cm-idee-effect { font-size: 10px; color: #6edc6e; margin-top: 2px; }
    .cm-footer {
      padding: 10px 18px 16px; display: flex; gap: 8px;
    }
    .cm-btn {
      flex: 1; padding: 9px; border-radius: 8px; border: none;
      font-size: 12px; font-weight: 700;
      font-family: Rajdhani, sans-serif;
      cursor: pointer; letter-spacing: .04em;
      transition: opacity .15s, transform .1s;
    }
    .cm-btn:disabled { opacity: .3; cursor: not-allowed; }
    .cm-btn:not(:disabled):hover { opacity: .85; transform: translateY(-1px); }
    .cm-btn-cancel {
      background: rgba(255,255,255,.06);
      color: rgba(255,255,255,.6);
      border: 0.5px solid rgba(255,255,255,.1);
    }
    .cm-btn-confirm {
      background: linear-gradient(135deg, #1e3f6e, #2a5294);
      color: #fff;
      border: 0.5px solid rgba(74,122,204,.3);
    }
  `;
  document.head.appendChild(s);
})();

// ================================================================
// crises_modal.js — Modal de gestion des crises
// Charger APRÈS app.js
// ================================================================

// ---- CONSTANTES CRISES
window.PANTHEON_CHIEFS = window.PANTHEON_CHIEFS || {
  sovereign: 'liberty',
  olympien:  'zeus',
  shemning:  'entite',
};
const PANTHEON_CHIEFS = window.PANTHEON_CHIEFS;

// ---- ÉTAT LOCAL CRISES (protégé contre double chargement)
if (typeof window._VV_CRISES_LOADED === 'undefined') {
  window._VV_CRISES_LOADED  = true;
  window._criseModal        = null;
  window._notifPanel        = null;
  window._notifications     = [];
}
// Références locales vers l'état global
const getModal  = ()    => window._criseModal;
const setModal  = (v)   => { window._criseModal = v; };

// Accès à 'me' depuis app.js
function getMe() { return window.VV.me || null; }

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
  return window.VV.DEITIES.filter(d => d.id !== getMe()?.id && d.pi > 0);
}

function piEcart(dieuId) {
  const me = getMe(); if (!me) return 999;
  const chef = getChefPantheon(dieuId);
  if (!chef) return 0;
  return Math.abs(me.pi - chef.pi);
}

function addLocalNotif(notif) {
  window._notifications.unshift({ ...notif, id: Date.now() });
  updateNotifBadge();
}

function openCriseModal(zoneName, criseType, criseIntensity) {
  const me = getMe();
  if (!me) return;

  const st      = window.VV.SITUATION_TYPES[criseType] || {};
  const color   = window.VV.getSituationColor(criseType, criseIntensity) || '#ff9944';
  const ecart   = piEcart(me.id);
  const autoSacr = ecart <= 10;
  const bonusIdees = getBonusIdees(zoneName);
  const allDeities = getAllDeities();

  window._criseModal = { zoneName, criseType, criseIntensity, option: null, invites: [], ideeIdx: null };

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
  window._criseModal.option  = opt;
  window._criseModal.invites = [];
  window._criseModal.ideeIdx = null;

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
  const idx = window._criseModal.invites.indexOf(dieuId);
  if (idx === -1) window._criseModal.invites.push(dieuId);
  else window._criseModal.invites.splice(idx, 1);
  document.getElementById(`cm-d-${dieuId}`)?.classList.toggle('checked', idx === -1);
  document.getElementById('cm-confirm-btn').disabled = window._criseModal.invites.length === 0;
}

function selectIdee(i) {
  window._criseModal.ideeIdx = i;
  document.querySelectorAll('.cm-idee-row').forEach((el, j) => el.classList.toggle('selected', j === i));
  document.getElementById('cm-confirm-btn').disabled = false;
}

function closeCriseModal() {
  const overlay = document.getElementById('crise-overlay');
  if (overlay) overlay.className = 'hidden';
  window._criseModal = null;
}

async function confirmCrise() {
  const me = getMe();
  if (!window._criseModal || !me) return;
  const { zoneName, criseType, criseIntensity, option, invites, ideeIdx } = window._criseModal;
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
      // Bloquer un slot pour l'initiateur
      const resInv = await postScript({
        action:        'add_attack',
        cycle:         window.VV.CYCLE || CYCLE,
        attaquant:     me.id,
        cible:         me.id,
        territoire_id: `crise_${zoneName}`,
      });
      if (resInv.ok || resInv.message) {
        window.VV.attacks.push({
          attacker:     me.id,
          target:       me.id,
          territory:    `crise_${zoneName}`,
          capitulation: '',
        });
        if (typeof renderDock === 'function') renderDock();
        if (typeof renderPlayerPanel === 'function') renderPlayerPanel();
      }
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
      // Bloquer un slot d'attaque
      const res = await postScript({
        action:        'add_attack',
        cycle:         window.VV.CYCLE || CYCLE,
        attaquant:     me.id,
        cible:         me.id,
        territoire_id: `crise_${zoneName}`,
      });
      if (res.ok || res.message) {
        window.VV.attacks.push({
          attacker:     me.id,
          target:       me.id,
          territory:    `crise_${zoneName}`,
          capitulation: '',
        });
        if (typeof renderDock === 'function') renderDock();
        if (typeof renderPlayerPanel === 'function') renderPlayerPanel();
      }

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

// ---- ÉTAT NOTIFICATIONS
// état géré via window._notifPanel et window._notifications

function updateNotifBadge() {
  const unread = window.window._notifications.filter(n => !n.read).length;
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
    window._notifPanel = panel;
  }

  if (window._notifications.length === 0) {
    panel.innerHTML = `<div class="np-header">Notifications</div><div class="np-empty">Aucune notification</div>`;
    return;
  }

  const items = window._notifications.map(n => {
    if (n.read) {
      return `<div class="np-item"><div class="np-item-title">${n.title}</div><div class="np-item-read">${n.desc}</div></div>`;
    }
    return `
      <div class="np-item" id="np-${n.id}">
        <div class="np-item-title">${n.title}</div>
        <div class="np-item-desc">${n.desc}</div>
        <div class="np-item-btns">
          <button class="np-btn np-btn-yes" onclick="repondreNotif('${n.id}','yes')">✓ Accepter</button>
          <button class="np-btn np-btn-no"  onclick="repondreNotif('${n.id}','no')">✕ Refuser</button>
        </div>
      </div>`;
  }).join('');

  panel.innerHTML = `<div class="np-header">Notifications (${window._notifications.filter(n=>!n.read).length} nouvelles)</div>${items}`;
}

window.repondreNotif = async function repondreNotif(id, rep) {
  const notif = window._notifications.find(n => n.id === id);
  if (!notif) return;
  notif.read = true;
  updateNotifBadge();
  renderNotifPanel();

  const _me = getMe();

  if (notif.payload) {
    await postScript({
      action:   'notif_response',
      notif_id: notif.payload.notif_id,
      reponse:  rep,
      dieu:     _me?.id,
      cycle:    window.VV.CYCLE || CYCLE,
    });

    // Si acceptation d'une invitation de crise → bloquer un slot d'attaque
    if (rep === 'yes' && notif.payload.zone && _me) {
      const territoire_id = `crise_${notif.payload.zone}`;
      // Vérifier que le slot n'est pas déjà utilisé
      const attaquesActuelles = window.VV.attacks.filter(a => a.attacker === _me.id);
      if (attaquesActuelles.length < 2) {
        const res = await postScript({
          action:       'add_attack',
          cycle:        window.VV.CYCLE || CYCLE,
          attaquant:    _me.id,
          cible:        _me.id,
          territoire_id: territoire_id,
        });
        if (res.ok || res.message) {
          // Mettre à jour les attaques localement
          window.VV.attacks.push({
            attacker:     _me.id,
            target:       _me.id,
            territory:    territoire_id,
            capitulation: '',
          });
          // Rafraîchir le dock
          if (typeof renderDock === 'function') renderDock();
          if (typeof renderPlayerPanel === 'function') renderPlayerPanel();
        }
      }
    }
  }
}

// ---- CHARGEMENT DES NOTIFS DEPUIS LE SHEET -------------------
async function loadNotifications() {
  const _me = getMe();
  if (!_me) return;
  try {
    const params = new URLSearchParams({ data: JSON.stringify({ action: 'get_notifs', dieu: _me.id }) });
    const r    = await fetch(CFG.APPS_SCRIPT + '?' + params, { method: 'GET' });
    const text = await r.text();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return;
    const d = JSON.parse(match[0]);
    if (d.notifs && Array.isArray(d.notifs)) {
      d.notifs.forEach(n => {
        window._notifications.push({
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
  const topbar = document.querySelector('.header-right, #header, header');
  if (!topbar || document.getElementById('btn-notifs')) return;

  const btn = document.createElement('button');
  btn.id        = 'btn-notifs';
  btn.className = 'tb-btn';
  btn.title     = 'Notifications';
  btn.innerHTML = '<i class="ti ti-bell"></i>';
  btn.style.position = 'relative';

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const panel = document.getElementById('notif-panel');
    if (!panel) { renderNotifPanel(); return; }
    const isHidden = panel.classList.contains('hidden') || panel.style.display === 'none';
    if (isHidden) {
      panel.classList.remove('hidden');
      panel.style.display = '';
      renderNotifPanel();
      window.window._notifications.filter(n => !n.read && !n.payload).forEach(n => n.read = true);
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
  if (panel && panel.contains(e.target)) return;
  if (!panel || panel.classList.contains('hidden')) return;
  if (!panel.contains(e.target) && e.target.id !== 'btn-notifs' && !e.target.closest('#btn-notifs')) {
    panel.classList.add('hidden');
  }
});

// ---- EXPOSITION GLOBALE
window.repondreNotif     = repondreNotif;
window.openCriseModal    = openCriseModal;
window.selectCriseOption = selectCriseOption;
window.toggleInvite      = toggleInvite;
window.selectIdee        = selectIdee;
window.closeCriseModal   = closeCriseModal;
window.confirmCrise      = confirmCrise;

// Appeler au login via app.js
window.VV = window.VV || {};
window.VV.crises = {
  loadNotifs:    loadNotifications,
  injectNotifBtn: injectNotifButton,
};
