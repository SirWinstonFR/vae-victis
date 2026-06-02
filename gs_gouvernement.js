/* ============================================================
   GRANDE SOCIÉTÉ — Module : Gouvernement Américain
   Élections, Congrès, Américanisme, Éveil Sovereign, Lois
   Appelé par gsOpenModule('gouvernement') dans grande_societe.js
   ============================================================ */

'use strict';

// ---- CONFIG ------------------------------------------------
const GOV_GS_CFG = {
  SHEET_ID:    '1L9hbQuAD9A4WQFG1G47teZlUPM6-JkMmuuX2Ys-TYt8',
  APPS_SCRIPT: 'https://script.google.com/macros/s/AKfycbyCaQI2c5ds2uCmoeCw6_fALjh-8ii05fkOVgZmWPhbY64vyYbrNcFvqbFKRb7rUwyxwQ/exec',
  GIDS: {
    gouvernement: '789610864',
  },
};

// ---- DONNÉES STATIQUES : ÉLECTION --------------------------
// Modifiable par les admins directement ici
const ELECTION_DATA = {
  annee: 2028,
  candidat_dem: {
    nom:     'Candidat Démocrate',
    parti:   'Démocrate',
    portrait: '', // URL portrait
    grands_electeurs: 286,
    couleur: '#1a6aaa',
  },
  candidat_rep: {
    nom:     'Candidat Républicain',
    parti:   'Républicain',
    portrait: '', // URL portrait
    grands_electeurs: 252,
    couleur: '#cc2222',
  },
  total_electeurs: 538,
  seuil_victoire:  270,
  // États grands électeurs : { NomEtat: { votes: N, gagnant: 'dem'|'rep'|'swing' } }
  etats: {
    'Alabama':        { votes: 9,  gagnant: 'rep' },
    'Alaska':         { votes: 3,  gagnant: 'rep' },
    'Arizona':        { votes: 11, gagnant: 'rep' },
    'Arkansas':       { votes: 6,  gagnant: 'rep' },
    'California':     { votes: 54, gagnant: 'dem' },
    'Colorado':       { votes: 10, gagnant: 'dem' },
    'Connecticut':    { votes: 7,  gagnant: 'dem' },
    'Delaware':       { votes: 3,  gagnant: 'dem' },
    'Florida':        { votes: 30, gagnant: 'rep' },
    'Georgia':        { votes: 16, gagnant: 'rep' },
    'Hawaii':         { votes: 4,  gagnant: 'dem' },
    'Idaho':          { votes: 4,  gagnant: 'rep' },
    'Illinois':       { votes: 19, gagnant: 'dem' },
    'Indiana':        { votes: 11, gagnant: 'rep' },
    'Iowa':           { votes: 6,  gagnant: 'rep' },
    'Kansas':         { votes: 6,  gagnant: 'rep' },
    'Kentucky':       { votes: 8,  gagnant: 'rep' },
    'Louisiana':      { votes: 8,  gagnant: 'rep' },
    'Maine':          { votes: 4,  gagnant: 'dem' },
    'Maryland':       { votes: 10, gagnant: 'dem' },
    'Massachusetts':  { votes: 11, gagnant: 'dem' },
    'Michigan':       { votes: 15, gagnant: 'dem' },
    'Minnesota':      { votes: 10, gagnant: 'dem' },
    'Mississippi':    { votes: 6,  gagnant: 'rep' },
    'Missouri':       { votes: 10, gagnant: 'rep' },
    'Montana':        { votes: 4,  gagnant: 'rep' },
    'Nebraska':       { votes: 5,  gagnant: 'rep' },
    'Nevada':         { votes: 6,  gagnant: 'dem' },
    'New Hampshire':  { votes: 4,  gagnant: 'dem' },
    'New Jersey':     { votes: 14, gagnant: 'dem' },
    'New Mexico':     { votes: 5,  gagnant: 'dem' },
    'New York':       { votes: 28, gagnant: 'dem' },
    'North Carolina': { votes: 16, gagnant: 'rep' },
    'North Dakota':   { votes: 3,  gagnant: 'rep' },
    'Ohio':           { votes: 17, gagnant: 'rep' },
    'Oklahoma':       { votes: 7,  gagnant: 'rep' },
    'Oregon':         { votes: 8,  gagnant: 'dem' },
    'Pennsylvania':   { votes: 19, gagnant: 'dem' },
    'Rhode Island':   { votes: 4,  gagnant: 'dem' },
    'South Carolina': { votes: 9,  gagnant: 'rep' },
    'South Dakota':   { votes: 3,  gagnant: 'rep' },
    'Tennessee':      { votes: 11, gagnant: 'rep' },
    'Texas':          { votes: 40, gagnant: 'rep' },
    'Utah':           { votes: 6,  gagnant: 'rep' },
    'Vermont':        { votes: 3,  gagnant: 'dem' },
    'Virginia':       { votes: 13, gagnant: 'dem' },
    'Washington':     { votes: 12, gagnant: 'dem' },
    'West Virginia':  { votes: 4,  gagnant: 'rep' },
    'Wisconsin':      { votes: 10, gagnant: 'dem' },
    'Wyoming':        { votes: 3,  gagnant: 'rep' },
    'D.C.':           { votes: 3,  gagnant: 'dem' },
  },
};

