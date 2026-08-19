import 'dotenv/config';
import app from './utils/app';
import prisma from './config/database';

const PORT = Number(process.env.PORT) || 3001;

const startServer = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log('📦 Conectado ao banco de dados com sucesso');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
      console.log(`🌐 URL: ${appUrl}`);
    });
  } catch (error) {
    console.error('❌ Erro crítico ao iniciar o servidor:', error);
    process.exit(1);
  }
};

startServer();

