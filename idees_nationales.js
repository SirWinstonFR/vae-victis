/* ============================================================
   VAE VICTIS — idees_nationales.js
   Rendu des 4 slots d'idées nationales dans le panneau zone
   ============================================================ */

(function() {
  'use strict';

  const TYPE_COLOR = {
    bonus:  '#2a9a4a',
    malus:  '#cc3030',
    neutre: '#3a7acc',
  };

  const PENTAGON = 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)';

  function buildSlot(id, index) {
    const col = id ? (TYPE_COLOR[id.type] || '#3a5a7a') : '#1a2e4a';

    // Slot vide
    if (!id) {
      return ''
        + '<div style="display:flex;flex-direction:column;align-items:center;gap:5px">'
        +   '<div style="width:52px;height:52px;clip-path:' + PENTAGON + ';background:#0d1828;display:flex;align-items:center;justify-content:center">'
        +     '<div style="width:46px;height:46px;clip-path:' + PENTAGON + ';background:#0a1422;display:flex;align-items:center;justify-content:center">'
        +       '<span style="font-size:16px;opacity:.2">?</span>'
        +     '</div>'
        +   '</div>'
        +   '<div style="font-size:9px;color:#1a2e4a;font-family:Rajdhani,sans-serif;text-align:center">Vide</div>'
        + '</div>';
    }

    // Icône : image ou symbole
    const icon = id.img
      ? '<img src="' + id.img + '" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display=\'none\'">'
      : '<span style="font-size:16px">' + (id.type === 'bonus' ? '★' : id.type === 'malus' ? '✕' : '○') + '</span>';

    // Panneau de détail (caché par défaut, toggle au clic)
    const detail = ''
      + '<div class="idee-detail" style="display:none;grid-column:1/-1;padding:8px 10px;'
      +   'border-radius:var(--radius);border:1px solid ' + col + '33;background:' + col + '0a;'
      +   'font-size:11px;color:var(--c-text2);line-height:1.6">'
      +   '<div style="font-family:Rajdhani,sans-serif;font-size:13px;font-weight:700;color:' + col + ';margin-bottom:4px">' + id.nom + '</div>'
      +   (id.court ? '<div style="margin-bottom:3px">' + id.court + '</div>' : '')
      +   (id.effet ? '<div style="color:' + col + ';font-size:10px">▲ ' + id.effet + '</div>' : '')
      + '</div>';

    // Carte cliquable
    const card = ''
      + '<div style="display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer"'
      +   ' onclick="(function(el){var d=el.nextElementSibling;d.style.display=d.style.display===\'none\'?\'block\':\'none\'})(this)"'
      +   ' title="' + id.nom + '">'
      +   '<div style="width:52px;height:52px;clip-path:' + PENTAGON + ';background:' + col + '44;display:flex;align-items:center;justify-content:center">'
      +     '<div style="width:46px;height:46px;clip-path:' + PENTAGON + ';background:#0a1422;overflow:hidden;display:flex;align-items:center;justify-content:center">'
      +       icon
      +     '</div>'
      +   '</div>'
      +   '<div style="font-size:9px;color:' + col + ';font-family:Rajdhani,sans-serif;text-align:center;'
      +     'max-width:56px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + id.nom + '</div>'
      + '</div>';

    return card + detail;
  }

  /**
   * Retourne le HTML complet de la section idées nationales.
   * @param {Array} idees — tableau d'objets idée depuis nations[zone].idees
   */
  window.VV.renderIdeesHTML = function(idees) {
    idees = idees || [];
    const slots = [0, 1, 2, 3].map(function(i) {
      return buildSlot(idees[i] || null, i);
    }).join('');

    return ''
      + '<div class="divider"></div>'
      + '<div class="sec"><i class="ti ti-star"></i> Idées nationales</div>'
      + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:4px 2px">'
      +   slots
      + '</div>';
  };

})();
