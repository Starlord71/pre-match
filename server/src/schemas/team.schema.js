import { z } from 'zod';

/**
 * Canonical team shape, aligned with football-data.org team payloads.
 * @type {import('zod').ZodObject}
 */
export const teamSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  shortName: z.string().min(1).nullish(),
  tla: z.string().length(3).nullish(),
  crest: z.string().url().nullish(),
});

export default teamSchema;
