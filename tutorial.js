/* ================================================================
   VAE VICTIS — tutorial.js  v3
   Se greffe sur l'interface RÉELLE de l'app.
   Overlay sombre + découpe sur l'élément actif + bulle guide.
   3 chapitres · Athéna · Judgment · Isis
   ================================================================ */
(function () {
  'use strict';

  /* ── Données fictives injectées dans l'app réelle ───────────── */
  const FAKE = {
    athena:   { id:'athena',   name:'Athéna',   color:'#c8901a', pi:74, avatar:'', pass:'tuto', player:'Joueur A',
                faction:'olympien', territories:['grèce & balkans','italie'], rank:2 },
    judgment: { id:'judgment', name:'Judgment', color:'#3a7acc', pi:28, avatar:'', pass:'tuto', player:'Joueur B',
                faction:'sovereign', territories:['usa'], rank:9 },
    isis:     { id:'isis',     name:'Isis',     color:'#b02828', pi:61, avatar:'', pass:'tuto', player:'Joueur C',
                faction:'shemning', territories:['maghreb','arabie'], rank:4 },
  };

  /* ── 3 chapitres / étapes ───────────────────────────────────── */
  const CHAPTERS = [
    {
      god: 'athena', color: '#c8901a',
      title: 'Chapitre 1 · Lire ses informations',
      intro: 'Tu incarnes <strong>Athéna</strong> (Olympiens). Dans ce premier chapitre, apprends à lire toutes les informations de ton profil : territoires, puissance, classement.',
      steps: [
        { sel:'#dock',          title:'Le dock des divinités',     text:'Le dock affiche toutes les divinités actives, organisées par faction. <strong>Ta divinité est mise en avant</strong> en couleur or. Tu vois aussi les autres dieux et combien d\'attaques ils ont reçues (le chiffre rouge).', action:null },
        { sel:'#panel-inner',   title:'Ton panneau de profil',     text:'Ce panneau affiche <strong>ton profil complet</strong> : ton nom, ta faction, ton score de Puissance d\'Influence (PI) et le nombre de territoires que tu contrôles. Il change selon ce que tu cliques.', action:null },
        { sel:'#ranking-panel', title:'Le classement des nations', text:'Ici tu vois le <strong>classement de toutes les nations</strong> par PI. Chaque barre représente la puissance accumulée sur cette zone géographique. Clique sur <strong>Grèce & Balkans</strong> pour l\'explorer.', action:'click-zone-Grèce & Balkans' },
        { sel:'#panel-inner',   title:'La fiche d\'une nation',    text:'Excellent ! Tu vois maintenant la fiche de la nation : son leader, le <strong>triangle d\'alignement</strong> qui indique vers quelle faction elle penche, et la liste de ses territoires avec leur propriétaire.', action:null },
        { sel:'.align-triangle',title:'Le triangle d\'alignement', text:'Ce SVG triangulaire est crucial : le <strong>point blanc</strong> indique l\'alignement politique de la nation. En haut = Olympiens, bas-gauche = Sovereign, bas-droit = Shemning. Plus il est proche d\'un sommet, plus la nation est influencée par cette faction.', action:null },
        { sel:'#dock',          title:'Explorer une autre divinité', text:'Maintenant clique sur <strong>Zeus</strong> dans le dock pour voir sa fiche — un allié Olympien. Tu verras ses territoires, son PI, et si tu peux l\'attaquer (non, il est allié !).', action:'click-deity-zeus' },
      ],
    },
    {
      god: 'judgment', color: '#3a7acc',
      title: 'Chapitre 2 · Comprendre les attaques',
      intro: 'Tu incarnes maintenant <strong>Judgment</strong> (Sovereign), au rang 9 avec seulement 28 PI. Position fragile ! Apprends à lire une situation adverse et à déclarer une attaque stratégique.',
      steps: [
        { sel:'#panel-inner',   title:'Une position vulnérable',   text:'Judgment est au <strong>rang 9</strong> avec 28 PI — bien en dessous de la moyenne. Il n\'a qu\'un territoire (USA). Cette situation appelle une stratégie offensive pour progresser.', action:null },
        { sel:'#ranking-panel', title:'Chercher une cible',        text:'Regarde le classement. Les nations avec un faible PI et des territoires peu défendus sont des cibles idéales. Clique sur <strong>Grèce & Balkans</strong> pour inspecter ce territoire Olympien.', action:'click-zone-Grèce & Balkans' },
        { sel:'#dock',   title:'Lire la fiche ennemie',     text:'Tu vois la fiche de Grèce & Balkans. Maintenant <strong>clique sur Athéna dans le dock</strong> en bas — sa fiche s\'ouvrira avec le bouton d\'attaque.', action:'click-deity-athena' },
        { sel:'#panel-inner',   title:'Le bouton d\'attaque',      text:'Le bouton <strong>rouge "Déclarer une attaque"</strong> apparaît quand tu peux frapper cette divinité. Conditions : tu dois être connecté, avoir moins de 2 attaques ce cycle, et ta cible doit avoir moins de 2 attaques reçues. Clique dessus.', action:'click-attack-athena' },
        { sel:'.modal.open, #modal-atk', title:'Choisir le territoire cible', text:'La modal d\'attaque te demande de <strong>choisir le territoire précis</strong> que tu vises. Ce choix est stratégique : certains territoires valent plus de PI que d\'autres (×2, ×3…). Choisis puis confirme.', action:'confirm-attack' },
        { sel:'#panel-inner',   title:'L\'attaque est enregistrée', text:'Ton attaque apparaît maintenant dans <strong>ton panel joueur</strong>. Tu vois le slot utilisé. Si tu avais 2 attaques ET 2 attaques reçues, tu devrais choisir un territoire à capituler. À la clôture, un webhook Discord vous notifie tous.', action:null },
      ],
    },
    {
      god: 'isis', color: '#b02828',
      title: 'Chapitre 3 · Analyser et décider',
      intro: 'Tu incarnes <strong>Isis</strong> (Shemning), rang 4 avec 61 PI. Tu maîtrises les bases. Ce chapitre t\'apprend à <strong>analyser la situation globale</strong> et à prendre les meilleures décisions.',
      steps: [
        { sel:'#panel-inner',   title:'Vue d\'ensemble de ta position', text:'Isis contrôle 2 zones géographiques avec un PI solide. Regarde ton panel : le nombre de territoires, le PI total. Avant d\'agir, <strong>évalue ta position</strong> dans le classement global.', action:null },
        { sel:'#ranking-panel', title:'Analyser le classement',    text:'Identifie les nations les plus faibles et les plus vulnérables. Les nations avec des territoires orphelins (propriétaire "Neutre") sont des <strong>cibles sans opposition</strong>. Clique sur <strong>Arabie</strong> pour l\'analyser.', action:'click-zone-Arabie' },
        { sel:'#panel-inner',   title:'Lire les territoires d\'une zone', text:'Tu vois les territoires d\'Arabie : chaque ligne indique le propriétaire actuel, le type (Ville ou Organisation) et la valeur en PI. Repère les territoires <strong>neutres ou faiblement défendus</strong> — ce sont tes opportunités.', action:null },
        { sel:'#dock',          title:'Trouver une cible dans le dock', text:'Pour attaquer, il faut passer par le dock. Clique sur une <strong>divinité ennemie avec peu d\'attaques reçues</strong> (pas de badge rouge, ou badge "1"). Isis peut cibler Judgment — faible, peu de PI, 1 seul territoire.', action:'click-deity-judgment' },
        { sel:'#panel-inner',   title:'Évaluer avant d\'agir',    text:'Tu vois la fiche de Judgment : 28 PI, peu de territoires. <strong>Avant de cliquer "Attaquer"</strong>, pose-toi ces questions : Est-ce que j\'ai encore un slot d\'attaque ? Est-ce que j\'ai besoin de mes défenses ? Cet ennemi peut-il riposter sur moi ?', action:null },
        { sel:'#warning-ticker',title:'Le ticker d\'alerte',       text:'La barre de défilement en bas indique <strong>en temps réel</strong> les menaces actives : tes attaques lancées et les attaques reçues sur tes territoires. En cycle actif, surveille-la régulièrement avant la clôture.', action:null },
        { sel:'#panel-inner',   title:'Tu es prêt !',             text:'Tu sais maintenant lire une situation, évaluer tes forces, choisir une cible et comprendre la logique défense/attaque. <strong>Dans l\'app réelle</strong>, chaque décision a un impact direct sur la carte et le classement. Bonne conquête.', action:'finish' },
      ],
    },
  ];

  /* ── État ───────────────────────────────────────────────────── */
  let ch = 0, st = 0;
  let active = false;

  /* ── Injecter CSS ───────────────────────────────────────────── */
  function injectCSS() {
    if (document.getElementById('vvt-css')) return;
    const s = document.createElement('style');
    s.id = 'vvt-css';
    s.textContent = `
      #vvt-mask {
        position: fixed; inset: 0; z-index: 8000; pointer-events: none;
        transition: opacity .3s;
      }
      /* les 4 bandes sombres autour de la zone éclairée */
      #vvt-band-top, #vvt-band-bot, #vvt-band-left, #vvt-band-right {
        position: fixed; z-index: 8001; background: rgba(2,5,12,.82);
        transition: all .35s cubic-bezier(.4,0,.2,1);
        pointer-events: all;
      }
      #vvt-spotlight-ring {
        position: fixed; z-index: 8002; pointer-events: none;
        border: 2px solid var(--vvt-color, #c8901a);
        border-radius: 8px;
        box-shadow: 0 0 0 4px color-mix(in srgb, var(--vvt-color,#c8901a) 18%, transparent),
                    inset 0 0 0 1px color-mix(in srgb, var(--vvt-color,#c8901a) 30%, transparent);
        transition: all .35s cubic-bezier(.4,0,.2,1);
      }
      #vvt-bubble {
        position: fixed; z-index: 8100; pointer-events: all;
        background: #050e1c; border-radius: 12px;
        border: 1px solid color-mix(in srgb, var(--vvt-color,#c8901a) 60%, transparent);
        padding: 18px 20px 14px;
        width: 290px;
        box-shadow: 0 8px 40px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.04);
        font-family: Rajdhani, sans-serif;
        transition: top .35s cubic-bezier(.4,0,.2,1), left .35s cubic-bezier(.4,0,.2,1);
        animation: vvt-pop .25s ease;
      }
      @keyframes vvt-pop { from { opacity:0; transform:scale(.92) } to { opacity:1; transform:scale(1) } }
      #vvt-bubble-arrow {
        position: absolute; width: 12px; height: 12px;
        background: #050e1c;
        border: 1px solid color-mix(in srgb, var(--vvt-color,#c8901a) 60%, transparent);
        transform: rotate(45deg);
        transition: top .35s, left .35s, bottom .35s, right .35s;
      }
      #vvt-bubble-tag {
        font-family: 'Share Tech Mono', monospace, sans-serif;
        font-size: 9px; letter-spacing: .14em; text-transform: uppercase;
        color: var(--vvt-color, #c8901a); margin-bottom: 5px; opacity: .85;
      }
      #vvt-bubble-title {
        font-size: 15px; font-weight: 700; color: #e8dea8;
        letter-spacing: .07em; margin-bottom: 9px; line-height: 1.25;
      }
      #vvt-bubble-text {
        font-size: 12.5px; color: #7a90a8; line-height: 1.65;
        margin-bottom: 14px;
      }
      #vvt-bubble-text strong { color: var(--vvt-color, #c8901a); font-weight: 600; }
      #vvt-bubble-nav { display: flex; gap: 8px; align-items: center; }
      #vvt-btn-next {
        flex: 1; padding: 8px 12px; border-radius: 7px;
        border: 1px solid color-mix(in srgb, var(--vvt-color,#c8901a) 70%, transparent);
        background: color-mix(in srgb, var(--vvt-color,#c8901a) 12%, transparent);
        color: var(--vvt-color, #c8901a);
        font-family: Rajdhani, sans-serif; font-weight: 700; font-size: 13px;
        letter-spacing: .07em; cursor: pointer; text-transform: uppercase;
        transition: all .2s;
      }
      #vvt-btn-next:hover { background: color-mix(in srgb, var(--vvt-color,#c8901a) 22%, transparent); }
      #vvt-btn-next.locked { opacity: .38; cursor: not-allowed; }
      #vvt-btn-next.locked:hover { background: color-mix(in srgb, var(--vvt-color,#c8901a) 12%, transparent); }
      #vvt-btn-prev {
        padding: 7px 12px; border-radius: 7px;
        border: 1px solid #1a2840; background: transparent;
        color: #3a5070; font-family: Rajdhani, sans-serif;
        font-size: 12px; cursor: pointer; transition: all .2s;
      }
      #vvt-btn-prev:hover { border-color: #3a5070; color: #6a90a8; }
      #vvt-dot-row { display: flex; gap: 5px; align-items: center; margin-top: 10px; }
      .vvt-dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: #162030; transition: all .3s;
      }
      .vvt-dot.done { background: color-mix(in srgb, var(--vvt-color,#c8901a) 50%, #162030); }
      .vvt-dot.cur  { background: var(--vvt-color, #c8901a); box-shadow: 0 0 5px var(--vvt-color,#c8901a); }
      #vvt-step-lbl {
        font-size: 9px; font-family: monospace; color: #2a4060;
        margin-left: auto; letter-spacing: .04em;
      }
      /* topbar du tuto */
      #vvt-topbar {
        position: fixed; top: 0; left: 0; right: 0; z-index: 8200;
        background: #040c18; border-bottom: 1px solid #0e1e30;
        padding: 0 20px; height: 36px;
        display: flex; align-items: center; gap: 16px;
        font-family: Rajdhani, sans-serif;
      }
      #vvt-topbar-logo {
        font-size: 13px; font-weight: 700; letter-spacing: .18em; color: #c8901a;
      }
      #vvt-topbar-badge {
        font-size: 9px; font-family: monospace; letter-spacing: .1em;
        background: rgba(200,144,26,.1); border: 1px solid rgba(200,144,26,.3);
        color: rgba(200,144,26,.8); border-radius: 20px; padding: 2px 9px;
      }
      #vvt-topbar-chaps { display: flex; gap: 6px; margin-left: auto; align-items: center; }
      .vvt-chap-pill {
        font-size: 9px; font-family: monospace; letter-spacing: .06em;
        padding: 3px 10px; border-radius: 20px; border: 1px solid #0e1e30;
        color: #2a4060; transition: all .3s;
      }
      .vvt-chap-pill.done  { border-color: #1a3020; color: #3a6030; }
      .vvt-chap-pill.cur   { border-color: var(--vvt-color,#c8901a); color: var(--vvt-color,#c8901a); }
      #vvt-exit {
        font-size: 11px; font-family: Rajdhani, sans-serif; font-weight: 600;
        background: transparent; border: 1px solid #1a2840;
        color: #3a5070; padding: 4px 12px; border-radius: 5px;
        cursor: pointer; letter-spacing: .05em; transition: all .2s; margin-left: 10px;
      }
      #vvt-exit:hover { border-color: #cc3030; color: #cc3030; }
      /* splash chapitre */
      #vvt-splash {
        position: fixed; inset: 0; z-index: 9000;
        background: rgba(2,5,12,.97);
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 14px; text-align: center; padding: 32px;
        font-family: Rajdhani, sans-serif;
        animation: vvt-pop .3s ease;
      }
      #vvt-splash h2 { font-size: 22px; font-weight: 700; letter-spacing: .12em; color: #e8dea8; }
      #vvt-splash p  { font-size: 13.5px; color: #6a8090; line-height: 1.7; max-width: 400px; }
      #vvt-splash p strong { color: var(--vvt-color, #c8901a); font-weight: 600; }
      #vvt-splash-btn {
        margin-top: 8px; padding: 11px 28px; border-radius: 8px;
        border: 1px solid var(--vvt-color,#c8901a);
        background: color-mix(in srgb, var(--vvt-color,#c8901a) 12%, transparent);
        color: var(--vvt-color, #c8901a);
        font-family: Rajdhani, sans-serif; font-weight: 700; font-size: 14px;
        letter-spacing: .1em; cursor: pointer; text-transform: uppercase;
        transition: all .2s;
      }
      #vvt-splash-btn:hover { background: color-mix(in srgb, var(--vvt-color,#c8901a) 22%, transparent); }
      #vvt-splash-sub {
        font-size: 10px; font-family: monospace; letter-spacing: .12em;
        color: var(--vvt-color, #c8901a); margin-bottom: 4px; opacity: .75;
      }
      /* finish */
      #vvt-finish {
        position: fixed; inset: 0; z-index: 9000;
        background: rgba(2,5,12,.97);
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 16px; text-align: center; padding: 40px;
        font-family: Rajdhani, sans-serif;
        animation: vvt-pop .3s ease;
      }
      #vvt-finish-icon { font-size: 56px; }
      #vvt-finish h2 { font-size: 26px; font-weight: 700; letter-spacing: .18em; color: #c8901a; }
      #vvt-finish p  { font-size: 14px; color: #5a7090; line-height: 1.7; max-width: 380px; }
      #vvt-finish-btn {
        margin-top: 10px; padding: 12px 32px; border-radius: 8px;
        border: 1px solid #c8901a;
        background: rgba(200,144,26,.1); color: #c8901a;
        font-family: Rajdhani, sans-serif; font-weight: 700; font-size: 15px;
        letter-spacing: .1em; cursor: pointer; text-transform: uppercase; transition: all .2s;
      }
      #vvt-finish-btn:hover { background: rgba(200,144,26,.22); }
      /* action-needed hint */
      #vvt-action-hint {
        font-size: 10px; font-family: monospace; color: var(--vvt-color,#c8901a);
        letter-spacing: .07em; margin-top: 8px; text-align: center;
        animation: vvt-blink 1.4s ease-in-out infinite;
      }
      @keyframes vvt-blink { 0%,100%{opacity:.5} 50%{opacity:1} }
    `;
    document.head.appendChild(s);
  }

  /* ── Construire la structure overlay ────────────────────────── */
  function buildDOM() {
    // topbar
    const topbar = document.createElement('div');
    topbar.id = 'vvt-topbar';
    topbar.innerHTML = `
      <span id="vvt-topbar-logo">VAE VICTIS</span>
      <span id="vvt-topbar-badge">MODE TUTORIEL</span>
      <div id="vvt-topbar-chaps">
        ${CHAPTERS.map((c,i) => `<div class="vvt-chap-pill" id="vvt-cp-${i}">Ch.${i+1}</div>`).join('')}
      </div>
      <button id="vvt-exit">✕ Quitter</button>
    `;
    document.body.appendChild(topbar);

    // 4 bandes sombres
    ['top','bot','left','right'].forEach(side => {
      const d = document.createElement('div');
      d.id = 'vvt-band-' + side;
      document.body.appendChild(d);
    });

    // anneau spotlight
    const ring = document.createElement('div');
    ring.id = 'vvt-spotlight-ring';
    document.body.appendChild(ring);

    // bulle guide
    const bubble = document.createElement('div');
    bubble.id = 'vvt-bubble';
    bubble.innerHTML = `
      <div id="vvt-bubble-arrow"></div>
      <div id="vvt-bubble-tag"></div>
      <div id="vvt-bubble-title"></div>
      <div id="vvt-bubble-text"></div>
      <div id="vvt-bubble-nav">
        <button id="vvt-btn-prev">← Préc.</button>
        <button id="vvt-btn-next">Suivant →</button>
      </div>
      <div id="vvt-dot-row"></div>
      <div id="vvt-action-hint" style="display:none">↑ Fais le geste ci-dessus</div>
    `;
    document.body.appendChild(bubble);

    // events
    document.getElementById('vvt-exit').onclick    = teardown;
    document.getElementById('vvt-btn-next').onclick = tryNext;
    document.getElementById('vvt-btn-prev').onclick = goPrev;
  }

  /* ── Spotlight : calcule les 4 bandes autour de target ─────── */
  const PAD = 6;
  function spotlight(sel) {
    const top   = document.getElementById('vvt-band-top');
    const bot   = document.getElementById('vvt-band-bot');
    const left  = document.getElementById('vvt-band-left');
    const right = document.getElementById('vvt-band-right');
    const ring  = document.getElementById('vvt-spotlight-ring');

    const el = sel ? document.querySelector(sel) : null;
    if (!el) {
      // Tout sombre
      top.style.cssText   = 'top:0;left:0;right:0;bottom:0;display:block';
      bot.style.display   = 'none';
      left.style.display  = 'none';
      right.style.display = 'none';
      ring.style.display  = 'none';
      return;
    }

    const r = el.getBoundingClientRect();
    const T = Math.max(0, r.top    - PAD);
    const B = Math.max(0, window.innerHeight - r.bottom - PAD);
    const L = Math.max(0, r.left   - PAD);
    const R = Math.max(0, window.innerWidth  - r.right  - PAD);
    const H = r.height + PAD*2;
    const W = r.width  + PAD*2;

    top.style.cssText   = `top:0;left:0;right:0;height:${T}px;display:block`;
    bot.style.cssText   = `bottom:0;left:0;right:0;height:${B}px;display:block`;
    left.style.cssText  = `top:${T}px;left:0;width:${L}px;height:${H}px;display:block`;
    right.style.cssText = `top:${T}px;right:0;width:${R}px;height:${H}px;display:block`;

    ring.style.cssText  = `
      top:${T}px; left:${L}px;
      width:${W}px; height:${H}px;
      display:block;
    `;
  }

  /* ── Positionner la bulle ───────────────────────────────────── */
  function positionBubble(sel) {
    const bubble = document.getElementById('vvt-bubble');
    const arrow  = document.getElementById('vvt-bubble-arrow');
    const BW = 290, BH = 230, M = 16;

    if (!sel) {
      bubble.style.top  = '50%';
      bubble.style.left = '50%';
      bubble.style.transform = 'translate(-50%,-50%)';
      arrow.style.display = 'none';
      return;
    }
    bubble.style.transform = 'none';
    arrow.style.display = 'block';

    const el = document.querySelector(sel);
    if (!el) return;
    const r = el.getBoundingClientRect();

    let top, left;
    // Essai : à droite
    if (r.right + M + BW < window.innerWidth) {
      left = r.right + M;
      top  = Math.max(44, Math.min(window.innerHeight - BH - 8, r.top + r.height/2 - BH/2));
      arrow.style.cssText = `left:-7px;top:${Math.min(BH-22,Math.max(12,r.top+r.height/2-top-6))}px;right:auto;bottom:auto;border-right:none;border-top:none`;
    // Essai : à gauche
    } else if (r.left - M - BW > 0) {
      left = r.left - BW - M;
      top  = Math.max(44, Math.min(window.innerHeight - BH - 8, r.top + r.height/2 - BH/2));
      arrow.style.cssText = `right:-7px;top:${Math.min(BH-22,Math.max(12,r.top+r.height/2-top-6))}px;left:auto;bottom:auto;border-left:none;border-bottom:none`;
    // Essai : en dessous
    } else if (r.bottom + M + BH < window.innerHeight) {
      top  = r.bottom + M;
      left = Math.max(8, Math.min(window.innerWidth - BW - 8, r.left + r.width/2 - BW/2));
      arrow.style.cssText = `top:-7px;left:${Math.min(BW-22,Math.max(12,r.left+r.width/2-left-6))}px;bottom:auto;right:auto;border-bottom:none;border-right:none`;
    // Fallback : au-dessus
    } else {
      top  = Math.max(44, r.top - BH - M);
      left = Math.max(8, Math.min(window.innerWidth - BW - 8, r.left + r.width/2 - BW/2));
      arrow.style.cssText = `bottom:-7px;left:${Math.min(BW-22,Math.max(12,r.left+r.width/2-left-6))}px;top:auto;right:auto;border-top:none;border-left:none`;
    }

    bubble.style.top  = Math.max(44, top) + 'px';
    bubble.style.left = Math.max(8, left) + 'px';
  }

  /* ── Render step ────────────────────────────────────────────── */
  function renderStep() {
    const chapter = CHAPTERS[ch];
    const step    = chapter.steps[st];
    const color   = chapter.color;

    // CSS var couleur faction
    document.documentElement.style.setProperty('--vvt-color', color);
    document.getElementById('vvt-topbar').style.setProperty('--vvt-color', color);
    document.getElementById('vvt-bubble').style.setProperty('--vvt-color', color);
    document.getElementById('vvt-spotlight-ring').style.setProperty('--vvt-color', color);

    // chapitres pills
    CHAPTERS.forEach((c2, i) => {
      const pill = document.getElementById('vvt-cp-' + i);
      pill.className = 'vvt-chap-pill' + (i < ch ? ' done' : i === ch ? ' cur' : '');
    });

    // contenu bulle
    document.getElementById('vvt-bubble-tag').textContent   = `Ch.${ch+1} · ${chapter.god.toUpperCase()} · Étape ${st+1}/${chapter.steps.length}`;
    document.getElementById('vvt-bubble-title').textContent = step.title;
    document.getElementById('vvt-bubble-text').innerHTML    = step.text;

    // points de progression
    const dotRow = document.getElementById('vvt-dot-row');
    dotRow.innerHTML = chapter.steps.map((_, i) => {
      const cls = i < st ? 'done' : i === st ? 'cur' : '';
      return `<div class="vvt-dot ${cls}" style="--vvt-color:${color}"></div>`;
    }).join('') + `<span id="vvt-step-lbl">${st+1}/${chapter.steps.length}</span>`;

    // bouton suivant
    const btnNext = document.getElementById('vvt-btn-next');
    const needsAction = step.action && step.action !== 'finish';
    const isLast = st === chapter.steps.length - 1;
    const isFinalChapter = ch === CHAPTERS.length - 1;

    if (needsAction) {
      btnNext.textContent = '→ Fais le geste';
      btnNext.classList.add('locked');
    } else if (isLast && isFinalChapter) {
      btnNext.textContent = 'Terminer ✓';
      btnNext.classList.remove('locked');
    } else if (isLast) {
      btnNext.textContent = 'Chapitre suivant →';
      btnNext.classList.remove('locked');
    } else {
      btnNext.textContent = 'Suivant →';
      btnNext.classList.remove('locked');
    }

    const hint = document.getElementById('vvt-action-hint');
    hint.style.display = needsAction ? 'block' : 'none';

    // bouton précédent
    document.getElementById('vvt-btn-prev').style.display = (ch === 0 && st === 0) ? 'none' : 'block';

    // spotlight + bulle
    spotlight(step.sel);
    positionBubble(step.sel);
  }

  /* ── Navigation ─────────────────────────────────────────────── */
  function tryNext() {
    const step = CHAPTERS[ch].steps[st];
    if (step.action && step.action !== 'finish') return; // bloqué — attendre le geste
    if (step.action === 'finish') { showFinish(); return; }

    const isLast = st === CHAPTERS[ch].steps.length - 1;
    if (isLast) {
      if (ch < CHAPTERS.length - 1) {
        ch++; st = 0;
        showSplash();
      } else {
        showFinish();
      }
    } else {
      st++;
      renderStep();
    }
  }

  function goPrev() {
    if (st > 0) { st--; renderStep(); }
    else if (ch > 0) { ch--; st = CHAPTERS[ch].steps.length - 1; renderStep(); }
  }

  /* ── Intercepter les gestes de l'utilisateur ────────────────── */
  function advanceIfMatch(action) {
    const step = CHAPTERS[ch].steps[st];
    if (!active || !step.action) return false;
    // Comparaison STRICTE : l'action doit correspondre exactement
    if (step.action !== action) return false;
    st++;
    if (st >= CHAPTERS[ch].steps.length) {
      if (ch < CHAPTERS.length - 1) { ch++; st = 0; setTimeout(showSplash, 300); }
      else setTimeout(showFinish, 300);
    } else {
      setTimeout(renderStep, 200);
    }
    return true;
  }

  /* ── Patch des fonctions de l'app réelle ────────────────────── */
  function patchApp() {
    // Intercepteur global en capture : bloque tout clic hors zone spotlight
    document.addEventListener('click', e => {
      if (!active) return;
      const step = CHAPTERS[ch]?.steps[st];
      if (!step?.action) return; // étape libre, pas de blocage
      // Laisser passer les éléments tuto
      if (e.target.closest('#vvt-bubble, #vvt-topbar, #vvt-splash, #vvt-finish')) return;
      // Zone autorisée = l'élément spotlighté
      const allowed = step.sel ? document.querySelector(step.sel) : null;
      if (!allowed) return;
      if (!allowed.contains(e.target) && e.target !== allowed) {
        e.stopImmediatePropagation();
        e.preventDefault();
        // Flash rouge des bandes = feedback visuel "zone bloquée"
        ['vvt-band-top','vvt-band-bot','vvt-band-left','vvt-band-right'].forEach(id => {
          const b = document.getElementById(id);
          if (!b) return;
          b.style.background = 'rgba(180,30,30,.6)';
          setTimeout(() => { b.style.background = 'rgba(2,5,12,.82)'; }, 220);
        });
      }
    }, true);

    // Surveiller les clics sur le dock
    document.getElementById('dock')?.addEventListener('click', e => {
      const chip = e.target.closest('.dchip[data-id]');
      if (!chip) return;
      advanceIfMatch('click-deity-' + chip.dataset.id);
    }, true);

    // Surveiller les clics sur le ranking panel
    document.getElementById('ranking-panel')?.addEventListener('click', e => {
      const item = e.target.closest('.ranking-item[data-zone]');
      if (!item) return;
      advanceIfMatch('click-zone-' + item.dataset.zone);
    }, true);

    // Surveiller le bouton attaque dans le panel
    document.getElementById('panel-inner')?.addEventListener('click', e => {
      const btn = e.target.closest('#panel-atk-btn, .atk-btn');
      if (btn) advanceIfMatch('click-attack-' + (btn.dataset?.owner || 'any'));
    }, true);

    // Surveiller la confirmation d'attaque
    document.getElementById('atk-confirm')?.addEventListener('click', () => {
      advanceIfMatch('confirm-attack');
    }, true);
  }

  /* ── Splash intro chapitre ───────────────────────────────────── */
  function showSplash() {
    // Masquer overlay spotlights pendant le splash
    ['vvt-band-top','vvt-band-bot','vvt-band-left','vvt-band-right','vvt-spotlight-ring','vvt-bubble'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    const chapter = CHAPTERS[ch];
    const god     = FAKE[chapter.god];

    // Injecter le dieu fictif pour que l'app affiche son nom
    injectFakeMe(chapter.god);

    const splash = document.createElement('div');
    splash.id = 'vvt-splash';
    splash.style.setProperty('--vvt-color', chapter.color);
    splash.innerHTML = `
      <div id="vvt-splash-sub">${['CHAPITRE 1','CHAPITRE 2','CHAPITRE 3'][ch]} · ${chapter.god.toUpperCase()}</div>
      <h2>${chapter.title}</h2>
      <p>${chapter.intro}</p>
      <button id="vvt-splash-btn">Commencer →</button>
    `;
    document.body.appendChild(splash);

    document.getElementById('vvt-splash-btn').onclick = () => {
      splash.remove();
      ['vvt-band-top','vvt-band-bot','vvt-band-left','vvt-band-right'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'block';
      });
      document.getElementById('vvt-bubble').style.display = 'block';
      renderStep();
    };
  }

  /* ── Injecter un faux joueur connecté ───────────────────────── */
  function injectFakeMe(godKey) {
    const fake = FAKE[godKey];
    if (!window.VV || !window.VV.DEITIES) return;

    // S'assurer que la divinité fictive existe dans DEITIES
    let d = window.VV.DEITIES.find(x => x.id === fake.id);
    if (!d) {
      d = { id: fake.id, name: fake.name, color: fake.color, pi: fake.pi,
            avatar: '', logo: '', player: fake.player, pass: 'tuto' };
      window.VV.DEITIES.unshift(d);
    } else {
      Object.assign(d, { name: fake.name, color: fake.color, pi: fake.pi, player: fake.player, pass: 'tuto' });
    }

    // Sauvegarder le vrai joueur (une seule fois)
    if (!window._vvt_realMe) {
      window._vvt_realMe = window.VV.me || null;
    }

    // Vider les attaques du chapitre précédent (réelles ou fictives)
    if (window.VV.attacks) {
      window.VV.attacks = window.VV.attacks.filter(a => a._tuto !== true);
    }

    // Swapper me via le bridge exposé par app.js
    if (typeof window.VV.setMe === 'function') {
      window.VV.setMe(d);
    }

    // Rafraîchir toute l'interface via le bridge
    try {
      if (typeof window.VV.refreshUI === 'function') {
        window.VV.refreshUI();
      }
      // Naviguer vers la zone de départ cohérente avec le dieu
      const startZone = { athena: 'Grèce & Balkans', judgment: 'USA', isis: 'Maghreb' }[godKey];
      if (startZone && typeof window.VV.onZoneClick === 'function') {
        setTimeout(() => window.VV.onZoneClick(startZone), 400);
      }
    } catch(e) { /* app pas encore prête */ }
  }

  /* ── Écran de fin ────────────────────────────────────────────── */
  function showFinish() {
    teardownOverlay();
    const fin = document.createElement('div');
    fin.id = 'vvt-finish';
    fin.innerHTML = `
      <div id="vvt-finish-icon">⚡</div>
      <h2>Entraînement terminé</h2>
      <p>Tu maîtrises maintenant les bases de <strong>Vae Victis</strong> : lire une situation, évaluer tes forces, attaquer stratégiquement et comprendre la défense.<br><br>L'app réelle t'attend — bonne conquête.</p>
      <button id="vvt-finish-btn">Fermer et jouer</button>
    `;
    document.body.appendChild(fin);
    document.getElementById('vvt-finish-btn').onclick = () => {
      fin.remove();
      teardown();
    };
    localStorage.setItem('vvt_tuto_done', '1');
  }

  /* ── Nettoyage partiel (overlay seulement, pas topbar) ──────── */
  function teardownOverlay() {
    ['vvt-band-top','vvt-band-bot','vvt-band-left','vvt-band-right','vvt-spotlight-ring','vvt-bubble'].forEach(id => {
      document.getElementById(id)?.remove();
    });
  }

  /* ── Nettoyage complet ────────────────────────────────────────── */
  function teardown() {
    active = false;
    // Restaurer le vrai joueur connecté
    if (window._vvt_realMe !== undefined) {
      if (typeof window.VV?.setMe === 'function') window.VV.setMe(window._vvt_realMe);
      delete window._vvt_realMe;
      try { if (typeof window.VV?.refreshUI === 'function') window.VV.refreshUI(); } catch(e) {}
    }
    ['vvt-topbar','vvt-band-top','vvt-band-bot','vvt-band-left','vvt-band-right',
     'vvt-spotlight-ring','vvt-bubble','vvt-splash','vvt-finish','vvt-css'].forEach(id => {
      document.getElementById(id)?.remove();
    });
    document.documentElement.style.removeProperty('--vvt-color');
  }

  /* ── Point d'entrée ───────────────────────────────────────────── */
  function launch() {
    if (document.getElementById('vvt-topbar')) return; // déjà actif
    active = true; ch = 0; st = 0;
    injectCSS();
    buildDOM();
    patchApp();
    showSplash();
  }

  /* ── Bouton ? permanent ───────────────────────────────────────── */
  function addTriggerBtn() {
    if (document.getElementById('vvt-trigger')) return;
    const btn = document.createElement('button');
    btn.id = 'vvt-trigger';
    btn.title = 'Tutoriel interactif';
    btn.textContent = '?';
    btn.style.cssText = `
      position:fixed;bottom:20px;right:20px;z-index:7900;
      width:44px;height:44px;border-radius:50%;
      background:#040c18;border:1.5px solid #c8901a;
      color:#c8901a;font-family:Rajdhani,sans-serif;font-weight:700;font-size:22px;
      cursor:pointer;box-shadow:0 0 18px rgba(200,144,26,.25);transition:all .2s;
    `;
    btn.onmouseenter = () => btn.style.background = 'rgba(200,144,26,.14)';
    btn.onmouseleave = () => btn.style.background = '#040c18';
    btn.onclick = launch;
    document.body.appendChild(btn);
  }

  function waitForLogin(cb) {
    // Attend que window.me soit défini (= joueur connecté)
    // Vérifie toutes les 500ms, abandonne après 5 minutes
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (window.me && window.me.id) {
        clearInterval(timer);
        cb();
      }
      if (tries > 600) clearInterval(timer); // timeout 5min
    }, 500);
  }

  function init() {
    addTriggerBtn();
    if (!localStorage.getItem('vvt_tuto_done')) {
      // Lancer le tuto uniquement APRÈS que le joueur s'est connecté
      waitForLogin(launch);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.VVTutorial = { launch, teardown };
})();
