import { z } from 'zod';
import { teamSchema } from './team.schema.js';
import { matchStatusSchema, scoreSchema } from './match.schema.js';

/**
 * Zod schemas for football-data.org v4 payloads.
 *
 * Every external response is parsed with these before the rest of the backend
 * trusts it. Unknown keys are stripped, so the resulting objects are already
 * normalized to the fields the domain cares about.
 * @module schemas/externalApi
 */

/** A match as returned by football-data.org (no league field; it is contextual). */
export const externalMatchSchema = z.object({
  id: z.number().int().positive(),
  utcDate: z.string().datetime(),
  status: matchStatusSchema,
  matchday: z.number().int().positive().nullish(),
  homeTeam: teamSchema,
  awayTeam: teamSchema,
  score: scoreSchema,
});

/** `GET /v4/competitions/{code}/matches` response. */
export const externalMatchesResponseSchema = z.object({
  matches: z.array(externalMatchSchema),
});

/** `GET /v4/competitions/{code}/teams` response. */
export const externalTeamsResponseSchema = z.object({
  teams: z.array(teamSchema),
});

/** `GET /v4/matches/{id}/head2head` response. */
export const externalH2HResponseSchema = z
  .object({
    matches: z.array(externalMatchSchema),
  })
  .passthrough();
