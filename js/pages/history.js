import { CONFIG, LEADER_CATEGORIES, TEAMS } from '../config.js';
import { N, batTotals, pitTotals, ipToOuts } from '../data.js';
import { esc, table, section, pageNav, empty, rate, dec, int, money, ordinal, logo, team, isCLE, playerLink, headshot, nameLink } from '../ui.js';
import { posCol } from '../cols.js';
import { leaderGrid } from './season.js';

// ---------- franchise leaders ----------
const BAT_CATS = [
  ['hr', 'Home Runs', int], ['rbi', 'Runs Batted In', int], ['h', 'Hits', int], ['r', 'Runs', int], ['doubles', 'Doubles', int], ['triples', 'Triples', int],
  ['sb', 'Stolen Bases', int], ['bb', 'Walks', int], ['tb', 'Total Bases', int], ['g', 'Games', int],
  ['avg', 'Batting Average', rate, 'rate'], ['obp', 'On-Base %', rate, 'rate'], ['slg', 'Slugging %', rate, 'rate'], ['ops', 'OPS', rate, 'rate'],
];
const PIT_CATS = [
  ['w', 'Wins', int], ['so', 'Strikeouts', int], ['sv', 'Saves', int], ['ip', 'Innings Pitched', v => v, 'ip'], ['g', 'Games Pitched', int], ['gs', 'Games Started', int],
  ['qs', 'Quality Starts', int], ['cg', 'Complete Games', int], ['sho', 'Shutouts', int], ['hld', 'Holds', int],
  ['era', 'ERA', v => dec(v), 'low'], ['whip', 'WHIP', v => dec(v), 'low'],
];
const MIN = { career: { ab: 500, outs: 600 }, season: { ab: 300, outs: 300 } };

function leaderBox(db, title, list, fmt) {
  return `<div class="leader-card"><h4>${esc(title)}</h4><table>${list.slice(0, 10).map((r, i) => `<tr><td class="rk">${i + 1}.</td><td>${playerLink(db, r.id)}${r.year ? ` <small>(${esc(r.year)})</small>` : ''}</td><td class="num">${fmt(r.v)}</td></tr>`).join('') || '<tr><td class="muted">—</td></tr>'}</table></div>`;
}
function rank(entries, key, kind) {
  const val = e => (kind === 'ip' ? e.t.outs : e.t[key]);
  return entries.filter(e => val(e) !== null && val(e) !== undefined && !(kind !== 'low' && kind !== 'rate' && !val(e)))
    .map(e => ({ id: e.id, year: e.year, v: kind === 'ip' ? e.t.ip : e.t[key], s: val(e) }))
    .sort((a, b) => (kind === 'low' ? a.s - b.s : b.s - a.s));
}
export function franchiseLeaders(db, mode = 'career') {
  const bats = [], pits = [];
  if (mode === 'career') {
    for (const [id, rows] of Object.entries(db.batByPlayer)) bats.push({ id, t: batTotals(rows) });
    for (const [id, rows] of Object.entries(db.pitByPlayer)) pits.push({ id, t: pitTotals(rows) });
  } else {
    for (const r of db.T.batting) bats.push({ id: r.player_id, year: r.year, t: batTotals([r]) });
    for (const r of db.T.pitching) pits.push({ id: r.player_id, year: r.year, t: pitTotals([r]) });
  }
  const m = MIN[mode];
  const batGrid = BAT_CATS.map(([k, label, f, kind]) => leaderBox(db, label, rank(kind === 'rate' ? bats.filter(e => e.t.ab >= m.ab) : bats, k, kind), f)).join('');
  const pitGrid = PIT_CATS.map(([k, label, f, kind]) => leaderBox(db, label, rank(kind === 'low' ? pits.filter(e => e.t.outs >= m.outs) : pits, k, kind), f)).join('');
  const tabs = `<div class="tabs"><a href="#/leaders/career" class="${mode === 'career' ? 'on' : ''}">Career</a><a href="#/leaders/season" class="${mode === 'season' ? 'on' : ''}">Single Season</a><a href="#/league-leaders">MLB Leaders by Year</a></div>`;
  return `<h1>${esc(CONFIG.franchise)} ${mode === 'career' ? 'Career' : 'Single-Season'} Leaders</h1>
    <p class="lede">Regular season, ${esc(CONFIG.franchise)} only. Rate stats need ${m.ab} AB (batting) or ${m.outs / 3} IP (pitching).</p>${tabs}
    ${section('bat', 'Batting', `<div class="leader-grid">${batGrid}</div>`)}
    ${section('pit', 'Pitching', `<div class="leader-grid">${pitGrid}</div>`)}
    <p class="note">Career OBP is estimated from hits and walks; career ERA and WHIP are rebuilt from each season's ERA, WHIP and innings.</p>`;
}

