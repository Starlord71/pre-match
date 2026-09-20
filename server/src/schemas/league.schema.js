import { z } from 'zod';

/**
 * Supported competition codes from football-data.org (v1 scope).
 * @type {import('zod').ZodEnum<['PL','PD','BL1','SA','FL1']>}
 */
export const LeagueCode = z.enum(['PL', 'PD', 'BL1', 'SA', 'FL1']);

/** Human-readable names for each supported league. */
export const LEAGUE_NAMES = {
  PL: 'Premier League',
  PD: 'La Liga',
  BL1: 'Bundesliga',
  SA: 'Serie A',
  FL1: 'Ligue 1',
};

export default LeagueCode;
