import { CONFIG } from './config.js';
import { loadData } from './data.js';
import { esc, enableSorting, bindVideos, headshot } from './ui.js';
import { homePage } from './pages/home.js';
import { seasonsIndex, seasonPage } from './pages/season.js';
import { playersIndex, bindPlayersIndex, playerPage } from './pages/player.js';
import { postseasonIndex, postseasonYear, seriesPage, gamePage } from './pages/postseason.js';
import { franchiseLeaders, leagueLeaders, awardsPage, allStarsPage, hofPage, draftPage, staffPage, ninetyPage } from './pages/history.js';
import { openingDayPage, transactionsPage } from './pages/moves.js';
import { highlightsIndex, highlightPage, bindLightbox } from './pages/media.js';

const app = document.getElementById('app');
let db = null;

const routes = [
  [/^$/, () => [homePage(db), 'Home']],
  [/^seasons$/, () => [seasonsIndex(db), 'Seasons']],
  [/^season\/(\d{4})$/, y => [seasonPage(db, y), `${y} Season`]],
  [/^players$/, () => [playersIndex(db), 'Players']],
  [/^player\/(P\d+)$/, id => [playerPage(db, id), db.players[id]?.name || 'Player']],
  [/^postseason$/, () => [postseasonIndex(db), 'Postseason']],
  [/^postseason\/(\d{4})$/, y => [postseasonYear(db, y), `${y} Postseason`]],
  [/^series\/(\d{4})\/([^/]+)$/, (y, r) => [seriesPage(db, y, r), `${y} ${decodeURIComponent(r)}`]],
  [/^game\/(\d{4})\/([^/]+)\/(\d+)$/, (y, r, g) => [gamePage(db, y, r, g), `${y} ${decodeURIComponent(r)} Game ${g}`]],
  [/^leaders(?:\/(career|season))?$/, m => [franchiseLeaders(db, m || 'career'), 'Franchise Leaders']],
  [/^league-leaders(?:\/(\d{4}))?$/, y => [leagueLeaders(db, y), 'MLB Leaders']],
  [/^awards$/, () => [awardsPage(db), 'Awards']],
  [/^allstars(?:\/(\d{4}))?$/, y => [allStarsPage(db, y), 'All-Stars']],
  [/^hof$/, () => [hofPage(db), 'Hall of Fame']],
  [/^draft(?:\/(\d{4}))?$/, y => [draftPage(db, y), 'Draft']],
  [/^staff$/, () => [staffPage(db), 'Managers & Staff']],
  [/^ninety-nines$/, () => [ninetyPage(db), '99 Club']],
  [/^transactions$/, () => [transactionsPage(db), 'Transactions']],
  [/^opening-day(?:\/(\d{4}))?$/, y => [openingDayPage(db, y), 'Opening Day']],
  [/^highlights$/, () => [highlightsIndex(db), 'Highlights']],
  [/^highlight\/(H\d+)$/, id => [highlightPage(db, id), db.highlights[id]?.title || 'Highlight']],
];

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, anchor] = raw.split('#');
  return { path: path.replace(/\/$/, ''), anchor };
}

function render() {
  if (!db) return;
  const { path, anchor } = parseHash();
  let html = null, title = '';
  for (const [re, fn] of routes) {
    const m = path.match(re);
    if (m) { try { [html, title] = fn(...m.slice(1)); } catch (e) { console.error(e); html = errorBox(`Something went wrong drawing this page: ${e.message}`); } break; }
  }
  if (html === null) { html = `<h1>Page not found</h1><p><a href="#/">Back to the home page</a></p>`; title = 'Not found'; }
  app.innerHTML = html;
  document.title = `${title} | ${CONFIG.siteName}`;
  markNav(path);
  bindPlayersIndex(app);
  bindLightbox(app);
  if (anchor) document.getElementById(anchor)?.scrollIntoView();
  else window.scrollTo(0, 0);
  document.body.classList.remove('nav-open');
}