export function leagueLeaders(db, yearStr) {
  const years = [...new Set(db.T.league_leaders.map(r => N(r.year)))].sort((a, b) => b - a);
  const year = N(yearStr) || years[0];
  const rows = db.T.league_leaders.filter(r => N(r.year) === year);
  return `<h1>${year || ''} MLB Leaders</h1>
    <div class="year-pills">${years.map(y => `<a class="pill-link ${y === year ? 'on' : ''}" href="#/league-leaders/${y}">${y}</a>`).join('')}</div>
    ${rows.length ? leaderGrid(db, rows) : empty('No league leaders entered.')}
    <p class="note">${esc(CONFIG.franchise)} players are highlighted. Ties share a rank.</p>`;
}

// ---------- awards ----------
export function awardsPage(db) {
  const awards = ['MVP', 'Cy Young', 'Rookie of the Year', 'Reliever of the Year', 'Batting Title'];
  const asgMvp = db.T.awards.filter(r => r.award === 'All-Star Game MVP').sort((a, b) => N(b.year) - N(a.year));
  const years = [...new Set(db.T.awards.map(r => N(r.year)))].sort((a, b) => b - a);
  const winners = (award, lg, y) => db.T.awards.filter(r => r.award === award && r.league === lg && N(r.year) === y).sort((a, b) => N(a.finish) - N(b.finish));
  const body = awards.map(a => {
    const rows = years.map(y => ({ year: String(y), al: winners(a, 'AL', y), nl: winners(a, 'NL', y) })).filter(r => r.al.length || r.nl.length);
    const cell = list => list.map((r, i) => `<div class="aw-line ${i ? 'aw-other' : 'aw-win'} ${isCLE(r.team) ? 'hl-row' : ''}">${i ? `<small>${ordinal(r.finish)}</small> ` : headshot(db, r.player_id, 'hs-xs')}${playerLink(db, r.player_id, r.player)} <small>${logo(r.team, 13)}${esc(TEAMS[r.team]?.abbr || r.team)}</small></div>`).join('');
    return section(a.replace(/\s/g, '-').toLowerCase(), a, table([
      { k: 'year', label: 'Year', fmt: r => `<a href="#/season/${r.year}">${r.year}</a>`, sort: r => N(r.year) },
      { k: 'al', label: 'American League', cls: 'left', fmt: r => cell(r.al) },
      { k: 'nl', label: 'National League', cls: 'left', fmt: r => cell(r.nl) },
    ], rows, { cls: 'awards-tbl' }));
  }).join('');
  const ws = db.T.postseason.filter(r => r.series_mvp_id).sort((a, b) => N(b.year) - N(a.year));
  return `<h1>Awards History</h1>${pageNav(awards.map(a => [a.replace(/\s/g, '-').toLowerCase(), a]).concat([['wsmvp', 'WS MVP'], ['asgmvp', 'All-Star MVP']]))}${body}
    ${section('wsmvp', 'World Series MVP', table([
      { k: 'year', label: 'Year', sort: r => N(r.year) }, { k: 'series_mvp', label: 'Player', cls: 'left', fmt: r => `<span class="pcell">${headshot(db, r.series_mvp_id, 'hs-xs')}${playerLink(db, r.series_mvp_id, r.series_mvp)}</span>` },
      { k: 'winner', label: 'Champion', cls: 'left', fmt: r => team(r.winner) },
    ], ws))}
    ${section('asgmvp', 'All-Star Game MVP', table([
      { k: 'year', label: 'Year', fmt: r => `<a href="#/allstars/${r.year}">${esc(r.year)}</a>`, sort: r => N(r.year) },
      { k: 'league', label: 'Lg' },
      { k: 'player', label: 'Player', cls: 'left', fmt: r => `<span class="pcell">${headshot(db, r.player_id, 'hs-xs')}${playerLink(db, r.player_id, r.player)}</span>` },
      { k: 'team', label: 'Team', cls: 'left', fmt: r => (r.team ? team(r.team, 16) : '') },
    ], asgMvp, { rowCls: r => (isCLE(r.team) ? 'hl-row' : '') }))}`;
}

