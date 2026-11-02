import { CONFIG, ROUND_ORDER } from './config.js';

const CACHE_KEY = 'cdr-cache-v1';

// RFC 4180 CSV parser -> array of row arrays.
export function parseCSV(text) {
  const rows = []; let row = []; let field = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function toObjects(text) {
  const rows = parseCSV(text);
  if (!rows.length) return [];
  const head = rows[0].map(h => h.trim());
  const keep = head.map((h, i) => (h ? i : -1)).filter(i => i >= 0);
  return rows.slice(1)
    .filter(r => keep.some(i => (r[i] || '').trim() !== ''))
    .map(r => Object.fromEntries(keep.map(i => [head[i], (r[i] ?? '').trim()])));
}

async function fetchTab(name, gid) {
  const base = `https://docs.google.com/spreadsheets/d/${CONFIG.sheetId}`;
  try {
    const r = await fetch(`${base}/export?format=csv&gid=${gid}`);
    if (r.ok) return await r.text();
  } catch (e) { /* fall through to gviz */ }
  const r = await fetch(`${base}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`);
  if (!r.ok) throw new Error(`Could not load the "${name}" tab (HTTP ${r.status})`);
  return r.text();
}

export async function loadData({ force = false } = {}) {
  if (!force) {
    try {
      const c = JSON.parse(sessionStorage.getItem(CACHE_KEY));
      if (c && Date.now() - c.t < CONFIG.cacheMinutes * 60e3) return buildDB(c.raw, c.t);
    } catch (e) { /* no cache */ }
  }
  const pairs = await Promise.all(Object.entries(CONFIG.tabs).map(async ([n, g]) => [n, await fetchTab(n, g)]));
  const raw = Object.fromEntries(pairs);
  const t = Date.now();
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t, raw })); } catch (e) { /* storage full or blocked */ }
  return buildDB(raw, t);
}

// ---------- number helpers ----------
export const N = v => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(String(v).replace(/[$,%\s]/g, ''));
  return Number.isFinite(n) ? n : null;
};
export const ipToOuts = v => {
  const n = N(v); if (n === null) return 0;
  const whole = Math.trunc(n); const frac = Math.round((n - whole) * 10);
  return whole * 3 + frac;
};
export const outsToIp = o => `${Math.floor(o / 3)}.${o % 3}`;
export const roundIdx = r => { const i = ROUND_ORDER.indexOf(r); return i < 0 ? 99 : i; };

const groupBy = (arr, fn) => arr.reduce((m, x) => { const k = fn(x); (m[k] ||= []).push(x); return m; }, {});

// Sheets may export dates as 4/1/2029; normalise to 2029-04-01.
const normDate = d => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(d || ''); return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : d; };

