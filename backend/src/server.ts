import app from './utils/app';

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

console.log('=================================');
console.log('Starting FinControl Backend...');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Port: ${PORT}`);
console.log('=================================');

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
});
