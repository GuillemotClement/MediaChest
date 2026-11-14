import { toNodeHandler } from 'better-auth/node';
import express, { NextFunction, Request, Response } from 'express';
import { auth } from './lib/auth.js';
import cors from 'cors';
import router from './app.router.js';
import { requireAuth } from './middlewares/requireAuth.js';
import { logger } from './lib/logger.js';
import { EndpointNotFoundError } from './errors/index.js';

export const app = express();

app.use(
  cors({
    origin: process.env.FRONT_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  }),
);

app.get('/api/health-check', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// utilisation de middleware pour récupérer les infos de session et proteger les routes
app.use('/api', requireAuth);

// route pour l'authentification Better auth
app.all('/api/auth/*splat', toNodeHandler(auth));

app.use(express.json());

app.use('/api', router);

// app.use(errorHandler);
// app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
//   logger.log('error', err.stack);
//   res.status(500).send('Something broke!');
// });
//
// no endpoint
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new EndpointNotFoundError())
})
