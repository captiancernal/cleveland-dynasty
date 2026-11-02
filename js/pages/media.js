import { CONFIG } from '../config.js';
import { N } from '../data.js';
import { esc, section, empty, mediaCard, mediaSrc, videoPlayer, playerLink, headshot, roundShort, logo } from '../ui.js';

export function highlightsIndex(db) {
  const hs = Object.values(db.highlights).sort((a, b) => N(b.year) - N(a.year) || b.highlight_id.localeCompare(a.highlight_id));
  const byYear = {}; for (const h of hs) (byYear[h.year] ||= []).push(h);
  const photos = db.T.highlight_media.length;
  return `<h1>Highlights &amp; Media</h1><p class="lede">${hs.length} moments · ${photos} videos and photos.</p>
    ${Object.entries(byYear).sort((a, b) => N(b[0]) - N(a[0])).map(([y, list]) => section(`y${y}`, y, `<div class="hl-grid">${list.map(h => mediaCard(db, h)).join('')}</div>`)).join('') || empty('No highlights yet.')}`;
}

export function highlightPage(db, hid) {
  const h = db.highlights[hid];
  if (!h) return empty('Highlight not found.');
  const media = db.mediaByHighlight[hid] || [];
  const videos = media.filter(m => m.media_type === 'video');
  const photos = media.filter(m => m.media_type !== 'video');
  const tags = db.tagsByHighlight[hid] || [];
  const whole = tags.filter(t => !t.media_id);
  const game = h.round ? db.games.find(g => N(g.year) === N(h.year) && g.round === h.round && N(g.game) === N(h.game)) : null;
  const ctx = [h.year && `<a href="#/season/${h.year}">${esc(h.year)}</a>`, h.round && `<a href="#/series/${h.year}/${encodeURIComponent(h.round)}">${esc(h.round)}</a>`, h.game && (game ? `<a href="#/game/${db.gameKey(game)}">Game ${esc(h.game)}</a>` : `Game ${esc(h.game)}`), h.opponent && `vs ${logo(h.opponent, 16)} ${esc(h.opponent)}`].filter(Boolean).join(' · ');
  const tagChips = list => list.map(t => `<a class="tag-chip" href="#/player/${t.player_id}">${headshot(db, t.player_id, 'hs-xs')}${esc(db.players[t.player_id]?.name || t.player)}</a>`).join('');
  const vids = videos.map(v => `<figure class="video-fig">${videoPlayer(v.drive_file_id, v.caption)}<figcaption>${esc(v.caption)} <a href="${esc(v.url)}" target="_blank" rel="noopener">Open in Drive</a></figcaption></figure>`).join('');
  const gal = photos.map((p, i) => {
    const pt = tags.filter(t => t.media_id === p.media_id);
    return `<figure class="photo"><button class="ph-btn" data-lightbox="${i}" aria-label="Open photo"><img loading="lazy" src="${mediaSrc(p, 720)}" alt="${esc(p.caption)}"></button><figcaption>${esc(p.caption)}${pt.length ? `<div class="tags">${tagChips(pt)}</div>` : ''}</figcaption></figure>`;
  }).join('');
  const lbData = esc(JSON.stringify(photos.map(p => ({ src: mediaSrc(p, 2000), cap: p.caption }))));
  return `<div class="crumbs"><a href="#/highlights">Highlights</a></div>
    <h1>${esc(h.title)}</h1><p class="meta">${ctx}</p>
    ${whole.length ? `<div class="tags big">${tagChips(whole)}</div>` : ''}
    ${vids}
    <p class="hl-desc">${esc(h.description)}</p>
    ${photos.length ? section('photos', 'Photos', `<div class="gallery" data-lb='${lbData}'>${gal}</div>`) : ''}`;
}

// Lightbox for any .gallery on the page.
export function bindLightbox(root) {
  root.querySelectorAll('.gallery').forEach(g => {
    const items = JSON.parse(g.dataset.lb || '[]');
    g.addEventListener('click', e => {
      const b = e.target.closest('[data-lightbox]'); if (!b) return;
      open(items, Number(b.dataset.lightbox));
    });
  });
}
function open(items, start) {
  let i = start;
  const el = document.createElement('div');
  el.className = 'lightbox'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
  const draw = () => { el.innerHTML = `<button class="lb-x" aria-label="Close">&times;</button>${items.length > 1 ? '<button class="lb-prev" aria-label="Previous">&#8249;</button><button class="lb-next" aria-label="Next">&#8250;</button>' : ''}<figure><img src="${items[i].src}" alt=""><figcaption>${esc(items[i].cap)} <span class="muted">${i + 1} / ${items.length}</span></figcaption></figure>`; };
  const close = () => { el.remove(); document.removeEventListener('keydown', key); };
  const step = d => { i = (i + d + items.length) % items.length; draw(); };
  const key = e => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); };
  el.addEventListener('click', e => {
    if (e.target.closest('.lb-prev')) return step(-1);
    if (e.target.closest('.lb-next')) return step(1);
    if (e.target === el || e.target.closest('.lb-x')) close();
  });
  document.addEventListener('keydown', key);
  draw(); document.body.appendChild(el);
}
