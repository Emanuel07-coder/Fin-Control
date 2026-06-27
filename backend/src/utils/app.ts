import express from "express";
import cors from "cors";
import routes from "../routes";
import { errorHandler } from "../middleware/error";

const app = express();

// ===========================================================================
// CONFIGURAÇÃO PARA RENDER (ATUALIZADO - ANTES ERA RAILWAY)
// ===========================================================================
// Esta linha diz ao Express para confiar no proxy do Render.
// Necessário para obter o IP real do usuário (req.ip) e para o rate limiting.
app.set('trust proxy', 1);

// ===========================================================================
// CORS - CONFIGURADO PARA O FRONTEND NA VERCEL
// ===========================================================================
const allowedOrigins = [
  'https://fin-control-kohl.vercel.app',                          // produção
  'https://fin-control-nmdz2pwuk-emanuelwenzel2007-6559s-projects.vercel.app', // preview
  'http://localhost:5173',                                         // dev local (Vite)
  'http://localhost:3000',                                         // dev local (alternativo)
];

app.use(cors({
  origin: function (origin, callback) {
    // Permite requisições sem origin (ex: Postman, curl, server-to-server)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `CORS: Origem ${origin} não permitida`;
      return callback(new Error(msg), false);
    }
    
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400, // cache preflight por 24h
}));

// Body parser (necessário para ler o JSON enviado no login)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Monta as rotas principais
app.use("/api", routes);

// Rota de health check (importante para o Render!)
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Middleware de tratamento de erros
app.use(errorHandler);

export default app;
