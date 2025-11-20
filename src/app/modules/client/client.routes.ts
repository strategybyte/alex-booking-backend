import express from 'express';

import ClientController from './client.controller';
import auth from '../../middlewares/auth';
import { Role } from '@prisma/client';
import validateRequest from '../../middlewares/validateRequest';
import ClientValidation from './client.validation';

const router = express.Router();

router.use(auth(Role.SUPER_ADMIN, Role.COUNSELOR));

// Get all clients for counselor with search, filter, sort, pagination
router.get('/', ClientController.GetCounselorClients);

// Get specific client details with appointment history
router.get(
  '/:clientId',
  validateRequest(ClientValidation.getClientDetailsSchema),
  ClientController.GetClientDetailsWithHistory,
);

// Update client information
router.patch(
  '/:clientId',
  validateRequest(ClientValidation.updateClientSchema),
  ClientController.UpdateClient,
);

export const ClientRoutes = router;
