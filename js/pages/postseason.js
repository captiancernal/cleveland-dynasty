import { CONFIG, ROUND_ORDER } from '../config.js';
import { N, roundIdx, ipToOuts, outsToIp } from '../data.js';
import { esc, table, section, empty, rate, dec, int, logo, isCLE, playerLink, headshot, nameLink, fmtDate, roundShort, mediaCard, pennant, videoPlayer } from '../ui.js';
import { posCol } from '../cols.js';

const CLE = CONFIG.franchise;

// Bracket laid out AL rounds -> World Series <- NL rounds.
export function bracket(db, rows) {
  const lg = (l, rounds) => rounds.map(r => rows.filter(x => x.round === r && (x.league === l || x.league === 'MLB')));
  const alRounds = ['AL Wild Card', 'ALDS', 'ALCS'].filter(r => rows.some(x => x.round === r));
  const nlRounds = ['NL Wild Card', 'NLDS', 'NLCS'].filter(r => rows.some(x => x.round === r));
  const ws = rows.filter(x => x.round === 'World Series');
  const matchup = m => {
    const side = (t, seed, w, win) => `<div class="bm-team ${win ? 'win' : ''} ${isCLE(t) ? 'cle' : ''}">${seed ? `<span class="seed">${esc(seed)}</span>` : ''}${logo(t, 20)}<span class="bm-name">${esc(t)}</span><span class="bm-w">${esc(w)}</span></div>`;
    const cleGame = isCLE(m.winner) || isCLE(m.loser) ? db.games.find(g => N(g.year) === N(m.year) && g.round === m.round) : null;
    const inner = `${side(m.winner, m.winner_seed, m.winner_wins, true)}${side(m.loser, m.loser_seed, m.loser_wins, false)}${m.series_mvp ? `<div class="bm-mvp">MVP: ${nameLink(db, m.series_mvp)}</div>` : ''}`;
    return cleGame ? `<a class="bm" href="#/series/${m.year}/${encodeURIComponent(m.round)}">${inner}</a>` : `<div class="bm">${inner}</div>`;
  };
  const col = (title, ms) => `<div class="b-col"><h5>${esc(title)}</h5>${ms.map(matchup).join('')}</div>`;
  return `<div class="bracket-wrap"><div class="bracket">
    ${lg('AL', alRounds).map((ms, i) => col(alRounds[i].replace('AL ', 'AL '), ms)).join('')}
    ${col('World Series', ws)}
    ${lg('NL', nlRounds).map((ms, i) => col(nlRounds[i], ms)).reverse().join('')}
  </div></div>`;
}

export function postseasonIndex(db) {
  const years = [...new Set(db.T.postseason.map(r => N(r.year)))].sort((a, b) => b - a);
  const wsRows = db.T.postseason.filter(r => r.round === 'World Series').sort((a, b) => N(b.year) - N(a.year));
  const ws = table([
    { k: 'year', label: 'Year', fmt: r => `<a href="#/postseason/${r.year}">${esc(r.year)}</a>`, sort: r => N(r.year) },
    { k: 'winner', label: 'Champion', cls: 'left', fmt: r => `<span class="team">${logo(r.winner, 18)}<b>${esc(r.winner)}</b></span>` },
    { k: 'series_result', label: 'Result' },
    { k: 'loser', label: 'Runner-up', cls: 'left', fmt: r => `<span class="team">${logo(r.loser, 18)}${esc(r.loser)}</span>` },
    { k: 'series_mvp', label: 'WS MVP', cls: 'left', fmt: r => (r.series_mvp_id ? playerLink(db, r.series_mvp_id, r.series_mvp) : '') },
  ], wsRows, { rowCls: r => (isCLE(r.winner) ? 'champ-row' : '') });
  const cle = db.T.playoffs.sort((a, b) => N(b.year) - N(a.year) || roundIdx(a.round) - roundIdx(b.round));
  const cleT = table([
    { k: 'year', label: 'Year', fmt: r => `<a href="#/postseason/${r.year}">${esc(r.year)}</a>`, sort: r => N(r.year) },
    { k: 'round', label: 'Round', cls: 'left', fmt: r => { const g = db.games.find(x => N(x.year) === N(r.year) && (x.round === r.round || x.round.endsWith(r.round))); return g ? `<a href="#/series/${r.year}/${encodeURIComponent(g.round)}">${esc(r.round)}</a>` : esc(r.round); } },
    { k: 'opponent', label: 'Opponent', cls: 'left', fmt: r => `<span class="team">${logo(r.opponent, 18)}${esc(r.opponent)}</span>` },
    { k: 'series_result', label: 'Series', fmt: r => `<b class="${N(r.cle_wins) > N(r.opp_wins) ? 'pos' : 'neg'}">${N(r.cle_wins) > N(r.opp_wins) ? 'W' : 'L'} ${esc(r.cle_wins)}-${esc(r.opp_wins)}</b>` },
  ], cle);
  return `<h1>Postseason History</h1>
    ${section('ws', 'World Series Champions', ws)}
    ${section('cle', `${CLE} Postseason Series`, cle.length ? cleT : empty('No postseason appearances yet.'))}
    ${section('years', 'Brackets by Year', `<div class="year-pills">${years.map(y => `<a class="pill-link" href="#/postseason/${y}">${y}</a>`).join('')}</div>`)}`;
}

