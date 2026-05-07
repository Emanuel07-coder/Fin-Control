import { app } from './src/utils/app';

import prisma from './src/config/database';

const PORT = process.env.PORT || 3001;

const startServer = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log('📦 Conectado ao banco de dados com sucesso');
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar o servidor:', error);
    process.exit(1);
  }
};

startServer();
