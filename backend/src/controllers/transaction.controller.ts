import { Response } from 'express';
import { AuthRequest } from '../types/express';
import {
  getTransactionsService,
  createTransactionService,
  updateTransactionService,
  deleteTransactionService,
  transactionFiltersSchema,
} from '../services/transaction.service';
import { AppError } from '../utils/AppError';
import {
  TransactionInput,
  TransactionUpdateInput,
  transactionSchema,
  transactionUpdateSchema,
} from '../utils/schemas';
import { ZodError } from 'zod';

export const getTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError('Usuário não autenticado', 401);

  let filters;
  try {
    filters = transactionFiltersSchema.parse(req.query);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError('Parâmetros de filtro inválidos', 400);
    }
    throw error;
  }

  const result = await getTransactionsService(userId, filters);
  res.json({
    message: 'Transações carregadas',
    data: result.transactions,
    pagination: result.pagination,
  });
};

export const createTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError('Usuário não autenticado', 401);

  let validated: TransactionInput;
  try {
    validated = transactionSchema.parse(req.body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError('Erro de validação', 400);
    }
    throw error;
  }

  const result = await createTransactionService(userId, validated);
  res
    .status(result.statusCode || 201)
    .json({ message: 'Transação criada com sucesso', data: result.transaction });
};

export const updateTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError('Usuário não autenticado', 401);

  const transactionId = String(req.params.id);

  let validated: TransactionUpdateInput;
  try {
    validated = transactionUpdateSchema.parse(req.body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError('Erro de validação', 400);
    }
    throw error;
  }

  const result = await updateTransactionService(userId, transactionId, validated);
  res.json({
    message: 'Transação atualizada com sucesso',
    data: result.transaction,
  });
};

export const deleteTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError('Usuário não autenticado', 401);

  const transactionId = String(req.params.id);

  await deleteTransactionService(userId, transactionId);
  res.json({ message: 'Transação excluída com sucesso' });
};