export function postseasonYear(db, yearStr) {
  const year = N(yearStr);
  const rows = db.T.postseason.filter(r => N(r.year) === year);
  const games = db.games.filter(g => N(g.year) === year);
  const champ = db.championYears.includes(year);
  const byRound = {};
  for (const g of games) (byRound[g.round] ||= []).push(g);
  const rounds = Object.keys(byRound).sort((a, b) => roundIdx(a) - roundIdx(b));
  const gl = rounds.map(r => {
    const gs = byRound[r];
    const opp = gs[0].opponent; const w = gs.filter(g => g.result === 'W').length; const l = gs.length - w;
    return `<div class="series-block"><h3><a href="#/series/${year}/${encodeURIComponent(r)}">${esc(r)}</a> vs ${logo(opp, 20)} ${esc(opp)} <span class="${w > l ? 'pos' : 'neg'}">${w > l ? 'Won' : 'Lost'} ${w}-${l}</span></h3>${gameList(db, gs)}</div>`;
  }).join('');
  return `<div class="crumbs"><a href="#/postseason">Postseason</a> · <a href="#/season/${year}">${year} season</a></div>
    <h1>${year} MLB Postseason</h1>
    ${champ ? `<div class="banner-champ">${pennant(year)}<div><h2>${year} World Series Champions</h2><p>The ${esc(CONFIG.franchiseCity)} ${esc(CONFIG.franchise)} won it all.</p></div></div>` : ''}
    ${section('bracket', 'Bracket', rows.length ? bracket(db, rows) : empty('No bracket entered.'))}
    ${games.length ? section('games', `${CLE} Games`, gl) : ''}`;
}

function gameList(db, gs) {
  return table([
    { k: 'game', label: 'Gm', num: true, sort: g => N(g.game) },
    { k: 'date', label: 'Date', fmt: g => `<a href="#/game/${db.gameKey(g)}">${esc(fmtDate(g.date))}</a>`, sort: g => g.date },
    { k: 'home_away', label: '', fmt: g => (g.home_away === 'away' ? '@' : 'vs') },
    { k: 'opponent', label: 'Opp', cls: 'left', fmt: g => `<span class="team">${logo(g.opponent, 16)}${esc(g.opponent)}</span>` },
    { k: 'result', label: 'W/L', fmt: g => `<b class="${g.result === 'W' ? 'pos' : 'neg'}">${esc(g.result)}</b>` },
    { k: 'score', label: 'Score', fmt: g => `${esc(g.cle_runs)}-${esc(g.opp_runs)}${N(g.innings) > 9 ? ` (${g.innings})` : ''}`, sort: g => N(g.cle_runs) - N(g.opp_runs) },
    { k: 'series', label: 'Series', fmt: g => `${esc(g.series_cle_wins)}-${esc(g.series_opp_wins)}` },
    { k: 'winning_pitcher', label: 'Win', cls: 'left', fmt: g => nameLink(db, g.winning_pitcher) },
    { k: 'losing_pitcher', label: 'Loss', cls: 'left', fmt: g => nameLink(db, g.losing_pitcher) },
    { k: 'save_pitcher', label: 'Save', cls: 'left', fmt: g => nameLink(db, g.save_pitcher) },
    { k: 'hl', label: '', fmt: g => (gameHighlights(db, g).length ? '<span class="vid-ico" title="Has highlights">&#9654;</span>' : '') },
  ], gs);
}

