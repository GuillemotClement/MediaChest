import { Router } from 'express';
import * as mediaController from './media.controller.js';

const mediaRouter = Router();

mediaRouter.get('/', (req, res) => {
  res.json({ message: 'List des médis' });
});

mediaRouter.post('/add-media-to-user', (req, res, next) => {
  mediaController.addMediaToUser(req, res, next);
});

export default mediaRouter;
