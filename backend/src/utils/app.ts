import express from "express";
import cors from "cors";
import routes from "../routes";

const app = express();

// LIBERAÇÃO TOTAL DO CORS
// Isso remove a trava de segurança e permite que QUALQUER site (Vercel, Localhost, etc)
// consiga conversar com seu backend. É a forma mais segura de garantir que funcione agora.
app.use(cors()); 

// Body parser (necessário para ler o JSON enviado no login)
app.use(express.json());

// Monta as rotas principais
app.use("/api", routes);

export default app;
