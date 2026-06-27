import express from "express";
import cors from "cors";
import routes from "../routes";
import { errorHandler } from "../middleware/error";

const app = express();

// ===========================================================================
// CONFIGURAÇÃO PARA RENDER
// ===========================================================================
app.set('trust proxy', 1);

// ===========================================================================
// CORS - ACEITA TODAS AS ORIGINS DA VERCEL (production + preview)
// ===========================================================================
const allowedOrigins = [
  // Production
  'https://fin-control-kohl.vercel.app',
  
  // Regex: aceita QUALQUER preview da Vercel (fin-control-qualquercoisa.vercel.app)
  /^https:\/\/fin-control-.*\.vercel\.app$/,
  
  // Local development
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
];

app.use(cors({
  origin: function (origin, callback) {
    // Permite requisições sem origin (Postman, curl, server-to-server)
    if (!origin) return callback(null, true);
    
    // Verifica origins exatas (strings)
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Verifica origins por regex
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      return callback(null, true);
    }
    
    console.warn(`❌ CORS bloqueado para origin: ${origin}`);
    return callback(new Error(`Origem ${origin} não permitida pelo CORS`), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400,
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rotas
app.use("/api", routes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handler
app.use(errorHandler);

export default app;
