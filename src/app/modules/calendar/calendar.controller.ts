import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import CalendarService from './calendar.services';
import { SessionType } from '@prisma/client';

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
  const type = req.query.type as SessionType;
  const result = await CalendarService.GetDateSlots(req.params.id, type);
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

const CalendarController = {
  GetCalendar,
  PostCalendarDate,
  GetDateSlots,
  PostDateSlots,
};

export default CalendarController;
