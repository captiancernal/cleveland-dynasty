import { CONFIG, LEADER_CATEGORIES } from '../config.js';
import { N, batTotals, pitTotals, roundIdx } from '../data.js';
import { playerMoves } from './moves.js';
import { esc, table, section, pageNav, empty, rate, dec, int, logo, team, isCLE, playerLink, headshot, headshotUrl, mediaCard, ordinal, pill } from '../ui.js';
import { yearCol, posCol, BAT_STATS, PIT_STATS, batTotalRow, pitTotalRow, GAME_BAT, GAME_PIT } from '../cols.js';

const POS_NAMES = { SP: 'Starting Pitcher', RP: 'Relief Pitcher', CP: 'Closer', C: 'Catcher', '1B': 'First Baseman', '2B': 'Second Baseman', '3B': 'Third Baseman', SS: 'Shortstop', LF: 'Left Fielder', CF: 'Center Fielder', RF: 'Right Fielder', DH: 'Designated Hitter', OF: 'Outfielder', IF: 'Infielder' };

export function playersIndex(db, query = '') {
  const q = query.toLowerCase();
  const all = Object.values(db.players).sort((a, b) => lastName(a.name).localeCompare(lastName(b.name)));
  const cleIds = new Set([...db.T.batting, ...db.T.pitching, ...db.T.postseason_batting, ...db.T.postseason_pitching].map(r => r.player_id));
  const letters = [...new Set(all.map(p => lastName(p.name)[0]?.toUpperCase()).filter(Boolean))].sort();
  const card = p => `<a class="pl-card ${cleIds.has(p.id) ? 'cle' : ''}" href="#/player/${p.id}" data-name="${esc(p.name.toLowerCase())}" data-cle="${cleIds.has(p.id) ? 1 : 0}">${headshot(db, p.id, 'hs-sm')}<span><b>${esc(p.name)}</b><small>${esc(p.pos || '')}${p.first ? ` · since ${esc(p.first)}` : ''}</small></span></a>`;
  const byLetter = letters.map(L => `<h3 id="L-${L}" class="letter">${L}</h3><div class="pl-grid">${all.filter(p => lastName(p.name)[0]?.toUpperCase() === L).map(card).join('')}</div>`).join('');
  return `<h1>Players</h1>
    <p class="lede">${all.length} players have appeared in the dynasty record. <span class="badge-cle">Highlighted</span> players have suited up for the ${esc(CONFIG.franchise)}.</p>
    <div class="filter-bar"><input id="pl-filter" type="search" placeholder="Filter players…" value="${esc(query)}" autocomplete="off"><label><input type="checkbox" id="pl-cle"> ${esc(CONFIG.franchise)} only</label></div>
    <nav class="alpha">${letters.map(L => `<a href="#" data-jump="L-${L}">${L}</a>`).join('')}</nav>
    <div id="pl-list">${byLetter}</div>`;
}
export function bindPlayersIndex(root) {
  const f = root.querySelector('#pl-filter'), c = root.querySelector('#pl-cle');
  if (!f) return;
  const apply = () => {
    const q = f.value.trim().toLowerCase(); const only = c.checked;
    root.querySelectorAll('.pl-card').forEach(el => { el.hidden = (q && !el.dataset.name.includes(q)) || (only && el.dataset.cle !== '1'); });
    root.querySelectorAll('.pl-grid').forEach(gr => { const any = [...gr.children].some(x => !x.hidden); gr.hidden = !any; gr.previousElementSibling.hidden = !any; });
  };
  f.addEventListener('input', apply); c.addEventListener('change', apply); apply();
}
const lastName = n => { const parts = n.replace(/ (Jr\.|Sr\.|II|III)$/, '').split(' '); return parts.length > 1 ? parts.slice(1).join(' ') : n; };

