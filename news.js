/* ============================================================
   VAE VICTIS — news.js
   Le Fil du Monde — Journal géopolitique RP
   Modal plein écran, données depuis Google Sheets
   ============================================================ */

'use strict';

const NEWS_CFG = {
  SHEET_ID: '1L9hbQuAD9A4WQFG1G47teZlUPM6-JkMmuuX2Ys-TYt8',
  GID:      '815680199',
};

let newsData     = [];
let newsFilter   = 'tous';
let newsSelId    = null;

const CAT_STYLES = {
  politique:  { bg:'#e6f1fb', color:'#185fa5', border:'#378add44', label:'Politique' },
  conflit:    { bg:'#fcebeb', color:'#a32d2d', border:'#e24b4a44', label:'Conflit' },
  culture:    { bg:'#faeeda', color:'#854f0b', border:'#ba751744', label:'Culture' },
  economie:   { bg:'#eaf3de', color:'#3b6d11', border:'#63992244', label:'Économie' },
  religion:   { bg:'#eeedfe', color:'#534ab7', border:'#7f77dd44', label:'Religion' },
  science:    { bg:'#e1f5ee', color:'#0f6e56', border:'#1d9e7544', label:'Science' },
  diplomatie: { bg:'#fbeaf0', color:'#993556', border:'#d4537e44', label:'Diplomatie' },
  analyse:    { bg:'#f1efe8', color:'#5f5e5a', border:'#88878044', label:'Analyse' },
  breaking:   { bg:'#fcebeb', color:'#a32d2d', border:'#e24b4a44', label:'Breaking' },
};

function getCatStyle(cat) {
  return CAT_STYLES[(cat||'').toLowerCase().trim()] || { bg:'var(--color-background-secondary)', color:'var(--color-text-secondary)', border:'var(--color-border-tertiary)', label: cat||'Divers' };
}

