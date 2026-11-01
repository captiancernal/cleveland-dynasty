import { CONFIG, TEAMS, ROUND_SHORT } from './config.js';
import { N } from './data.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- formatting ----------
export const rate = (v, d = 3) => {
  const n = typeof v === 'number' ? v : N(v);
  if (n === null || n === undefined || Number.isNaN(n)) return '';
  const s = n.toFixed(d);
  return n < 1 && n >= 0 && d === 3 ? s.replace(/^0/, '') : s;
};
export const dec = (v, d = 2) => { const n = typeof v === 'number' ? v : N(v); return n === null || Number.isNaN(n) ? '' : n.toFixed(d); };
export const int = v => { const n = typeof v === 'number' ? v : N(v); return n === null ? '' : Math.round(n).toLocaleString('en-US'); };
export const money = v => { const n = N(v); if (n === null) return ''; return n >= 1e6 ? `$${(n / 1e6).toFixed(2).replace(/\.?0+$/, '')}M` : `$${n.toLocaleString('en-US')}`; };
export const ordinal = n => { n = N(n); if (n === null) return ''; const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
export const fmtDate = d => { if (!d) return ''; const t = new Date(d + 'T12:00:00'); return Number.isNaN(+t) ? d : t.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };
export const roundShort = r => ROUND_SHORT[r] || r;
export const isCLE = team => team === CONFIG.franchise || team === 'CLE' || team === 'Guardians';

// ---------- links ----------
export const playerHref = id => `#/player/${id}`;
export function playerLink(db, id, name) {
  const p = db.players[id];
  const label = esc(name || p?.name || id);
  return id && p ? `<a href="${playerHref(id)}">${label}</a>` : label;
}
// Link a name like "Cam Schlittler" when it matches exactly one player.
export function nameLink(db, name) {
  if (!name) return '';
  db._nameIdx ||= Object.values(db.players).reduce((m, p) => { (m[p.name.toLowerCase()] ||= []).push(p.id); return m; }, {});
  const ids = db._nameIdx[name.toLowerCase()];
  return ids && ids.length === 1 ? `<a href="${playerHref(ids[0])}">${esc(name)}</a>` : esc(name);
}

// ---------- images ----------
export function headshotUrl(mlbam, w = 213) {
  const id = N(mlbam) || 0;
  return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_${w},q_auto:best/v1/people/${id}/headshot/67/current`;
}
export function headshot(db, id, cls = 'hs') {
  const p = db.players[id];
  return `<img class="${cls}" loading="lazy" src="${headshotUrl(p?.mlbam)}" alt="${esc(p?.name || '')}">`;
}
export function teamLogoUrl(team, variant = '') {
  const t = TEAMS[team]; if (!t) return '';
  return variant ? `https://www.mlbstatic.com/team-logos/${variant}/${t.id}.svg` : `https://www.mlbstatic.com/team-logos/${t.id}.svg`;
}
export function logo(team, size = 20, variant = '') {
  const src = teamLogoUrl(team, variant);
  if (!src) return '';
  const onerr = '';
  if (isCLE(team) && CONFIG.franchiseLogoOverride) {
    return `<img class="logo cle-logo" src="${esc(CONFIG.franchiseLogoOverride)}" data-fallback="${src}" onerror="this.onerror=null;this.src=this.dataset.fallback" width="${size}" height="${size}" alt="${esc(team)}" loading="lazy">`;
  }
  return `<img class="logo" src="${src}" width="${size}" height="${size}" alt="${esc(team)}" loading="lazy"${onerr}>`;
}
export const team = (name, size = 18) => name ? `<span class="team">${logo(name, size)}<span>${esc(name)}</span></span>` : '';
export const teamAbbr = name => TEAMS[name]?.abbr || name;

export const driveThumb = (id, w = 640) => `https://lh3.googleusercontent.com/d/${id}=w${w}`;
export const driveVideo = id => `https://drive.google.com/file/d/${id}/preview`;
// Video poster that swaps in the Drive player on click (fast pages, no black boxes).
export const videoPlayer = (id, title = '') => `<div class="video-frame"><button class="vposter" data-video="${esc(id)}" aria-label="Play ${esc(title)}"><img loading="lazy" src="${driveThumb(id, 1280)}" alt=""><span class="play" aria-hidden="true"></span></button></div>`;
export function bindVideos(root) {
  root.addEventListener('click', e => {
    const b = e.target.closest('.vposter'); if (!b) return;
    b.outerHTML = `<iframe src="${driveVideo(b.dataset.video)}" allow="autoplay; fullscreen" allowfullscreen title="Video"></iframe>`;
  });
}

// ---------- layout pieces ----------
export function section(id, title, body, extra = '') {
  return `<section class="box" id="${id}"><div class="box-h"><h2>${esc(title)}</h2>${extra}</div><div class="box-b">${body}</div></section>`;
}
export function pageNav(items) {
  return `<nav class="onpage"><span>On this page:</span>${items.filter(Boolean).map(([id, label]) => `<a href="#" data-jump="${id}">${esc(label)}</a>`).join('')}</nav>`;
}
export const empty = msg => `<p class="muted">${esc(msg)}</p>`;
export const pill = (txt, cls = '') => `<span class="pill ${cls}">${esc(txt)}</span>`;

/**
 * Sortable B-Ref style table.
 * cols: [{ k, label, title, fmt(row) -> html, sort(row) -> value, cls, num }]
 */
export function table(cols, rows, { foot = [], cls = '', rowCls, caption, id } = {}) {
  if (!rows.length && !foot.length) return empty('No data yet.');
  const val = (c, r) => (c.fmt ? c.fmt(r) : esc(r[c.k] ?? ''));
  const sortVal = (c, r) => {
    const v = c.sort ? c.sort(r) : r[c.k];
    if (v === null || v === undefined || v === '') return '';
    return v;
  };
  const th = cols.map((c, i) => `<th data-i="${i}" class="${c.num ? 'num' : ''} ${c.cls || ''}" ${c.title ? `title="${esc(c.title)}"` : ''}>${esc(c.label)}</th>`).join('');
  const tr = r => `<tr class="${rowCls ? rowCls(r) : ''}">${cols.map(c => `<td class="${c.num ? 'num' : ''} ${c.cls || ''}" data-v="${esc(sortVal(c, r))}">${val(c, r)}</td>`).join('')}</tr>`;
  const tf = foot.map(r => `<tr>${cols.map(c => `<td class="${c.num ? 'num' : ''} ${c.cls || ''}">${val(c, r)}</td>`).join('')}</tr>`).join('');
  return `<div class="tbl-wrap"><table class="stats ${cls}" ${id ? `id="${id}"` : ''}>${caption ? `<caption>${esc(caption)}</caption>` : ''}<thead><tr>${th}</tr></thead><tbody>${rows.map(tr).join('')}</tbody>${tf ? `<tfoot>${tf}</tfoot>` : ''}</table></div>`;
}

// Click-to-sort for every .stats table (delegated once).
export function enableSorting(root) {
  root.addEventListener('click', e => {
    const th = e.target.closest('table.stats thead th');
    if (!th) return;
    const tableEl = th.closest('table');
    const i = [...th.parentNode.children].indexOf(th);
    const tbody = tableEl.tBodies[0];
    const dir = th.dataset.dir === 'desc' ? 'asc' : 'desc';
    tableEl.querySelectorAll('thead th').forEach(x => delete x.dataset.dir);
    th.dataset.dir = dir;
    const rows = [...tbody.rows];
    rows.sort((a, b) => {
      const av = a.cells[i]?.dataset.v ?? '', bv = b.cells[i]?.dataset.v ?? '';
      if (av === '' && bv !== '') return 1;
      if (bv === '' && av !== '') return -1;
      const an = Number(av), bn = Number(bv);
      const cmp = !Number.isNaN(an) && !Number.isNaN(bn) ? an - bn : String(av).localeCompare(String(bv));
      return dir === 'asc' ? cmp : -cmp;
    });
    rows.forEach(r => tbody.appendChild(r));
  });
}

// ---------- media ----------
export function mediaCard(db, h, { big = false } = {}) {
  const cover = db.media[h.cover_media_id] || (db.mediaByHighlight[h.highlight_id] || [])[0];
  const img = cover ? `<img loading="lazy" src="${driveThumb(cover.drive_file_id, big ? 960 : 480)}" alt="">` : '';
  const isVid = cover?.media_type === 'video';
  const sub = [h.year, h.round ? `${roundShort(h.round)}${h.game ? ` G${h.game}` : ''}` : (h.phase === 'regular_season' ? 'Regular season' : ''), h.opponent ? `vs ${h.opponent}` : ''].filter(Boolean).join(' · ');
  return `<a class="hl-card${big ? ' big' : ''}" href="#/highlight/${h.highlight_id}"><div class="hl-thumb">${img}${isVid ? '<span class="play" aria-hidden="true"></span>' : ''}</div><div class="hl-meta"><strong>${esc(h.title)}</strong><span>${esc(sub)}</span></div></a>`;
}

export function pennant(year, label = 'World Series Champions') {
  return `<div class="pennant" title="${esc(year)} ${esc(label)}"><span class="p-year">${esc(year)}</span><span class="p-label">${esc(label)}</span></div>`;
}
