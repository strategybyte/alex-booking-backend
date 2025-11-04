import express from 'express';
import AppointmentController from './appointment.controller';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import AppointmentValidation from './appointment.validation';
import { Role } from '@prisma/client';

const router = express.Router();

router.use(auth(Role.SUPER_ADMIN, Role.COUNSELOR));

router.post(
  '/',
  validateRequest(AppointmentValidation.createManualAppointmentSchema),
  AppointmentController.CreateManualAppointment,
);
router.get(
  '/',
  validateRequest(AppointmentValidation.getAppointmentsQuerySchema),
  AppointmentController.GetCounselorAppointments,
);
router.get(
  '/:appointmentId',
  AppointmentController.GetCounselorAppointmentDetailsById,
);
router.patch(
  '/:appointmentId/completed',
  AppointmentController.CompleteCounselorAppointmentById,
);
router.patch(
  '/:appointmentId/cancel',
  validateRequest(AppointmentValidation.cancelAppointmentSchema),
  AppointmentController.CancelCounselorAppointmentById,
);
router.patch(
  '/:appointmentId/reschedule',
  validateRequest(AppointmentValidation.rescheduleAppointmentSchema),
  AppointmentController.RescheduleCounselorAppointmentById,
);

export const AppointmentRoutes = router;
