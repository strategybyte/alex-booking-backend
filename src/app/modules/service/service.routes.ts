import express from 'express';
import { Role } from '@prisma/client';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import ServiceController from './service.controller';
import ServiceValidation from './service.validation';

const router = express.Router();

// Public routes
router.get(
  '/',
  validateRequest(ServiceValidation.getServicesQuerySchema),
  ServiceController.GetAllServices,
);
router.get(
  '/:serviceId',
  validateRequest(ServiceValidation.serviceIdParamSchema),
  ServiceController.GetServiceById,
);

// Private routes (SUPER_ADMIN only)
router.post(
  '/',
  auth(Role.SUPER_ADMIN),
  validateRequest(ServiceValidation.createServiceSchema),
  ServiceController.CreateService,
);

router.patch(
  '/:serviceId',
  auth(Role.SUPER_ADMIN),
  validateRequest(ServiceValidation.updateServiceSchema),
  ServiceController.UpdateService,
);

router.delete(
  '/:serviceId',
  auth(Role.SUPER_ADMIN),
  validateRequest(ServiceValidation.serviceIdParamSchema),
  ServiceController.DeleteService,
);

export const ServiceRoutes = router;
