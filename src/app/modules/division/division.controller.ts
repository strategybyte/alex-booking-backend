import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import DivisionService from './division.services';

const CreateDivision = catchAsync(async (req, res) => {
  const result = await DivisionService.CreateDivision(req.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Division created successfully',
    data: result,
  });
});

const GetAllDivisions = catchAsync(async (req, res) => {
  const result = await DivisionService.GetAllDivisions();
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Divisions retrieved successfully',
    data: result,
  });
});

const GetDivisionById = catchAsync(async (req, res) => {
  const result = await DivisionService.GetDivisionById(req.params.divisionId as string);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Division retrieved successfully',
    data: result,
  });
});

const UpdateDivision = catchAsync(async (req, res) => {
  const result = await DivisionService.UpdateDivision(
    req.params.divisionId as string,
    req.body,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Division updated successfully',
    data: result,
  });
});

const DeleteDivision = catchAsync(async (req, res) => {
  await DivisionService.DeleteDivision(req.params.divisionId as string);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Division deleted successfully',
    data: null,
  });
});

const DivisionController = {
  CreateDivision,
  GetAllDivisions,
  GetDivisionById,
  UpdateDivision,
  DeleteDivision,
};

export default DivisionController;
