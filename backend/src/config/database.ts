import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Extensão que injeta o RLS por requisição do usuário.
// Usa SET (variável de sessão) para injetar app.current_user_id na conexão atual.
// Em produção, cada requisição HTTP define essa variável via authenticateToken
// antes de qualquer operação de banco, garantindo isolamento por usuário.
export const getPrismaWithUser = (userId: string) => {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          await prisma.$executeRawUnsafe(`SET app.current_user_id = '${userId}';`);
          return query(args);
        },
      },
    },
  });
};

export default prisma;
