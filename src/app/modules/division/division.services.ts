import { DivisionType } from '@prisma/client';
import prisma from '../../utils/prisma';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';

const CreateDivision = async (payload: {
  type: DivisionType;
  description?: string;
  is_active?: boolean;
}) => {
  const existing = await prisma.division.findUnique({
    where: { type: payload.type },
  });

  if (existing) {
    throw new AppError(
      httpStatus.CONFLICT,
      `A division of type ${payload.type} already exists`,
    );
  }

  return prisma.division.create({ data: payload });
};

const GetAllDivisions = async () => {
  return prisma.division.findMany({
    orderBy: { created_at: 'asc' },
    include: {
      _count: { select: { services: true, user_divisions: true } },
    },
  });
};

const GetDivisionById = async (divisionId: string) => {
  const division = await prisma.division.findUnique({
    where: { id: divisionId },
    include: {
      services: {
        where: { is_active: true },
        orderBy: { name: 'asc' },
      },
      _count: { select: { services: true, user_divisions: true } },
    },
  });

  if (!division) {
    throw new AppError(httpStatus.NOT_FOUND, 'Division not found');
  }

  return division;
};

const UpdateDivision = async (
  divisionId: string,
  payload: { description?: string; is_active?: boolean },
) => {
  const division = await prisma.division.findUnique({
    where: { id: divisionId },
  });

  if (!division) {
    throw new AppError(httpStatus.NOT_FOUND, 'Division not found');
  }

  return prisma.division.update({ where: { id: divisionId }, data: payload });
};

const DeleteDivision = async (divisionId: string) => {
  const division = await prisma.division.findUnique({
    where: { id: divisionId },
  });

  if (!division) {
    throw new AppError(httpStatus.NOT_FOUND, 'Division not found');
  }

  await prisma.division.delete({ where: { id: divisionId } });
};

const DivisionService = {
  CreateDivision,
  GetAllDivisions,
  GetDivisionById,
  UpdateDivision,
  DeleteDivision,
};

export default DivisionService;
