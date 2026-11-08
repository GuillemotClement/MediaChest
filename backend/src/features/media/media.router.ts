import { Router } from 'express';

const mediaRouter = Router();

mediaRouter.get('/', (req, res) => {
  res.json({ message: 'List des médis' });
});

export default mediaRouter;
