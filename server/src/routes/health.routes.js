import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';

/**
 * Health check routes.
 * @type {import('express').Router}
 */
const router = Router();

router.get('/', getHealth);

export default router;
