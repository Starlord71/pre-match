import { Router } from 'express';
import { postSync } from '../controllers/sync.controller.js';

/**
 * Manual sync routes.
 * @type {import('express').Router}
 */
const router = Router();

router.post('/:league', postSync);

export default router;
