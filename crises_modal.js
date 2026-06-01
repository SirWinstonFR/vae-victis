// ================================================================
// crises_modal.js — Modal de gestion des crises
// Charger APRÈS app.js
// ================================================================

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

// Brancher renderCrisesPanel dans app.js
const _origRenderZone = window.VV?.renderZonePanel;

// Exposer renderCrisesPanel globalement
window.renderCrisesPanel = renderCrisesPanel;
