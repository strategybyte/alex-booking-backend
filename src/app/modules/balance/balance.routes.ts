import { Router } from 'express';
import { BalanceController } from './balance.controller';
import auth from '../../middlewares/auth';
import { Role } from '@prisma/client';
import validateRequest from '../../middlewares/validateRequest';
import BalanceValidation from './balance.validation';

const router = Router();

// Routes for counsellors to view their own balance
router.get('/my-balance', auth(Role.COUNSELOR), BalanceController.getMyBalance);
router.get(
  '/my-transactions',
  auth(Role.COUNSELOR),
  validateRequest(BalanceValidation.balanceFiltersSchema),
  BalanceController.getMyBalanceTransactions,
);

// Routes for super admin to manage all balances
router.get(
  '/all',
  auth(Role.SUPER_ADMIN),
  validateRequest(BalanceValidation.counsellorBalanceFiltersSchema),
  BalanceController.getAllCounsellorBalances,
);

router.get(
  '/:counsellor_id',
  auth(Role.SUPER_ADMIN),
  BalanceController.getCounsellorBalance,
);

router.get(
  '/:counsellor_id/transactions',
  auth(Role.SUPER_ADMIN),
  validateRequest(BalanceValidation.balanceFiltersSchema),
  BalanceController.getBalanceTransactions,
);

router.patch(
  '/:counsellor_id/adjust',
  auth(Role.SUPER_ADMIN),
  validateRequest(BalanceValidation.adjustBalanceSchema),
  BalanceController.adjustBalance,
);

router.patch(
  '/:counsellor_id/set-values',
  auth(Role.SUPER_ADMIN),
  validateRequest(BalanceValidation.setBalanceValuesSchema),
  BalanceController.setBalanceValues,
);

export const BalanceRoutes = router;
