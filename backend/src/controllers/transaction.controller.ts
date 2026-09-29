import { Request, Response } from 'express';
import { getTransactionsService, createTransactionService, updateTransactionService, deleteTransactionService } from '../services/transaction.service';
import { AppError } from '../utils/AppError';

interface AuthRequest extends Request {
  user?: { userId: string };
}

export const getTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await getTransactionsService(req, res);
    res.json(result);
  } catch (error) {
    throw error;
  }
};

export const createTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await createTransactionService(req, res);
    res.status(result.statusCode || 201).json({ message: result.message, data: result.data });
  } catch (error) {
    throw error;
  }
};

export const updateTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await updateTransactionService(req, res);
    res.json({ message: result.message, data: result.data });
  } catch (error) {
    throw error;
  }
};

export const deleteTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await deleteTransactionService(req, res);
    res.json({ message: 'Transação excluída com sucesso' });
  } catch (error) {
    throw error;
  }
};