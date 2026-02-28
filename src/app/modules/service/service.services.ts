import { Prisma, SessionType } from '@prisma/client';
import prisma from '../../utils/prisma';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';

interface IServiceFilters {
  division_id?: string;
  session_type?: SessionType;
  min_price?: number;
  max_price?: number;
  is_active?: boolean;
}

const CreateService = async (payload: {
  division_id: string;
  name: string;
  description?: string;
  session_type: SessionType;
  base_amount: number;
  currency?: string;
  is_active?: boolean;
}) => {
  const division = await prisma.division.findUnique({
    where: { id: payload.division_id },
  });

  if (!division) {
    throw new AppError(httpStatus.NOT_FOUND, 'Division not found');
  }

  return prisma.service.create({
    data: payload,
    include: { division: { select: { id: true, type: true } } },
  });
};

const GetAllServices = async (filters: IServiceFilters) => {
  const where: Prisma.ServiceWhereInput = {};

  if (filters.division_id) where.division_id = filters.division_id;
  if (filters.session_type) where.session_type = filters.session_type;
  if (filters.is_active !== undefined) where.is_active = filters.is_active;

  if (filters.min_price !== undefined || filters.max_price !== undefined) {
    where.base_amount = {};
    if (filters.min_price !== undefined) where.base_amount.gte = filters.min_price;
    if (filters.max_price !== undefined) where.base_amount.lte = filters.max_price;
  }

  return prisma.service.findMany({
    where,
    include: {
      division: { select: { id: true, type: true, description: true } },
    },
    orderBy: [{ division_id: 'asc' }, { name: 'asc' }],
  });
};

const GetServiceById = async (serviceId: string) => {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: {
      division: true,
      user_services: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              specialization: true,
              profile_picture: true,
            },
          },
        },
      },
    },
  });

  if (!service) {
    throw new AppError(httpStatus.NOT_FOUND, 'Service not found');
  }

  return service;
};

const UpdateService = async (
  serviceId: string,
  payload: {
    name?: string;
    description?: string;
    session_type?: SessionType;
    base_amount?: number;
    currency?: string;
    is_active?: boolean;
  },
) => {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });

  if (!service) {
    throw new AppError(httpStatus.NOT_FOUND, 'Service not found');
  }

  return prisma.service.update({
    where: { id: serviceId },
    data: payload,
    include: { division: { select: { id: true, type: true } } },
  });
};

const DeleteService = async (serviceId: string) => {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });

  if (!service) {
    throw new AppError(httpStatus.NOT_FOUND, 'Service not found');
  }

  await prisma.service.delete({ where: { id: serviceId } });
};

const ServiceService = {
  CreateService,
  GetAllServices,
  GetServiceById,
  UpdateService,
  DeleteService,
};

export default ServiceService;
