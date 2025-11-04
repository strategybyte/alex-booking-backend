import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import DashboardService from './dashboard.services';
import { Role } from '@prisma/client';

const GetDashboard = catchAsync(async (req, res) => {
  const { role, id } = req.user;

  let result;

  if (role === Role.SUPER_ADMIN) {
    // Super Admin gets all counselors' appointments
    result = await DashboardService.GetSuperAdminDashboard(req.query);
  } else if (role === Role.COUNSELOR) {
    // Counselor gets only their own appointments
    result = await DashboardService.GetCounselorDashboard(id, req.query);
  }

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Dashboard data retrieved successfully',
    data: result,
  });
});

const DashboardController = {
  GetDashboard,
};

export default DashboardController;
