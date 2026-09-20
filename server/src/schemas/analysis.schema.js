import { z } from 'zod';

/**
 * Zod schemas for the analysis endpoint.
 * @module schemas/analysis.schema
 */

/**
 * Validates the `GET /api/analysis` query string.
 * @type {import('zod').ZodObject}
 */
export const analysisQuerySchema = z
  .object({
    home: z.coerce.number().int().positive(),
    away: z.coerce.number().int().positive(),
    date: z.string().datetime(),
  })
  .refine((query) => query.home !== query.away, {
    message: 'home and away must be different teams',
    path: ['away'],
  });

export default analysisQuerySchema;