function markNav(path) {
  const top = path.split('/')[0] || 'home';
  const map = { season: 'seasons', player: 'players', series: 'postseason', game: 'postseason', highlight: 'highlights', 'league-leaders': 'leaders', 'opening-day': 'transactions' };
  const key = map[top] || top;
  document.querySelectorAll('.mainnav a').forEach(a => a.classList.toggle('on', a.dataset.nav === key));
}

const errorBox = msg => `<div class="error-box"><h2>Couldn't load the dynasty data</h2><p>${esc(msg)}</p><p>Make sure the Google Sheet is shared as <b>Anyone with the link: Viewer</b>, then <button class="btn" data-refresh>try again</button>.</p></div>`;

// ---------- search ----------
function setupSearch() {
  const input = document.getElementById('search');
  const box = document.getElementById('search-results');
  let items = [], sel = -1;
  const draw = () => {
    box.innerHTML = items.map((it, i) => `<a href="${it.href}" class="${i === sel ? 'sel' : ''}">${it.img || ''}<span>${esc(it.label)}<small>${esc(it.sub)}</small></span></a>`).join('');
    box.hidden = !items.length;
  };
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    sel = -1;
    if (!q || !db) { items = []; return draw(); }
    const ps = Object.values(db.players).filter(p => p.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.toLowerCase().indexOf(q) - b.name.toLowerCase().indexOf(q)).slice(0, 8)
      .map(p => ({ href: `#/player/${p.id}`, label: p.name, sub: p.pos || 'Player', img: headshot(db, p.id, 'hs-xs') }));
    const ys = db.seasons.filter(y => String(y).includes(q)).map(y => ({ href: `#/season/${y}`, label: `${y} ${CONFIG.franchise}`, sub: 'Season' }));
    const hs = Object.values(db.highlights).filter(h => h.title.toLowerCase().includes(q)).slice(0, 3).map(h => ({ href: `#/highlight/${h.highlight_id}`, label: h.title, sub: `Highlight · ${h.year}` }));
    items = [...ys, ...ps, ...hs];
    draw();
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, items.length - 1); draw(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); draw(); e.preventDefault(); }
    else if (e.key === 'Enter' && items.length) { location.hash = items[Math.max(sel, 0)].href; close(); }
    else if (e.key === 'Escape') close();
  });
  const close = () => { input.value = ''; items = []; draw(); input.blur(); };
  box.addEventListener('click', () => setTimeout(close, 0));
  document.addEventListener('click', e => { if (!e.target.closest('.search')) { items = []; draw(); } });
  document.addEventListener('keydown', e => { if (e.key === '/' && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); input.focus(); } });
}

// ---------- theme ----------
function setupTheme() {
  const btn = document.getElementById('theme-toggle');
  let saved = null; try { saved = localStorage.getItem('cdr-theme'); } catch (e) { /* blocked */ }
  if (saved) document.documentElement.dataset.theme = saved;
  btn.addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('cdr-theme', next); } catch (e) { /* blocked */ }
  });
}

async function boot(force = false) {
  app.innerHTML = '<div class="loading"><span class="ball"></span>Loading the dynasty…</div>';
  try {
    db = await loadData({ force });
    document.getElementById('loaded-at').textContent = new Date(db.loadedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    render();
  } catch (e) {
    console.error(e);
    app.innerHTML = errorBox(e.message);
  }
}

document.addEventListener('click', e => {
  const j = e.target.closest('[data-jump]');
  if (j) { e.preventDefault(); document.getElementById(j.dataset.jump)?.scrollIntoView({ behavior: 'smooth' }); }
  if (e.target.closest('[data-refresh]')) { e.preventDefault(); boot(true); }
  if (e.target.closest('#nav-toggle')) document.body.classList.toggle('nav-open');
});
enableSorting(app);
bindVideos(app);
window.addEventListener('hashchange', render);
setupSearch();
setupTheme();
boot();
