import express from "express";
import cors from "cors";
import routes from "../routes";

const app = express();

// ===========================================================================
// CONFIGURAÇÃO PARA RAILWAY / VERCEL (CORREÇÃO DO ERRO DE VALIDAÇÃO)
// ===========================================================================
// Esta linha resolve o erro "ERR_ERL_UNEXPECTED_X_FORWARDED_FOR".
// Ela diz ao Express que ele está atrás de um proxy (Railway) e que deve 
// confiar nos cabeçalhos X-Forwarded-For para identificar o IP do usuário.
app.set('trust proxy', 1); 

// LIBERAÇÃO TOTAL DO CORS
app.use(cors()); 

// Body parser (necessário para ler o JSON enviado no login)
app.use(express.json());

// Monta as rotas principais
app.use("/api", routes);

export default app;
