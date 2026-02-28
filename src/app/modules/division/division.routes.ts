import express from 'express';
import { Role } from '@prisma/client';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import DivisionController from './division.controller';
import DivisionValidation from './division.validation';

const router = express.Router();

// Public routes
router.get('/', DivisionController.GetAllDivisions);
router.get(
  '/:divisionId',
  validateRequest(DivisionValidation.divisionIdParamSchema),
  DivisionController.GetDivisionById,
);

// Private routes (SUPER_ADMIN only)
router.post(
  '/',
  auth(Role.SUPER_ADMIN),
  validateRequest(DivisionValidation.createDivisionSchema),
  DivisionController.CreateDivision,
);

router.patch(
  '/:divisionId',
  auth(Role.SUPER_ADMIN),
  validateRequest(DivisionValidation.updateDivisionSchema),
  DivisionController.UpdateDivision,
);

router.delete(
  '/:divisionId',
  auth(Role.SUPER_ADMIN),
  validateRequest(DivisionValidation.divisionIdParamSchema),
  DivisionController.DeleteDivision,
);

export const DivisionRoutes = router;