function buildDB(raw, loadedAt) {
  const T = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, toObjects(v)]));
  const players = {};
  for (const p of T.players) {
    players[p.player_id] = { id: p.player_id, name: p.player, pos: p.primary_position, first: p.first_year, mlbam: p.mlbam_id };
  }
  // Players referenced elsewhere but missing from the master tab still get a stub.
  const ensure = (id, name) => { if (id && !players[id]) players[id] = { id, name, pos: '', first: '', mlbam: '' }; };
  for (const t of Object.values(T)) for (const r of t) if (r.player_id) ensure(r.player_id, r.player);

  const years = new Set();
  for (const k of ['season_summary', 'standings', 'batting', 'pitching', 'staff', 'awards', 'all_stars', 'postseason', 'hall_of_fame', 'draft', 'highlights', 'season_wrapup', 'transactions', 'opening_day']) {
    for (const r of T[k]) if (N(r.year)) years.add(N(r.year));
  }
  const seasons = [...years].sort((a, b) => a - b);

  const by = (tab, key) => groupBy(T[tab], r => r[key]);
  const db = {
    T, players, seasons, loadedAt,
    summaryByYear: Object.fromEntries(T.season_summary.map(r => [r.year, r])),
    wrapByYear: Object.fromEntries(T.season_wrapup.map(r => [r.year, r.narrative])),
    batByPlayer: by('batting', 'player_id'),
    pitByPlayer: by('pitching', 'player_id'),
    psBatByPlayer: by('postseason_batting', 'player_id'),
    psPitByPlayer: by('postseason_pitching', 'player_id'),
    gameBatByPlayer: by('postseason_game_batting', 'player_id'),
    gamePitByPlayer: by('postseason_game_pitching', 'player_id'),
    awardsByPlayer: by('awards', 'player_id'),
    asByPlayer: by('all_stars', 'player_id'),
    leadersByPlayer: by('league_leaders', 'player_id'),
    ninetyByPlayer: by('ninety_nines', 'player_id'),
    draftByPlayer: by('draft', 'player_id'),
    hofByPlayer: by('hall_of_fame', 'player_id'),
    highlights: Object.fromEntries(T.highlights.map(h => [h.highlight_id, h])),
    mediaByHighlight: groupBy([...T.highlight_media].sort((a, b) => N(a.sequence) - N(b.sequence)), m => m.highlight_id),
    media: Object.fromEntries(T.highlight_media.map(m => [m.media_id, m])),
    tagsByHighlight: by('highlight_players', 'highlight_id'),
    tagsByPlayer: by('highlight_players', 'player_id'),
    trades: by('transactions', 'transaction_id'),
    txByPlayer: by('transactions', 'player_id'),
    openingDay: by('opening_day', 'year'),
    odByPlayer: by('opening_day', 'player_id'),
  };
  for (const r of T.opening_day) r.date = normDate(r.date);
  db.games = [...T.postseason_games].sort((a, b) => a.date.localeCompare(b.date));
  db.gameKey = g => `${g.year}/${encodeURIComponent(g.round)}/${g.game}`;
  db.championYears = T.season_summary.filter(r => /world series winner/i.test(r.playoff_result)).map(r => N(r.year));
  db.wsMvp = Object.fromEntries(T.postseason.filter(r => r.series_mvp_id).map(r => [r.year, r]));
  return db;
}

// ---------- derived stats ----------
const BAT_SUM = ['g', 'ab', 'r', 'h', 'doubles', 'triples', 'hr', 'rbi', 'sb', 'bb', 'so', 'tb'];
export function batTotals(rows) {
  const t = Object.fromEntries(BAT_SUM.map(k => [k, 0]));
  for (const r of rows) for (const k of BAT_SUM) t[k] += N(r[k]) || 0;
  if (!t.tb) t.tb = t.h + t.doubles + 2 * t.triples + 3 * t.hr;
  // OBP is estimated as (H+BB)/(AB+BB): HBP and SF are not tracked for full seasons.
  t.avg = t.ab ? t.h / t.ab : null;
  t.obp = t.ab + t.bb ? (t.h + t.bb) / (t.ab + t.bb) : null;
  t.slg = t.ab ? t.tb / t.ab : null;
  t.ops = t.obp !== null && t.slg !== null ? t.obp + t.slg : null;
  return t;
}
export function pitTotals(rows) {
  const t = { w: 0, l: 0, sv: 0, g: 0, gs: 0, qs: 0, cg: 0, sho: 0, bs: 0, hld: 0, bb: 0, so: 0, outs: 0, er: 0, hbb: 0 };
  for (const r of rows) {
    for (const k of ['w', 'l', 'sv', 'g', 'gs', 'qs', 'cg', 'sho', 'bs', 'hld', 'bb', 'so']) t[k] += N(r[k]) || 0;
    const o = ipToOuts(r.ip); t.outs += o;
    // Earned runs and hits are rebuilt from ERA and WHIP since the season screens don't show them.
    if (N(r.er) !== null) t.er += N(r.er); else t.er += (N(r.era) || 0) * o / 27;
    t.hbb += (N(r.whip) || 0) * o / 3;
  }
  t.ip = outsToIp(t.outs);
  t.era = t.outs ? t.er * 27 / t.outs : null;
  t.whip = t.outs ? t.hbb * 3 / t.outs : null;
  t.wpct = t.w + t.l ? t.w / (t.w + t.l) : null;
  t.k9 = t.outs ? t.so * 27 / t.outs : null;
  return t;
}
