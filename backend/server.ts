import app from './src/utils/app';
import prisma from './src/config/database';

const PORT = Number(process.env.PORT) || 3001;

const startServer = async (): Promise<void> => {
  try {
    // 1. Primeiro, tentamos conectar ao banco de dados
    await prisma.$connect();
    console.log('📦 Conectado ao banco de dados com sucesso');

    // 2. SÓ DEPOIS de conectar ao banco, ligamos o servidor
    // Usamos '0.0.0.0' para garantir que o Railway aceite conexões externas
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);

      const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
      console.log(`🌐 URL: ${appUrl}`);
    });
  } catch (error) {
    console.error('❌ Erro crítico ao iniciar o servidor:', error);
    process.exit(1); // Fecha o app se o banco não conectar, forçando o Railway a reiniciar
  }
};

startServer();