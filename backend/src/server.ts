import app from './utils/app';

// Garante que PORT seja sempre um número
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

console.log('=================================');
console.log('Starting FinControl Backend...');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Port: ${PORT}`);
console.log('=================================');

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`📊 Health check: http://${HOST}:${PORT}/api/health`);
});
