import express from "express";
import cors from "cors";
import helmet from "helmet";  // ← NOVO
import routes from "../routes";
import { errorHandler } from "../middleware/error";

const app = express();

// ===========================================================================
// CONFIGURAÇÃO PARA RENDER
// ===========================================================================
app.set('trust proxy', 1);

// ===========================================================================
// 🛡️ HELMET - SEGURANÇA DE BORDA (CSP, HSTS, X-Frame, etc)
// ===========================================================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],  // Tailwind precisa
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: [
        "'self'",
        "https://*.supabase.co",
        "https://fin-control-kohl.vercel.app"
      ],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,  // Necessário para Supabase Storage
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// ===========================================================================
// CORS - ACEITA ORIGINS DA VERCEL (production + preview)
// ===========================================================================
const allowedOrigins = [
  // Production
  'https://fin-control-kohl.vercel.app',
  
  // Regex: aceita QUALQUER preview da Vercel
  /^https:\/\/fin-control-.*\.vercel\.app$/,
  
  // Local development
  'http://localhost:5173',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    const isAllowed = allowedOrigins.some(allowed => 
      allowed instanceof RegExp && allowed.test(origin)
    );
    if (isAllowed) return callback(null, true);
    console.warn(`❌ CORS bloqueado para origin: ${origin}`);
    return callback(new Error(`Origem ${origin} não permitida pelo CORS`), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400,
}));

// ===========================================================================
// BODY PARSER COM LIMITE REDUZIDO (proteção contra DoS por payload)
// ===========================================================================
app.use(express.json({ limit: '100kb' }));  // era 10mb
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

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
