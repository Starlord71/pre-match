import { Router } from 'express';
import { getMatches, getTeamMatches } from '../controllers/matches.controller.js';

/**
 * Matches routes.
 * @type {import('express').Router}
 */
const router = Router();

router.get('/', getMatches);
router.get('/team/:teamId', getTeamMatches);

export default router;
