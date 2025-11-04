import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import CalendarService from './calendar.services';

const GetCalendar = catchAsync(async (req, res) => {
  const result = await CalendarService.GetCalenders(req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'All calendar dates retrieved successfully',
    data: result,
  });
});

const PostCalendarDate = catchAsync(async (req, res) => {
  const date = req.body.date;

  const result = await CalendarService.CreateCalenderDate(req.user.id, date);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Calendar date created successfully',
    data: result,
  });
});

const GetDateSlots = catchAsync(async (req, res) => {
  const result = await CalendarService.GetDateSlots(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Calendar slots retrieved successfully',
    data: result,
  });
});

const PostDateSlots = catchAsync(async (req, res) => {
  const result = await CalendarService.CreateDateSlots(req.params.id, req.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Calendar slots created successfully',
    data: result,
  });
});

const PostSlotsWithCalendarDate = catchAsync(async (req, res) => {
  // Support both single date format and bulk data array format
  let payload = req.body;

  // If request has date and slots at root level, wrap it in data array
  if (req.body.date && req.body.slots && !req.body.data) {
    payload = {
      data: [
        {
          date: req.body.date,
          slots: req.body.slots,
        },
      ],
    };
  }

  const result = await CalendarService.CreateSlotsWithCalendarDate(
    req.user.id,
    payload,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Calendar slots created successfully',
    data: result,
  });
});

const GetSlotsWithCalendarDate = catchAsync(async (req, res) => {
  const result = await CalendarService.GetSlotsWithCalendarDate(req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Calendar slots got successfully',
    data: result,
  });
});

const DeleteTimeSlot = catchAsync(async (req, res) => {
  const result = await CalendarService.DeleteTimeSlot(req.user.id, req.params.slotId);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Time slot deleted successfully',
    data: result,
  });
});

const CalendarController = {
  GetCalendar,
  PostCalendarDate,
  GetDateSlots,
  PostDateSlots,
  PostSlotsWithCalendarDate,
  GetSlotsWithCalendarDate,
  DeleteTimeSlot,
};

export default CalendarController;
