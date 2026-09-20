import { Router } from 'express';
import { getAnalysis } from '../controllers/analysis.controller.js';

/**
 * Match analysis routes.
 * @type {import('express').Router}
 */
const router = Router();

router.get('/', getAnalysis);

export default router;