// ---- FETCH -------------------------------------------------
async function loadNews() {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${NEWS_CFG.SHEET_ID}/gviz/tq?tqx=out:json&gid=${NEWS_CFG.GID}`;
    const r   = await fetch(url);
    const raw = await r.text();
    const m   = raw.match(/setResponse\(([\s\S]*)\)/);
    if (!m) return;
    const data = JSON.parse(m[1]);
    const cols = data.table.cols.map(c => (c.label||'').trim());
    newsData = (data.table.rows||[]).map(r =>
      Object.fromEntries(cols.map((col,i) => [col, String(r?.c?.[i]?.v??'').trim()]))
    ).filter(r => r.id && r.titre);
    console.log('[VV News] Chargé:', newsData.length, 'articles');
  } catch(e) {
    console.warn('[VV News]', e);
  }
}

// ---- OPEN --------------------------------------------------
async function openNews() {
  let modal = document.getElementById('news-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'news-modal';
    document.body.appendChild(modal);
  }

  modal.style.cssText = `
    position:fixed;inset:0;z-index:3000;
    background:rgba(0,2,8,.92);
    backdrop-filter:blur(6px);
    display:flex;align-items:center;justify-content:center;
    padding:20px;
    animation:news-fade .3s ease;
  `;

  if (!document.getElementById('news-style')) {
    const s = document.createElement('style');
    s.id = 'news-style';
    s.textContent = `
      @keyframes news-fade { from{opacity:0} to{opacity:1} }
      @keyframes news-slide { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
      .news-card { cursor:pointer; transition:transform .15s,box-shadow .15s; }
      .news-card:hover { transform:translateY(-2px); box-shadow:0 4px 20px rgba(0,0,0,.3); }
      .news-filter-btn { cursor:pointer; transition:all .12s; }
      .news-filter-btn:hover { opacity:.8; }
      .news-filter-btn.active { font-weight:600 !important; }
      #news-article-panel { animation:news-slide .25s ease; }
    `;
    document.head.appendChild(s);
  }

  // Show loading
  modal.innerHTML = `<div style="color:#cfe4f7;font-family:Rajdhani,sans-serif;font-size:13px;letter-spacing:.1em">Chargement…</div>`;

  await loadNews();
  newsSelId = null;
  newsFilter = 'tous';
  renderNewsModal();
}

function closeNews() {
  const modal = document.getElementById('news-modal');
  if (modal) modal.style.display = 'none';
}

// ---- RENDER MODAL ------------------------------------------
function renderNewsModal() {
  const modal = document.getElementById('news-modal');
  if (!modal) return;

  // Filter data
  const filtered = newsFilter === 'tous'
    ? newsData
    : newsData.filter(n => (n.categorie||'').toLowerCase() === newsFilter);

  // Une article
  const une = filtered.find(n => n.une === '1' || n.une?.toLowerCase() === 'true' || n.une === 'TRUE') || filtered[0];

  // Categories for filter
  const cats = ['tous', ...new Set(newsData.map(n => (n.categorie||'').toLowerCase()).filter(Boolean))];

  const currentYear = new Date().getFullYear();

  modal.innerHTML = `
    <div style="
      width:100%;max-width:1100px;height:88vh;
      background:#04080f;
      border:1px solid #1a2e4a;border-radius:12px;
      display:flex;flex-direction:column;
      overflow:hidden;
      position:relative;
    ">
      <!-- Ligne déco haut -->
      <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#3a7acc,#c8901a,#b02828,transparent);border-radius:12px 12px 0 0"></div>

      <!-- HEADER -->
      <div style="padding:14px 22px 12px;border-bottom:1px solid #1a2e4a;display:flex;align-items:center;gap:16px;flex-shrink:0;background:#04080f">
        <div>
          <div style="font-family:Cinzel,serif;font-size:18px;font-weight:700;color:#cfe4f7;letter-spacing:.1em">LE FIL DU MONDE</div>
          <div style="font-size:10px;color:#3a5a7a;letter-spacing:.12em;text-transform:uppercase;margin-top:2px">Chroniques géopolitiques · Univers Vae Victis</div>
        </div>
        <div style="height:30px;width:1px;background:#1a2e4a;margin:0 4px"></div>
        <!-- Filtres -->
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          ${cats.map(cat => {
            const st = cat === 'tous' ? null : getCatStyle(cat);
            const isActive = newsFilter === cat;
            return `<span class="news-filter-btn${isActive?' active':''}" onclick="newsSetFilter('${cat}')"
              style="font-size:11px;padding:3px 10px;border-radius:5px;font-family:Rajdhani,sans-serif;font-weight:${isActive?'700':'500'};
              letter-spacing:.05em;
              background:${isActive?(st?st.bg:'#1a2e4a'):'transparent'};
              color:${isActive?(st?st.color:'#cfe4f7'):'#3a5a7a'};
              border:1px solid ${isActive?(st?st.border:'#2a4a6a'):'transparent'};
              text-transform:capitalize">
              ${cat === 'tous' ? 'Tous' : (st?.label||cat)}
            </span>`;
          }).join('')}
        </div>
        <button onclick="closeNews()" style="margin-left:auto;background:none;border:1px solid #1a2e4a;border-radius:6px;color:#3a5a7a;padding:5px 12px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:11px;font-weight:600;letter-spacing:.06em;transition:all .12s" onmouseover="this.style.borderColor='#2a4a6a';this.style.color='#cfe4f7'" onmouseout="this.style.borderColor='#1a2e4a';this.style.color='#3a5a7a'">FERMER</button>
      </div>

      <!-- CORPS -->
      <div style="flex:1;display:grid;grid-template-columns:${newsSelId?'1fr 400px':'1fr'};overflow:hidden;min-height:0">

        <!-- LISTE ARTICLES -->
        <div style="overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:10px;scrollbar-width:thin;scrollbar-color:#1a2e4a transparent">
          ${filtered.length === 0
            ? `<div style="text-align:center;color:#2a4a6a;font-family:Rajdhani,sans-serif;font-size:13px;padding:40px">Aucun article pour cette catégorie</div>`
            : ''
          }

          ${une ? renderUneCard(une) : ''}

          ${filtered.length > 1 ? `
            <div style="display:grid;grid-template-columns:repeat(${newsSelId?'2':'3'},1fr);gap:10px">
              ${filtered.filter(n => n.id !== une?.id).slice(0,6).map(n => renderSmallCard(n)).join('')}
            </div>
          ` : ''}

          ${filtered.filter(n => n.id !== une?.id).slice(6).map(n => renderTextCard(n)).join('')}
        </div>

        <!-- ARTICLE OUVERT -->
        ${newsSelId ? `<div id="news-article-panel" style="border-left:1px solid #1a2e4a;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#1a2e4a transparent">
          ${renderArticleDetail(newsSelId)}
        </div>` : ''}
      </div>

      <!-- FOOTER -->
      <div style="padding:7px 22px;border-top:1px solid #1a2e4a;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;background:#040810">
        <div style="font-size:9px;color:#1a2e4a;font-family:Rajdhani,sans-serif;letter-spacing:.06em">${newsData.length} articles · Données en direct · Vae Victis ${currentYear}</div>
        <button onclick="loadNews().then(renderNewsModal)" style="background:none;border:1px solid #1a2e4a;border-radius:4px;color:#3a5a7a;padding:3px 10px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:10px" onmouseover="this.style.color='#c8901a'" onmouseout="this.style.color='#3a5a7a'">⟳ ACTUALISER</button>
      </div>
    </div>
  `;

  // Click outside
  modal.onclick = e => { if (e.target === modal) closeNews(); };
}

// ---- CARD RENDERERS ----------------------------------------
function renderUneCard(n) {
  const st = getCatStyle(n.categorie);
  const isActive = newsSelId === n.id;
  return `
    <div class="news-card" onclick="newsOpenArticle('${n.id}')"
      style="background:${isActive?'#0a1628':'#080f1a'};border:1px solid ${isActive?'#2a4a6a':'#1a2e4a'};border-radius:10px;overflow:hidden;display:grid;grid-template-columns:1fr ${n.image_url?'280px':'0px'}">
      <div style="padding:18px 20px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">
          ${n.une==='1'||n.une?.toLowerCase()==='true'||n.une==='TRUE'?`<span style="font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;background:#fcebeb;color:#a32d2d;border:1px solid #e24b4a44;letter-spacing:.06em">UNE</span>`:''}
          <span style="font-size:10px;padding:3px 8px;border-radius:4px;background:${st.bg};color:${st.color};border:1px solid ${st.border}">${st.label}</span>
          ${n.nom?`<span style="font-size:11px;color:#3a5a7a">Par <span style="color:#6a8aaa">${n.nom}</span></span>`:''}
          <span style="font-size:11px;color:#2a4a6a;margin-left:auto">${n.date_rp||''} · Acte ${n.acte||'?'}</span>
        </div>
        <div style="font-family:Cinzel,Rajdhani,sans-serif;font-size:17px;font-weight:700;color:#cfe4f7;line-height:1.35;margin-bottom:10px">${n.titre}</div>
        <div style="font-size:12px;color:#5a7a9a;line-height:1.6;margin-bottom:14px">${n.resume||''}</div>
        <span style="font-size:11px;color:#3a7acc;font-family:Rajdhani,sans-serif;font-weight:600">Lire l'article →</span>
      </div>
      ${n.image_url?`<div style="background:#0a1628;overflow:hidden;border-left:1px solid #1a2e4a">
        <img src="${n.image_url}" style="width:100%;height:100%;object-fit:cover;opacity:.85" onerror="this.style.display='none'">
      </div>`:''}
    </div>
  `;
}

function renderSmallCard(n) {
  const st = getCatStyle(n.categorie);
  const isActive = newsSelId === n.id;
  return `
    <div class="news-card" onclick="newsOpenArticle('${n.id}')"
      style="background:${isActive?'#0a1628':'#080f1a'};border:1px solid ${isActive?'#2a4a6a':'#1a2e4a'};border-radius:8px;overflow:hidden">
      ${n.image_url?`<div style="height:90px;overflow:hidden;border-bottom:1px solid #1a2e4a">
        <img src="${n.image_url}" style="width:100%;height:100%;object-fit:cover;opacity:.8" onerror="this.style.display='none'">
      </div>`:`<div style="height:60px;background:#0a1628;border-bottom:1px solid #1a2e4a;display:flex;align-items:center;justify-content:center">
        <i class="ti ti-news" style="font-size:20px;color:#1a2e4a"></i>
      </div>`}
      <div style="padding:10px 12px">
        <div style="display:flex;gap:5px;margin-bottom:7px;align-items:center">
          <span style="font-size:9px;padding:2px 6px;border-radius:3px;background:${st.bg};color:${st.color};border:1px solid ${st.border}">${st.label}</span>
          <span style="font-size:9px;color:#2a4a6a;margin-left:auto">Acte ${n.acte||'?'}</span>
        </div>
        <div style="font-size:12px;font-weight:600;color:#cfe4f7;line-height:1.35;margin-bottom:5px">${n.titre}</div>
        <div style="font-size:10px;color:#3a5a7a;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${n.resume||''}</div>
        <div style="font-size:10px;color:#2a4a6a;margin-top:6px">${n.date_rp||''}</div>
      </div>
    </div>
  `;
}

function renderTextCard(n) {
  const st = getCatStyle(n.categorie);
  const isActive = newsSelId === n.id;
  return `
    <div class="news-card" onclick="newsOpenArticle('${n.id}')"
      style="background:${isActive?'#0a1628':'#080f1a'};border:1px solid ${isActive?'#2a4a6a':'#1a2e4a'};border-radius:8px;padding:12px 16px;display:flex;gap:14px;align-items:flex-start">
      <div style="flex:1;min-width:0">
        <div style="display:flex;gap:7px;margin-bottom:6px;align-items:center">
          <span style="font-size:9px;padding:2px 6px;border-radius:3px;background:${st.bg};color:${st.color};border:1px solid ${st.border}">${st.label}</span>
          ${n.nom?`<span style="font-size:10px;color:#3a5a7a">${n.nom}</span>`:''}
        </div>
        <div style="font-size:13px;font-weight:600;color:#cfe4f7;margin-bottom:4px;line-height:1.3">${n.titre}</div>
        <div style="font-size:11px;color:#3a5a7a;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${n.resume||''}</div>
      </div>
      <div style="font-size:10px;color:#2a4a6a;white-space:nowrap;padding-top:3px;font-family:Rajdhani,sans-serif">${n.date_rp||''}<br>Acte ${n.acte||'?'}</div>
    </div>
  `;
}

function renderArticleDetail(id) {
  const n = newsData.find(x => x.id === id);
  if (!n) return '';
  const st = getCatStyle(n.categorie);
  return `
    <div style="padding:20px">
      <button onclick="newsCloseArticle()" style="background:none;border:none;color:#3a5a7a;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:11px;font-weight:600;letter-spacing:.06em;padding:0;margin-bottom:16px;display:flex;align-items:center;gap:5px" onmouseover="this.style.color='#cfe4f7'" onmouseout="this.style.color='#3a5a7a'">
        ← RETOUR
      </button>

      ${n.image_url?`<div style="width:100%;height:160px;border-radius:8px;overflow:hidden;margin-bottom:16px;border:1px solid #1a2e4a">
        <img src="${n.image_url}" style="width:100%;height:100%;object-fit:cover;opacity:.9" onerror="this.parentElement.style.display='none'">
      </div>`:''}

      <div style="display:flex;gap:7px;margin-bottom:12px;flex-wrap:wrap;align-items:center">
        ${n.une==='1'||n.une?.toLowerCase()==='true'||n.une==='TRUE'?`<span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:3px;background:#fcebeb;color:#a32d2d;border:1px solid #e24b4a44">UNE</span>`:''}
        <span style="font-size:10px;padding:2px 7px;border-radius:3px;background:${st.bg};color:${st.color};border:1px solid ${st.border}">${st.label}</span>
      </div>

      <div style="font-family:Cinzel,Rajdhani,sans-serif;font-size:16px;font-weight:700;color:#cfe4f7;line-height:1.35;margin-bottom:10px">${n.titre}</div>

      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #1a2e4a">
        ${n.nom?`<div style="width:28px;height:28px;border-radius:50%;background:#0a1628;border:1px solid #1a2e4a;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#3a7acc;flex-shrink:0">${n.nom.slice(0,2).toUpperCase()}</div>`:''}
        <div>
          ${n.nom?`<div style="font-size:11px;font-weight:600;color:#6a8aaa">${n.nom}</div>`:''}
          <div style="font-size:10px;color:#2a4a6a">${n.date_rp||''} · Acte ${n.acte||'?'}</div>
        </div>
      </div>

      ${n.resume?`<div style="font-size:13px;color:#7a9aaa;line-height:1.7;margin-bottom:14px;font-style:italic;padding-left:12px;border-left:2px solid #1a3a5a">${n.resume}</div>`:''}

      ${n.article?`<div style="font-size:12px;color:#5a7a9a;line-height:1.8;white-space:pre-wrap">${n.article}</div>`
        :`<div style="font-size:11px;color:#2a4a6a;text-align:center;padding:20px;font-style:italic">Article complet non disponible</div>`}
    </div>
  `;
}

// ---- ACTIONS -----------------------------------------------
function newsSetFilter(cat) {
  newsFilter = cat;
  newsSelId = null;
  renderNewsModal();
}

function newsOpenArticle(id) {
  newsSelId = newsSelId === id ? null : id;
  renderNewsModal();
}

function newsCloseArticle() {
  newsSelId = null;
  renderNewsModal();
}

// ---- EXPORTS -----------------------------------------------
window.openNews          = openNews;
window.closeNews         = closeNews;
window.newsSetFilter     = newsSetFilter;
window.newsOpenArticle   = newsOpenArticle;
window.newsCloseArticle  = newsCloseArticle;
