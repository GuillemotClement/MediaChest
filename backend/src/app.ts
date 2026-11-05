import { toNodeHandler } from 'better-auth/node';
import express from 'express';
import { auth } from './lib/auth.js';

export const app = express();

app.get('/api/health-check', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// routes for auth with Better Auth
app.all('/api/auth/{*any}', toNodeHandler(auth));
