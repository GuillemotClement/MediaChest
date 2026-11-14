import { RequestHandler } from 'express';
import { auth } from '../lib/auth.js';
import { fromNodeHeaders } from 'better-auth/node';
import { AuthenticationError } from '../errors/index.js';
import AppError from '../errors/AppError.js';

export const requireAuth: RequestHandler = async (req, res, next) => {
  const isPublicRoute =
    req.method === 'POST' && ['/auth/sign-in/email', '/auth/sign-up/email'].includes(req.path);

  if (isPublicRoute) {
    next();
    return;
  }

  try {
    const result = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!result) {
      throw new AuthenticationError();
    }

    req.user = result.user;
    req.session = result.session;

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(401).json({ message: 'Authentification requise' });
    }
    throw new AppError('Something is broken in authenticate middleware');
  }
};
