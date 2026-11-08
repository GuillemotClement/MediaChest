import { Router } from 'express';
import mediaRouter from './features/media/media.router.js';

const router = Router();

router.use('/media', mediaRouter);

export default router;
