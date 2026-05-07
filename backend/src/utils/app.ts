import express from "express";
import cors from "cors";
import routes from "../routes";

// No arquivo backend/src/utils/app.ts

const allowedOrigins = [
  "http://localhost:5173", // Seu frontend local
  "https://fin-control-kohl.vercel.app/", // A URL que a Vercel te der (substitua aqui!)
];

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite requisições sem origin (como apps insomnia/postman) ou origins da lista
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Body parser (necessário para req.body em routes)
app.use(express.json());

// Monta as rotas principais.
// Como routes/index.ts já faz router.use('/auth', authRouter), o caminho final vira: /api/auth/login
app.use("/api", routes);

export default app;


