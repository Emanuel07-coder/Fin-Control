import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Assinatura genérica de um handler assíncrono do Express.
 * Preserva os tipos de req (pode ser Request estendido, ex: AuthRequest),
 * res e next, e retorna RequestHandler para compatibilidade com as rotas.
 */
export type AsyncRequestHandler<T extends Request = Request> = (
  req: T,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

/**
 * Wrap de um handler assíncrono encaminhando erros para o next(express).
 * Mantém a tipagem do req para evitar casts manuais nos controllers.
 */
export const asyncHandler = <T extends Request = Request>(
  fn: AsyncRequestHandler<T>
): RequestHandler => ((req, res, next) => {
  Promise.resolve(fn(req as T, res, next)).catch(next);
}) as RequestHandler;
