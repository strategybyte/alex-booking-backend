import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import ClientService from './client.services';

const GetCounselorClients = catchAsync(async (req, res) => {
  const result = await ClientService.GetCounselorClientsById(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Client retrieved successfully',
    data: result,
  });
});

const ClientController = {
  GetCounselorClients,
};

export default ClientController;
