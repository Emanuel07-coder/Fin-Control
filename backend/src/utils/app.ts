import express from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "../routes";
import { errorHandler } from "../middleware/error";

// No arquivo backend/src/utils/app.ts

const allowedOrigins = [
  "http://localhost:5173", // Seu frontend local
  "https://seu-projeto-frontend.vercel.app", // A URL que a Vercel te der (substitua aqui!)
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

export default app;

