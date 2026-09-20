import { Router } from 'express';
import { getMatches } from '../controllers/matches.controller.js';

/**
 * Matches routes.
 * @type {import('express').Router}
 */
const router = Router();

router.get('/', getMatches);

export default router;
