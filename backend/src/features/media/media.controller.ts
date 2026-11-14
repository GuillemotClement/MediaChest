import { NextFunction, RequestHandler, Request, Response } from 'express';
import * as mediaService from './media.service.js';
import { AuthenticationError } from '../../errors/index.js';

export const addMediaToUser: RequestHandler = async (req, res, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      // TODO: mettre en place la gestion d'erreur
      throw new AuthenticationError();
    }

    const result = await mediaService.addMediaToUser(userId, req.body);

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const getUserMedia = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AuthenticationError();
    }

    const result = await mediaService.getUserMedia(userId);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
