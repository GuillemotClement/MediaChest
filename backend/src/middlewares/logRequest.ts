import { RequestHandler } from 'express';
import { logger } from '../lib/logger.js';

export const logRequest: RequestHandler = (req, _res, next) => {
  logger.log('info', `${req.method} ${req.url}`);
  next();
};
