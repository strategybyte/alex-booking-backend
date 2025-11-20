import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import pick from '../../utils/pick';
import ClientService from './client.services';

const GetCounselorClients = catchAsync(async (req, res) => {
  // Pick only allowed filter and pagination fields from query
  const filters = pick(req.query, ['search', 'gender']);
  const paginationOptions = pick(req.query, [
    'page',
    'limit',
    'sort_by',
    'sort_order',
  ]);

  const result = await ClientService.GetCounselorClientsById(
    req.user.id,
    filters,
    paginationOptions,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Clients retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});

const GetClientDetailsWithHistory = catchAsync(async (req, res) => {
  const result = await ClientService.GetClientDetailsWithHistory(
    req.params.clientId,
    req.user.id,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Client details retrieved successfully',
    data: result,
  });
});

const UpdateClient = catchAsync(async (req, res) => {
  const result = await ClientService.UpdateClient(
    req.params.clientId,
    req.user.id,
    req.user.role,
    req.body,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Client updated successfully',
    data: result,
  });
});

const ClientController = {
  GetCounselorClients,
  GetClientDetailsWithHistory,
  UpdateClient,
};

export default ClientController;
