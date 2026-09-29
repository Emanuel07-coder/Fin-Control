import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Extensão que injeta o RLS por requisição do usuário
export const getPrismaWithUser = (userId: string) => {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          return prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(
              `SET LOCAL app.current_user_id = '${userId}';`
            );
            return query(args);
          });
        },
      },
    },
  });
};

export default prisma;