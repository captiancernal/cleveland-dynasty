import { CONFIG } from '../config.js';
import { N, batTotals, pitTotals } from '../data.js';
import { openingDayCard, tradeCard, tradesForYear, GAME_TYPE } from './moves.js';
import { esc, section, table, rate, dec, int, money, ordinal, logo, isCLE, playerLink, headshot, mediaCard, pennant, videoPlayer, nameLink } from '../ui.js';

export function homePage(db) {
  const T = db.T;
  const played = T.season_summary.map(s => N(s.year)).sort((a, b) => a - b);
  const last = played[played.length - 1];
  const s = db.summaryByYear[last] || {};
  const nextYear = Math.max(...db.seasons);
  const upcoming = nextYear > last ? nextYear : null;
  const upMgr = upcoming ? T.staff.find(r => N(r.year) === upcoming && r.role === 'Manager') : null;

  const wins = T.season_summary.reduce((a, r) => a + (N(r.wins) || 0), 0);
  const losses = T.season_summary.reduce((a, r) => a + (N(r.losses) || 0), 0);
  const psW = db.games.filter(g => g.result === 'W').length, psL = db.games.filter(g => g.result === 'L').length;

  // ---------- hero ----------
  const hero = `<section class="hero">
    <div class="hero-logo">${logo(CONFIG.franchise, 120, 'team-cap-on-dark')}</div>
    <div class="hero-text">
      <p class="eyebrow">MLB The Show 26 Franchise · Est. ${played[0] || ''}</p>
      <h1>${esc(CONFIG.franchiseCity)} ${esc(CONFIG.franchise)} Dynasty</h1>
      <div class="hero-stats">
        <div><b>${played.length}</b><span>Seasons</span></div>
        <div><b>${wins}-${losses}</b><span>Regular season</span></div>
        <div><b>${psW}-${psL}</b><span>Postseason</span></div>
        <div><b>${db.championYears.length}</b><span>World Series titles</span></div>
      </div>
    </div>
    <div class="hero-pennants">${db.championYears.map(y => `<a href="#/postseason/${y}">${pennant(y)}</a>`).join('')}</div>
  </section>`;

  // ---------- latest season ----------
  const champ = db.championYears.includes(last);
  const latest = `<div class="card season-card">
    <h3><a href="#/season/${last}">${last} Season</a></h3>
    <p class="big-rec">${esc(s.wins)}-${esc(s.losses)}</p>
    <p>${ordinal(s.division_finish)} in ${esc(s.division)}</p>
    <p>${champ ? '<strong class="champ">World Series Champions</strong>' : esc(s.playoff_result === 'missed' ? 'Missed the playoffs' : s.playoff_result)}</p>
    <p class="muted">Manager: ${esc(s.manager)}</p>
    ${upcoming ? `<div class="next-up"><b>Up next: ${upcoming}</b>${upMgr ? `<span>New manager ${esc(upMgr.name)} (${esc(upMgr.contract_years)}-year deal)</span>` : ''}<a href="#/season/${upcoming}">Preview &rarr;</a></div>` : ''}
  </div>`;

  // ---------- featured highlight ----------
  // Newest year first; within a year postseason moments, then game moments over trades, then newest.
  const isTrade = h => Object.values(db.trades).some(rs => rs[0].highlight_id === h.highlight_id);
  const rank = h => (h.phase === 'postseason' ? 0 : isTrade(h) ? 2 : 1);
  const hls = Object.values(db.highlights).sort((a, b) => N(b.year) - N(a.year) || rank(a) - rank(b) || b.highlight_id.localeCompare(a.highlight_id));
  const feat = hls[0];
  const featVid = feat ? (db.mediaByHighlight[feat.highlight_id] || []).find(m => m.media_type === 'video') : null;
  const featured = feat ? `<div class="card featured">
    <h3>Featured Highlight</h3>
    ${featVid ? videoPlayer(featVid.drive_file_id, feat.title) : mediaCard(db, feat, { big: true })}
    <p><a href="#/highlight/${feat.highlight_id}"><b>${esc(feat.title)}</b></a></p>
    <div class="hl-strip">${hls.slice(1, 4).map(h => mediaCard(db, h)).join('')}</div>
    <p><a href="#/highlights">All highlights &rarr;</a></p>
  </div>` : '';

  // ---------- Opening Day + latest trades ----------
  const odYear = Math.max(0, ...Object.keys(db.openingDay).map(Number));
  const od = odYear ? `<div class="card"><h3>Opening Day ${odYear} <a class="more" href="#/opening-day/${odYear}">Full card &rarr;</a></h3>${openingDayCard(db, odYear, { compact: true })}${db.rsGames.filter(g => N(g.year) === odYear && g.game_type !== 'opening_day').map(g => `<p class="od-extra"><b>${esc(GAME_TYPE[g.game_type] || g.game_type)}:</b> ${g.result} ${esc(g.cle_runs)}-${esc(g.opp_runs)} ${g.home_away === 'away' ? 'at' : 'vs'} ${esc(g.opponent)}. ${esc(g.note.replace(/^Home opener; /, ''))}</p>`).join('')}</div>` : '';
  const trYear = Math.max(0, ...Object.values(db.trades).map(rs => N(rs[0].year)));
  const trades = trYear ? `<div class="card"><h3>${trYear} Trades <a class="more" href="#/transactions">All transactions &rarr;</a></h3><div class="trade-grid">${tradesForYear(db, trYear).reverse().map(t => tradeCard(db, t)).join('')}</div></div>` : '';

  // ---------- franchise leaders ----------
  const bats = Object.entries(db.batByPlayer).map(([id, rs]) => ({ id, t: batTotals(rs) }));
  const pits = Object.entries(db.pitByPlayer).map(([id, rs]) => ({ id, t: pitTotals(rs) }));
  const top = (arr, f, fmt, min = () => true, low = false) => arr.filter(min).filter(e => f(e) !== null && (low || f(e) > 0)).sort((a, b) => (low ? f(a) - f(b) : f(b) - f(a))).slice(0, 5)
    .map((e, i) => `<li>${i === 0 ? headshot(db, e.id, 'hs-sm') : '<span class="hs-sm ph-blank"></span>'}<span>${playerLink(db, e.id)}</span><b>${fmt(f(e))}</b></li>`).join('');
  const lb = (title, list) => `<div class="mini-leader"><h4>${title}</h4><ol>${list}</ol></div>`;
  const leaders = `<div class="card"><h3>Franchise Leaders <a class="more" href="#/leaders/career">More &rarr;</a></h3><div class="mini-leaders">
    ${lb('Home Runs', top(bats, e => e.t.hr, int))}
    ${lb('Hits', top(bats, e => e.t.h, int))}
    ${lb('Batting Avg', top(bats, e => e.t.avg, rate, e => e.t.ab >= 500))}
    ${lb('Wins', top(pits, e => e.t.w, int))}
    ${lb('Strikeouts', top(pits, e => e.t.so, int))}
    ${lb('Saves', top(pits, e => e.t.sv, int))}
  </div></div>`;

  // ---------- awards & honors ----------
  const cleAwards = T.awards.filter(a => isCLE(a.team) && N(a.finish) === 1).sort((a, b) => N(b.year) - N(a.year));
  const mvps = Object.values(db.wsMvp).filter(r => isCLE(r.winner));
  const honors = `<div class="card"><h3>${esc(CONFIG.franchise)} Award Winners</h3><ul class="honors">
    ${mvps.map(r => `<li>${headshot(db, r.series_mvp_id, 'hs-sm')}<span>${playerLink(db, r.series_mvp_id, r.series_mvp)}<small>${esc(r.year)} World Series MVP</small></span></li>`).join('')}
    ${cleAwards.map(a => `<li>${headshot(db, a.player_id, 'hs-sm')}<span>${playerLink(db, a.player_id, a.player)}<small>${esc(a.year)} ${esc(a.league)} ${esc(a.award)}</small></span></li>`).join('') || '<li class="muted">None yet.</li>'}
  </ul><p><a href="#/awards">Awards history &rarr;</a></p></div>`;

  // ---------- HOF ----------
  const hofYear = Math.max(...T.hall_of_fame.map(r => N(r.year)));
  const hof = T.hall_of_fame.filter(r => N(r.year) === hofYear);
  const hofCard = hof.length ? `<div class="card"><h3>Hall of Fame Class of ${hofYear}</h3><ul class="honors">${hof.map(r => `<li>${headshot(db, r.player_id, 'hs-sm')}<span>${playerLink(db, r.player_id, r.player)}<small>${esc(r.position)} · ${logo(r.team, 13)} ${esc(r.team)} · ${esc(r.first_year)}–${esc(r.last_year)}</small></span></li>`).join('')}</ul><p><a href="#/hof">All inductees &rarr;</a></p></div>` : '';

  // ---------- recap excerpt ----------
  const wrap = db.wrapByYear[last];
  const recap = wrap ? `<div class="card recap"><h3>${last} in Review</h3><p>${esc(wrap.length > 520 ? wrap.slice(0, wrap.lastIndexOf(' ', 520)) + '…' : wrap)}</p><p><a href="#/season/${last}#recap">Read the full recap &rarr;</a></p></div>` : '';

  // ---------- year by year ----------
  const yby = table([
    { k: 'year', label: 'Year', fmt: r => `<a href="#/season/${r.year}">${esc(r.year)}</a>`, sort: r => N(r.year) },
    { k: 'rec', label: 'W-L', fmt: r => `${esc(r.wins)}-${esc(r.losses)}` },
    { k: 'division_finish', label: 'Fin', fmt: r => ordinal(r.division_finish) },
    { k: 'playoff_result', label: 'Postseason', cls: 'left', fmt: r => (/world series winner/i.test(r.playoff_result) ? '<strong class="champ">Won WS</strong>' : esc(r.playoff_result === 'missed' ? '—' : r.playoff_result)) },
    { k: 'manager', label: 'Manager', cls: 'left' },
  ], [...T.season_summary].sort((a, b) => N(b.year) - N(a.year)), { rowCls: r => (/world series winner/i.test(r.playoff_result) ? 'champ-row' : '') });

  return `${hero}
    <div class="home-grid">
      <div class="col-main">${featured}${trades}${recap}${section('yby', 'Year by Year', yby, '<a class="more" href="#/seasons">Franchise history &rarr;</a>')}</div>
      <div class="col-side">${latest}${od}${leaders}${honors}${hofCard}</div>
    </div>`;
}
