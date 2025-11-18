import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import PublicCalendarController from './publicCalendar.controller';
import PublicCalendarValidation from './publicCalendar.validation';

const router = express.Router();

// Specific routes first (before parameterized routes)
router.get(
  '/check-availability',
  validateRequest(PublicCalendarValidation.checkAvailabilitySchema),
  PublicCalendarController.CheckCounselorsAvailability,
);

router.get(
  '/slots/:calenderId',
  validateRequest(PublicCalendarValidation.getCounselorSlotsSchema),
  PublicCalendarController.GetCounselorDateSlots,
);

// Parameterized routes after specific routes
router.get(
  '/:counselorId',
  validateRequest(PublicCalendarValidation.getCounselorCalendarSchema),
  PublicCalendarController.GetCounselorCalendar,
);

router.get(
  '/:counselorId/slots/:date',
  // validateRequest(PublicCalendarValidation.getCounselorCalendarSchema),
  PublicCalendarController.GetCounselorDateSlots,
);

export const PublicCalendarRoutes = router;
