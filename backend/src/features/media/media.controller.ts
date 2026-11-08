import { RequestHandler } from 'express';

export const addMediaToUser: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Authentifcation requise' });
    }

    const { TMDBId } = req.body;

    const result = await mediaService.addMediaToUser(userId, mediaId);

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};
