import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import PublicUsersService from './publicUsers.services';
import pick from '../../utils/pick';

const GetPublicCounselors = catchAsync(async (req, res) => {
  const filters = pick(req.query, ['service_id', 'division_id']);
  const result = await PublicUsersService.GetPublicCounselors(filters);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Counselors retrieved successfully',
    data: result,
  });
});

const PublicUsersController = {
  GetPublicCounselors,
};

export default PublicUsersController;
