import { Router } from 'express';
import { getTeams } from '../controllers/teams.controller.js';

/**
 * Teams routes.
 * @type {import('express').Router}
 */
const router = Router();

router.get('/', getTeams);

export default router;
