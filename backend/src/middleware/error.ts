import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // 1. Log estruturado para monitoramento
  // Usamos ISOString para facilitar a busca em logs do CloudWatch, Datadog ou Sentry
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}: ${err.message}`);

  // 2. Tratamento de Erros Controlados (AppError)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ 
      error: err.message 
    });
    return;
  }

  // 3. Tratamento de Erros de Validação do Zod
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Erro de validação nos dados enviados',
      details: err.issues.map(i => ({ 
        path: i.path.join('.'), // Transforma o array de path em string (ex: 'user.email')
        message: i.message 
      })),
    });
    return;
  }

  // 4. Tratamento de Erros Genéricos (Fallback)
  // Aqui impedimos que erros internos (como "PrismaClientKnownRequestError") 
  // vazem detalhes do banco de dados para o cliente.
  res.status(500).json({ 
    error: 'Ocorreu um erro interno no servidor. Por favor, tente novamente mais tarde.' 
  });
};
