import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validateBody = (schema: AnyZodObject) => (
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

export const validateQuery = (schema: AnyZodObject) => (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    next(result.error);
    return;
  }

  req.query = result.data;
  next();
};

export const validateParams = (schema: AnyZodObject) => (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const result = schema.safeParse(req.params);
  if (!result.success) {
    next(result.error);
    return;
  }

  req.params = result.data;
  next();
};
