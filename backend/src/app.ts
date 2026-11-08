import { toNodeHandler } from 'better-auth/node';
import express from 'express';
import { auth } from './lib/auth.js';
import cors from 'cors';

export const app = express();

app.use(
  cors({
    origin: process.env.FRONT_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  }),
);

app.use(express.json());

app.get('/api/health-check', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// routes for auth with Better Auth
app.all('/api/auth/*splat', toNodeHandler(auth));
