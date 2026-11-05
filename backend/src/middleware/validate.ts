import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';

export const validateBody = (schema: ZodTypeAny) => (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    next(result.error);
    return;
  }

  req.body = result.data;
  next();
};

export const validateQuery = (schema: ZodTypeAny) => (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    next(result.error);
    return;
  }

  req.query = result.data as any;
  next();
};

export const validateParams = (schema: ZodTypeAny) => (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const result = schema.safeParse(req.params);
  if (!result.success) {
    next(result.error);
    return;
  }

  req.params = result.data as any;
  next();
};