// ---------- all-stars ----------
export function allStarsPage(db, yearStr) {
  const years = [...new Set(db.T.all_stars.map(r => N(r.year)))].sort((a, b) => b - a);
  const year = N(yearStr) || years[0];
  const rows = db.T.all_stars.filter(r => N(r.year) === year);
  const roleOrd = { lineup: 0, starting_pitcher: 1, pitcher: 2, bench: 3 };
  const roster = lg => {
    const rs = rows.filter(r => r.league === lg).sort((a, b) => (roleOrd[a.role] - roleOrd[b.role]) || (N(a.slot) ?? 99) - (N(b.slot) ?? 99));
    return table([
      { k: 'role', label: 'Role', fmt: r => esc({ lineup: r.slot ? `Bat ${r.slot}` : 'Starter', starting_pitcher: 'SP', pitcher: 'P', bench: 'Res' }[r.role] || r.role), sort: r => roleOrd[r.role] * 100 + (N(r.slot) || 50) },
      { k: 'player', label: 'Player', cls: 'left', fmt: r => `<span class="pcell">${headshot(db, r.player_id, 'hs-xs')}${playerLink(db, r.player_id, r.player)}</span>`, sort: r => r.player },
      posCol, { k: 'team', label: 'Team', cls: 'left', fmt: r => (r.team ? team(r.team, 16) : '') },
      { k: 'overall', label: 'OVR', num: true, sort: r => N(r.overall) },
      { k: 'line', label: 'W-L / ERA', fmt: r => (r.era ? `${esc(r.wins)}-${esc(r.losses)}, ${esc(r.era)}` : '') },
    ], rs, { rowCls: r => (isCLE(r.team) ? 'hl-row' : '') });
  };
  // Count selections per CLE player across all years
  const cle = {}; for (const r of db.T.all_stars) if (isCLE(r.team)) (cle[r.player_id] ||= new Set()).add(r.year);
  const cleRows = Object.entries(cle).map(([id, ys]) => ({ id, n: ys.size, years: [...ys].sort().join(', ') })).sort((a, b) => b.n - a.n);
  const game = db.rsGames.find(g => N(g.year) === year && g.game_type === 'all_star_game');
  const mvp = db.T.awards.find(r => N(r.year) === year && r.award === 'All-Star Game MVP');
  const hl = Object.values(db.highlights).find(h => N(h.year) === year && h.phase === 'all_star');
  const gameBox = game ? `<div class="asg-result"><div class="asg-score"><span>AL</span><b>${game.result === 'W' ? esc(game.cle_runs) : esc(game.opp_runs)}</b><i>–</i><b>${game.result === 'W' ? esc(game.opp_runs) : esc(game.cle_runs)}</b><span>NL</span></div>
    ${mvp ? `<div class="asg-mvp">${headshot(db, mvp.player_id, 'hs-sm')}<span><small>All-Star Game MVP</small>${playerLink(db, mvp.player_id, mvp.player)} ${mvp.team ? logo(mvp.team, 16) : ''}</span></div>` : ''}
    <p>${esc(game.note)}${hl ? ` <a href="#/highlight/${hl.highlight_id}">Photos &rarr;</a>` : ''}</p></div>` : '';
  return `<h1>${year || ''} All-Star Game</h1>${gameBox}
    <div class="year-pills">${years.map(y => `<a class="pill-link ${y === year ? 'on' : ''}" href="#/allstars/${y}">${y}</a>`).join('')}</div>
    <div class="two-col">${section('al', 'American League', roster('AL'))}${section('nl', 'National League', roster('NL'))}</div>
    ${section('cle', `${CONFIG.franchise} All-Stars (all years)`, table([
      { k: 'id', label: 'Player', cls: 'left', fmt: r => `<span class="pcell">${headshot(db, r.id, 'hs-xs')}${playerLink(db, r.id)}</span>`, sort: r => db.players[r.id]?.name },
      { k: 'n', label: 'Selections', num: true, sort: r => r.n }, { k: 'years', label: 'Years', cls: 'left' },
    ], cleRows))}
    <p class="note">Team is only recorded for ${esc(CONFIG.franchise)} players; other clubs are left blank unless known.</p>`;
}