const gameHighlights = (db, g) => db.T.highlights.filter(h => N(h.year) === N(g.year) && h.round === g.round && N(h.game) === N(g.game));

export function seriesPage(db, yearStr, roundEnc) {
  const year = N(yearStr); const round = decodeURIComponent(roundEnc);
  const gs = db.games.filter(g => N(g.year) === year && g.round === round);
  if (!gs.length) return empty('Series not found.');
  const opp = gs[0].opponent;
  const w = gs.filter(g => g.result === 'W').length; const l = gs.length - w;
  const dates = new Set(gs.map(g => g.date));
  const keyOf = r => `${r.year}|${r.round}|${r.game}`;
  const inSeries = new Set(gs.map(keyOf));
  const bat = db.T.postseason_game_batting.filter(r => inSeries.has(keyOf(r)));
  const pit = db.T.postseason_game_pitching.filter(r => inSeries.has(keyOf(r)));
  // Series totals per player
  const bt = {}; for (const r of bat) { const t = (bt[r.player_id] ||= { player_id: r.player_id, player: r.player, position: r.position, g: 0, ab: 0, r: 0, h: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, bb: 0, so: 0, sb: 0 }); t.g++; for (const k of ['ab', 'r', 'h', 'doubles', 'triples', 'hr', 'rbi', 'bb', 'so', 'sb']) t[k] += N(r[k]) || 0; }
  const pt = {}; for (const r of pit) { const t = (pt[r.player_id] ||= { player_id: r.player_id, player: r.player, g: 0, gs: 0, w: 0, l: 0, sv: 0, outs: 0, h: 0, r: 0, er: 0, bb: 0, so: 0 }); t.g++; if (r.started === 'Y') t.gs++; if (r.decision === 'W') t.w++; if (r.decision === 'L') t.l++; if (r.decision === 'SV') t.sv++; t.outs += ipToOuts(r.ip); for (const k of ['h', 'r', 'er', 'bb', 'so']) t[k] += N(r[k]) || 0; }
  const n = (k, label) => ({ k, label, num: true, fmt: r => int(r[k]), sort: r => r[k] });
  const pc = { k: 'player', label: 'Player', cls: 'left', fmt: r => `<span class="pcell">${headshot(db, r.player_id, 'hs-xs')}${playerLink(db, r.player_id, r.player)}</span>`, sort: r => r.player };
  const batT = table([pc, posCol, n('g', 'G'), n('ab', 'AB'), n('r', 'R'), n('h', 'H'), n('doubles', '2B'), n('triples', '3B'), n('hr', 'HR'), n('rbi', 'RBI'), n('bb', 'BB'), n('so', 'SO'), n('sb', 'SB'),
    { k: 'avg', label: 'BA', num: true, fmt: r => (r.ab ? rate(r.h / r.ab) : ''), sort: r => (r.ab ? r.h / r.ab : '') }], Object.values(bt).sort((a, b) => b.ab - a.ab));
  const pitT = table([pc, n('g', 'G'), n('gs', 'GS'), n('w', 'W'), n('l', 'L'), n('sv', 'SV'),
    { k: 'ip', label: 'IP', num: true, fmt: r => outsToIp(r.outs), sort: r => r.outs }, n('h', 'H'), n('r', 'R'), n('er', 'ER'), n('bb', 'BB'), n('so', 'SO'),
    { k: 'era', label: 'ERA', num: true, fmt: r => (r.outs ? dec(r.er * 27 / r.outs) : ''), sort: r => (r.outs ? r.er * 27 / r.outs : '') }], Object.values(pt).sort((a, b) => b.outs - a.outs));
  const hl = db.T.highlights.filter(h => N(h.year) === year && h.round === round);
  const mvp = db.T.postseason.find(r => N(r.year) === year && r.round === round && r.series_mvp_id);
  return `<div class="crumbs"><a href="#/postseason">Postseason</a> · <a href="#/postseason/${year}">${year}</a></div>
    <div class="matchup-head">${logo(CLE, 64, 'team-cap-on-light')}<div><h1>${year} ${esc(round)}</h1><p class="meta">${esc(CONFIG.franchise)} ${w > l ? 'defeat' : 'lose to'} ${esc(opp)}, <b>${w}-${l}</b> · ${esc(fmtDate([...dates][0]))} – ${esc(fmtDate([...dates].pop()))}</p>${mvp ? `<p class="meta"><strong>Series MVP:</strong> ${playerLink(db, mvp.series_mvp_id, mvp.series_mvp)}</p>` : ''}</div>${logo(opp, 64)}</div>
    ${hl.length ? section('hl', 'Highlights', `<div class="hl-grid">${hl.map(h => mediaCard(db, h)).join('')}</div>`) : ''}
    ${section('games', 'Games', gameList(db, gs))}
    ${section('bat', 'Series Batting', batT)}
    ${section('pit', 'Series Pitching', pitT)}`;
}

