import { Request } from 'express';

// Extensão do Request do Express com o campo `user` injetado pelo middleware de autenticação.
// Centralizada aqui para evitar redefinições duplicadas em services/controllers.
declare module 'express-serve-static-core' {
  interface Request {
    user?: { userId: string };
  }
}

export type AuthRequest = Request;