// ---------- hall of fame ----------
export function hofPage(db) {
  const rows = [...db.T.hall_of_fame].sort((a, b) => N(b.year) - N(a.year));
  const byYear = {}; for (const r of rows) (byYear[r.year] ||= []).push(r);
  const plaque = r => {
    const line = r.ip ? `${r.w}-${r.l} · ${r.era} ERA · ${int(r.so)} SO · ${r.ip} IP${N(r.sv) ? ` · ${r.sv} SV` : ''}` : `${r.avg} BA · ${int(r.h)} H · ${int(r.hr)} HR · ${int(r.rbi)} RBI${r.sb ? ` · ${r.sb} SB` : ''}`;
    return `<a class="plaque" href="#/player/${r.player_id}"><div class="plaque-top">${headshot(db, r.player_id, 'hs-lg')}${logo(r.team, 44)}</div><h3>${esc(r.player)}</h3><p>${esc(r.position)} · ${esc(r.team)} · #${esc(r.jersey_number)}</p><p class="yrs">${esc(r.first_year)}–${esc(r.last_year)}</p><p class="plaque-line">${esc(line)}</p></a>`;
  };
  return `<h1>Hall of Fame</h1><p class="lede">${rows.length} inductees since the dynasty began.</p>
    ${Object.entries(byYear).sort((a, b) => N(b[0]) - N(a[0])).map(([y, rs]) => section(`hof-${y}`, `Class of ${y}`, `<div class="plaque-grid">${rs.map(plaque).join('')}</div>`)).join('')}`;
}

// ---------- draft ----------
export function draftPage(db, yearStr) {
  const years = [...new Set(db.T.draft.map(r => N(r.year)))].sort((a, b) => b - a);
  const year = N(yearStr) || years[0];
  const rows = db.T.draft.filter(r => N(r.year) === year).sort((a, b) => N(a.overall_pick) - N(b.overall_pick));
  const cols = [
    { k: 'round', label: 'Rd', num: true, sort: r => N(r.round) }, { k: 'overall_pick', label: 'Pick', num: true, sort: r => N(r.overall_pick) },
    { k: 'team', label: 'Team', cls: 'left', fmt: r => team(r.team, 16) },
    { k: 'player', label: 'Player', cls: 'left', fmt: r => `<span class="pcell">${headshot(db, r.player_id, 'hs-xs')}${playerLink(db, r.player_id, r.player)}</span>`, sort: r => r.player },
    posCol, { k: 'age', label: 'Age', num: true, sort: r => N(r.age) }, { k: 'overall', label: 'OVR', num: true, sort: r => N(r.overall) },
  ];
  return `<h1>${year || ''} Fantasy Draft</h1>
    <div class="year-pills">${years.map(y => `<a class="pill-link ${y === year ? 'on' : ''}" href="#/draft/${y}">${y}</a>`).join('')}</div>
    ${section('cle', `${CONFIG.franchise} Picks`, table(cols, rows.filter(r => isCLE(r.team))))}
    ${section('r1', 'First Round (all teams)', table(cols, rows.filter(r => N(r.round) === 1), { rowCls: r => (isCLE(r.team) ? 'hl-row' : '') }))}`;
}