export function gamePage(db, yearStr, roundEnc, gameStr) {
  const year = N(yearStr); const round = decodeURIComponent(roundEnc); const gnum = N(gameStr);
  const g = db.games.find(x => N(x.year) === year && x.round === round && N(x.game) === gnum);
  if (!g) return empty('Game not found.');
  const idx = db.games.indexOf(g);
  const prev = db.games[idx - 1], next = db.games[idx + 1];
  const same = r => N(r.year) === year && r.round === round && N(r.game) === gnum;
  const bat = db.T.postseason_game_batting.filter(same).sort((a, b) => (N(a.batting_order) ?? 99) - (N(b.batting_order) ?? 99));
  const pit = db.T.postseason_game_pitching.filter(same).sort((a, b) => N(a.appearance_order) - N(b.appearance_order));
  const home = g.home_away === 'home';
  const away = home ? g.opponent : CLE, homeT = home ? CLE : g.opponent;
  const awayR = home ? g.opp_runs : g.cle_runs, homeR = home ? g.cle_runs : g.opp_runs;
  const n = (k, label) => ({ k, label, num: true, fmt: r => (r._tot ? int(r[k]) : esc(r[k] ?? '')), sort: r => N(r[k]) });
  const sum = (rows, keys) => Object.fromEntries(keys.map(k => [k, rows.reduce((a, r) => a + (N(r[k]) || 0), 0)]));
  const bkeys = ['ab', 'r', 'h', 'rbi', 'bb', 'so'];
  const batT = table([
    { k: 'player', label: 'Batting', cls: 'left', fmt: r => (r._tot ? '<strong>Team Totals</strong>' : `<span class="pcell ${bat.findIndex(x => x.batting_order === r.batting_order) !== bat.indexOf(r) ? 'sub' : ''}">${playerLink(db, r.player_id, r.player)} <small>${esc(r.position)}</small></span>`) },
    ...bkeys.map(k => n(k, k.toUpperCase())),
    { k: 'avg_to_date', label: 'BA', num: true, fmt: r => (r._tot ? '' : rate(r.avg_to_date)) },
  ], bat, { foot: [{ _tot: true, ...sum(bat, bkeys) }] });
  const notes = [['2B', 'doubles'], ['3B', 'triples'], ['HR', 'hr'], ['SB', 'sb'], ['CS', 'cs'], ['HBP', 'hbp'], ['GDP', 'gidp'], ['SH', 'sh'], ['SF', 'sf'], ['E', 'e']]
    .map(([lab, k]) => { const xs = bat.filter(r => N(r[k]) > 0).map(r => `${esc(r.player.split(' ').slice(1).join(' ') || r.player)}${N(r[k]) > 1 ? ` ${N(r[k])}` : ''}`); return xs.length ? `<b>${lab}:</b> ${xs.join(', ')}` : ''; }).filter(Boolean);
  const pkeys = ['h', 'r', 'er', 'bb', 'so'];
  const pitT = table([
    { k: 'player', label: 'Pitching', cls: 'left', fmt: r => (r._tot ? '<strong>Team Totals</strong>' : `${playerLink(db, r.player_id, r.player)}${r.note_as_shown ? ` <small class="muted">${esc(r.note_as_shown.startsWith('BS inferred') ? 'BS' : r.note_as_shown)}</small>` : (r.decision ? ` <small>${esc(r.decision)}</small>` : '')}`) },
    { k: 'ip', label: 'IP', num: true, fmt: r => (r._tot ? outsToIp(r.outs) : esc(r.ip)) },
    ...pkeys.map(k => n(k, k.toUpperCase())),
    { k: 'era_to_date', label: 'ERA', num: true, fmt: r => (r._tot ? '' : dec(r.era_to_date)) },
  ], pit, { foot: [{ _tot: true, outs: pit.reduce((a, r) => a + ipToOuts(r.ip), 0), ...sum(pit, pkeys) }] });

  const hl = gameHighlights(db, g);
  const firstVid = hl.map(h => (db.mediaByHighlight[h.highlight_id] || []).find(m => m.media_type === 'video')).find(Boolean);
  const sb = (t, r, isWin) => `<div class="sb-team ${isWin ? 'win' : ''}">${logo(t, 56, 'team-cap-on-dark')}<span class="sb-name">${esc(t)}</span><span class="sb-runs">${esc(r)}</span></div>`;
  return `<div class="crumbs"><a href="#/postseason/${year}">${year} Postseason</a> · <a href="#/series/${year}/${encodeURIComponent(round)}">${esc(round)}</a>${prev ? ` · <a href="#/game/${db.gameKey(prev)}">&larr; Prev game</a>` : ''}${next ? ` · <a href="#/game/${db.gameKey(next)}">Next game &rarr;</a>` : ''}</div>
    <h1>${year} ${esc(round)}, Game ${gnum}</h1>
    <p class="meta">${esc(fmtDate(g.date))} · ${home ? 'Progressive Field' : `at ${esc(g.opponent)}`} · Series ${esc(CONFIG.franchise)} ${esc(g.series_cle_wins)}-${esc(g.series_opp_wins)}${N(g.innings) !== 9 ? ` · ${esc(g.innings)} innings` : ''}</p>
    <div class="scoreboard">${sb(away, awayR, N(awayR) > N(homeR))}<span class="sb-at">@</span>${sb(homeT, homeR, N(homeR) > N(awayR))}
      <div class="sb-dec"><div><b>W:</b> ${nameLink(db, g.winning_pitcher)}</div><div><b>L:</b> ${nameLink(db, g.losing_pitcher)}</div>${g.save_pitcher ? `<div><b>SV:</b> ${nameLink(db, g.save_pitcher)}</div>` : ''}<div class="muted">Starters: ${nameLink(db, g.cle_starter)} vs ${nameLink(db, g.opp_starter)}</div></div>
    </div>
    ${firstVid ? videoPlayer(firstVid.drive_file_id, firstVid.caption) : ''}
    ${hl.length ? section('hl', 'Highlights from this game', `<div class="hl-grid">${hl.map(h => mediaCard(db, h)).join('')}</div>`) : ''}
    ${section('box', `${CONFIG.franchise} Box Score`, `${batT}${notes.length ? `<p class="box-notes">${notes.join(' &nbsp;·&nbsp; ')}</p>` : ''}${pitT}`)}
    <p class="note">Only the ${esc(CONFIG.franchise)} side of the box score is tracked.</p>`;
}
