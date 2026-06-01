// ================================================================
// crises_modal.js — Modal de gestion des crises
// Charger APRÈS app.js
// ================================================================

// ---- ÉTAT LOCAL CRISES
let _criseModal = null;

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
  _notifications.unshift({ ...notif, id: Date.now() });
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
  const me = getMe();
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

// ---- ÉTAT NOTIFICATIONS
let _notifPanel    = null;
let _notifications = [];

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

async function repondreNotif(id, rep) {
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
      dieu:     (window.VV.me || me)?.id,
      cycle:    window.VV.CYCLE || CYCLE,
    });
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
  const topbar = document.querySelector('.header-right, #header, header');
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

// ---- EXPOSITION GLOBALE
window.repondreNotif     = repondreNotif;
window.openCriseModal    = openCriseModal;
window.selectCriseOption = selectCriseOption;
window.toggleInvite      = toggleInvite;
window.selectIdee        = selectIdee;
window.closeCriseModal   = closeCriseModal;
window.confirmCrise      = confirmCrise;

// Appeler au login via app.js
window.VV.crises = {
  loadNotifs:    loadNotifications,
  injectNotifBtn: injectNotifButton,
};