// ---------- staff ----------
export function staffPage(db) {
  const years = [...new Set(db.T.staff.map(r => N(r.year)))].sort((a, b) => b - a);
  const mgrs = {};
  for (const s of db.T.season_summary) if (s.manager) (mgrs[s.manager] ||= { name: s.manager, years: [], w: 0, l: 0, titles: 0 }).years.push(N(s.year));
  for (const s of db.T.season_summary) if (s.manager) { const m = mgrs[s.manager]; m.w += N(s.wins) || 0; m.l += N(s.losses) || 0; if (/world series winner/i.test(s.playoff_result)) m.titles++; }
  for (const s of db.T.staff) if (s.role === 'Manager' && !mgrs[s.name]) mgrs[s.name] = { name: s.name, years: [N(s.year)], w: 0, l: 0, titles: 0 };
  const mRows = Object.values(mgrs).sort((a, b) => Math.min(...a.years) - Math.min(...b.years)).map(m => ({ ...m, span: `${Math.min(...m.years)}–${Math.max(...m.years)}`, pct: m.w + m.l ? m.w / (m.w + m.l) : null }));
  const roles = ['Manager', 'Hitting Coach', 'Pitching Coach', '1st Base Coach', '3rd Base Coach', 'Farm Director'];
  const grid = table([{ k: 'role', label: 'Role', cls: 'left' }, ...years.map(y => ({ k: String(y), label: String(y), cls: 'left', fmt: r => { const s = r[y]; return s ? `${esc(s.name)}<br><small class="muted">${money(s.salary)} · ${esc(s.contract_years)} yr${N(s.contract_years) === 1 ? '' : 's'} left</small>` : ''; } }))],
    roles.map(role => ({ role, ...Object.fromEntries(years.map(y => [y, db.T.staff.find(s => N(s.year) === y && s.role === role)])) })));
  return `<h1>Managers &amp; Coaching Staff</h1>
    ${section('mgr', 'Managers', table([
      { k: 'name', label: 'Manager', cls: 'left' }, { k: 'span', label: 'Seasons' },
      { k: 'w', label: 'W', num: true }, { k: 'l', label: 'L', num: true }, { k: 'pct', label: 'W-L%', num: true, fmt: r => rate(r.pct), sort: r => r.pct },
      { k: 'titles', label: 'Titles', num: true },
    ], mRows))}
    ${section('staff', 'Staff by Season', grid)}`;
}

// ---------- 99 club ----------
export function ninetyPage(db) {
  const rows = [...db.T.ninety_nines].sort((a, b) => N(b.year) - N(a.year));
  const label = y => (N(y) === Math.min(...db.seasons) - 1 ? `Preseason ${N(y) + 1}` : `After ${y}`);
  const byYear = {}; for (const r of rows) (byYear[r.year] ||= []).push(r);
  return `<h1>99 Overall Club</h1><p class="lede">Every player rated 99 overall at the end of each season.</p>
    ${Object.entries(byYear).sort((a, b) => N(b[0]) - N(a[0])).map(([y, rs]) => section(`y${y}`, label(y), table([
      { k: 'player', label: 'Player', cls: 'left', fmt: r => `<span class="pcell">${headshot(db, r.player_id, 'hs-xs')}${playerLink(db, r.player_id, r.player)}</span>`, sort: r => r.player },
      posCol, { k: 'team', label: 'Team', cls: 'left', fmt: r => team(r.team, 16) }, { k: 'age', label: 'Age', num: true, sort: r => N(r.age) }, { k: 'potential', label: 'Pot', num: true },
      { k: 'line', label: 'Season line', cls: 'left', fmt: r => esc(r.era ? `${r.w}-${r.l}, ${r.era} ERA, ${r.so} SO, ${r.ip} IP, ${r.whip} WHIP` : r.avg ? `${r.avg} BA, ${r.hr} HR, ${r.rbi} RBI, ${r.r} R, ${r.sb} SB` : '') },
    ], rs, { rowCls: r => (isCLE(r.team) ? 'hl-row' : '') }))).join('')}`;
}
