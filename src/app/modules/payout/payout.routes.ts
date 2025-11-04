import { Router } from 'express';
import { PayoutController } from './payout.controller';
import auth from '../../middlewares/auth';
import { Role } from '@prisma/client';
import validateRequest from '../../middlewares/validateRequest';
import PayoutValidation from './payout.validation';

const router = Router();

// Routes for counsellors
router.post(
  '/request',
  auth(Role.COUNSELOR),
  validateRequest(PayoutValidation.createPayoutRequestSchema),
  PayoutController.createPayoutRequest,
);

router.get(
  '/my-requests',
  auth(Role.COUNSELOR),
  validateRequest(PayoutValidation.counsellorPayoutFiltersSchema),
  PayoutController.getMyPayoutRequests,
);

// Routes for super admin
router.get(
  '/all',
  auth(Role.SUPER_ADMIN),
  validateRequest(PayoutValidation.payoutFiltersSchema),
  PayoutController.getAllPayoutRequests,
);

router.get(
  '/:id',
  auth(Role.SUPER_ADMIN),
  PayoutController.getPayoutRequestById,
);

router.get(
  '/counsellor/:counsellor_id',
  auth(Role.SUPER_ADMIN),
  validateRequest(PayoutValidation.counsellorPayoutFiltersSchema),
  PayoutController.getCounsellorPayoutRequests,
);

router.patch(
  '/:id/process',
  auth(Role.SUPER_ADMIN),
  validateRequest(PayoutValidation.processPayoutRequestSchema),
  PayoutController.processPayoutRequest,
);

router.post(
  '/:id/execute',
  auth(Role.SUPER_ADMIN),
  PayoutController.executePayout,
);

export const PayoutRoutes = router;