// ---- DONNÉES STATIQUES : CONGRÈS ---------------------------
const CONGRES_DATA = {
  senat: { dem: 47, rep: 53, total: 100 },
  chambre: { dem: 213, rep: 222, total: 435 },
};

// ---- ÉTAT DU MODULE ----------------------------------------
let govData = {
  eveil:         42,  // % d'éveil Sovereign (depuis Sheet)
  americanisme:  67,  // % sentiment d'américanisme (depuis Sheet)
  president: {
    nom:      'Candidat Démocrate',
    titre:    '48e Président des États-Unis',
    portrait: '',
    parti:    'Démocrate',
    debut:    '20 janvier 2029',
  },
  lois: [], // depuis Sheet
};

// ---- FETCH -------------------------------------------------
async function govFetch() {
  if (!GOV_GS_CFG?.GIDS?.gouvernement) return null;
  const url = `https://docs.google.com/spreadsheets/d/${GOV_GS_CFG.SHEET_ID}/gviz/tq?tqx=out:json&gid=${GOV_GS_CFG.GIDS.gouvernement}`;
  try {
    const r   = await fetch(url);
    const raw = await r.text();
    const m   = raw.match(/setResponse\(([\s\S]*)\)/);
    if (!m) return null;
    const data = JSON.parse(m[1]);
    const rows = data.table.rows || [];
    if (!rows.length) return null;
    let cols = data.table.cols.map(c => (c.label || '').trim().replace(/^"+|"+$/g, ''));
    const hasLabels = cols.some(c => c.length > 0);
    if (!hasLabels) {
      cols = rows[0].c.map(c => String(c?.v ?? '').trim());
      return rows.slice(1).map(r => Object.fromEntries(cols.map((col, i) => [col, String(r?.c?.[i]?.v ?? '').trim()])));
    }
    return rows.map(r => Object.fromEntries(cols.map((col, i) => [col, String(r?.c?.[i]?.v ?? '').trim()])));
  } catch(e) {
    console.warn('[GOV] fetch error:', e);
    return null;
  }
}

async function govLoadData() {
  const rows = await govFetch();
  if (!rows) return;

  rows.forEach(r => {
    const key = (r.cle || r.key || '').trim().toLowerCase();
    const val = (r.valeur || r.value || '').trim();

    if (key === 'eveil')          govData.eveil          = Math.min(100, Math.max(0, Number(val) || govData.eveil));
    if (key === 'americanisme')   govData.americanisme   = Math.min(100, Math.max(0, Number(val) || govData.americanisme));
    if (key === 'president_nom')  govData.president.nom  = val || govData.president.nom;
    if (key === 'president_titre')govData.president.titre= val || govData.president.titre;
    if (key === 'president_portrait') govData.president.portrait = val || govData.president.portrait;
    if (key === 'president_parti')govData.president.parti= val || govData.president.parti;
    if (key === 'president_debut')govData.president.debut= val || govData.president.debut;
  });

  // Lois : lignes avec type='loi'
  govData.lois = rows
    .filter(r => (r.type || '').trim().toLowerCase() === 'loi')
    .map(r => ({
      titre:   (r.titre || r.title || '').trim(),
      statut:  (r.statut || 'en_vote').trim(),
      desc:    (r.description || '').trim(),
      parti:   (r.parti || '').trim().toLowerCase(),
    }))
    .filter(l => l.titre);
}

