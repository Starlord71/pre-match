import { z } from 'zod';
import { LeagueCode } from './league.schema.js';

/**
 * Zod schemas for the analysis endpoint.
 * @module schemas/analysis.schema
 */

/**
 * Validates the `GET /api/analysis` query string.
 *
 * `league` is optional for backward compatibility: without it, the two teams'
 * matches from any league are still analyzed (today's behavior) and no
 * standings signal is computed.
 * @type {import('zod').ZodObject}
 */
export const analysisQuerySchema = z
  .object({
    home: z.coerce.number().int().positive(),
    away: z.coerce.number().int().positive(),
    date: z.string().datetime().optional(),
    league: LeagueCode.optional(),
  })
  .refine((query) => query.home !== query.away, {
    message: 'home and away must be different teams',
    path: ['away'],
  });

export default analysisQuerySchema;
