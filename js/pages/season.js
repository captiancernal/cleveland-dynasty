import { CONFIG, LEADER_CATEGORIES, TEAMS } from '../config.js';
import { N, batTotals, pitTotals, roundIdx } from '../data.js';
import { esc, table, section, pageNav, empty, rate, dec, int, money, ordinal, team, logo, isCLE, playerLink, headshot, nameLink, mediaCard, roundShort, pennant } from '../ui.js';
import { yearCol, playerCol, posCol, BAT_STATS, PIT_STATS, batTotalRow, pitTotalRow } from '../cols.js';
import { bracket } from './postseason.js';
import { openingDayCard, tradeCard, tradesForYear, milestoneGames } from './moves.js';

export function seasonsIndex(db) {
  const rows = db.seasons.filter(y => db.summaryByYear[y] || db.T.staff.some(s => N(s.year) === y)).map(y => {
    const s = db.summaryByYear[y] || {};
    const st = db.T.standings.find(r => N(r.year) === y && isCLE(r.team)) || {};
    const mgr = s.manager || db.T.staff.find(r => N(r.year) === y && r.role === 'Manager')?.name || '';
    return { year: String(y), ...s, gb: st.gb, rs: st.rs, ra: st.ra, pct: st.pct || (s.wins ? N(s.wins) / (N(s.wins) + N(s.losses)) : ''), manager: mgr, clinch: st.clinch };
  }).reverse();
  const cols = [
    yearCol,
    { k: 'wins', label: 'W', num: true, sort: r => N(r.wins) }, { k: 'losses', label: 'L', num: true, sort: r => N(r.losses) },
    { k: 'pct', label: 'W-L%', num: true, fmt: r => rate(r.pct), sort: r => N(r.pct) },
    { k: 'gb', label: 'GB', num: true, fmt: r => (N(r.gb) === 0 ? '--' : esc(r.gb || '')), sort: r => N(r.gb) },
    { k: 'division_finish', label: 'Finish', fmt: r => (r.division_finish ? `${ordinal(r.division_finish)} of 5` : ''), sort: r => N(r.division_finish) },
    { k: 'rs', label: 'R', num: true, title: 'Runs scored', sort: r => N(r.rs) }, { k: 'ra', label: 'RA', num: true, title: 'Runs allowed', sort: r => N(r.ra) },
    { k: 'playoff_result', label: 'Postseason', cls: 'left', fmt: r => (/world series winner/i.test(r.playoff_result) ? '<strong class="champ">Won World Series</strong>' : esc(r.playoff_result === 'missed' ? 'Missed playoffs' : r.playoff_result || (r.wins ? '' : 'Upcoming'))) },
    { k: 'manager', label: 'Manager', cls: 'left', fmt: r => esc(r.manager) },
    { k: 'payroll', label: 'Payroll', num: true, fmt: r => money(r.payroll), sort: r => N(r.payroll) },
  ];
  return `<h1>${esc(CONFIG.franchiseCity)} ${esc(CONFIG.franchise)} Franchise History</h1>
    <p class="lede">Every season of the dynasty, year by year. Click a year for the full team page.</p>
    ${section('years', 'Year-by-Year Results', table(cols, rows, { rowCls: r => (/world series winner/i.test(r.playoff_result) ? 'champ-row' : '') }))}`;
}

