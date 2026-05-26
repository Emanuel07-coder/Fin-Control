import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}: ${err.message}`);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Erro de validação nos dados enviados',
      details: err.issues.map(i => ({ 
        path: i.path.join('.'), 
        message: i.message 
      })),
    });
    return;
  }

  res.status(500).json({ error: 'Ocorreu um erro interno no servidor. Tente novamente mais tarde.' });
};
