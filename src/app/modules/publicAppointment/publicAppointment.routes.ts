import express from 'express';
import PublicAppointmentController from './publicAppointment.controller';
import validateRequest from '../../middlewares/validateRequest';
import PublicAppointmentValidation from './publicAppointment.validation';
import AppointmentController from '../appointment/appointment.controller';
import AppointmentValidation from '../appointment/appointment.validation';

const router = express.Router();

router.post(
  '/',
  validateRequest(PublicAppointmentValidation.createPublicAppointmentZodSchema),
  PublicAppointmentController.PostAppointment,
);

router.get('/by-token',
  validateRequest(AppointmentValidation.getAppointmentByTokenSchema),
  AppointmentController.GetAppointmentByToken,
);

router.get('/:id', PublicAppointmentController.getAppointment);

export const PublicAppointmentRoutes = router;
