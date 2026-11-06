// Opening Day lineup cards and trades.
import { CONFIG } from '../config.js';
import { N } from '../data.js';
import { esc, section, empty, money, logo, team, playerLink, headshot, fmtDate, table } from '../ui.js';

export const GAME_TYPE = { opening_day: 'Opening Day', home_opener: 'Home Opener', player_home_debut: 'Home Debut' };
const score = g => (g && g.result ? `${g.result} ${g.cle_runs}-${g.opp_runs}` : '');

const PHASE = { spring_training: 'Spring training', offseason: 'Offseason', regular_season: 'Regular season', postseason: 'Postseason', trade_deadline: 'Trade deadline' };

// ---------- Opening Day ----------
export function openingDayCard(db, year, { compact = false } = {}) {
  const rows = db.openingDay[year] || [];
  if (!rows.length) return '';
  const lineup = rows.filter(r => r.role === 'lineup').sort((a, b) => N(a.batting_order) - N(b.batting_order));
  const sp = rows.find(r => r.role === 'starting_pitcher');
  const opp = rows.find(r => r.role === 'opp_starting_pitcher');
  const r0 = rows[0];
  const game = db.rsGames.find(g => N(g.year) === N(year) && g.game_type === 'opening_day');
  const away = r0.home_away === 'away';
  const us = CONFIG.franchise;
  const matchup = away ? `${esc(us)} at ${esc(r0.opponent)}` : `${esc(r0.opponent)} at ${esc(us)}`;

  const line = r => `<li>
      <span class="od-ord">${esc(r.batting_order)}</span>
      ${headshot(db, r.player_id, 'od-hs')}
      <span class="od-name">${playerLink(db, r.player_id, r.player)}${r.prospect === 'Y' ? '<span class="od-flag" title="Prospect / rookie">Rookie</span>' : ''}${r.note && !compact ? `<small>${esc(r.note)}</small>` : ''}</span>
      <span class="od-pos">${esc(r.position)}</span>
      <span class="od-bats" title="Bats">${esc(r.bats_throws)}</span>
      ${r.ovr ? `<span class="od-ovr" title="Overall on Opening Day">${esc(r.ovr)}</span>` : ''}
    </li>`;
  const pitcher = (r, side) => r ? `<div class="od-sp ${side}">${headshot(db, r.player_id, 'od-sp-hs')}<div><small>${side === 'us' ? 'Starting pitcher' : `${esc(r.team)} starter`}</small><b>${playerLink(db, r.player_id, r.player)}</b><span>${esc(r.bats_throws)}</span></div></div>` : '';
  const avg = lineup.filter(r => N(r.ovr)).map(r => N(r.ovr));
  const avgOvr = avg.length ? Math.round(avg.reduce((a, b) => a + b, 0) / avg.length) : null;

  return `<div class="od-card${compact ? ' compact' : ''}">
    <div class="od-head">
      <div class="od-logos">${logo(us, 46, 'team-cap-on-dark')}<span>${away ? '@' : 'vs'}</span>${logo(r0.opponent, 46, 'team-cap-on-dark')}</div>
      <div class="od-title"><span class="od-eyebrow">Opening Day ${esc(year)}</span><b>${matchup}</b><small>${esc(fmtDate(r0.date))}</small></div>
      ${game?.result ? `<div class="od-score ${game.result === 'W' ? 'win' : 'loss'}"><b>${esc(game.result)}</b><span>${esc(game.cle_runs)}-${esc(game.opp_runs)}</span></div>` : ''}
    </div>
    <div class="od-sub"><span>#</span><span></span><span>Player</span><span>Pos</span><span>B</span>${avgOvr ? '<span>OVR</span>' : ''}</div>
    <ol class="od-list">${lineup.map(line).join('')}</ol>
    <div class="od-foot">${pitcher(sp, 'us')}<span class="od-vs">vs</span>${pitcher(opp, 'them')}</div>
    ${avgOvr && !compact ? `<p class="od-note">Lineup average ${avgOvr} OVR on Opening Day. Ratings are an Opening Day snapshot; end-of-season ratings are on the season page.</p>` : ''}
  </div>`;
}

// Opening Day, home opener and other notable regular-season games for a year.
export function milestoneGames(db, year) {
  const rows = db.rsGames.filter(g => N(g.year) === N(year));
  return rows.length ? table([
    { k: 'game_type', label: 'Game', cls: 'left', fmt: g => `<b>${esc(GAME_TYPE[g.game_type] || g.game_type)}</b>` },
    { k: 'date', label: 'Date', fmt: g => esc(fmtDate(g.date)) },
    { k: 'opponent', label: 'Opponent', cls: 'left', fmt: g => `${g.home_away === 'away' ? '@ ' : 'vs '}${team(g.opponent, 16)}` },
    { k: 'result', label: 'Result', fmt: g => (g.result ? `<span class="${g.result === 'W' ? 'pos' : 'neg'}"><b>${esc(score(g))}</b></span>` : '<span class="muted">—</span>') },
    { k: 'note', label: 'Notes', cls: 'left', fmt: g => esc(g.note) },
  ], rows) : '';
}

