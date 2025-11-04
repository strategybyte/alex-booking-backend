import express from 'express';
import DashboardController from './dashboard.controller';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import DashboardValidation from './dashboard.validation';
import { Role } from '@prisma/client';

const router = express.Router();

router.use(auth(Role.SUPER_ADMIN, Role.COUNSELOR));

// Get Dashboard Data

router.get(
  '/',
  validateRequest(DashboardValidation.getDashboardSchema),
  DashboardController.GetDashboard,
);

export const DashboardRoutes = router;