export function playerPage(db, id) {
  const p = db.players[id];
  if (!p) return empty('Player not found.');
  const bat = (db.batByPlayer[id] || []).sort((a, b) => N(a.year) - N(b.year));
  const pit = (db.pitByPlayer[id] || []).sort((a, b) => N(a.year) - N(b.year));
  const psb = (db.psBatByPlayer[id] || []).sort((a, b) => N(a.year) - N(b.year));
  const psp = (db.psPitByPlayer[id] || []).sort((a, b) => N(a.year) - N(b.year));
  const gb = (db.gameBatByPlayer[id] || []).sort((a, b) => a.date.localeCompare(b.date));
  const gp = (db.gamePitByPlayer[id] || []).sort((a, b) => a.date.localeCompare(b.date));
  const awards = (db.awardsByPlayer[id] || []).sort((a, b) => N(a.year) - N(b.year) || N(a.finish) - N(b.finish));
  const as = (db.asByPlayer[id] || []).sort((a, b) => N(a.year) - N(b.year));
  const ll = (db.leadersByPlayer[id] || []);
  const nn = (db.ninetyByPlayer[id] || []);
  const dr = (db.draftByPlayer[id] || []);
  const hof = (db.hofByPlayer[id] || [])[0];
  const wsMvps = Object.values(db.wsMvp).filter(r => r.series_mvp_id === id);
  const isPitcher = ['SP', 'RP', 'CP', 'P'].includes(p.pos) || (pit.length && !bat.length);

  // Championship rings: on the CLE roster in a title year.
  const cleYears = new Set([...bat, ...pit, ...psb, ...psp].map(r => N(r.year)));
  const rings = db.championYears.filter(y => cleYears.has(y));

  // Latest known team
  const sightings = [
    ...bat.map(r => [r.year, r.team]), ...pit.map(r => [r.year, r.team]), ...as.map(r => [r.year, r.team]),
    ...awards.map(r => [r.year, r.team]), ...nn.map(r => [r.year, r.team]), ...dr.map(r => [r.year, r.team]), ...ll.map(r => [r.year, r.team]),
    // Opening Day, then trades (in order) so the latest move decides the current team within a year.
    ...(db.odByPlayer[id] || []).map(r => [r.year, r.team]),
    ...[...(db.txByPlayer[id] || [])].sort((a, b) => a.transaction_id.localeCompare(b.transaction_id)).map(r => [r.year, r.direction === 'acquired' ? CONFIG.franchise : r.partner_team]),
  ].filter(x => x[1]).sort((a, b) => N(a[0]) - N(b[0]));
  const lastTeam = sightings.length ? sightings[sightings.length - 1][1] : '';

  // ---------- badges ----------
  const badges = [];
  if (hof) badges.push(`<span class="bling hof">Hall of Fame ${esc(hof.year)}</span>`);
  rings.forEach(y => badges.push(`<span class="bling ring">${y} World Series Champion</span>`));
  wsMvps.forEach(r => badges.push(`<span class="bling gold">${esc(r.year)} WS MVP</span>`));
  awards.filter(a => N(a.finish) === 1).forEach(a => badges.push(`<span class="bling gold">${esc(a.year)} ${esc(a.league)} ${esc(a.award)}</span>`));
  const asYears = [...new Set(as.map(r => r.year))];
  if (asYears.length) badges.push(`<span class="bling">${asYears.length}x All-Star</span>`);
  if (nn.length) badges.push(`<span class="bling ninety">99 Club ×${nn.length}</span>`);

  // ---------- header ----------
  const realLink = N(p.mlbam) ? `<a href="https://www.mlb.com/player/${p.mlbam}" target="_blank" rel="noopener">MLB.com profile</a> · <a href="https://www.baseball-reference.com/search/search.fcgi?search=${encodeURIComponent(p.name)}" target="_blank" rel="noopener">Real-life stats</a>` : '';
  const quick = isPitcher && pit.length ? (() => { const t = pitTotals(pit); return [['W-L', `${t.w}-${t.l}`], ['ERA', dec(t.era)], ['SO', int(t.so)], ['IP', t.ip], ['SV', int(t.sv)], ['WHIP', dec(t.whip)]]; })()
    : bat.length ? (() => { const t = batTotals(bat); return [['G', int(t.g)], ['H', int(t.h)], ['HR', int(t.hr)], ['RBI', int(t.rbi)], ['BA', rate(t.avg)], ['OPS', rate(t.ops)]]; })() : [];
  const head = `<div class="player-head">
    <div class="ph-photo"><img src="${headshotUrl(p.mlbam, 360)}" alt="${esc(p.name)}">${lastTeam ? `<span class="ph-team">${logo(lastTeam, 40)}</span>` : ''}</div>
    <div class="ph-main">
      <h1>${esc(p.name)}</h1>
      <p class="meta"><strong>Position:</strong> ${esc(POS_NAMES[p.pos] || p.pos || 'Unknown')}</p>
      ${lastTeam ? `<p class="meta"><strong>Last seen with:</strong> ${team(lastTeam, 16)}</p>` : ''}
      ${p.first ? `<p class="meta"><strong>First appeared:</strong> ${esc(p.first)}${dr.length ? ` · Drafted ${dr.map(d => `${esc(d.year)} Rd ${esc(d.round)}, #${esc(d.overall_pick)} overall by the ${esc(d.team)}`).join('; ')}` : ''}</p>` : ''}
      <p class="meta muted">Dynasty ID ${esc(p.id)}${realLink ? ` · ${realLink}` : ''}</p>
      ${badges.length ? `<div class="blings">${badges.join('')}</div>` : ''}
    </div>
    ${quick.length ? `<div class="ph-summary"><h4>${esc(CONFIG.franchise)} Career</h4><div class="sum-grid">${quick.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div></div>` : ''}
  </div>`;

  // ---------- sections ----------
  const parts = [], nav = [];
  const add = (sid, title, body, extra) => { if (body) { parts.push(section(sid, title, body, extra)); nav.push([sid, title]); } };

  const tags = db.tagsByPlayer[id] || [];
  const hlIds = [...new Set(tags.map(t => t.highlight_id))];
  if (hlIds.length) add('highlights', 'Highlights', `<div class="hl-grid">${hlIds.map(h => db.highlights[h]).filter(Boolean).map(h => mediaCard(db, h)).join('')}</div>`);

  add('moves', 'Transactions & Opening Day', playerMoves(db, id));

  if (hof) {
    const line = hof.ip ? `${hof.w}-${hof.l}, ${hof.era} ERA, ${int(hof.so)} SO, ${hof.ip} IP${N(hof.sv) ? `, ${hof.sv} SV` : ''}` : `${hof.avg} BA, ${int(hof.h)} H, ${int(hof.hr)} HR, ${int(hof.rbi)} RBI${hof.sb ? `, ${hof.sb} SB` : ''}`;
    add('hof', 'Hall of Fame', `<div class="hof-plaque">${logo(hof.team, 64)}<div><h3>Inducted ${esc(hof.year)}</h3><p>${esc(hof.team)} · #${esc(hof.jersey_number)} · ${esc(hof.first_year)}–${esc(hof.last_year)}</p><p class="plaque-line">Career: ${esc(line)}</p></div></div>`);
  }

  const order = isPitcher ? ['pit', 'bat'] : ['bat', 'pit'];
  for (const o of order) {
    if (o === 'bat' && bat.length) add('batting', 'Standard Batting', table([yearCol, { k: 'team', label: 'Tm', fmt: r => logo(r.team, 18) + ' ' + esc(r.team) }, posCol, ...BAT_STATS], bat, { foot: bat.length > 1 ? [batTotalRow(batTotals(bat), `${bat.length} Yrs`)] : [] }));
    if (o === 'pit' && pit.length) add('pitching', 'Standard Pitching', table([yearCol, { k: 'team', label: 'Tm', fmt: r => logo(r.team, 18) + ' ' + esc(r.team) }, posCol, ...PIT_STATS], pit, { foot: pit.length > 1 ? [pitTotalRow(pitTotals(pit), `${pit.length} Yrs`)] : [] }));
  }
  if (psb.length) add('ps-batting', 'Postseason Batting', table([yearCol, posCol, ...BAT_STATS], psb, { foot: psb.length > 1 ? [batTotalRow(batTotals(psb), 'Totals')] : [] }));
  if (psp.length) add('ps-pitching', 'Postseason Pitching', table([yearCol, posCol, ...PIT_STATS], psp, { foot: psp.length > 1 ? [pitTotalRow(pitTotals(psp), 'Totals')] : [] }));
  if (gb.length) add('gamelog-bat', 'Postseason Game Log (Batting)', table(GAME_BAT(db), gb));
  if (gp.length) add('gamelog-pit', 'Postseason Game Log (Pitching)', table(GAME_PIT(db), gp));

  // Appearances on screens that don't fit the stat tables
  if (awards.length) add('awards', 'Awards Voting', table([
    yearCol, { k: 'award', label: 'Award', cls: 'left', fmt: r => `${esc(r.league)} ${esc(r.award)}` },
    { k: 'finish', label: 'Finish', fmt: r => (N(r.finish) === 1 ? '<b class="gold-txt">Winner</b>' : ordinal(r.finish)), sort: r => N(r.finish) },
    { k: 'team', label: 'Team', cls: 'left', fmt: r => team(r.team, 16) },
    { k: 'line', label: 'Stat line', cls: 'left', fmt: r => esc(r.award === 'All-Star Game MVP' ? `In the game: ${r.wins === '1' ? 'W' : 'ND'}, ${r.strikeouts} SO, ${r.era} ERA` : r.era
      ? [r.wins !== '' && r.wins != null ? `${r.wins}-${r.losses}` : '', r.saves ? `${r.saves} SV` : '', `${r.era} ERA`, r.strikeouts ? `${r.strikeouts} SO` : ''].filter(Boolean).join(', ')
      : [r.avg ? `${r.avg} BA` : '', r.hr ? `${r.hr} HR` : '', r.rbi ? `${r.rbi} RBI` : ''].filter(Boolean).join(', ')) },
  ], awards));
  if (as.length) add('allstar', 'All-Star Selections', table([
    yearCol, { k: 'league', label: 'Lg' }, { k: 'role', label: 'Role', cls: 'left', fmt: r => esc({ lineup: `Starter${r.slot ? ` (batting ${r.slot})` : ''}`, starting_pitcher: 'Starting pitcher', pitcher: 'Pitcher', bench: 'Reserve' }[r.role] || r.role) },
    posCol, { k: 'team', label: 'Team', cls: 'left', fmt: r => team(r.team, 16) }, { k: 'overall', label: 'OVR', num: true, sort: r => N(r.overall) },
  ], as));
  if (ll.length) add('leaders', 'League Leader Finishes', table([
    yearCol, { k: 'category', label: 'Category', cls: 'left', fmt: r => esc(LEADER_CATEGORIES[r.category]?.label || r.category) },
    { k: 'rank', label: 'Rank', num: true, fmt: r => ordinal(r.rank), sort: r => N(r.rank) }, { k: 'value', label: 'Value', num: true }, { k: 'team', label: 'Team', cls: 'left', fmt: r => team(r.team, 16) },
  ], ll.sort((a, b) => N(a.year) - N(b.year) || N(a.rank) - N(b.rank))));
  if (nn.length) add('ninetynine', '99 Overall Club', table([
    { k: 'year', label: 'Season', fmt: r => esc(r.year), sort: r => N(r.year) }, { k: 'team', label: 'Team', cls: 'left', fmt: r => team(r.team, 16) }, { k: 'age', label: 'Age', num: true }, { k: 'potential', label: 'Pot', num: true },
    { k: 'line', label: 'Season line', cls: 'left', fmt: r => esc(r.era ? `${r.w}-${r.l}, ${r.era} ERA, ${r.so} SO, ${r.ip} IP` : r.avg ? `${r.avg} BA, ${r.hr} HR, ${r.rbi} RBI, ${r.sb} SB` : '') },
  ], nn));
  if (sightings.length) {
    const tl = [];
    for (const [y, t] of sightings) if (!tl.length || tl[tl.length - 1].t !== t) tl.push({ y, t, to: y }); else tl[tl.length - 1].to = y;
    add('teams', 'Teams', `<ol class="timeline">${tl.map(x => `<li>${logo(x.t, 28)}<span><b>${esc(x.t)}</b><small>${x.y === x.to ? esc(x.y) : `${esc(x.y)}–${esc(x.to)}`}</small></span></li>`).join('')}</ol><p class="note">Based on every screen this player appears on (rosters, awards, All-Star teams, leaderboards).</p>`);
  }
  return `${head}${pageNav(nav)}${parts.join('') || empty('No stats recorded for this player yet.')}`;
}
