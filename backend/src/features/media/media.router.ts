import { Router } from 'express';
import * as mediaController from './media.controller.js';
import { validateBody } from '../../middlewares/validationRequest.js';
import { addMediaToUserRequest } from './media.schema.js';

const mediaRouter = Router();

mediaRouter.post(
  '/add-media-to-user',
  validateBody(addMediaToUserRequest),
  mediaController.addMediaToUser,
);

export default mediaRouter;
