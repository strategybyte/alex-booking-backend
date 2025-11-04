import express from 'express';

import { Role } from '@prisma/client';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';

import CalendarController from './calendar.controller';
import CalendarValidation from './calendar.validation';

const router = express.Router();

router.use(auth(Role.SUPER_ADMIN, Role.COUNSELOR));

router
  .route('/')
  .get(CalendarController.GetCalendar)
  .post(
    validateRequest(CalendarValidation.CreateCalendarSchema),
    CalendarController.PostCalendarDate,
  );
router
  .route('/slots')
  .get(CalendarController.GetSlotsWithCalendarDate)
  .post(
    validateRequest(CalendarValidation.CreateCalendarWithSlotsSchema),
    CalendarController.PostSlotsWithCalendarDate,
  );

router
  .route('/:id/slots')
  .get(CalendarController.GetDateSlots)
  .post(
    validateRequest(CalendarValidation.CreateSlotsSchema),
    CalendarController.PostDateSlots,
  );

router.route('/slots/:slotId').delete(CalendarController.DeleteTimeSlot);

export const CalendarRoutes = router;
