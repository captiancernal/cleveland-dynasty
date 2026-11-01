// Shared stat-table column definitions.
import { esc, rate, dec, int, playerLink, headshot, team, roundShort, fmtDate } from './ui.js';
import { N, ipToOuts } from './data.js';

const n = (k, label, title, f = int) => ({ k, label, title, num: true, fmt: r => f(r[k]), sort: r => N(r[k]) });
const rt = (k, label, title, d = 3) => ({ k, label, title, num: true, fmt: r => (d === 3 ? rate(r[k]) : dec(r[k], d)), sort: r => N(r[k]) });

export const yearCol = { k: 'year', label: 'Year', fmt: r => r.year ? `<a href="#/season/${r.year}">${esc(r.year)}</a>` : esc(r._label || ''), sort: r => N(r.year) };
export const playerCol = db => ({ k: 'player', label: 'Player', cls: 'left', fmt: r => r._label ? `<strong>${esc(r._label)}</strong>` : `<span class="pcell">${headshot(db, r.player_id, 'hs-xs')}${playerLink(db, r.player_id, r.player)}</span>`, sort: r => r.player });
export const posCol = { k: 'position', label: 'Pos', fmt: r => esc(r.position || '') };

export const BAT_STATS = [
  n('g', 'G', 'Games'), n('ab', 'AB', 'At bats'), n('r', 'R', 'Runs'), n('h', 'H', 'Hits'),
  n('doubles', '2B', 'Doubles'), n('triples', '3B', 'Triples'), n('hr', 'HR', 'Home runs'), n('rbi', 'RBI', 'Runs batted in'),
  n('sb', 'SB', 'Stolen bases'), n('bb', 'BB', 'Walks'), n('so', 'SO', 'Strikeouts'),
  rt('avg', 'BA', 'Batting average'), rt('obp', 'OBP', 'On-base percentage'), rt('slg', 'SLG', 'Slugging'), rt('ops', 'OPS', 'On-base plus slugging'),
  n('tb', 'TB', 'Total bases'),
];
export const PIT_STATS = [
  n('w', 'W', 'Wins'), n('l', 'L', 'Losses'), rt('wpct', 'W-L%', 'Win-loss percentage'), rt('era', 'ERA', 'Earned run average', 2),
  n('g', 'G', 'Games'), n('gs', 'GS', 'Games started'), n('cg', 'CG', 'Complete games'), n('sho', 'SHO', 'Shutouts'),
  n('sv', 'SV', 'Saves'), n('bs', 'BS', 'Blown saves'), n('hld', 'HLD', 'Holds'), n('qs', 'QS', 'Quality starts'),
  { k: 'ip', label: 'IP', title: 'Innings pitched', num: true, fmt: r => esc(r.ip ?? ''), sort: r => ipToOuts(r.ip) },
  n('bb', 'BB', 'Walks'), n('so', 'SO', 'Strikeouts'), rt('whip', 'WHIP', 'Walks + hits per inning', 2),
];

// Totals objects from data.js use numbers; give them the same keys the columns read.
export const batTotalRow = (t, label) => ({ _label: label, ...t });
export const pitTotalRow = (t, label) => ({ _label: label, ...t });

export const GAME_BAT = db => [
  { k: 'date', label: 'Date', fmt: r => `<a href="#/game/${r.year}/${encodeURIComponent(r.round)}/${r.game}">${esc(fmtDate(r.date))}</a>`, sort: r => r.date },
  { k: 'round', label: 'Series', fmt: r => `${esc(roundShort(r.round))} G${esc(r.game)}`, sort: r => r.date },
  n('batting_order', 'Bat#', 'Batting order spot'), posCol,
  n('ab', 'AB'), n('r', 'R'), n('h', 'H'), n('doubles', '2B'), n('triples', '3B'), n('hr', 'HR'), n('rbi', 'RBI'),
  n('bb', 'BB'), n('so', 'SO'), n('sb', 'SB'), n('hbp', 'HBP'), n('gidp', 'GDP'), n('e', 'E', 'Errors'),
  rt('avg_to_date', 'BA', 'Postseason average after this game'),
];
export const GAME_PIT = db => [
  { k: 'date', label: 'Date', fmt: r => `<a href="#/game/${r.year}/${encodeURIComponent(r.round)}/${r.game}">${esc(fmtDate(r.date))}</a>`, sort: r => r.date },
  { k: 'round', label: 'Series', fmt: r => `${esc(roundShort(r.round))} G${esc(r.game)}`, sort: r => r.date },
  { k: 'started', label: 'GS', fmt: r => (r.started === 'Y' ? 'GS' : '') },
  { k: 'decision', label: 'Dec', fmt: r => esc(r.decision) },
  { k: 'ip', label: 'IP', num: true, fmt: r => esc(r.ip), sort: r => ipToOuts(r.ip) },
  n('h', 'H'), n('r', 'R'), n('er', 'ER'), n('bb', 'BB'), n('so', 'SO'),
  rt('era_to_date', 'ERA', 'Postseason ERA after this game', 2),
];

export { team };