export function seasonPage(db, yearStr) {
  const year = N(yearStr);
  const y = String(year);
  const s = db.summaryByYear[y];
  const T = db.T;
  const atYear = tab => T[tab].filter(r => N(r.year) === year);
  const staff = atYear('staff');
  const mgr = s?.manager || staff.find(r => r.role === 'Manager')?.name || '';
  const prev = db.seasons.filter(x => x < year).pop(), next = db.seasons.filter(x => x > year)[0];

  // ---------- header ----------
  const champ = db.championYears.includes(year);
  const rec = s ? `${s.wins}-${s.losses}` : '';
  const head = `<div class="page-head">
    <div class="ph-logo">${logo(CONFIG.franchise, 96, 'team-cap-on-light')}</div>
    <div class="ph-main">
      <div class="crumbs"><a href="#/seasons">Seasons</a>${prev ? ` · <a href="#/season/${prev}">&larr; ${prev}</a>` : ''}${next ? ` · <a href="#/season/${next}">${next} &rarr;</a>` : ''}</div>
      <h1>${year} ${esc(CONFIG.franchiseCity)} ${esc(CONFIG.franchise)}</h1>
      ${s ? `<p class="meta"><strong>Record:</strong> ${rec}, ${ordinal(s.division_finish)} in ${esc(s.division)}</p>` : `<p class="meta">${db.openingDay[y] || db.rsGames.some(g => N(g.year) === year) ? 'Season in progress.' : 'Season not played yet.'}</p>`}
      ${mgr ? `<p class="meta"><strong>Manager:</strong> ${esc(mgr)}</p>` : ''}
      ${s ? `<p class="meta"><strong>Postseason:</strong> ${champ ? '<strong class="champ">Won World Series</strong>' : esc(s.playoff_result === 'missed' ? 'Did not qualify' : s.playoff_result)}</p>` : ''}
      ${s?.payroll ? `<p class="meta"><strong>Payroll:</strong> ${money(s.payroll)}</p>` : ''}
    </div>
    ${champ ? `<div class="ph-side">${pennant(year)}</div>` : ''}
  </div>`;

  // ---------- team stat strip ----------
  const strip = s && s.team_avg ? `<div class="strip">
    ${[['BA', rate(s.team_avg)], ['OBP', rate(s.team_obp)], ['SLG', rate(s.team_slg)], ['ERA', dec(s.team_era)], ['Fld%', rate(s.fielding_pct)]].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}
    ${[['Overall', s.rank_overall], ['Contact', s.rank_contact], ['Power', s.rank_power], ['Pitching', s.rank_pitching], ['Defense', s.rank_defense], ['Speed', s.rank_speed]].filter(x => x[1]).map(([k, v]) => `<div class="rank"><span>${k} rank</span><b>${ordinal(v)}</b></div>`).join('')}
  </div>` : '';

  // ---------- sections ----------
  const parts = [];
  const nav = [];
  const add = (id, title, body, extra) => { if (body) { parts.push(section(id, title, body, extra)); nav.push([id, title]); } };

  const wrap = db.wrapByYear[y];
  add('recap', 'Season Recap', wrap ? wrap.split(/\n+/).map(p => `<p>${esc(p)}</p>`).join('') : '');

  const hl = T.highlights.filter(h => N(h.year) === year);
  add('highlights', 'Highlights', hl.length ? `<div class="hl-grid">${hl.map(h => mediaCard(db, h)).join('')}</div>` : '');

  add('opening-day', 'Opening Day', openingDayCard(db, year));
  add('milestones', 'Milestone Games', milestoneGames(db, year));
  const tr = tradesForYear(db, year);
  add('transactions', 'Trades', tr.length ? `<div class="trade-grid">${tr.map(t => tradeCard(db, t)).join('')}</div>` : '');

  // standings
  const stand = atYear('standings').sort((a, b) => N(a.division_finish) - N(b.division_finish));
  add('standings', `${stand[0]?.division || 'Division'} Standings`, stand.length ? table([
    { k: 'team', label: 'Team', cls: 'left', fmt: r => `${team(r.team)}${r.clinch ? ` <sup class="clinch">${esc(r.clinch)}</sup>` : ''}`, sort: r => r.team },
    { k: 'wins', label: 'W', num: true, sort: r => N(r.wins) }, { k: 'losses', label: 'L', num: true, sort: r => N(r.losses) },
    { k: 'pct', label: 'W-L%', num: true, fmt: r => rate(r.pct), sort: r => N(r.pct) },
    { k: 'gb', label: 'GB', num: true, fmt: r => (N(r.gb) === 0 ? '--' : esc(r.gb)), sort: r => N(r.gb) },
    { k: 'rs', label: 'RS', num: true, sort: r => N(r.rs) }, { k: 'ra', label: 'RA', num: true, sort: r => N(r.ra) },
    { k: 'diff', label: 'Diff', num: true, fmt: r => { const d = N(r.rs) - N(r.ra); return `<span class="${d > 0 ? 'pos' : d < 0 ? 'neg' : ''}">${d > 0 ? '+' : ''}${d}</span>`; }, sort: r => N(r.rs) - N(r.ra) },
  ], stand, { rowCls: r => (isCLE(r.team) ? 'hl-row' : '') }) + '<p class="note">z = clinched division · y = division winner · w = wild card</p>' : '');

  // batting / pitching
  const bat = atYear('batting');
  if (bat.length) {
    const tot = batTotals(bat);
    add('batting', 'Team Batting', table([playerCol(db), posCol, ...BAT_STATS], bat, { foot: [batTotalRow(tot, 'Team Totals')] }));
  }
  const pit = atYear('pitching');
  if (pit.length) {
    const tot = pitTotals(pit);
    add('pitching', 'Team Pitching', table([playerCol(db), posCol, ...PIT_STATS], pit, { foot: [pitTotalRow(tot, 'Team Totals')] }));
  }

  // postseason stats
  const psb = atYear('postseason_batting'), psp = atYear('postseason_pitching');
  if (psb.length || psp.length) {
    let body = '';
    if (psb.length) body += `<h3>Batting</h3>${table([playerCol(db), posCol, ...BAT_STATS], psb, { foot: [batTotalRow(batTotals(psb), 'Postseason Totals')] })}`;
    if (psp.length) body += `<h3>Pitching</h3>${table([playerCol(db), posCol, ...PIT_STATS], psp, { foot: [pitTotalRow(pitTotals(psp), 'Postseason Totals')] })}`;
    const series = atYear('playoffs').sort((a, b) => roundIdx(a.round) - roundIdx(b.round));
    const sl = series.length ? `<div class="series-row">${series.map(r => {
      const won = N(r.cle_wins) > N(r.opp_wins);
      const g = db.games.find(x => N(x.year) === year && (x.round === r.round || x.round.endsWith(r.round)));
      const href = g ? `#/series/${year}/${encodeURIComponent(g.round)}` : `#/postseason/${year}`;
      return `<a class="series-chip ${won ? 'won' : 'lost'}" href="${href}">${logo(r.opponent, 28)}<span><b>${esc(r.round)}</b>${won ? 'Beat' : 'Lost to'} ${esc(r.opponent)} ${esc(r.cle_wins)}-${esc(r.opp_wins)}</span></a>`;
    }).join('')}</div>` : '';
    add('postseason', 'Postseason', sl + body, `<a class="more" href="#/postseason/${year}">Bracket &amp; box scores &rarr;</a>`);
  }

  // depth chart
  const lineup = atYear('lineup'), rot = atYear('rotation'), pen = atYear('relievers');
  if (lineup.length || rot.length || pen.length) {
    const starters = lineup.filter(r => r.lineup_role === 'starter').sort((a, b) => (N(a.batting_order) ?? 99) - (N(b.batting_order) ?? 99));
    const bench = lineup.filter(r => r.lineup_role !== 'starter');
    const card = (r, top, sub) => `<li>${headshot(db, r.player_id, 'hs-sm')}<div><span class="dc-top">${top}</span>${playerLink(db, r.player_id, r.player)}<span class="dc-sub">${sub}</span></div></li>`;
    const ov = r => (r.overall ? `<span class="ovr">${esc(r.overall)}</span>` : '');
    const roleOrder = { closer: 0, setup: 1, middle: 2, long: 3, '': 4 };
    const body = `<div class="depth">
      <div><h3>Lineup</h3><ol class="dc">${starters.map(r => card(r, `${r.batting_order ? esc(r.batting_order) + '. ' : ''}${esc(r.position)}`, `${ov(r)} ${rate(r.avg)} / ${int(r.hr)} HR / ${int(r.rbi)} RBI`)).join('')}</ol>
        ${bench.length ? `<h4>Bench</h4><ol class="dc">${bench.map(r => card(r, esc(r.position), `${ov(r)} ${rate(r.avg)} / ${int(r.hr)} HR`)).join('')}</ol>` : ''}</div>
      <div><h3>Rotation</h3><ol class="dc">${rot.sort((a, b) => N(a.rotation_order) - N(b.rotation_order)).map(r => card(r, `SP${esc(r.rotation_order)} · ${esc(r.throws)}HP`, `${ov(r)} ${esc(r.wins)}-${esc(r.losses)}, ${dec(r.era)} ERA`)).join('')}</ol></div>
      <div><h3>Bullpen</h3><ol class="dc">${pen.sort((a, b) => (roleOrder[a.role] ?? 4) - (roleOrder[b.role] ?? 4)).map(r => card(r, `${esc(r.role ? r.role[0].toUpperCase() + r.role.slice(1) : 'RP')} · ${esc(r.throws)}HP`, `${ov(r)} ${esc(r.wins)}-${esc(r.losses)}, ${dec(r.era)} ERA${N(r.saves) ? `, ${r.saves} SV` : ''}${N(r.holds) ? `, ${r.holds} HLD` : ''}`)).join('')}</ol></div>
    </div>`;
    add('depth', 'Depth Chart', body);
  }

  // staff
  add('staff', 'Coaching Staff', staff.length ? table([
    { k: 'role', label: 'Role', cls: 'left' }, { k: 'name', label: 'Name', cls: 'left' },
    { k: 'salary', label: 'Salary', num: true, fmt: r => money(r.salary), sort: r => N(r.salary) },
    { k: 'contract_years', label: 'Years Left', num: true, sort: r => N(r.contract_years) },
  ], staff, { foot: [{ role: '<strong>Total</strong>', name: '', salary: staff.reduce((a, r) => a + (N(r.salary) || 0), 0), contract_years: '' }].map(r => ({ ...r, role: 'Total' })) }) : '');

  // awards
  const aw = atYear('awards');
  if (aw.length) {
    const groups = {};
    for (const r of aw) (groups[`${r.league} ${r.award}`] ||= []).push(r);
    const body = `<div class="award-grid">${Object.entries(groups).map(([k, rs]) => `<div class="award-card"><h4>${esc(k)}</h4><ol>${rs.sort((a, b) => N(a.finish) - N(b.finish)).map(r => `<li class="${isCLE(r.team) ? 'hl-row' : ''}">${headshot(db, r.player_id, 'hs-xs')}<span>${playerLink(db, r.player_id, r.player)} <small>${logo(r.team, 14)} ${esc(r.team)}</small></span></li>`).join('')}</ol></div>`).join('')}</div>`;
    add('awards', 'Awards Voting', body, `<a class="more" href="#/awards">All awards &rarr;</a>`);
  }

  // all-stars
  const as = atYear('all_stars');
  if (as.length) {
    const cle = as.filter(r => isCLE(r.team));
    const body = `${cle.length ? `<div class="cle-allstars">${cle.map(r => `<a href="#/player/${r.player_id}" class="as-chip">${headshot(db, r.player_id, 'hs-sm')}<span><b>${esc(r.player)}</b>${esc(r.position || '')} · ${esc(r.role.replace('_', ' '))}</span></a>`).join('')}</div>` : '<p class="muted">No Indians selected.</p>'}
      <p><a href="#/allstars/${year}">Full ${year} All-Star rosters &rarr;</a></p>`;
    add('allstars', 'All-Stars', body);
  }

  // league leaders
  const ll = atYear('league_leaders');
  if (ll.length) add('leaders', 'MLB Leaders', leaderGrid(db, ll), `<a class="more" href="#/league-leaders/${year}">Full list &rarr;</a>`);

  // bracket
  const br = atYear('postseason');
  if (br.length) add('bracket', 'MLB Postseason', bracket(db, br));

  // 99 club, HOF, draft
  const nn = atYear('ninety_nines');
  if (nn.length) add('ninetynine', '99 Overall Club', `<div class="chip-row">${nn.map(r => `<a class="as-chip" href="#/player/${r.player_id}">${headshot(db, r.player_id, 'hs-sm')}<span><b>${esc(r.player)}</b>${esc(r.position)} · ${logo(r.team, 14)} ${esc(r.team)}</span></a>`).join('')}</div>`);
  const hof = atYear('hall_of_fame');
  if (hof.length) add('hof', 'Hall of Fame Class', `<div class="chip-row">${hof.map(r => `<a class="as-chip" href="#/player/${r.player_id}">${headshot(db, r.player_id, 'hs-sm')}<span><b>${esc(r.player)}</b>${esc(r.position)} · ${logo(r.team, 14)} ${esc(r.team)}</span></a>`).join('')}</div>`);
  const dr = atYear('draft').filter(r => isCLE(r.team));
  if (dr.length) add('draft', 'Indians Draft Picks', table([
    { k: 'round', label: 'Rd', num: true, sort: r => N(r.round) }, { k: 'overall_pick', label: 'Pick', num: true, sort: r => N(r.overall_pick) },
    playerCol(db), posCol, { k: 'age', label: 'Age', num: true, sort: r => N(r.age) }, { k: 'overall', label: 'OVR', num: true, sort: r => N(r.overall) },
  ], dr), `<a class="more" href="#/draft">Full draft &rarr;</a>`);

  return `${head}${strip}${pageNav(nav)}${parts.join('') || empty('Nothing recorded for this season yet.')}`;
}

export function leaderGrid(db, rows) {
  const byCat = {};
  for (const r of rows) (byCat[r.category] ||= []).push(r);
  const cats = Object.keys(LEADER_CATEGORIES).filter(c => byCat[c]).concat(Object.keys(byCat).filter(c => !LEADER_CATEGORIES[c]));
  return `<div class="leader-grid">${cats.map(c => {
    const meta = LEADER_CATEGORIES[c] || { label: c.replace(/_/g, ' ') };
    const list = byCat[c].sort((a, b) => N(a.rank) - N(b.rank));
    return `<div class="leader-card"><h4>${esc(meta.label)}</h4><table>${list.map(r => `<tr class="${isCLE(r.team) ? 'hl-row' : ''}"><td class="rk">${esc(r.rank)}.</td><td>${playerLink(db, r.player_id, r.player)} <small>${logo(r.team, 13)}${esc(TEAMS[r.team]?.abbr || r.team)}</small></td><td class="num">${esc(r.value)}</td></tr>`).join('')}</table></div>`;
  }).join('')}</div>`;
}
