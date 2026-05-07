import app from './src/utils/app';


import prisma from './src/config/database';

const PORT = Number(process.env.PORT) || 3001; // O Railway vai injetar 8080 aqui automaticamente

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

const startServer = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log('📦 Conectado ao banco de dados com sucesso');
    app.listen(Number(PORT), () => {
      console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar o servidor:', error);
    process.exit(1);
  }
};

startServer();
