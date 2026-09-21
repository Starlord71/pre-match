import env from '../config/env.js';
import * as teamsRepository from '../repositories/teams.repository.js';
import * as matchesRepository from '../repositories/matches.repository.js';
import { getDb } from '../db/db.js';

/**
 * Generates and clears demo Premier League data for a first run with no
 * `FOOTBALL_DATA_API_KEY` configured.
 *
 * Demo rows use negative ids (`< 0`); real football-data.org ids are always
 * positive, so a negative id is an unambiguous, migration-free "this is demo
 * data" marker that never collides with anything a real sync writes. The
 * canonical Zod schemas that require a positive id (`team.schema.js`,
 * `match.schema.js`) are not used anywhere in this write path or in the read
 * path the controllers use, so they never see — and never reject — these ids.
 * @module services/demoSeed
 */

/** Demo league: enough to exercise every feature without authoring 5 leagues. */
const DEMO_LEAGUE = 'PL';

/** Real Premier League club names, paired with a 3-letter code. */
const TEAMS = [
  ['Arsenal FC', 'ARS'],
  ['Aston Villa FC', 'AVL'],
  ['AFC Bournemouth', 'BOU'],
  ['Brentford FC', 'BRE'],
  ['Brighton & Hove Albion FC', 'BHA'],
  ['Chelsea FC', 'CHE'],
  ['Crystal Palace FC', 'CRY'],
  ['Everton FC', 'EVE'],
  ['Fulham FC', 'FUL'],
  ['Ipswich Town FC', 'IPS'],
  ['Leicester City FC', 'LEI'],
  ['Liverpool FC', 'LIV'],
  ['Manchester City FC', 'MCI'],
  ['Manchester United FC', 'MUN'],
  ['Newcastle United FC', 'NEW'],
  ['Nottingham Forest FC', 'NFO'],
  ['Southampton FC', 'SOU'],
  ['Tottenham Hotspur FC', 'TOT'],
  ['West Ham United FC', 'WHU'],
  ['Wolverhampton Wanderers FC', 'WOL'],
];

/** Past matchdays generated before the current one. */
const PAST_MATCHDAYS = 7;
/** Milliseconds in a day, used to space matchdays a week apart. */
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Small deterministic PRNG (mulberry32) so generated scores are reproducible
 * across runs and assertable in tests without flakiness.
 * @param {number} seed Seed value.
 * @returns {() => number} Generator returning floats in [0, 1).
 */
function mulberry32(seed) {
  let state = seed;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Builds a single round-robin schedule (circle method): `teams.length - 1`
 * rounds, each with `teams.length / 2` pairings, home/away alternated by
 * round so no team is always home.
 * @param {string[]} teamIds Team ids in a stable order.
 * @returns {Array<Array<[string, string]>>} Rounds of `[home, away]` pairs.
 */
function roundRobin(teamIds) {
  const rotating = teamIds.slice(1);
  const fixed = teamIds[0];
  const rounds = [];

  for (let round = 0; round < teamIds.length - 1; round += 1) {
    const arranged = [fixed, ...rotating];
    const pairs = [];
    for (let i = 0; i < arranged.length / 2; i += 1) {
      const home = arranged[i];
      const away = arranged[arranged.length - 1 - i];
      pairs.push(round % 2 === 0 ? [home, away] : [away, home]);
    }
    rounds.push(pairs);
    rotating.unshift(rotating.pop());
  }

  return rounds;
}

/**
 * Tells whether the demo dataset should be generated: no API key configured
 * and the database is genuinely empty (never overwrites anything, demo or
 * real).
 * @returns {boolean} True when the demo dataset should be seeded.
 */
export function shouldSeedDemoData() {
  return !env.FOOTBALL_DATA_API_KEY && teamsRepository.count() === 0;
}

/**
 * Generates a Premier League demo dataset anchored to the current time: past
 * matchdays already finished, a current matchday with a live match plus
 * played and still-to-play fixtures, and one scheduled matchday ahead.
 * @param {object} [options] Generation options.
 * @param {number} [options.now] Reference instant in ms (for tests).
 * @returns {{teams: number, matches: number}} Counts written.
 */
export function seedDemoData({ now = Date.now() } = {}) {
  const random = mulberry32(20260101);
  const randomScore = () => Math.floor(random() * 5);

  const teams = TEAMS.map(([name, tla], index) => ({
    id: -(index + 1),
    name,
    shortName: name.replace(/ (FC|AFC)$/, ''),
    tla,
    crest: null,
  }));
  const teamIdByName = new Map(teams.map((team) => [team.name, team.id]));
  const rounds = roundRobin(teams.map((team) => team.name));

  const totalRounds = PAST_MATCHDAYS + 2;
  const currentRoundIndex = PAST_MATCHDAYS;
  let nextMatchId = -1001;
  const matches = [];

  rounds.slice(0, totalRounds).forEach((pairs, roundIndex) => {
    const matchday = roundIndex + 1;

    pairs.forEach(([homeName, awayName], pairIndex) => {
      let utcDate;
      let status;
      let fullTimeHome = null;
      let fullTimeAway = null;

      if (roundIndex < currentRoundIndex) {
        // Past matchday: a week further back for every round before this one.
        utcDate = new Date(now - (currentRoundIndex - roundIndex) * 7 * DAY_MS);
        status = 'FINISHED';
        fullTimeHome = randomScore();
        fullTimeAway = randomScore();
      } else if (roundIndex === currentRoundIndex) {
        // Current matchday: a spread of already-played, live and upcoming kickoffs.
        if (pairIndex < 4) {
          utcDate = new Date(now - 3 * 60 * 60 * 1000);
          status = 'FINISHED';
          fullTimeHome = randomScore();
          fullTimeAway = randomScore();
        } else if (pairIndex === 4) {
          utcDate = new Date(now - 45 * 60 * 1000);
          status = 'IN_PLAY';
          fullTimeHome = randomScore();
          fullTimeAway = randomScore();
        } else {
          utcDate = new Date(now + (pairIndex - 4) * 3 * 60 * 60 * 1000);
          status = 'SCHEDULED';
        }
      } else {
        // Next matchday: fully in the future, nothing played yet.
        utcDate = new Date(now + 7 * DAY_MS + pairIndex * 60 * 60 * 1000);
        status = 'SCHEDULED';
      }

      matches.push({
        id: nextMatchId,
        league: DEMO_LEAGUE,
        utcDate: utcDate.toISOString(),
        status,
        matchday,
        homeTeamId: teamIdByName.get(homeName),
        awayTeamId: teamIdByName.get(awayName),
        winner: null,
        duration: null,
        fullTimeHome,
        fullTimeAway,
        halfTimeHome: null,
        halfTimeAway: null,
      });
      nextMatchId -= 1;
    });
  });

  teamsRepository.upsertMany(teams);
  matchesRepository.upsertMany(matches);

  return { teams: teams.length, matches: matches.length };
}

/**
 * Removes every demo row (`id < 0`) from `matches` and `teams`, in that order
 * so the foreign key from `matches` to `teams` is never violated. Real rows
 * (always positive ids) are untouched.
 * @returns {{teams: number, matches: number}} Rows removed.
 */
export function purgeDemoData() {
  const db = getDb();
  const matchesResult = db.prepare('DELETE FROM matches WHERE id < 0').run();
  const teamsResult = db.prepare('DELETE FROM teams WHERE id < 0').run();
  return { teams: teamsResult.changes, matches: matchesResult.changes };
}

export default { shouldSeedDemoData, seedDemoData, purgeDemoData };
