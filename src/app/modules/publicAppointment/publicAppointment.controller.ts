import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import PublicAppointmentService from './publicAppointment.services';

const PostAppointment = catchAsync(async (req, res) => {
  const data = req.body;

  // Convert frontend camelCase to backend snake_case format
  const clientData = {
    first_name: data.firstName,
    last_name: data.lastName,
    email: data.email,
    phone: data.phone,
    date_of_birth: data.dateOfBirth,
    gender: data.gender || 'OTHER',
  };

  const appointmentData = {
    session_type: data.sessionType,
    date: data.date,
    time_slot_id: data.timeSlotId,
    notes: data.notes || 'N/A',
    counselor_id: data.counselorId,
    service_id: data.serviceId,
  };

  const result = await PublicAppointmentService.CreateAppointment(
    clientData,
    appointmentData,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Appointment created successfully',
    data: result,
  });
});

const getAppointment = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await PublicAppointmentService.getAppointment(id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Appointment fetched successfully',
    data: result,
  });
});

const PublicAppointmentController = { PostAppointment, getAppointment };

export default PublicAppointmentController;