export function openingDayPage(db, yearStr) {
  const years = Object.keys(db.openingDay).map(Number).sort((a, b) => b - a);
  if (!years.length) return `<h1>Opening Day</h1>${empty('No Opening Day lineups recorded yet.')}`;
  const year = N(yearStr) || years[0];
  const tabs = years.map(y => `<a class="${y === year ? 'on' : ''}" href="#/opening-day/${y}">${y}</a>`).join('');
  return `<h1>Opening Day Lineups</h1><nav class="year-tabs">${tabs}</nav>${openingDayCard(db, year) || empty('No lineup for that year.')}${milestoneGames(db, year) ? section('milestones', 'Milestone Games', milestoneGames(db, year)) : ''}
    <p><a href="#/season/${year}">${year} season page &rarr;</a></p>`;
}

// ---------- Trades ----------
export function tradeCard(db, tid) {
  const rows = db.trades[tid];
  if (!rows?.length) return '';
  const r0 = rows[0];
  const got = rows.filter(r => r.direction === 'acquired');
  const gave = rows.filter(r => r.direction === 'traded_away');
  const head = rows.find(r => r.budget_before) || r0;
  const delta = N(head.budget_after) !== null && N(head.budget_before) !== null ? N(head.budget_after) - N(head.budget_before) : null;
  const pl = r => `<li>${headshot(db, r.player_id, 'hs-sm')}<span class="tr-name">${playerLink(db, r.player_id, r.player)}<small>${esc(r.position)}${r.age ? ` · Age ${esc(r.age)}` : ''}${r.contract_aav ? ` · ${money(r.contract_aav)}/yr, ${esc(r.contract_years)} yr${N(r.contract_years) === 1 ? '' : 's'} left` : ''}</small></span>${r.ovr ? `<span class="tr-ovr" title="Overall / potential at the time of the trade">${esc(r.ovr)}<small>${esc(r.pot)}</small></span>` : ''}</li>`;
  const hl = r0.highlight_id && db.highlights[r0.highlight_id];
  return `<div class="trade-card" id="${esc(tid)}">
    <div class="tr-head"><span class="tr-tag">Trade</span><b>${esc(CONFIG.franchise)} &harr; ${esc(r0.partner_team)}</b><small>${esc(r0.year)} · ${esc(r0.when_note || PHASE[r0.phase] || r0.phase)}</small></div>
    <div class="tr-sides">
      <div class="tr-side us"><h4>${logo(CONFIG.franchise, 22)} ${esc(CONFIG.franchise)} get</h4><ul>${got.map(pl).join('')}</ul></div>
      <div class="tr-side them"><h4>${logo(r0.partner_team, 22)} ${esc(r0.partner_team)} get</h4><ul>${gave.map(pl).join('')}</ul></div>
    </div>
    <div class="tr-foot">${delta !== null ? `<span>Budget ${money(head.budget_before)} &rarr; <b>${money(head.budget_after)}</b> <em class="${delta >= 0 ? 'pos' : 'neg'}">(${delta >= 0 ? '+' : '−'}${money(Math.abs(delta))})</em></span>` : '<span></span>'}${hl ? `<a href="#/highlight/${hl.highlight_id}">Trade screen &rarr;</a>` : ''}</div>
  </div>`;
}

export const tradesForYear = (db, year) => Object.keys(db.trades).filter(t => N(db.trades[t][0].year) === N(year)).sort();

export function transactionsPage(db) {
  const years = [...new Set(Object.values(db.trades).map(rs => N(rs[0].year)))].sort((a, b) => b - a);
  return `<h1>Transactions</h1><p class="lede">Every trade of the dynasty. Ratings are as shown on the trade screen.</p>
    ${years.map(y => section(`y${y}`, String(y), `<div class="trade-grid">${tradesForYear(db, y).map(t => tradeCard(db, t)).join('')}</div>`)).join('') || empty('No trades recorded yet.')}`;
}

// Short list for a player page.
export function playerMoves(db, id) {
  const tx = db.txByPlayer[id] || [];
  const od = db.odByPlayer[id] || [];
  const gm = db.rsGamesByPlayer[id] || [];
  const items = [
    ...tx.map(r => ({ y: N(r.year), html: `${r.direction === 'acquired' ? 'Acquired from' : 'Traded to'} ${team(r.partner_team, 16)} <small class="muted">(${esc(r.when_note || PHASE[r.phase] || '')})</small> · <a href="#/transactions#${esc(r.transaction_id)}">Trade details</a>` })),
    ...od.filter(r => r.role !== 'opp_starting_pitcher').map(r => ({ y: N(r.year), html: `Opening Day: ${r.role === 'starting_pitcher' ? 'starting pitcher' : `batted ${esc(r.batting_order)}${['', 'st', 'nd', 'rd'][N(r.batting_order)] || 'th'}, ${esc(r.position)}`} vs ${team(r.opponent, 16)} · <a href="#/opening-day/${esc(r.year)}">Lineup card</a>` })),
    ...gm.map(g => ({ y: N(g.year), html: `${esc(GAME_TYPE[g.game_type] || g.game_type)}: ${esc(g.note)} <small class="muted">(${[`${g.home_away === 'away' ? '@' : 'vs'} ${esc(g.opponent)}`, esc(score(g))].filter(Boolean).join(', ')})</small>` })),
  ].sort((a, b) => a.y - b.y);
  return items.length ? `<ul class="moves">${items.map(i => `<li><b>${i.y}</b><span>${i.html}</span></li>`).join('')}</ul>` : '';
}