// ---- RENDER PRINCIPAL --------------------------------------
async function renderGouvernement(container) {
  if (!container) return;

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:30px 0;color:#3a5880;font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:.1em">
      <div class="gs-blink-dot" style="background:#3a5880;width:6px;height:6px;border-radius:50%"></div>
      ACCÈS AU RÉSEAU GOUVERNEMENTAL…
    </div>`;

  await govLoadData();
  gsInjectGovStyles();
  // La carte D3 est dessinée après le render du HTML
  setTimeout(govDrawMap, 50);

  const eveil   = govData.eveil;
  const eveilLabel = eveil < 33 ? 'DISCRET' : eveil < 66 ? 'INQUIET' : 'RÉVÉLÉ';
  const eveilColor = eveil < 33 ? '#2a8a3a' : eveil < 66 ? '#c8a84b' : '#cc3030';
  const eveilDesc  = eveil < 33
    ? 'Le Sovereign opère dans l\'ombre — aucune suspicion.'
    : eveil < 66
    ? 'Des observateurs notent des anomalies — prudence requise.'
    : 'L\'existence du Sovereign est suspectée — danger critique.';

  const dem = ELECTION_DATA.candidat_dem;
  const rep = ELECTION_DATA.candidat_rep;
  const winner = dem.grands_electeurs >= ELECTION_DATA.seuil_victoire ? 'dem' : 'rep';
  const demPct = Math.round(dem.grands_electeurs / ELECTION_DATA.total_electeurs * 100);
  const repPct = Math.round(rep.grands_electeurs / ELECTION_DATA.total_electeurs * 100);
  const seuil270Pct = Math.round(ELECTION_DATA.seuil_victoire / ELECTION_DATA.total_electeurs * 100);

  const americanisme = govData.americanisme;
  const amColor = americanisme >= 50 ? '#2a8a3a' : '#cc3030';
  const amLabel = americanisme >= 70 ? 'FORT' : americanisme >= 50 ? 'STABLE' : 'CRITIQUE';

  const president = govData.president;
  const partiColor = president.parti.toLowerCase().includes('rep') ? '#cc2222' : '#1a6aaa';

  container.innerHTML = `
    <div class="gov-root">

      <!-- ① BARRE D'ÉVEIL -->
      <div class="gov-eveil-bar" style="--eveil-color:${eveilColor}">
        <div class="gov-eveil-header">
          <span class="gov-eveil-icon">◈</span>
          <span class="gov-eveil-title">NIVEAU D'ÉVEIL SOVEREIGN</span>
          <span class="gov-eveil-badge" style="color:${eveilColor};border-color:${eveilColor}44;background:${eveilColor}11">${eveilLabel}</span>
          <span class="gov-eveil-desc">${eveilDesc}</span>
          <span class="gov-eveil-val" style="color:${eveilColor}">${eveil}%</span>
        </div>
        <div class="gov-eveil-track">
          <div class="gov-eveil-fill" style="width:${eveil}%;background:${eveilColor}"></div>
          <div class="gov-eveil-cut" style="left:33.3%"><span>DISCRET</span></div>
          <div class="gov-eveil-cut" style="left:66.6%"><span>INQUIET</span></div>
        </div>
      </div>

      <!-- ② GRILLE PRINCIPALE -->
      <div class="gov-main-grid">

        <!-- COLONNE GAUCHE : Élection -->
        <div class="gov-col-left">

          <!-- Titre élection -->
          <div class="gov-section-title">
            <span class="gov-section-icon">🗳</span>
            ÉLECTION PRÉSIDENTIELLE ${ELECTION_DATA.annee}
          </div>

          <!-- Candidats -->
          <div class="gov-candidates">
            ${govCandidatCard(dem, 'dem', winner === 'dem')}
            <div class="gov-vs">VS</div>
            ${govCandidatCard(rep, 'rep', winner === 'rep')}
          </div>

          <!-- Barre 270 -->
          <div class="gov-270-wrap">
            <div class="gov-270-labels">
              <span style="color:${dem.couleur}">${dem.grands_electeurs} GE</span>
              <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:#3a5880">▲ 270 pour gagner ▲</span>
              <span style="color:${rep.couleur}">${rep.grands_electeurs} GE</span>
            </div>
            <div class="gov-270-track">
              <div class="gov-270-dem" style="width:${demPct}%;background:${dem.couleur}"></div>
              <div class="gov-270-rep" style="width:${repPct}%;background:${rep.couleur}"></div>
              <div class="gov-270-seuil" style="left:${seuil270Pct}%">
                <div class="gov-270-seuil-line"></div>
                <div class="gov-270-seuil-label">270</div>
              </div>
            </div>
          </div>

          <!-- Carte USA simplifiée -->
          <div class="gov-map-wrap" id="gov-map-container">
            <div id='gov-map-d3' style='width:100%;height:100%;min-height:220px'></div>
          </div>

        </div>

        <!-- COLONNE DROITE -->
        <div class="gov-col-right">

          <!-- Président -->
          <div class="gov-section-title">
            <span class="gov-section-icon">🦅</span>
            PRÉSIDENT EN EXERCICE
          </div>
          <div class="gov-president-card">
            <div class="gov-president-portrait">
              ${president.portrait
                ? `<img src="${president.portrait}" alt="${president.nom}">`
                : `<div class="gov-president-initials" style="color:${partiColor}">${president.nom.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>`}
            </div>
            <div class="gov-president-info">
              <div class="gov-president-nom">${president.nom}</div>
              <div class="gov-president-titre">${president.titre}</div>
              <div class="gov-president-meta">
                <span class="gov-parti-badge" style="color:${partiColor};border-color:${partiColor}44;background:${partiColor}11">${president.parti}</span>
                <span style="font-size:9px;color:#3a5880;font-family:'Share Tech Mono',monospace">depuis ${president.debut}</span>
              </div>
            </div>
          </div>

          <!-- Lois en cours -->
          <div class="gov-section-title" style="margin-top:14px">
            <span class="gov-section-icon">📋</span>
            LOIS EN COURS DE VOTE
          </div>
          <div class="gov-lois-list" id="gov-lois-list">
            ${govRenderLois()}
          </div>

          <!-- Congrès -->
          <div class="gov-section-title" style="margin-top:14px">
            <span class="gov-section-icon">🏛</span>
            CONGRÈS AMÉRICAIN
          </div>
          <div class="gov-congres">
            ${govCongresBar('Sénat', CONGRES_DATA.senat)}
            ${govCongresBar('Chambre des Représentants', CONGRES_DATA.chambre)}
          </div>

          <!-- Américanisme -->
          <div class="gov-section-title" style="margin-top:14px">
            <span class="gov-section-icon">🇺🇸</span>
            SENTIMENT D'AMÉRICANISME
          </div>
          <div class="gov-am-wrap">
            <div class="gov-am-top">
              <span class="gov-am-val" style="color:${amColor}">${americanisme}%</span>
              <span class="gov-am-label" style="color:${amColor}">${amLabel}</span>
              ${americanisme < 50 ? `<span class="gov-am-warn">⚠ SEUIL CRITIQUE</span>` : ''}
            </div>
            <div class="gov-am-track">
              <div class="gov-am-fill" style="width:${americanisme}%;background:${amColor}"></div>
              <div class="gov-am-seuil50">
                <div class="gov-am-seuil50-line"></div>
                <div class="gov-am-seuil50-label">50%</div>
              </div>
            </div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:#2a3a54;margin-top:4px">
              ${americanisme >= 50 ? 'La population croit en ses institutions.' : 'La confiance populaire s\'effrite — instabilité imminente.'}
            </div>
          </div>

        </div>
      </div>
    </div>
  `;
}

// ---- CANDIDAT CARD -----------------------------------------
function govCandidatCard(c, side, isWinner) {
  const align = side === 'dem' ? 'flex-start' : 'flex-end';
  const textAlign = side === 'dem' ? 'left' : 'right';
  return `
    <div class="gov-candidat ${side === 'dem' ? 'gov-candidat-dem' : 'gov-candidat-rep'}${isWinner ? ' gov-candidat-winner' : ''}"
         style="border-color:${c.couleur}${isWinner ? '' : '44'};align-items:${align};text-align:${textAlign}">
      <div class="gov-candidat-portrait" style="border-color:${c.couleur}${isWinner ? '' : '44'}">
        ${c.portrait
          ? `<img src="${c.portrait}" alt="${c.nom}">`
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:'Oswald',sans-serif;font-size:20px;font-weight:600;color:${c.couleur}">${c.nom.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>`}
        ${isWinner ? `<div class="gov-winner-crown">★</div>` : ''}
      </div>
      <div class="gov-candidat-nom" style="color:${isWinner ? c.couleur : '#8a9ab0'}">${c.nom}</div>
      <div class="gov-candidat-parti" style="color:${c.couleur}88">${c.parti}</div>
      <div class="gov-candidat-ge" style="color:${c.couleur}">${c.grands_electeurs} <span style="font-size:9px;opacity:.6">GE</span></div>
    </div>
  `;
}

// ---- CONGRÈS BAR -------------------------------------------
function govCongresBar(label, data) {
  const demPct = Math.round(data.dem / data.total * 100);
  const repPct = Math.round(data.rep / data.total * 100);
  const maj = data.rep > data.dem ? 'rep' : 'dem';
  return `
    <div class="gov-congres-item">
      <div class="gov-congres-label">
        <span>${label}</span>
        <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:${maj==='rep'?'#cc2222':'#1a6aaa'}">
          ${maj==='rep'?`Rép. ${data.rep}`:`Dém. ${data.dem}`} / ${data.total}
        </span>
      </div>
      <div class="gov-congres-track">
        <div style="height:100%;width:${demPct}%;background:#1a6aaa;border-radius:3px 0 0 3px;transition:width .6s"></div>
        <div style="height:100%;width:${repPct}%;background:#cc2222;border-radius:0 3px 3px 0;transition:width .6s"></div>
      </div>
      <div class="gov-congres-detail">
        <span style="color:#1a6aaa88;font-size:9px">Dém. ${data.dem}</span>
        <span style="color:#cc222288;font-size:9px">Rép. ${data.rep}</span>
      </div>
    </div>
  `;
}

// ---- LOIS --------------------------------------------------
function govRenderLois() {
  if (!govData.lois.length) {
    return `<div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:#2a3a54;text-align:center;padding:12px">Aucune loi en cours de vote</div>`;
  }
  return govData.lois.map(l => {
    const statutColor = l.statut === 'adoptée' ? '#2a8a3a' : l.statut === 'rejetée' ? '#cc3030' : '#c8a84b';
    const partiColor  = l.parti === 'rep' ? '#cc2222' : l.parti === 'dem' ? '#1a6aaa' : '#5a7a9a';
    return `
      <div class="gov-loi-item">
        <div class="gov-loi-header">
          <span class="gov-loi-titre">${l.titre}</span>
          <span class="gov-loi-statut" style="color:${statutColor};border-color:${statutColor}33">${l.statut.toUpperCase()}</span>
        </div>
        ${l.desc ? `<div class="gov-loi-desc">${l.desc}</div>` : ''}
        ${l.parti ? `<div class="gov-loi-parti" style="color:${partiColor}">${l.parti === 'rep' ? 'Républicain' : l.parti === 'dem' ? 'Démocrate' : l.parti}</div>` : ''}
      </div>
    `;
  }).join('');
}

