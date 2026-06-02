/* =============================================================
   VAE VICTIS — tutorial.js  v2
   Tutoriel interactif 3 chapitres / 3 divinités
   Athéna (Olympiens) · Judgment (Sovereign) · Isis (Shemning)
   ============================================================= */
(function () {
  'use strict';

  /* ─────────────────────────────────────────────────────────────
     DONNÉES BAC À SABLE
  ───────────────────────────────────────────────────────────── */
  const FACTIONS = {
    olympien: { color: '#c8a020', colorDim: 'rgba(200,160,32,.15)', label: 'Olympiens', icon: '⚡' },
    sovereign:{ color: '#4a8ad4', colorDim: 'rgba(74,138,212,.15)',  label: 'Sovereign',  icon: '🔵' },
    shemning: { color: '#cc3030', colorDim: 'rgba(204,48,48,.15)',   label: 'Shemning',   icon: '🔴' },
    neutre:   { color: '#445566', colorDim: 'rgba(68,85,102,.15)',   label: 'Neutre',     icon: '⬜' },
  };

  const GODS = {
    athena:   { id:'athena',   name:'Athéna',   faction:'olympien',  color:'#c8a020', icon:'🦉', influence:74, rank:2, territories:['athenes','corinthe','delphes'] },
    judgment: { id:'judgment', name:'Judgment', faction:'sovereign', color:'#4a8ad4', icon:'⚖', influence:28, rank:9, territories:['washington'] },
    isis:     { id:'isis',     name:'Isis',     faction:'shemning',  color:'#cc3030', icon:'𓂀', influence:61, rank:4, territories:['alexandrie','memphis','louxor'] },
    zeus:     { id:'zeus',     name:'Zeus',     faction:'olympien',  color:'#c8a020', icon:'⚡', influence:88, rank:1, territories:['olympe','sparte','argos'] },
    liberty:  { id:'liberty',  name:'Liberty',  faction:'sovereign', color:'#4a8ad4', icon:'🗽', influence:71, rank:3, territories:['new_york','boston','chicago'] },
    seth:     { id:'seth',     name:'Seth',     faction:'shemning',  color:'#cc3030', icon:'𓂀', influence:55, rank:5, territories:['thebes_eg','karnak'] },
  };

  const TERRITORIES = {
    athenes:    { id:'athenes',    name:'Athènes',       country:'Grèce',         x:58, y:40, faction:'olympien',  owner:'athena',   inf:{olympien:78,sovereign:14,shemning:8},  pop:'3.1M', gdp:'18Mds$' },
    corinthe:   { id:'corinthe',   name:'Corinthe',      country:'Grèce',         x:54, y:46, faction:'olympien',  owner:'athena',   inf:{olympien:65,sovereign:22,shemning:13}, pop:'0.6M', gdp:'4Mds$'  },
    delphes:    { id:'delphes',    name:'Delphes',        country:'Grèce',         x:50, y:38, faction:'olympien',  owner:'athena',   inf:{olympien:82,sovereign:10,shemning:8},  pop:'0.1M', gdp:'1Mds$'  },
    washington: { id:'washington', name:'Washington DC',  country:'États-Unis',    x:28, y:34, faction:'sovereign', owner:'judgment', inf:{olympien:18,sovereign:62,shemning:20}, pop:'0.7M', gdp:'9Mds$'  },
    new_york:   { id:'new_york',   name:'New York',       country:'États-Unis',    x:26, y:30, faction:'sovereign', owner:'liberty',  inf:{olympien:12,sovereign:74,shemning:14}, pop:'8.3M', gdp:'900Mds$'},
    boston:     { id:'boston',     name:'Boston',         country:'États-Unis',    x:29, y:27, faction:'sovereign', owner:'liberty',  inf:{olympien:15,sovereign:70,shemning:15}, pop:'0.7M', gdp:'120Mds$'},
    chicago:    { id:'chicago',    name:'Chicago',        country:'États-Unis',    x:22, y:31, faction:'sovereign', owner:'liberty',  inf:{olympien:20,sovereign:66,shemning:14}, pop:'2.7M', gdp:'700Mds$'},
    olympe:     { id:'olympe',     name:'Olympe',         country:'Grèce',         x:55, y:35, faction:'olympien',  owner:'zeus',     inf:{olympien:95,sovereign:3, shemning:2},  pop:'—',    gdp:'—'      },
    sparte:     { id:'sparte',     name:'Sparte',         country:'Grèce',         x:58, y:48, faction:'olympien',  owner:'zeus',     inf:{olympien:88,sovereign:8, shemning:4},  pop:'0.4M', gdp:'2Mds$'  },
    alexandrie: { id:'alexandrie', name:'Alexandrie',     country:'Égypte',        x:64, y:44, faction:'shemning',  owner:'isis',     inf:{olympien:12,sovereign:22,shemning:66}, pop:'5.2M', gdp:'22Mds$' },
    memphis:    { id:'memphis',    name:'Memphis (Égy.)', country:'Égypte',        x:67, y:48, faction:'shemning',  owner:'isis',     inf:{olympien:10,sovereign:18,shemning:72}, pop:'2.1M', gdp:'8Mds$'  },
    louxor:     { id:'louxor',     name:'Louxor',         country:'Égypte',        x:70, y:52, faction:'shemning',  owner:'isis',     inf:{olympien:8, sovereign:14,shemning:78}, pop:'0.5M', gdp:'3Mds$'  },
    thebes_eg:  { id:'thebes_eg',  name:'Thèbes (Égy.)',  country:'Égypte',        x:68, y:54, faction:'shemning',  owner:'seth',     inf:{olympien:15,sovereign:20,shemning:65}, pop:'0.3M', gdp:'2Mds$'  },
    karnak:     { id:'karnak',     name:'Karnak',         country:'Égypte',        x:72, y:56, faction:'shemning',  owner:'seth',     inf:{olympien:6, sovereign:10,shemning:84}, pop:'0.1M', gdp:'1Mds$'  },
    argos:      { id:'argos',      name:'Argos',          country:'Grèce',         x:60, y:50, faction:'olympien',  owner:'zeus',     inf:{olympien:80,sovereign:12,shemning:8},  pop:'0.1M', gdp:'1Mds$'  },
  };

  /* ─────────────────────────────────────────────────────────────
     CHAPITRES & ÉTAPES
  ───────────────────────────────────────────────────────────── */
  const CHAPTERS = [
    {
      id: 'athena',
      god: 'athena',
      title: 'Chapitre 1 — Lire ses informations',
      subtitle: 'Jouer Athéna · Olympiens',
      color: '#c8a020',
      intro: 'Dans ce premier chapitre, tu incarnes <strong>Athéna</strong>, déesse de la sagesse. Tu vas apprendre à lire toutes les informations disponibles : tes territoires, ton influence, ta position parmi les dieux.',
      steps: [
        {
          id: 'ch1-profile',
          highlight: '#vvt-god-panel',
          title: 'Ton profil de divinité',
          text: 'Le panel gauche affiche ta <strong>fiche complète</strong>. Tu vois ton nom, ta faction (Olympiens), ton score d\'influence global et ton rang parmi tous les dieux. Athéna est ici au rang 2 avec 74 points d\'influence.',
          action: null,
        },
        {
          id: 'ch1-territories',
          highlight: '#vvt-terr-list',
          title: 'Tes territoires',
          text: 'Tu possèdes <strong>3 territoires</strong> : Athènes, Corinthe et Delphes. Chaque territoire contribue à ton influence globale. Clique sur <strong>Athènes</strong> pour l\'inspecter.',
          action: 'click-territory-athenes',
        },
        {
          id: 'ch1-territory-detail',
          highlight: '#vvt-territory-detail',
          title: 'Détail d\'un territoire',
          text: 'Tu vois maintenant la fiche d\'Athènes : pays, population, PIB, et surtout la <strong>répartition d\'influence</strong> entre les 3 factions. 78% Olympiens — ce territoire est très solidement tenu.',
          action: null,
        },
        {
          id: 'ch1-map',
          highlight: '#vvt-map-zone',
          title: 'La carte',
          text: 'Sur la carte, tes territoires brillent en <strong>or</strong>. Les cercles pulsent selon l\'intensité de l\'influence. Plus le territoire est solide, plus l\'onde est vive. Observe la différence entre Athènes (78%) et Corinthe (65%).',
          action: null,
        },
        {
          id: 'ch1-other-gods',
          highlight: '#vvt-gods-list',
          title: 'Les autres dieux',
          text: 'Le classement affiche tous les dieux actifs, leur faction et leur influence. Zeus domine avec 88 points. Liberty (Sovereign) est proche d\'Athéna avec 71. Surveille les dieux proches de ton score — ce sont tes rivaux directs.',
          action: null,
        },
      ],
    },
    {
      id: 'judgment',
      god: 'judgment',
      title: 'Chapitre 2 — Comprendre les attaques',
      subtitle: 'Jouer Judgment · Sovereign',
      color: '#4a8ad4',
      intro: 'Tu incarnes maintenant <strong>Judgment</strong>, dieu de la justice Sovereign, avec seulement 28 points d\'influence — une position fragile. Tu vas apprendre à lire la situation adverse et déclarer des attaques stratégiques.',
      steps: [
        {
          id: 'ch2-weak-position',
          highlight: '#vvt-god-panel',
          title: 'Une position vulnérable',
          text: 'Judgment est au <strong>rang 9</strong> avec seulement 28 points d\'influence. Il ne possède qu\'un seul territoire : Washington DC. Cette situation impose une stratégie offensive pour progresser.',
          action: null,
        },
        {
          id: 'ch2-read-enemy',
          highlight: '#vvt-territory-detail',
          title: 'Lire un territoire ennemi',
          text: 'Clique sur <strong>Athènes</strong> sur la carte — un territoire Olympien. Observe la répartition d\'influence. 78% Olympiens : attaquer ici serait risqué. Il vaut mieux viser un territoire plus contesté.',
          action: 'click-territory-athenes',
        },
        {
          id: 'ch2-find-weak',
          highlight: '#vvt-territory-detail',
          title: 'Trouver la cible idéale',
          text: 'Maintenant clique sur <strong>Corinthe</strong>. 65% Olympiens, 22% Sovereign — ce territoire est déjà partiellement influencé par ta faction. C\'est une cible bien plus réaliste pour une attaque.',
          action: 'click-territory-corinthe',
        },
        {
          id: 'ch2-declare-attack',
          highlight: '#vvt-attack-zone',
          title: 'Déclarer une attaque',
          text: 'Tu peux lancer <strong>2 attaques max</strong> par cycle. Clique sur le bouton "⚔ Attaquer Corinthe" pour déclarer ton offensive. Rappelle-toi : 2 attaques = 1 seule défense possible.',
          action: 'click-attack-corinthe',
        },
        {
          id: 'ch2-slots',
          highlight: '#vvt-dock',
          title: 'Tes slots d\'action',
          text: 'Le dock affiche tes <strong>slots d\'attaque et de défense</strong>. Tu viens d\'utiliser 1 slot offensif. Il t\'en reste 1. Si tu lances une 2e attaque, tu n\'auras plus qu\'1 défense ce cycle — choisis avec soin.',
          action: 'click-confirm-attack',
        },
        {
          id: 'ch2-defense-logic',
          highlight: '#vvt-dock',
          title: 'La logique de défense',
          text: 'Avec <strong>1 attaque lancée</strong>, tu conserves 2 défenses. Si tu te fais attaquer sur 2 territoires différents avant la clôture, tu peux tout défendre. La clôture déclenche un <strong>webhook Discord</strong> qui te prévient des attaques reçues.',
          action: null,
        },
      ],
    },
    {
      id: 'isis',
      god: 'isis',
      title: 'Chapitre 3 — Analyser et décider',
      subtitle: 'Jouer Isis · Shemning',
      color: '#cc3030',
      intro: 'Tu incarnes <strong>Isis</strong>, déesse égyptienne au rang 4 avec 61 points d\'influence. Tu maîtrises maintenant les bases. Ce chapitre t\'apprend à <strong>analyser la situation globale</strong> et choisir les meilleures actions possibles.',
      steps: [
        {
          id: 'ch3-overview',
          highlight: '#vvt-god-panel',
          title: 'Vue d\'ensemble de ta position',
          text: 'Isis contrôle <strong>3 territoires en Égypte</strong> avec des scores élevés (66–78%). Sa position est solide mais Seth (Shemning) est proche avec 55 points. Entre alliés d\'une même faction, la compétition existe aussi.',
          action: null,
        },
        {
          id: 'ch3-ideas',
          highlight: '#vvt-ideas-panel',
          title: 'Lire ses Idées Nationales',
          text: 'Les <strong>Idées Nationales</strong> modifient tes capacités. Isis dispose ici de "Magie Ancienne" (+1 attaque spéciale) et "Malédiction" (−10% défense adverse). Clique sur une idée pour voir son effet complet.',
          action: 'click-idea',
        },
        {
          id: 'ch3-faction-council',
          highlight: '#vvt-faction-btn',
          title: 'Le Conseil Shemning',
          text: 'En tant que Shemning, tu peux accéder au <strong>Cercle d\'Asimov</strong> — l\'organisation secrète de ta faction. Ces interfaces donnent accès à des actions avancées exclusives. Clique pour explorer.',
          action: 'click-faction',
        },
        {
          id: 'ch3-analyze-target',
          highlight: '#vvt-territory-detail',
          title: 'Analyser une cible potentielle',
          text: 'Clique sur <strong>Washington DC</strong> (Judgment/Sovereign). 62% Sovereign, 20% Shemning — ton influence est déjà présente. En attaquant ici, tu gagnes du terrain ET tu affaiblis Judgment, rival en bas du classement.',
          action: 'click-territory-washington',
        },
        {
          id: 'ch3-strategy',
          highlight: '#vvt-strategy-box',
          title: 'Réfléchir avant d\'agir',
          text: 'Avant d\'attaquer, pose-toi ces questions : <strong>Quelle est mon influence sur la cible ?</strong> Mon ennemi peut-il se défendre ? Est-ce que j\'ai besoin de mes 2 défenses ce cycle ? Une bonne attaque se prépare autant qu\'elle s\'exécute.',
          action: null,
        },
        {
          id: 'ch3-final-attack',
          highlight: '#vvt-attack-zone',
          title: 'Passer à l\'action',
          text: 'Tu as analysé la situation. Isis a 20% d\'influence sur Washington — c\'est jouable. Lance l\'attaque sur Washington DC. Confirme et observe comment ton slot se remplit.',
          action: 'click-attack-washington',
        },
        {
          id: 'ch3-done',
          highlight: null,
          title: 'Tu maîtrises l\'essentiel',
          text: 'Tu sais maintenant lire une situation, évaluer tes forces, choisir une cible et gérer tes slots. Dans la vraie app, chaque décision a un impact réel sur la carte. <strong>Bonne conquête.</strong>',
          action: 'finish-chapter',
        },
      ],
    },
  ];

  /* ─────────────────────────────────────────────────────────────
     ÉTAT
  ───────────────────────────────────────────────────────────── */
  let state = {
    chapter: 0,
    step: 0,
    selectedTerritory: null,
    attackPending: null,
    attacks: [],
    ideaExpanded: false,
  };

  /* ─────────────────────────────────────────────────────────────
     CSS
  ───────────────────────────────────────────────────────────── */
  const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&display=swap');
#vvt-root *{box-sizing:border-box;margin:0;padding:0}
#vvt-root{position:fixed;inset:0;z-index:99000;background:#030b18;display:flex;flex-direction:column;font-family:'Rajdhani',sans-serif;color:#c0cce0;overflow:hidden}

/* ── Top bar ── */
#vvt-topbar{background:#040d1c;border-bottom:1px solid #122030;padding:10px 24px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:16px}
#vvt-logo{font-size:15px;font-weight:700;letter-spacing:.2em;color:#c8a020}
#vvt-chapter-label{font-size:12px;font-family:'Share Tech Mono',monospace;color:#5a7090;letter-spacing:.06em}
#vvt-topbar-right{display:flex;align-items:center;gap:12px}
#vvt-exit-btn{background:transparent;border:1px solid #1a2840;color:#4a6080;font-family:'Rajdhani',sans-serif;font-size:12px;font-weight:600;padding:5px 14px;border-radius:6px;cursor:pointer;letter-spacing:.06em;transition:all .2s}
#vvt-exit-btn:hover{border-color:#cc3030;color:#cc3030}

/* ── Chapter progress bar ── */
#vvt-chapbar{background:#030912;border-bottom:1px solid #0c1a28;padding:10px 24px;display:flex;gap:8px;flex-shrink:0;align-items:center}
.vvt-chap-step{flex:1;height:3px;border-radius:2px;background:#0d1e30;position:relative;cursor:default;transition:background .3s}
.vvt-chap-step.done{background:#c8a020}
.vvt-chap-step.active-chapter{background:var(--chap-color,#c8a020)}
.vvt-chap-label{font-size:10px;font-family:'Share Tech Mono',monospace;color:#3a5070;min-width:80px;letter-spacing:.04em}
.vvt-chap-sep{width:1px;height:12px;background:#122030;flex-shrink:0}

/* ── Step dots ── */
#vvt-stepdots{background:#030912;padding:6px 24px 8px;display:flex;align-items:center;gap:6px;flex-shrink:0}
.vvt-dot{width:7px;height:7px;border-radius:50%;background:#0d1e30;transition:all .3s;cursor:default}
.vvt-dot.done{background:#3a5030}
.vvt-dot.active{background:var(--chap-color,#c8a020);box-shadow:0 0 6px var(--chap-color,#c8a020)}
.vvt-dot-sep{width:16px;height:1px;background:#0f1e30;flex-shrink:0}
#vvt-step-label{font-size:10px;font-family:'Share Tech Mono',monospace;color:#3a5070;margin-left:auto;letter-spacing:.04em}

/* ── Main ── */
#vvt-main{flex:1;display:flex;overflow:hidden;gap:0}

/* ── Left: god panel ── */
#vvt-god-panel{width:220px;background:#050e1c;border-right:1px solid #0c1a28;display:flex;flex-direction:column;overflow:hidden;flex-shrink:0}
#vvt-god-header{padding:16px;border-bottom:1px solid #0c1a28}
#vvt-god-avatar{width:52px;height:52px;border-radius:50%;border:2px solid;display:flex;align-items:center;justify-content:center;font-size:24px;margin:0 auto 10px;background:rgba(0,0,0,.3)}
#vvt-god-name{text-align:center;font-size:16px;font-weight:700;letter-spacing:.1em;color:#e0d0b0}
#vvt-god-faction{text-align:center;font-size:10px;font-family:'Share Tech Mono',monospace;margin-top:3px;opacity:.7}
#vvt-god-stats{display:flex;gap:8px;margin-top:12px}
.vvt-stat-box{flex:1;text-align:center;background:#040c18;border:1px solid #0d1e30;border-radius:6px;padding:6px 4px}
.vvt-stat-val{font-size:18px;font-weight:700;line-height:1}
.vvt-stat-lbl{font-size:9px;font-family:'Share Tech Mono',monospace;color:#3a5070;margin-top:2px;letter-spacing:.04em}
#vvt-terr-list{padding:10px 12px;border-bottom:1px solid #0c1a28}
#vvt-terr-list-title{font-size:10px;font-family:'Share Tech Mono',monospace;color:#3a5070;letter-spacing:.08em;margin-bottom:8px}
.vvt-terr-item{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;cursor:pointer;transition:background .2s;margin-bottom:3px}
.vvt-terr-item:hover{background:#0a1828}
.vvt-terr-item.selected{background:#0d2030}
.vvt-terr-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.vvt-terr-name{font-size:12px;color:#a0b0c0;flex:1}
.vvt-terr-pct{font-size:11px;font-family:'Share Tech Mono',monospace}
#vvt-gods-list{padding:10px 12px;flex:1;overflow-y:auto}
#vvt-gods-list-title{font-size:10px;font-family:'Share Tech Mono',monospace;color:#3a5070;letter-spacing:.08em;margin-bottom:8px}
.vvt-god-row{display:flex;align-items:center;gap:6px;padding:5px 6px;border-radius:5px;margin-bottom:2px;transition:background .2s}
.vvt-god-row.me{background:#0a1828}
.vvt-god-row-rank{font-size:10px;font-family:'Share Tech Mono',monospace;color:#2a4060;width:18px}
.vvt-god-row-icon{font-size:13px}
.vvt-god-row-name{font-size:12px;color:#8090a8;flex:1}
.vvt-god-row-name.me{color:#c8a020}
.vvt-god-row-inf{font-size:11px;font-family:'Share Tech Mono',monospace}

/* ── Center: simulation ── */
#vvt-sim{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative}
#vvt-map-zone{flex:1;position:relative;overflow:hidden}
#vvt-map-bg{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,#071428 0%,#020609 75%)}
#vvt-map-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(20,40,70,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(20,40,70,.12) 1px,transparent 1px);background-size:40px 40px}
.vvt-terr-pin{position:absolute;transform:translate(-50%,-50%);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;z-index:5}
.vvt-terr-pin-dot{width:26px;height:26px;border-radius:50%;border:2px solid;display:flex;align-items:center;justify-content:center;transition:all .2s;position:relative}
.vvt-terr-pin-dot::after{content:'';position:absolute;inset:-4px;border-radius:50%;border:1.5px solid;opacity:0;animation:vvt-ring 2.5s ease-in-out infinite}
@keyframes vvt-ring{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.4);opacity:0}}
.vvt-terr-pin:hover .vvt-terr-pin-dot,.vvt-terr-pin.selected .vvt-terr-pin-dot{transform:scale(1.25)}
.vvt-terr-pin.selected .vvt-terr-pin-dot{box-shadow:0 0 12px currentColor}
.vvt-terr-pin-label{font-size:9px;font-family:'Share Tech Mono',monospace;color:#5a7090;white-space:nowrap;letter-spacing:.04em}
.vvt-terr-pin.selected .vvt-terr-pin-label{color:#c8a020}
#vvt-dock{position:absolute;bottom:10px;left:50%;transform:translateX(-50%);background:#050e1c;border:1px solid #122030;border-radius:10px;padding:8px 16px;display:flex;align-items:center;gap:10px;z-index:10}
.vvt-slot-grp{display:flex;align-items:center;gap:6px}
.vvt-slot-lbl{font-size:9px;font-family:'Share Tech Mono',monospace;color:#2a4060;letter-spacing:.06em}
.vvt-slot{width:40px;height:40px;border-radius:7px;border:1.5px dashed #162030;display:flex;align-items:center;justify-content:center;font-size:18px;transition:all .3s}
.vvt-slot.atk-filled{border-color:#cc5050;background:rgba(204,80,80,.1);border-style:solid}
.vvt-slot.def-slot{border-color:#2a4060;border-style:dashed}
.vvt-slot.def-blocked{border-color:#601010;background:rgba(80,10,10,.1);border-style:solid;opacity:.5}
.vvt-dock-sep{width:1px;height:30px;background:#0d1e30}

/* ── Modals inside sim ── */
.vvt-modal-layer{position:absolute;inset:0;background:rgba(2,6,14,.88);display:none;align-items:center;justify-content:center;z-index:30}
.vvt-modal-layer.open{display:flex}
.vvt-modal-box{border-radius:12px;border:1px solid;padding:24px;max-width:320px;width:90%}

/* ── Right: detail + actions ── */
#vvt-right{width:240px;background:#050e1c;border-left:1px solid #0c1a28;display:flex;flex-direction:column;overflow:hidden;flex-shrink:0}
#vvt-right-tabs{display:flex;border-bottom:1px solid #0c1a28;flex-shrink:0}
.vvt-rtab{flex:1;padding:9px 4px;font-size:11px;font-family:'Share Tech Mono',monospace;text-align:center;color:#2a4060;cursor:pointer;border-bottom:2px solid transparent;transition:all .2s;letter-spacing:.04em}
.vvt-rtab.on{color:var(--chap-color,#c8a020);border-bottom-color:var(--chap-color,#c8a020)}
#vvt-territory-detail{flex:1;overflow-y:auto;padding:14px}
.vvt-detail-empty{text-align:center;padding-top:40px;font-size:11px;font-family:'Share Tech Mono',monospace;color:#2a4060;line-height:1.8}
.vvt-detail-tname{font-size:15px;font-weight:700;color:#ddd0a0;letter-spacing:.08em;margin-bottom:2px}
.vvt-detail-country{font-size:10px;font-family:'Share Tech Mono',monospace;color:#5a7090;margin-bottom:12px}
.vvt-detail-stat-row{display:flex;gap:8px;margin-bottom:10px}
.vvt-detail-stat{flex:1;background:#040c18;border:1px solid #0d1e30;border-radius:6px;padding:7px 6px;text-align:center}
.vvt-detail-stat-val{font-size:13px;font-weight:600;color:#a0b8c8}
.vvt-detail-stat-lbl{font-size:9px;font-family:'Share Tech Mono',monospace;color:#2a4060;margin-top:2px}
.vvt-inf-section{margin-bottom:12px}
.vvt-inf-title{font-size:9px;font-family:'Share Tech Mono',monospace;color:#3a5070;letter-spacing:.08em;margin-bottom:6px}
.vvt-inf-row{display:flex;align-items:center;gap:6px;margin-bottom:4px}
.vvt-inf-label{font-size:10px;font-family:'Share Tech Mono',monospace;color:#4a6080;width:56px;flex-shrink:0}
.vvt-inf-track{flex:1;height:5px;background:#0a1828;border-radius:3px;overflow:hidden}
.vvt-inf-fill{height:100%;border-radius:3px;transition:width .5s ease}
.vvt-inf-pct{font-size:10px;font-family:'Share Tech Mono',monospace;color:#5a7090;width:26px;text-align:right}
.vvt-att-btn{width:100%;margin-top:8px;padding:9px;border-radius:7px;border:1px solid #cc3030;background:rgba(204,48,48,.1);color:#cc3030;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:13px;letter-spacing:.06em;cursor:pointer;text-transform:uppercase;transition:all .2s}
.vvt-att-btn:hover{background:rgba(204,48,48,.25)}
.vvt-att-btn:disabled{opacity:.25;cursor:not-allowed}
.vvt-ally-label{width:100%;margin-top:8px;padding:7px;border-radius:6px;border:1px solid #1a3020;background:rgba(20,60,20,.1);color:#3a7040;font-size:11px;font-family:'Share Tech Mono',monospace;text-align:center;letter-spacing:.04em}

#vvt-ideas-panel{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:7px}
.vvt-idea-card{border:1px solid;border-radius:8px;padding:10px 12px;cursor:pointer;transition:all .2s}
.vvt-idea-card.bonus{border-color:#1a3020;background:rgba(20,60,30,.12)}
.vvt-idea-card.bonus:hover{border-color:#3a6030;background:rgba(20,60,30,.25)}
.vvt-idea-card.malus{border-color:#2a1010;background:rgba(80,20,20,.12)}
.vvt-idea-card.malus:hover{border-color:#6a2020;background:rgba(80,20,20,.25)}
.vvt-idea-card.empty{border-color:#0c1a28;border-style:dashed;opacity:.35;cursor:default}
.vvt-idea-top{display:flex;align-items:center;gap:8px}
.vvt-idea-ico{font-size:17px}
.vvt-idea-lbl{font-size:12px;font-weight:600;color:#b0c0d0;letter-spacing:.04em}
.vvt-idea-kind{font-size:9px;font-family:'Share Tech Mono',monospace;margin-top:3px}
.vvt-idea-card.bonus .vvt-idea-kind{color:#4db870}
.vvt-idea-card.malus .vvt-idea-kind{color:#d04040}
.vvt-idea-eff{font-size:11px;color:#5a7090;margin-top:6px;line-height:1.4;display:none}
.vvt-idea-card.open .vvt-idea-eff{display:block}
#vvt-strategy-box{padding:12px 14px;margin:10px 14px 0;border-radius:8px;border:1px solid #1a2840;background:#040c18}
#vvt-strategy-box h4{font-size:11px;font-family:'Share Tech Mono',monospace;color:#3a5070;letter-spacing:.08em;margin-bottom:8px}
.vvt-strat-q{font-size:12px;color:#7090a8;padding:4px 0;border-bottom:1px solid #0c1828;line-height:1.5}
.vvt-strat-q:last-child{border:none}
.vvt-strat-q::before{content:'? ';color:#2a4060}
#vvt-faction-btn{margin:10px 12px;padding:9px;border-radius:8px;border:1px solid;background:rgba(0,0,0,.2);font-family:'Rajdhani',sans-serif;font-weight:700;font-size:12px;letter-spacing:.08em;cursor:pointer;text-align:center;text-transform:uppercase;transition:all .2s}
#vvt-faction-btn:hover{opacity:.8}

/* ── Guide bubble ── */
#vvt-guide-anchor{position:fixed;z-index:99800;pointer-events:none;transition:top .3s,left .3s}
#vvt-bubble{background:#06101e;border:1px solid;border-radius:12px;padding:18px 20px;max-width:280px;pointer-events:all;box-shadow:0 4px 32px rgba(0,0,0,.5)}
#vvt-bubble-tag{font-size:9px;font-family:'Share Tech Mono',monospace;letter-spacing:.12em;margin-bottom:7px;opacity:.7}
#vvt-bubble-title{font-size:15px;font-weight:700;color:#e8dea8;letter-spacing:.07em;margin-bottom:9px;line-height:1.2}
#vvt-bubble-text{font-size:12.5px;color:#8090a8;line-height:1.6;margin-bottom:14px}
#vvt-bubble-text strong{font-weight:600}
#vvt-bubble-nav{display:flex;gap:8px;align-items:center}
#vvt-btn-next{flex:1;padding:8px 14px;border-radius:7px;border:1px solid;background:rgba(0,0,0,.25);font-family:'Rajdhani',sans-serif;font-weight:700;font-size:13px;letter-spacing:.06em;cursor:pointer;text-transform:uppercase;transition:all .2s}
#vvt-btn-next:hover{opacity:.8}
#vvt-btn-prev{padding:7px 12px;border-radius:7px;border:1px solid #1a2840;background:transparent;color:#3a5070;font-family:'Rajdhani',sans-serif;font-size:12px;cursor:pointer;transition:all .2s}
#vvt-btn-prev:hover{border-color:#3a5070;color:#6080a0}
.vvt-bubble-arrow{position:absolute;width:11px;height:11px;background:#06101e;border:1px solid;transform:rotate(45deg)}

/* ── Highlight ── */
.vvt-hl{outline:2px solid var(--chap-color,#c8a020) !important;outline-offset:4px;box-shadow:0 0 0 6px color-mix(in srgb,var(--chap-color,#c8a020) 12%,transparent) !important;position:relative;z-index:200}

/* ── Finish overlay ── */
#vvt-finish{position:absolute;inset:0;background:rgba(2,6,14,.95);z-index:500;display:none;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center;padding:32px}
#vvt-finish.open{display:flex}
#vvt-finish h2{font-size:26px;font-weight:700;letter-spacing:.18em;color:#c8a020}
#vvt-finish p{font-size:14px;color:#5a7090;line-height:1.7;max-width:360px}
#vvt-finish-btn{padding:12px 32px;border-radius:8px;border:1px solid #c8a020;background:rgba(200,160,32,.1);color:#c8a020;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:15px;letter-spacing:.1em;cursor:pointer;text-transform:uppercase;transition:all .2s}
#vvt-finish-btn:hover{background:rgba(200,160,32,.25)}

/* ── Attack modal ── */
#vvt-atk-modal .vvt-modal-box{border-color:#cc3030;background:#06100c}
#vvt-atk-modal h3{font-size:16px;font-weight:700;color:#e08080;letter-spacing:.1em;margin-bottom:6px;text-transform:uppercase}
#vvt-atk-modal p{font-size:13px;color:#7080a0;line-height:1.5;margin-bottom:10px}
#vvt-atk-warn{font-size:11px;font-family:'Share Tech Mono',monospace;color:#a06040;padding:7px 10px;background:rgba(160,80,20,.08);border-left:2px solid #a06040;border-radius:0 4px 4px 0;margin-bottom:14px}
#vvt-atk-confirm{width:100%;padding:10px;border-radius:7px;border:1px solid #cc3030;background:rgba(204,48,48,.12);color:#cc3030;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:14px;letter-spacing:.08em;cursor:pointer;text-transform:uppercase;transition:all .2s;margin-bottom:6px}
#vvt-atk-confirm:hover{background:rgba(204,48,48,.28)}
#vvt-atk-cancel{width:100%;padding:7px;border-radius:7px;border:1px solid #0d1e30;background:transparent;color:#4a6080;font-family:'Rajdhani',sans-serif;font-size:12px;cursor:pointer;transition:all .2s}
#vvt-atk-cancel:hover{border-color:#3a5070;color:#7090a8}

/* ── Faction modal ── */
#vvt-fac-modal .vvt-modal-box{text-align:center}
#vvt-fac-modal h3{font-size:18px;font-weight:700;letter-spacing:.12em;margin-bottom:10px;text-transform:uppercase}
#vvt-fac-modal p{font-size:13px;color:#6a8090;line-height:1.6;margin-bottom:18px}
#vvt-fac-close{padding:9px 24px;border-radius:7px;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:13px;cursor:pointer;letter-spacing:.06em;text-transform:uppercase;transition:all .2s;border:1px solid}

/* scrollbar */
#vvt-root ::-webkit-scrollbar{width:4px}
#vvt-root ::-webkit-scrollbar-track{background:#030912}
#vvt-root ::-webkit-scrollbar-thumb{background:#1a2840;border-radius:2px}
`;

  /* ─────────────────────────────────────────────────────────────
     BUILD DOM
  ───────────────────────────────────────────────────────────── */
  function build() {
    const root = document.createElement('div');
    root.id = 'vvt-root';
    root.innerHTML = `
      <div id="vvt-topbar">
        <div style="display:flex;align-items:center;gap:14px">
          <span id="vvt-logo">VAE VICTIS</span>
          <span id="vvt-chapter-label">MODE TUTORIEL</span>
        </div>
        <div id="vvt-topbar-right">
          <button id="vvt-exit-btn">✕ Quitter</button>
        </div>
      </div>
      <div id="vvt-chapbar">
        <span class="vvt-chap-label">Chapitre</span>
        ${CHAPTERS.map((ch,i)=>`
          <div class="vvt-chap-step" id="vvt-cs-${i}" style="--chap-color:${ch.color}"></div>
          ${i<CHAPTERS.length-1?'<div class="vvt-chap-sep"></div>':''}
        `).join('')}
      </div>
      <div id="vvt-stepdots"></div>
      <div id="vvt-main">
        <!-- God panel -->
        <div id="vvt-god-panel">
          <div id="vvt-god-header">
            <div id="vvt-god-avatar"></div>
            <div id="vvt-god-name"></div>
            <div id="vvt-god-faction"></div>
            <div id="vvt-god-stats">
              <div class="vvt-stat-box"><div class="vvt-stat-val" id="vvt-stat-inf"></div><div class="vvt-stat-lbl">INFLUENCE</div></div>
              <div class="vvt-stat-box"><div class="vvt-stat-val" id="vvt-stat-rank"></div><div class="vvt-stat-lbl">RANG</div></div>
            </div>
          </div>
          <div id="vvt-terr-list">
            <div id="vvt-terr-list-title">MES TERRITOIRES</div>
            <div id="vvt-terr-list-items"></div>
          </div>
          <div id="vvt-gods-list">
            <div id="vvt-gods-list-title">CLASSEMENT DIVINITÉS</div>
            <div id="vvt-gods-list-items"></div>
          </div>
        </div>

        <!-- Simulation -->
        <div id="vvt-sim">
          <div id="vvt-map-zone">
            <div id="vvt-map-bg"></div>
            <div id="vvt-map-grid"></div>
            <!-- pins injected by JS -->
            <div id="vvt-dock">
              <div class="vvt-slot-grp">
                <span class="vvt-slot-lbl">ATT</span>
                <div class="vvt-slot" id="vvt-s-a1"></div>
                <div class="vvt-slot" id="vvt-s-a2"></div>
              </div>
              <div class="vvt-dock-sep"></div>
              <div class="vvt-slot-grp">
                <span class="vvt-slot-lbl">DEF</span>
                <div class="vvt-slot def-slot" id="vvt-s-d1"></div>
                <div class="vvt-slot def-slot" id="vvt-s-d2"></div>
              </div>
            </div>
          </div>
          <!-- Attack modal -->
          <div class="vvt-modal-layer" id="vvt-atk-modal">
            <div class="vvt-modal-box">
              <h3>⚔ Attaque déclarée</h3>
              <p id="vvt-atk-desc"></p>
              <div id="vvt-atk-warn"></div>
              <button id="vvt-atk-confirm">Confirmer l'attaque</button>
              <button id="vvt-atk-cancel">Annuler</button>
            </div>
          </div>
          <!-- Faction modal -->
          <div class="vvt-modal-layer" id="vvt-fac-modal">
            <div class="vvt-modal-box">
              <h3 id="vvt-fac-title"></h3>
              <p id="vvt-fac-text"></p>
              <button id="vvt-fac-close">Retour</button>
            </div>
          </div>
          <!-- Finish -->
          <div id="vvt-finish">
            <div style="font-size:52px">⚡</div>
            <h2>Entraînement terminé</h2>
            <p>Tu maîtrises maintenant les bases de Vae Victis. Dans l'app réelle, chaque décision compte.</p>
            <button id="vvt-finish-btn">Rejoindre la vraie app</button>
          </div>
        </div>

        <!-- Right panel -->
        <div id="vvt-right">
          <div id="vvt-right-tabs">
            <div class="vvt-rtab on" id="vvt-rt-detail" onclick="vvtTab('detail')">Territoire</div>
            <div class="vvt-rtab" id="vvt-rt-ideas" onclick="vvtTab('ideas')">Idées</div>
            <div class="vvt-rtab" id="vvt-rt-strat" onclick="vvtTab('strat')">Analyse</div>
          </div>
          <div id="vvt-territory-detail"><div class="vvt-detail-empty">← Clique sur<br>un territoire</div></div>
          <div id="vvt-ideas-panel" style="display:none"></div>
          <div id="vvt-attack-zone" style="display:none;padding:12px">
            <div style="font-size:10px;font-family:'Share Tech Mono',monospace;color:#3a5070;letter-spacing:.08em;margin-bottom:8px">ACTION DISPONIBLE</div>
            <button class="vvt-att-btn" id="vvt-attack-btn-main"></button>
          </div>
          <div id="vvt-strategy-box" style="display:none">
            <h4>QUESTIONS STRATÉGIQUES</h4>
            <div class="vvt-strat-q">Quelle est mon influence sur la cible ?</div>
            <div class="vvt-strat-q">L'ennemi peut-il se défendre ?</div>
            <div class="vvt-strat-q">Ai-je besoin de mes 2 défenses ?</div>
            <div class="vvt-strat-q">Qui bénéficie le plus de cette attaque ?</div>
          </div>
          <button id="vvt-faction-btn"></button>
        </div>
      </div>

      <!-- Guide bubble -->
      <div id="vvt-guide-anchor" style="display:none">
        <div class="vvt-bubble-arrow" id="vvt-bubble-arrow"></div>
        <div id="vvt-bubble">
          <div id="vvt-bubble-tag"></div>
          <div id="vvt-bubble-title"></div>
          <div id="vvt-bubble-text"></div>
          <div id="vvt-bubble-nav">
            <button id="vvt-btn-prev">← Préc.</button>
            <button id="vvt-btn-next">Suivant →</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    // inject css
    const style = document.createElement('style');
    style.id = 'vvt-css';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  /* ─────────────────────────────────────────────────────────────
     RENDER CHAPTER
  ───────────────────────────────────────────────────────────── */
  function renderChapter(ci) {
    const ch = CHAPTERS[ci];
    const god = GODS[ch.god];
    const fc = FACTIONS[god.faction];

    // CSS var for chapter color
    document.getElementById('vvt-root').style.setProperty('--chap-color', ch.color);

    // Chapter bar
    CHAPTERS.forEach((c,i)=>{
      const el = document.getElementById('vvt-cs-'+i);
      el.classList.remove('done','active-chapter');
      if(i<ci) el.classList.add('done');
      if(i===ci) el.classList.add('active-chapter');
    });

    // God panel
    const av = document.getElementById('vvt-god-avatar');
    av.textContent = god.icon;
    av.style.borderColor = god.color;
    av.style.color = god.color;
    document.getElementById('vvt-god-name').textContent = god.name;
    const gf = document.getElementById('vvt-god-faction');
    gf.textContent = fc.label;
    gf.style.color = god.color;
    document.getElementById('vvt-stat-inf').textContent = god.influence;
    document.getElementById('vvt-stat-inf').style.color = god.color;
    document.getElementById('vvt-stat-rank').textContent = '#'+god.rank;
    document.getElementById('vvt-stat-rank').style.color = god.color;

    // Territory list
    const tli = document.getElementById('vvt-terr-list-items');
    tli.innerHTML = god.territories.map(tid=>{
      const t = TERRITORIES[tid];
      const tf = FACTIONS[t.faction];
      const myPct = t.inf[god.faction];
      return `<div class="vvt-terr-item" id="vvt-titem-${tid}" onclick="vvtClickTerritory('${tid}')">
        <div class="vvt-terr-dot" style="background:${tf.color}"></div>
        <div class="vvt-terr-name">${t.name}</div>
        <div class="vvt-terr-pct" style="color:${tf.color}">${myPct}%</div>
      </div>`;
    }).join('');

    // Gods list
    const godOrder = Object.values(GODS).sort((a,b)=>b.influence-a.influence);
    document.getElementById('vvt-gods-list-items').innerHTML = godOrder.map(g=>{
      const gfc = FACTIONS[g.faction];
      const isMe = g.id===god.id;
      return `<div class="vvt-god-row${isMe?' me':''}">
        <div class="vvt-god-row-rank">#${g.rank}</div>
        <div class="vvt-god-row-icon">${g.icon}</div>
        <div class="vvt-god-row-name${isMe?' me':''}">${g.name}</div>
        <div class="vvt-god-row-inf" style="color:${gfc.color}">${g.influence}</div>
      </div>`;
    }).join('');

    // Map pins
    const mapZone = document.getElementById('vvt-map-zone');
    mapZone.querySelectorAll('.vvt-terr-pin').forEach(el=>el.remove());
    Object.values(TERRITORIES).forEach(t=>{
      const tf = FACTIONS[t.faction];
      const pin = document.createElement('div');
      pin.className = 'vvt-terr-pin';
      pin.id = 'vvt-pin-'+t.id;
      pin.style.left = t.x+'%';
      pin.style.top  = t.y+'%';
      pin.innerHTML = `
        <div class="vvt-terr-pin-dot" style="border-color:${tf.color};color:${tf.color};background:${tf.colorDim}">
          <div style="width:9px;height:9px;border-radius:50%;background:${tf.color};opacity:.85"></div>
        </div>
        <div class="vvt-terr-pin-label">${t.name}</div>
      `;
      pin.querySelector('.vvt-terr-pin-dot').style.setProperty('color', tf.color);
      pin.onclick = ()=>vvtClickTerritory(t.id);
      mapZone.appendChild(pin);
    });

    // Ideas
    const ideas = getIdeasForGod(god.id);
    document.getElementById('vvt-ideas-panel').innerHTML = ideas.map((idea,i)=>`
      <div class="vvt-idea-card ${idea.type}" id="vvt-idea-${i}" onclick="vvtToggleIdea(${i})">
        <div class="vvt-idea-top">
          <div class="vvt-idea-ico">${idea.icon}</div>
          <div><div class="vvt-idea-lbl">${idea.label}</div><div class="vvt-idea-kind">${idea.type==='bonus'?'▲ BONUS':'▼ MALUS'}</div></div>
        </div>
        <div class="vvt-idea-eff">${idea.effect}</div>
      </div>
    `).join('');

    // Faction btn
    const factionNames = { olympien:'⚡ Experreducti', sovereign:'🔵 Grande Société', shemning:'🔴 Cercle d\'Asimov' };
    const fb = document.getElementById('vvt-faction-btn');
    fb.textContent = factionNames[god.faction];
    fb.style.borderColor = god.color+'88';
    fb.style.color = god.color;

    // Reset state
    state.selectedTerritory = null;
    state.attackPending = null;
    state.attacks = [];
    document.getElementById('vvt-territory-detail').innerHTML = '<div class="vvt-detail-empty">← Clique sur<br>un territoire</div>';
    document.getElementById('vvt-attack-zone').style.display='none';
    document.getElementById('vvt-strategy-box').style.display='none';
    resetDock();
    vvtTab('detail');
  }

  function getIdeasForGod(gid){
    const map = {
      athena:[
        {icon:'🦉',label:'Sagesse Tactique',type:'bonus',effect:'+15% efficacité défensive sur tous les territoires'},
        {icon:'🛡',label:'Égide Divine',type:'bonus',effect:'+1 défense supplémentaire par cycle'},
        {icon:'⚖',label:'Loi du Talion',type:'malus',effect:'-10% influence gagnée par attaque'},
        {type:'empty',icon:'',label:'',effect:''},
      ],
      judgment:[
        {icon:'⚖',label:'Justice Absolue',type:'bonus',effect:'+20% influence sur territoires contestés'},
        {icon:'🔒',label:'Position Défensive',type:'malus',effect:'-1 attaque disponible ce cycle'},
        {type:'empty',icon:'',label:'',effect:''},
        {type:'empty',icon:'',label:'',effect:''},
      ],
      isis:[
        {icon:'𓂀',label:'Magie Ancienne',type:'bonus',effect:'+1 attaque spéciale disponible'},
        {icon:'☽',label:'Résurrection',type:'bonus',effect:'Récupère un territoire perdu si > 40% influence'},
        {icon:'⛓',label:'Malédiction',type:'malus',effect:'-10% score défense adverse sur ta cible'},
        {type:'empty',icon:'',label:'',effect:''},
      ],
    };
    return map[gid] || [];
  }

  function resetDock(){
    ['vvt-s-a1','vvt-s-a2'].forEach(id=>{
      const el = document.getElementById(id);
      el.className='vvt-slot'; el.textContent='';
    });
    ['vvt-s-d1','vvt-s-d2'].forEach(id=>{
      const el = document.getElementById(id);
      el.className='vvt-slot def-slot'; el.textContent='';
    });
  }

  /* ─────────────────────────────────────────────────────────────
     INTERACTIONS
  ───────────────────────────────────────────────────────────── */
  window.vvtClickTerritory = function(tid) {
    const t = TERRITORIES[tid];
    if(!t) return;
    state.selectedTerritory = tid;

    // highlight pins + list items
    document.querySelectorAll('.vvt-terr-pin').forEach(el=>el.classList.remove('selected'));
    document.querySelectorAll('.vvt-terr-item').forEach(el=>el.classList.remove('selected'));
    const pin = document.getElementById('vvt-pin-'+tid);
    if(pin) pin.classList.add('selected');
    const item = document.getElementById('vvt-titem-'+tid);
    if(item) item.classList.add('selected');

    renderTerritoryDetail(t);
    vvtTab('detail');

    // step advance triggers
    const ch = CHAPTERS[state.chapter];
    const step = ch.steps[state.step];
    if(step && step.action === 'click-territory-'+tid) {
      // show attack button if needed
      if(ch.id==='judgment'||ch.id==='isis') {
        const god = GODS[ch.god];
        const isOwn = t.faction === god.faction;
        const canAtk = state.attacks.length < 2;
        if(!isOwn && canAtk) {
          document.getElementById('vvt-attack-zone').style.display='block';
          const btn = document.getElementById('vvt-attack-btn-main');
          btn.textContent = '⚔ Attaquer '+t.name;
          btn.disabled = false;
          btn.onclick = ()=>vvtOpenAttack(tid);
          btn.id='vvt-attack-btn-main';
        }
      }
      setTimeout(()=>advanceStepIfMatch('click-territory-'+tid), 400);
    }
    // auto-show attack if the next step needs it
    const next = ch.steps[state.step+1];
    if(next && (next.action==='click-attack-'+tid)) {
      const god = GODS[ch.god];
      if(t.faction!==god.faction && state.attacks.length<2){
        document.getElementById('vvt-attack-zone').style.display='block';
        const btn = document.getElementById('vvt-attack-btn-main');
        btn.textContent = '⚔ Attaquer '+t.name;
        btn.disabled=false;
        btn.onclick=()=>vvtOpenAttack(tid);
      }
    }
  };

  function renderTerritoryDetail(t) {
    const tf = FACTIONS[t.faction];
    const ch = CHAPTERS[state.chapter];
    const god = GODS[ch.god];
    const isOwn = t.faction===god.faction;
    const canAtk = state.attacks.length<2;

    document.getElementById('vvt-territory-detail').innerHTML = `
      <div class="vvt-detail-tname">${t.name}</div>
      <div class="vvt-detail-country" style="color:${tf.color}">${t.country} · ${tf.label}</div>
      <div class="vvt-detail-stat-row">
        <div class="vvt-detail-stat"><div class="vvt-detail-stat-val">${t.pop}</div><div class="vvt-detail-stat-lbl">POPULATION</div></div>
        <div class="vvt-detail-stat"><div class="vvt-detail-stat-val">${t.gdp}</div><div class="vvt-detail-stat-lbl">PIB</div></div>
      </div>
      <div class="vvt-inf-section">
        <div class="vvt-inf-title">RÉPARTITION D'INFLUENCE</div>
        ${Object.entries(t.inf).map(([f,v])=>`
          <div class="vvt-inf-row">
            <div class="vvt-inf-label">${FACTIONS[f].label.substring(0,7)}</div>
            <div class="vvt-inf-track"><div class="vvt-inf-fill" style="width:${v}%;background:${FACTIONS[f].color}"></div></div>
            <div class="vvt-inf-pct">${v}%</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  window.vvtOpenAttack = function(tid) {
    const t = TERRITORIES[tid];
    state.attackPending = tid;
    document.getElementById('vvt-atk-desc').innerHTML = `Attaque sur <strong>${t.name}</strong> (${FACTIONS[t.faction].label})`;
    const atks = state.attacks.length+1;
    document.getElementById('vvt-atk-warn').textContent = atks===2
      ? '⚠ 2 attaques ce cycle = 1 seule défense disponible.'
      : '⚠ Rappel : max 2 attaques par cycle.';
    document.getElementById('vvt-atk-modal').classList.add('open');
    advanceStepIfMatch('click-attack-'+tid);
  };

  window.vvtTab = function(tab) {
    ['detail','ideas','strat'].forEach(t=>{
      document.getElementById('vvt-rt-'+t).classList.toggle('on',t===tab);
    });
    document.getElementById('vvt-territory-detail').style.display = tab==='detail'?'block':'none';
    document.getElementById('vvt-ideas-panel').style.display      = tab==='ideas'?'flex':'none';
    if(tab==='ideas') advanceStepIfMatch('click-idea');
  };

  window.vvtToggleIdea = function(i) {
    const card = document.getElementById('vvt-idea-'+i);
    if(!card || card.classList.contains('empty')) return;
    card.classList.toggle('open');
    advanceStepIfMatch('click-idea');
  };

  /* ─────────────────────────────────────────────────────────────
     STEP ENGINE
  ───────────────────────────────────────────────────────────── */
  function advanceStepIfMatch(action) {
    const ch = CHAPTERS[state.chapter];
    const step = ch.steps[state.step];
    if(step && step.action === action) goNextStep();
  }

  function goNextStep() {
    const ch = CHAPTERS[state.chapter];
    if(state.step < ch.steps.length-1) {
      state.step++;
      renderStep();
    }
  }

  function goPrevStep() {
    if(state.step > 0) {
      state.step--;
      renderStep();
    } else if(state.chapter > 0) {
      state.chapter--;
      state.step = CHAPTERS[state.chapter].steps.length-1;
      renderChapter(state.chapter);
      renderStep();
    }
  }

  function goNext() {
    const ch = CHAPTERS[state.chapter];
    const step = ch.steps[state.step];
    // if step has an action required, don't auto-advance — user must do it
    if(step.action && step.action!==null && step.action!=='finish-chapter') return;
    if(step.action==='finish-chapter') { finishChapter(); return; }

    if(state.step < ch.steps.length-1) {
      state.step++;
      renderStep();
    } else {
      finishChapter();
    }
  }

  function finishChapter() {
    if(state.chapter < CHAPTERS.length-1) {
      state.chapter++;
      state.step=0;
      renderChapter(state.chapter);
      renderStep();
      showChapterIntro();
    } else {
      showFinish();
    }
  }

  function showChapterIntro() {
    const ch = CHAPTERS[state.chapter];
    // flash topbar
    document.getElementById('vvt-chapter-label').textContent = ch.title.toUpperCase();
  }

  function renderStep() {
    const ch = CHAPTERS[state.chapter];
    const steps = ch.steps;
    const step = steps[state.step];

    // stepdots
    const dots = document.getElementById('vvt-stepdots');
    dots.innerHTML = steps.map((s,i)=>{
      let cls='vvt-dot';
      if(i<state.step) cls+=' done';
      if(i===state.step) cls+=' active';
      return `<div class="${cls}"></div>${i<steps.length-1?'<div class="vvt-dot-sep"></div>':''}`;
    }).join('')+`<span id="vvt-step-label">${state.step+1} / ${steps.length}</span>`;

    // highlight
    document.querySelectorAll('.vvt-hl').forEach(el=>el.classList.remove('vvt-hl'));
    if(step.highlight) {
      const el = document.querySelector(step.highlight);
      if(el) el.classList.add('vvt-hl');
    }

    // strategy box
    document.getElementById('vvt-strategy-box').style.display = step.id.includes('strategy')?'block':'none';

    // bubble
    const bubble = document.getElementById('vvt-bubble');
    document.getElementById('vvt-bubble-tag').textContent = ch.subtitle.toUpperCase()+' · ÉTAPE '+(state.step+1);
    document.getElementById('vvt-bubble-tag').style.color = ch.color;
    document.getElementById('vvt-bubble-title').textContent = step.title;
    document.getElementById('vvt-bubble-text').innerHTML = step.text;
    bubble.style.borderColor = ch.color+'88';

    // next button
    const btnNext = document.getElementById('vvt-btn-next');
    const isLast = state.step===steps.length-1;
    const isFinalChapter = state.chapter===CHAPTERS.length-1;
    btnNext.style.borderColor = ch.color+'88';
    btnNext.style.color = ch.color;

    const hasAction = step.action && step.action!=='finish-chapter';
    if(hasAction) {
      btnNext.textContent = '→ Fais le geste';
      btnNext.style.opacity='.45';
      btnNext.onclick = null;
    } else if(isLast && isFinalChapter) {
      btnNext.textContent = 'Terminer ✓';
      btnNext.style.opacity='1';
      btnNext.onclick = ()=>showFinish();
    } else if(isLast) {
      btnNext.textContent = 'Chapitre suivant →';
      btnNext.style.opacity='1';
      btnNext.onclick = ()=>finishChapter();
    } else {
      btnNext.textContent = 'Suivant →';
      btnNext.style.opacity='1';
      btnNext.onclick = ()=>goNext();
    }

    // prev button
    document.getElementById('vvt-btn-prev').style.display = (state.step===0&&state.chapter===0)?'none':'block';
    document.getElementById('vvt-btn-prev').onclick = ()=>goPrevStep();

    // position bubble
    positionBubble(step.highlight);
    document.getElementById('vvt-guide-anchor').style.display='block';
  }

  function positionBubble(selector) {
    const anchor = document.getElementById('vvt-guide-anchor');
    const arrow  = document.getElementById('vvt-bubble-arrow');
    const bw=282, bh=220;
    const margin=14;

    if(!selector) {
      anchor.style.top  = '50%';
      anchor.style.left = '50%';
      anchor.style.transform = 'translate(-50%,-50%)';
      arrow.style.display='none';
      return;
    }
    anchor.style.transform='none';
    arrow.style.display='block';

    const target = document.querySelector(selector);
    if(!target) { anchor.style.display='none'; return; }
    const r = target.getBoundingClientRect();

    // Try right first, else left, else below
    let top, left, arrowPos;
    if(r.right+margin+bw < window.innerWidth) {
      left = r.right+margin;
      top  = Math.max(8, Math.min(window.innerHeight-bh-8, r.top+r.height/2-bh/2));
      arrow.style.cssText=`left:-6px;top:${Math.min(bh-20,Math.max(10,r.top+r.height/2-top-6))}px;right:auto;bottom:auto;border-right:none;border-top:none`;
    } else if(r.left-margin-bw > 0) {
      left = r.left-bw-margin;
      top  = Math.max(8, Math.min(window.innerHeight-bh-8, r.top+r.height/2-bh/2));
      arrow.style.cssText=`right:-6px;top:${Math.min(bh-20,Math.max(10,r.top+r.height/2-top-6))}px;left:auto;bottom:auto;border-left:none;border-bottom:none`;
    } else {
      top  = r.bottom+margin;
      left = Math.max(8, Math.min(window.innerWidth-bw-8, r.left+r.width/2-bw/2));
      arrow.style.cssText=`top:-6px;left:${Math.min(bw-20,Math.max(10,r.left+r.width/2-left-6))}px;bottom:auto;right:auto;border-bottom:none;border-right:none`;
    }
    anchor.style.top  = Math.max(8, top)+'px';
    anchor.style.left = Math.max(8, left)+'px';

    // arrow color match
    const ch = CHAPTERS[state.chapter];
    arrow.style.borderColor = ch.color+'88';
    arrow.style.background  = '#06101e';
  }

  function showFinish() {
    document.querySelectorAll('.vvt-hl').forEach(el=>el.classList.remove('vvt-hl'));
    document.getElementById('vvt-guide-anchor').style.display='none';
    document.getElementById('vvt-finish').classList.add('open');
    document.getElementById('vvt-cs-2').classList.add('done');
    localStorage.setItem('vvt_tuto_done','1');
  }

  /* ─────────────────────────────────────────────────────────────
     INTRO CHAPTER SPLASH
  ───────────────────────────────────────────────────────────── */
  function showChapterSplash(ci, onDone) {
    const ch = CHAPTERS[ci];
    const god = GODS[ch.god];
    const splash = document.createElement('div');
    splash.style.cssText=`position:absolute;inset:0;z-index:400;background:rgba(2,6,14,.96);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center;padding:32px;animation:vvt-ring .01s`;
    splash.innerHTML=`
      <div style="font-size:52px">${god.icon}</div>
      <div style="font-size:10px;font-family:'Share Tech Mono',monospace;color:${ch.color};letter-spacing:.18em">${ch.subtitle.toUpperCase()}</div>
      <div style="font-size:22px;font-weight:700;color:#e0d0b0;letter-spacing:.1em;max-width:420px">${ch.title}</div>
      <div style="font-size:13px;color:#6a8090;line-height:1.7;max-width:400px">${ch.intro}</div>
      <button style="margin-top:12px;padding:11px 28px;border-radius:8px;border:1px solid ${ch.color}88;background:${ch.color}18;color:${ch.color};font-family:'Rajdhani',sans-serif;font-weight:700;font-size:14px;letter-spacing:.1em;cursor:pointer;text-transform:uppercase">Commencer ce chapitre →</button>
    `;
    const sim = document.getElementById('vvt-sim');
    sim.appendChild(splash);
    splash.querySelector('button').onclick = ()=>{ splash.remove(); onDone(); };
  }

  /* ─────────────────────────────────────────────────────────────
     BIND GLOBAL EVENTS
  ───────────────────────────────────────────────────────────── */
  function bindEvents() {
    document.getElementById('vvt-exit-btn').onclick = () => {
      document.getElementById('vvt-root').remove();
      document.getElementById('vvt-css').remove();
    };
    document.getElementById('vvt-finish-btn').onclick = () => {
      document.getElementById('vvt-root').remove();
      document.getElementById('vvt-css').remove();
    };
    document.getElementById('vvt-atk-confirm').onclick = () => {
      const tid = state.attackPending;
      if(!tid) return;
      state.attacks.push(tid);
      document.getElementById('vvt-atk-modal').classList.remove('open');
      // fill slot
      const slotId = state.attacks.length===1?'vvt-s-a1':'vvt-s-a2';
      const slot = document.getElementById(slotId);
      slot.className='vvt-slot atk-filled'; slot.textContent='⚔';
      if(state.attacks.length===2){
        document.getElementById('vvt-s-d2').className='vvt-slot def-slot def-blocked';
      }
      document.getElementById('vvt-attack-zone').style.display='none';
      advanceStepIfMatch('click-confirm-attack');
    };
    document.getElementById('vvt-atk-cancel').onclick = () => {
      document.getElementById('vvt-atk-modal').classList.remove('open');
    };
    document.getElementById('vvt-faction-btn').onclick = () => {
      const ch = CHAPTERS[state.chapter];
      const god = GODS[ch.god];
      const names = { olympien:'Experreducti', sovereign:'Grande Société', shemning:'Cercle d\'Asimov'};
      const descs = {
        olympien:'Le conseil secret des Olympiens. Accès à des actions exclusives, négociations et archives de faction.',
        sovereign:'L\'organisation économique Sovereign. Marchés noirs, contrats diplomatiques et leviers financiers.',
        shemning:'Le cercle mystique de Shemning. Rituels, malédictions et accès aux coulisses des événements mondiaux.',
      };
      const modal = document.getElementById('vvt-fac-modal');
      const box = modal.querySelector('.vvt-modal-box');
      document.getElementById('vvt-fac-title').textContent = names[god.faction];
      document.getElementById('vvt-fac-text').textContent  = descs[god.faction];
      box.style.borderColor = god.color+'88';
      document.getElementById('vvt-fac-title').style.color = god.color;
      document.getElementById('vvt-fac-close').style.borderColor = god.color+'88';
      document.getElementById('vvt-fac-close').style.color = god.color;
      document.getElementById('vvt-fac-close').style.background = god.color+'15';
      modal.classList.add('open');
      advanceStepIfMatch('click-faction');
    };
    document.getElementById('vvt-fac-close').onclick = () => {
      document.getElementById('vvt-fac-modal').classList.remove('open');
    };
  }

  /* ─────────────────────────────────────────────────────────────
     LAUNCH
  ───────────────────────────────────────────────────────────── */
  function launch() {
    if(document.getElementById('vvt-root')) return;
    build();
    bindEvents();
    state = { chapter:0, step:0, selectedTerritory:null, attackPending:null, attacks:[], ideaExpanded:false };
    renderChapter(0);
    showChapterSplash(0, ()=>renderStep());
  }

  /* Bouton ? permanent */
  function addBtn() {
    if(document.getElementById('vvt-open-btn')) return;
    const btn = document.createElement('button');
    btn.id='vvt-open-btn';
    btn.title='Tutoriel interactif';
    btn.textContent='?';
    btn.style.cssText='position:fixed;bottom:20px;right:20px;z-index:98000;width:44px;height:44px;border-radius:50%;background:#040d1c;border:1.5px solid #c8a020;color:#c8a020;font-family:"Rajdhani",sans-serif;font-weight:700;font-size:22px;cursor:pointer;box-shadow:0 0 16px rgba(200,160,32,.25);transition:all .2s';
    btn.onmouseenter=()=>btn.style.background='rgba(200,160,32,.15)';
    btn.onmouseleave=()=>btn.style.background='#040d1c';
    btn.onclick=launch;
    document.body.appendChild(btn);
  }

  function init() {
    addBtn();
    if(!localStorage.getItem('vvt_tuto_done')) setTimeout(launch,900);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();

  window.VVTutorial = { launch };
})();
