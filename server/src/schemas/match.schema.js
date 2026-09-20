import { z } from 'zod';
import { LeagueCode } from './league.schema.js';
import { teamSchema } from './team.schema.js';

/** Lifecycle status of a match as reported by football-data.org. */
export const matchStatusSchema = z.enum([
  'SCHEDULED',
  'TIMED',
  'IN_PLAY',
  'PAUSED',
  'FINISHED',
  'SUSPENDED',
  'POSTPONED',
  'CANCELLED',
  'AWARDED',
]);

/** Score breakdown for a match. */
export const scoreSchema = z.object({
  winner: z.enum(['HOME_TEAM', 'AWAY_TEAM', 'DRAW']).nullish(),
  duration: z.enum(['REGULAR', 'EXTRA_TIME', 'PENALTY_SHOOTOUT']).nullish(),
  fullTime: z.object({
    home: z.number().int().nullable(),
    away: z.number().int().nullable(),
  }),
  halfTime: z
    .object({
      home: z.number().int().nullable(),
      away: z.number().int().nullable(),
    })
    .optional(),
});

/**
 * Canonical match shape used throughout the backend.
 * @type {import('zod').ZodObject}
 */
export const matchSchema = z.object({
  id: z.number().int().positive(),
  league: LeagueCode,
  utcDate: z.string().datetime(),
  status: matchStatusSchema,
  matchday: z.number().int().positive().nullish(),
  homeTeam: teamSchema,
  awayTeam: teamSchema,
  score: scoreSchema,
});

export default matchSchema;
