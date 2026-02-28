import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import ServiceService from './service.services';
import pick from '../../utils/pick';

const CreateService = catchAsync(async (req, res) => {
  const result = await ServiceService.CreateService(req.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Service created successfully',
    data: result,
  });
});

const GetAllServices = catchAsync(async (req, res) => {
  const filters = pick(req.query, [
    'division_id',
    'session_type',
    'min_price',
    'max_price',
    'is_active',
  ]);
  const result = await ServiceService.GetAllServices(filters as any);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Services retrieved successfully',
    data: result,
  });
});

const GetServiceById = catchAsync(async (req, res) => {
  const result = await ServiceService.GetServiceById(req.params.serviceId as string);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Service retrieved successfully',
    data: result,
  });
});

const UpdateService = catchAsync(async (req, res) => {
  const result = await ServiceService.UpdateService(
    req.params.serviceId as string,
    req.body,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Service updated successfully',
    data: result,
  });
});

const DeleteService = catchAsync(async (req, res) => {
  await ServiceService.DeleteService(req.params.serviceId as string);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Service deleted successfully',
    data: null,
  });
});

const ServiceController = {
  CreateService,
  GetAllServices,
  GetServiceById,
  UpdateService,
  DeleteService,
};

export default ServiceController;