// ---- CARTE USA (SVG simplifié avec coordonnées approx.) ----
function govDrawMap() {
  const container = document.getElementById('gov-map-d3');
  if (!container) return;

  const dem = ELECTION_DATA.candidat_dem;
  const rep = ELECTION_DATA.candidat_rep;

  // Mapping nom anglais → données élection
  const STATE_NAME_MAP = {
    'Alabama':'Alabama','Alaska':'Alaska','Arizona':'Arizona','Arkansas':'Arkansas',
    'California':'California','Colorado':'Colorado','Connecticut':'Connecticut',
    'Delaware':'Delaware','Florida':'Florida','Georgia':'Georgia','Hawaii':'Hawaii',
    'Idaho':'Idaho','Illinois':'Illinois','Indiana':'Indiana','Iowa':'Iowa',
    'Kansas':'Kansas','Kentucky':'Kentucky','Louisiana':'Louisiana','Maine':'Maine',
    'Maryland':'Maryland','Massachusetts':'Massachusetts','Michigan':'Michigan',
    'Minnesota':'Minnesota','Mississippi':'Mississippi','Missouri':'Missouri',
    'Montana':'Montana','Nebraska':'Nebraska','Nevada':'Nevada','New Hampshire':'New Hampshire',
    'New Jersey':'New Jersey','New Mexico':'New Mexico','New York':'New York',
    'North Carolina':'North Carolina','North Dakota':'North Dakota','Ohio':'Ohio',
    'Oklahoma':'Oklahoma','Oregon':'Oregon','Pennsylvania':'Pennsylvania',
    'Rhode Island':'Rhode Island','South Carolina':'South Carolina','South Dakota':'South Dakota',
    'Tennessee':'Tennessee','Texas':'Texas','Utah':'Utah','Vermont':'Vermont',
    'Virginia':'Virginia','Washington':'Washington','West Virginia':'West Virginia',
    'Wisconsin':'Wisconsin','Wyoming':'Wyoming',
  };

  // Charger le TopoJSON US states
  fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json')
    .then(r => r.json())
    .then(us => {
      const W = container.clientWidth  || 680;
      const H = container.clientHeight || 220;

      // Nettoyer
      container.innerHTML = '';

      const svg = d3.select(container).append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${W} ${H}`)
        .style('display', 'block')
        .style('background', '#060e1c');

      // Projection Albers USA (standard pour les cartes US)
      const projection = d3.geoAlbersUsa()
        .fitSize([W, H], topojson.feature(us, us.objects.states));

      const path = d3.geoPath().projection(projection);

      // Noms des états par FIPS (topojson us-atlas)
      const STATE_FIPS = {
        '01':'Alabama','02':'Alaska','04':'Arizona','05':'Arkansas','06':'California',
        '08':'Colorado','09':'Connecticut','10':'Delaware','12':'Florida','13':'Georgia',
        '15':'Hawaii','16':'Idaho','17':'Illinois','18':'Indiana','19':'Iowa',
        '20':'Kansas','21':'Kentucky','22':'Louisiana','23':'Maine','24':'Maryland',
        '25':'Massachusetts','26':'Michigan','27':'Minnesota','28':'Mississippi',
        '29':'Missouri','30':'Montana','31':'Nebraska','32':'Nevada','33':'New Hampshire',
        '34':'New Jersey','35':'New Mexico','36':'New York','37':'North Carolina',
        '38':'North Dakota','39':'Ohio','40':'Oklahoma','41':'Oregon','42':'Pennsylvania',
        '44':'Rhode Island','45':'South Carolina','46':'South Dakota','47':'Tennessee',
        '48':'Texas','49':'Utah','50':'Vermont','51':'Virginia','53':'Washington',
        '54':'West Virginia','55':'Wisconsin','56':'Wyoming',
      };

      const states = topojson.feature(us, us.objects.states).features;

      // Dessiner les états
      svg.selectAll('.state')
        .data(states)
        .enter().append('path')
        .attr('class', 'state')
        .attr('d', path)
        .attr('fill', d => {
          const fips = String(d.id).padStart(2, '0');
          const name = STATE_FIPS[fips];
          const etat = name ? ELECTION_DATA.etats[name] : null;
          if (!etat) return '#0d1e34';
          return etat.gagnant === 'dem'
            ? dem.couleur + 'cc'
            : etat.gagnant === 'rep'
            ? rep.couleur + 'cc'
            : '#3a5060';
        })
        .attr('stroke', '#060e1c')
        .attr('stroke-width', 0.5)
        .append('title')
        .text(d => {
          const fips = String(d.id).padStart(2, '0');
          const name = STATE_FIPS[fips];
          const etat = name ? ELECTION_DATA.etats[name] : null;
          return name ? `${name}${etat ? ' — ' + etat.votes + ' GE' : ''}` : '';
        });

      // Frontières entre états
      svg.append('path')
        .datum(topojson.mesh(us, us.objects.states, (a, b) => a !== b))
        .attr('fill', 'none')
        .attr('stroke', '#0a1828')
        .attr('stroke-width', 0.8)
        .attr('d', path);

      // Légende
      const leg = svg.append('g').attr('transform', `translate(8, ${H-18})`);
      leg.append('circle').attr('r', 5).attr('fill', dem.couleur).attr('cx', 5).attr('cy', 0);
      leg.append('text').attr('x', 14).attr('y', 4).attr('fill', '#8a9ab0')
        .attr('font-size', 9).attr('font-family', 'Share Tech Mono,monospace').text(dem.parti);
      leg.append('circle').attr('r', 5).attr('fill', rep.couleur).attr('cx', 85).attr('cy', 0);
      leg.append('text').attr('x', 94).attr('y', 4).attr('fill', '#8a9ab0')
        .attr('font-size', 9).attr('font-family', 'Share Tech Mono,monospace').text(rep.parti);
    })
    .catch(e => {
      console.warn('[GOV MAP]', e);
      container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-family:Share Tech Mono,monospace;font-size:10px;color:#2a3a54">Carte indisponible</div>';
    });
}

// ---- STYLES// ---- STYLES ------------------------------------------------
function gsInjectGovStyles() {
  if (document.getElementById('gs-gov-style')) return;
  const style = document.createElement('style');
  style.id = 'gs-gov-style';
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;600&family=Share+Tech+Mono&display=swap');

    .gov-root {
      display:flex;flex-direction:column;gap:0;
      height:100%;overflow-y:auto;
      font-family:'Oswald',sans-serif;
      color:#cfe4f7;
    }

    /* BARRE D'ÉVEIL */
    .gov-eveil-bar {
      padding:10px 20px 12px;
      background:#060a14;
      border-bottom:1px solid var(--eveil-color, #2a8a3a)22;
      position:sticky;top:0;z-index:10;
    }
    .gov-eveil-header {
      display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap;
    }
    .gov-eveil-icon { font-size:14px;color:var(--eveil-color);animation:gov-pulse 2s infinite; }
    @keyframes gov-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
    .gov-eveil-title { font-size:10px;font-weight:600;letter-spacing:.14em;color:#5a7a9a;text-transform:uppercase; }
    .gov-eveil-badge {
      font-family:'Share Tech Mono',monospace;font-size:9px;font-weight:700;
      padding:2px 8px;border-radius:2px;border:1px solid;letter-spacing:.12em;
    }
    .gov-eveil-desc { font-family:'Share Tech Mono',monospace;font-size:9px;color:#3a5880;flex:1;min-width:0; }
    .gov-eveil-val { font-size:14px;font-weight:600;letter-spacing:.06em;margin-left:auto; }
    .gov-eveil-track {
      height:8px;background:#0c1628;border-radius:4px;border:1px solid #1a2844;
      position:relative;overflow:visible;
    }
    .gov-eveil-fill {
      height:100%;border-radius:4px;
      transition:width .8s ease;
      position:relative;
    }
    .gov-eveil-fill::after {
      content:'';position:absolute;right:0;top:0;bottom:0;
      width:12px;background:rgba(255,255,255,.25);border-radius:0 4px 4px 0;
    }
    .gov-eveil-cut {
      position:absolute;top:-4px;bottom:-4px;width:1px;
      background:#1e3050;
    }
    .gov-eveil-cut span {
      position:absolute;top:-16px;left:50%;transform:translateX(-50%);
      font-family:'Share Tech Mono',monospace;font-size:7px;color:#2a3a54;
      white-space:nowrap;letter-spacing:.08em;
    }

    /* GRILLE */
    .gov-main-grid {
      display:grid;grid-template-columns:1fr 320px;gap:0;
      flex:1;min-height:0;overflow:hidden;
    }
    .gov-col-left {
      padding:16px 18px;border-right:1px solid #1a2844;
      overflow-y:auto;display:flex;flex-direction:column;gap:12px;
    }
    .gov-col-right {
      padding:14px 16px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;
    }

    .gov-section-title {
      font-size:10px;font-weight:600;letter-spacing:.14em;color:#3a5880;
      text-transform:uppercase;display:flex;align-items:center;gap:6px;
      border-bottom:1px solid #0e1c2e;padding-bottom:6px;
    }
    .gov-section-icon { font-size:12px; }

    /* CANDIDATS */
    .gov-candidates {
      display:flex;align-items:center;justify-content:space-between;gap:8px;
    }
    .gov-vs {
      font-family:'Share Tech Mono',monospace;font-size:11px;color:#2a3a54;flex-shrink:0;
    }
    .gov-candidat {
      flex:1;display:flex;flex-direction:column;gap:4px;
      padding:10px;border-radius:8px;border:1px solid;background:#060a14;
      transition:border-color .2s;
    }
    .gov-candidat-winner { background:#080e1c; }
    .gov-candidat-portrait {
      width:52px;height:52px;border-radius:50%;overflow:hidden;
      border:2px solid;background:#0d1e34;position:relative;flex-shrink:0;
    }
    .gov-candidat-portrait img { width:100%;height:100%;object-fit:cover; }
    .gov-winner-crown {
      position:absolute;top:-4px;right:-4px;font-size:10px;
      background:#0a0e1a;border-radius:50%;padding:1px;
    }
    .gov-candidat-rep { align-items:flex-end; }
    .gov-candidat-rep .gov-candidat-portrait { order:-1; }
    .gov-candidat-nom { font-size:12px;font-weight:600;letter-spacing:.04em; }
    .gov-candidat-parti { font-size:9px;letter-spacing:.06em;font-family:'Share Tech Mono',monospace; }
    .gov-candidat-ge { font-size:18px;font-weight:600;letter-spacing:.04em; }

    /* BARRE 270 */
    .gov-270-wrap { display:flex;flex-direction:column;gap:4px; }
    .gov-270-labels { display:flex;justify-content:space-between;align-items:center;font-size:11px;font-weight:600; }
    .gov-270-track {
      height:14px;border-radius:7px;background:#0a1628;border:1px solid #1a2844;
      position:relative;overflow:hidden;display:flex;
    }
    .gov-270-dem, .gov-270-rep { height:100%;transition:width .6s ease; }
    .gov-270-seuil {
      position:absolute;top:0;bottom:0;width:2px;background:#fff;opacity:.6;
    }
    .gov-270-seuil-line { width:100%;height:100%; }
    .gov-270-seuil-label {
      position:absolute;top:-16px;left:50%;transform:translateX(-50%);
      font-family:'Share Tech Mono',monospace;font-size:8px;color:#8a9ab0;
      white-space:nowrap;
    }

    /* CARTE */
    .gov-map-wrap { border-radius:8px;overflow:hidden;border:1px solid #1a2844;background:#060e1c;flex:1; }
    .gov-map-inner { padding:8px; }
    .gov-map-legend {
      display:flex;align-items:center;gap:4px;margin-bottom:6px;
      font-family:'Share Tech Mono',monospace;font-size:9px;color:#5a7a9a;
    }
    .gov-map-dot { width:8px;height:8px;border-radius:50%;display:inline-block; }

    /* PRÉSIDENT */
    .gov-president-card {
      display:flex;gap:12px;align-items:flex-start;
      background:#060a14;border:1px solid #1a2844;border-radius:8px;padding:12px;
    }
    .gov-president-portrait {
      width:60px;height:60px;border-radius:50%;overflow:hidden;flex-shrink:0;
      border:2px solid #1a3050;background:#0d1e34;
      display:flex;align-items:center;justify-content:center;
    }
    .gov-president-portrait img { width:100%;height:100%;object-fit:cover; }
    .gov-president-initials { font-size:20px;font-weight:600; }
    .gov-president-nom { font-size:14px;font-weight:600;color:#cfe4f7;letter-spacing:.04em; }
    .gov-president-titre { font-size:10px;color:#5a7a9a;margin:2px 0 6px;line-height:1.4; }
    .gov-president-meta { display:flex;align-items:center;gap:8px;flex-wrap:wrap; }
    .gov-parti-badge {
      font-family:'Share Tech Mono',monospace;font-size:8px;font-weight:700;
      padding:2px 6px;border-radius:2px;border:1px solid;letter-spacing:.1em;
    }

    /* LOIS */
    .gov-lois-list { display:flex;flex-direction:column;gap:5px; }
    .gov-loi-item {
      background:#060a14;border:1px solid #1a2844;border-radius:6px;padding:8px 10px;
    }
    .gov-loi-header { display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:3px; }
    .gov-loi-titre { font-size:11px;font-weight:600;color:#cfe4f7;flex:1;line-height:1.3; }
    .gov-loi-statut {
      font-family:'Share Tech Mono',monospace;font-size:8px;font-weight:700;
      padding:2px 5px;border-radius:2px;border:1px solid;flex-shrink:0;letter-spacing:.06em;
    }
    .gov-loi-desc { font-size:9px;color:#5a7a9a;line-height:1.5; }
    .gov-loi-parti { font-size:9px;font-weight:600;margin-top:3px;font-family:'Share Tech Mono',monospace; }

    /* CONGRÈS */
    .gov-congres { display:flex;flex-direction:column;gap:8px; }
    .gov-congres-item {}
    .gov-congres-label {
      display:flex;justify-content:space-between;align-items:center;
      font-size:10px;font-weight:600;color:#5a7a9a;letter-spacing:.06em;margin-bottom:4px;
    }
    .gov-congres-track {
      height:10px;border-radius:5px;background:#0a1628;border:1px solid #1a2844;
      display:flex;overflow:hidden;
    }
    .gov-congres-detail { display:flex;justify-content:space-between;margin-top:2px; }

    /* AMÉRICANISME */
    .gov-am-wrap { background:#060a14;border:1px solid #1a2844;border-radius:8px;padding:10px 12px; }
    .gov-am-top { display:flex;align-items:center;gap:8px;margin-bottom:6px; }
    .gov-am-val { font-size:22px;font-weight:600;letter-spacing:.04em; }
    .gov-am-label { font-family:'Share Tech Mono',monospace;font-size:9px;font-weight:700;letter-spacing:.1em; }
    .gov-am-warn { font-family:'Share Tech Mono',monospace;font-size:8px;color:#cc3030;letter-spacing:.08em;animation:gov-pulse 1.5s infinite; }
    .gov-am-track {
      height:10px;background:#0a1628;border-radius:5px;border:1px solid #1a2844;
      position:relative;overflow:hidden;
    }
    .gov-am-fill { height:100%;border-radius:5px;transition:width .8s ease; }
    .gov-am-seuil50 {
      position:absolute;top:0;bottom:0;left:50%;width:1px;background:#fff;opacity:.4;
    }
    .gov-am-seuil50-label {
      position:absolute;top:-15px;left:50%;transform:translateX(-50%);
      font-family:'Share Tech Mono',monospace;font-size:7px;color:#3a5060;
    }
  `;
  document.head.appendChild(style);
}

// ---- EXPORT ------------------------------------------------
window.gsRenderGouvernement = renderGouvernement;
