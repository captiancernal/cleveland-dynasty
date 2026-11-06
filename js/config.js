// Site settings. The Sheet must be shared "Anyone with the link: Viewer".
export const CONFIG = {
  siteName: 'Cleveland Dynasty Reference',
  franchise: 'Indians',
  franchiseCity: 'Cleveland',
  sheetId: '1NUMZCwSm95J1fpUDLKavin9MoxMfAQpVPWTQ_X0FyrU',
  // Optional: put your own Indians logo in assets/logos/ and set its path here,
  // e.g. 'assets/logos/indians.png'. Leave blank to use the MLB "C" mark.
  franchiseLogoOverride: '',
  cacheMinutes: 5,
  tabs: {
    players: 10, draft: 0, staff: 17, standings: 14, season_summary: 1,
    rotation: 2, relievers: 3, lineup: 4, batting: 12, pitching: 13,
    postseason_batting: 19, postseason_pitching: 20, postseason_games: 24,
    postseason_game_batting: 25, postseason_game_pitching: 26,
    awards: 5, playoffs: 6, league_leaders: 18, all_stars: 11, postseason: 15,
    hall_of_fame: 16, highlights: 21, highlight_media: 23, highlight_players: 22,
    ninety_nines: 7, season_wrapup: 8, transactions: 27, opening_day: 28, regular_season_games: 29,
  },
};

// Team names as they appear in-game -> MLB team id (for logos), abbreviation, league, division.
export const TEAMS = {
  'Orioles':      { id: 110, abbr: 'BAL', lg: 'AL', div: 'AL East' },
  'Red Sox':      { id: 111, abbr: 'BOS', lg: 'AL', div: 'AL East' },
  'Yankees':      { id: 147, abbr: 'NYY', lg: 'AL', div: 'AL East' },
  'Rays':         { id: 139, abbr: 'TB',  lg: 'AL', div: 'AL East' },
  'Blue Jays':    { id: 141, abbr: 'TOR', lg: 'AL', div: 'AL East' },
  'White Sox':    { id: 145, abbr: 'CWS', lg: 'AL', div: 'AL Central' },
  'Indians':      { id: 114, abbr: 'CLE', lg: 'AL', div: 'AL Central' },
  'Guardians':    { id: 114, abbr: 'CLE', lg: 'AL', div: 'AL Central' },
  'Tigers':       { id: 116, abbr: 'DET', lg: 'AL', div: 'AL Central' },
  'Royals':       { id: 118, abbr: 'KC',  lg: 'AL', div: 'AL Central' },
  'Twins':        { id: 142, abbr: 'MIN', lg: 'AL', div: 'AL Central' },
  'Astros':       { id: 117, abbr: 'HOU', lg: 'AL', div: 'AL West' },
  'Angels':       { id: 108, abbr: 'LAA', lg: 'AL', div: 'AL West' },
  'Athletics':    { id: 133, abbr: 'ATH', lg: 'AL', div: 'AL West' },
  'Mariners':     { id: 136, abbr: 'SEA', lg: 'AL', div: 'AL West' },
  'Rangers':      { id: 140, abbr: 'TEX', lg: 'AL', div: 'AL West' },
  'Braves':       { id: 144, abbr: 'ATL', lg: 'NL', div: 'NL East' },
  'Marlins':      { id: 146, abbr: 'MIA', lg: 'NL', div: 'NL East' },
  'Mets':         { id: 121, abbr: 'NYM', lg: 'NL', div: 'NL East' },
  'Phillies':     { id: 143, abbr: 'PHI', lg: 'NL', div: 'NL East' },
  'Nationals':    { id: 120, abbr: 'WSH', lg: 'NL', div: 'NL East' },
  'Cubs':         { id: 112, abbr: 'CHC', lg: 'NL', div: 'NL Central' },
  'Reds':         { id: 113, abbr: 'CIN', lg: 'NL', div: 'NL Central' },
  'Brewers':      { id: 158, abbr: 'MIL', lg: 'NL', div: 'NL Central' },
  'Pirates':      { id: 134, abbr: 'PIT', lg: 'NL', div: 'NL Central' },
  'Cardinals':    { id: 138, abbr: 'STL', lg: 'NL', div: 'NL Central' },
  'Diamondbacks': { id: 109, abbr: 'ARI', lg: 'NL', div: 'NL West' },
  'Rockies':      { id: 115, abbr: 'COL', lg: 'NL', div: 'NL West' },
  'Dodgers':      { id: 119, abbr: 'LAD', lg: 'NL', div: 'NL West' },
  'Padres':       { id: 135, abbr: 'SD',  lg: 'NL', div: 'NL West' },
  'Giants':       { id: 137, abbr: 'SF',  lg: 'NL', div: 'NL West' },
};

export const ROUND_ORDER = ['AL Wild Card', 'NL Wild Card', 'Wild Card', 'ALDS', 'NLDS', 'ALCS', 'NLCS', 'World Series'];
export const ROUND_SHORT = { 'AL Wild Card': 'WC', 'NL Wild Card': 'WC', 'Wild Card': 'WC', 'ALDS': 'ALDS', 'NLDS': 'NLDS', 'ALCS': 'ALCS', 'NLCS': 'NLCS', 'World Series': 'WS' };

export const LEADER_CATEGORIES = {
  batting_avg: { label: 'Batting Average', short: 'BA', side: 'bat' },
  home_runs: { label: 'Home Runs', short: 'HR', side: 'bat' },
  rbi: { label: 'Runs Batted In', short: 'RBI', side: 'bat' },
  hits: { label: 'Hits', short: 'H', side: 'bat' },
  runs: { label: 'Runs Scored', short: 'R', side: 'bat' },
  doubles: { label: 'Doubles', short: '2B', side: 'bat' },
  triples: { label: 'Triples', short: '3B', side: 'bat' },
  stolen_bases: { label: 'Stolen Bases', short: 'SB', side: 'bat' },
  walks: { label: 'Walks', short: 'BB', side: 'bat' },
  obp: { label: 'On-Base Percentage', short: 'OBP', side: 'bat' },
  at_bats: { label: 'At Bats', short: 'AB', side: 'bat' },
  batting_war: { label: 'WAR (Position Players)', short: 'WAR', side: 'bat' },
  wins: { label: 'Wins', short: 'W', side: 'pit' },
  era: { label: 'Earned Run Average', short: 'ERA', side: 'pit' },
  strikeouts: { label: 'Strikeouts', short: 'SO', side: 'pit' },
  saves: { label: 'Saves', short: 'SV', side: 'pit' },
  pitching_war: { label: 'WAR (Pitchers)', short: 'WAR', side: 'pit' },
};
