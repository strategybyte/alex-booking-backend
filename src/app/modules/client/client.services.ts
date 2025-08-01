import prisma from '../../utils/prisma';

const GetCounselorClientsById = async (counselor_id: string) => {
  const clients = await prisma.client.findMany({
    where: {
      appointments: {
        every: {
          counselor_id,
        },
      },
    },

    select: {
      first_name: true,
      last_name: true,
      email: true,
      gender: true,
      date_of_birth: true,
      phone: true,
      id: true,
      created_at: true,
      _count: {
        select: {
          appointments: true,
        },
      },
    },

    orderBy: {
      created_at: 'asc',
    },
  });

  const formattedClients = clients.map((client) => ({
    id: client.id,
    firstName: client.first_name,
    lastName: client.last_name,
    email: client.email,
    phone: client.phone,
    gender: client.gender,
    totalAppointments: client._count.appointments,
    dateOfBirth: client.date_of_birth,
    createdAt: client.created_at,
  }));

  return formattedClients;
};

const ClientService = {
  GetCounselorClientsById,
};

export default ClientService;
