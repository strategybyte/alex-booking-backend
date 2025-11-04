import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import pick from '../../utils/pick';
import AppointmentService from './appointment.services';

const GetCounselorAppointments = catchAsync(async (req, res) => {
  // Pick only allowed filter and pagination fields from query
  const filters = pick(req.query, ['search', 'session_type', 'status', 'date']);
  const paginationOptions = pick(req.query, [
    'page',
    'limit',
    'sort_by',
    'sort_order',
  ]);

  const result = await AppointmentService.GetCounselorAppointmentsById(
    req.user.id,
    filters,
    paginationOptions,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Appointments retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});

const GetCounselorAppointmentDetailsById = catchAsync(async (req, res) => {
  const result = await AppointmentService.GetCounselorAppointmentDetailsById(
    req.params.appointmentId,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Appointment details retrieved successfully',
    data: result,
  });
});

const CompleteCounselorAppointmentById = catchAsync(async (req, res) => {
  const result = await AppointmentService.CompleteAppointmentById(
    req.params.appointmentId,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Appointment details retrieved successfully',
    data: result,
  });
});

const CancelCounselorAppointmentById = catchAsync(async (req, res) => {
  const result = await AppointmentService.CancelAppointmentById(
    req.params.appointmentId,
    req.user.id,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Appointment cancelled successfully',
    data: result,
  });
});

const RescheduleCounselorAppointmentById = catchAsync(async (req, res) => {
  const { newTimeSlotId } = req.body;

  const result = await AppointmentService.RescheduleAppointmentById(
    req.params.appointmentId,
    req.user.id,
    newTimeSlotId,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Appointment rescheduled successfully',
    data: result,
  });
});

const CreateManualAppointment = catchAsync(async (req, res) => {
  const result = await AppointmentService.CreateManualAppointment(
    req.user.id,
    req.body,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Appointment created successfully. Confirmation email sent to client.',
    data: result,
  });
});

const AppointmentController = {
  GetCounselorAppointments,
  GetCounselorAppointmentDetailsById,
  CompleteCounselorAppointmentById,
  CancelCounselorAppointmentById,
  RescheduleCounselorAppointmentById,
  CreateManualAppointment,
};

export default AppointmentController;
