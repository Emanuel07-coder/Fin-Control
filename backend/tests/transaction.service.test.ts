import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getTransactionsService,
  createTransactionService,
  updateTransactionService,
  deleteTransactionService,
  transactionFiltersSchema,
} from '../src/services/transaction.service';
import { AppError } from '../src/utils/AppError';
import prisma from '../src/config/database';

let mockedTxCreateMany: ReturnType<typeof vi.fn>;
let mockedTxCreate: ReturnType<typeof vi.fn>;

// Mock dependencies - self-contained factory (no external variables)
vi.mock('../src/config/database', () => {
  const mPrisma = {
    $transaction: vi.fn(async (callback) => {
      const mTx = {
        transaction: {
          create: vi.fn().mockResolvedValue({
            id: 'tx-new',
            userId: 'user-123',
            amount: 1000,
            type: 'INCOME',
            date: new Date(),
            category: { id: 'cat1', name: 'Salary' },
          }),
          createMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        $executeRawUnsafe: vi.fn(),
      };
      mockedTxCreate = mTx.transaction.create;
      mockedTxCreateMany = mTx.transaction.createMany;
      return callback(mTx);
    }),
    transaction: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
  return {
    default: mPrisma,
    prisma: mPrisma,
  };
});

const mockPrisma = prisma as unknown as {
  $transaction: ReturnType<typeof vi.fn>;
  transaction: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

describe('Transaction Service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getTransactionsService', () => {
    it('should return transactions with pagination', async () => {
      const mockTransactions = [
        {
          id: 'tx1',
          userId: 'user-123',
          amount: 1000,
          type: 'INCOME',
          date: new Date(),
          category: { id: 'cat1', name: 'Salary' },
        },
      ];
      mockPrisma.transaction.findMany.mockResolvedValue(mockTransactions);
      mockPrisma.transaction.count.mockResolvedValue(1);

      const filters = transactionFiltersSchema.parse({
        page: 1,
        limit: 20,
      });

      const result = await getTransactionsService('user-123', filters);

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        include: { category: true },
        orderBy: { date: 'desc' },
        skip: 0,
        take: 20,
      });
      expect(mockPrisma.transaction.count).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
      expect(result).toEqual({
        transactions: mockTransactions,
        pagination: { page: 1, limit: 20, total: 1 },
      });
    });

    it('should throw AppError when user not authenticated', async () => {
      await expect(
        getTransactionsService('', transactionFiltersSchema.parse({}))
      ).rejects.toEqual(new AppError('Usuário não autenticado', 401));
    });
  });

  describe('createTransactionService', () => {
    it('should create a transaction', async () => {
      mockPrisma.transaction.create.mockResolvedValue({
        id: 'tx1',
        userId: 'user-123',
        amount: 1000,
        type: 'INCOME',
        date: new Date(),
        category: { id: 'cat1', name: 'Salary' },
      });

      const data = {
        categoryId: 'cat1',
        type: 'INCOME',
        amount: 1000,
        description: 'Salary',
        date: new Date().toISOString(),
        recurrence: 'NONE',
      };

      const result = await createTransactionService('user-123', data);

      expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          categoryId: 'cat1',
          type: 'INCOME',
          amount: 1000,
          description: 'Salary',
          date: expect.any(Date),
          recurrence: 'NONE',
        },
        include: { category: true },
      });
      expect(result).toEqual({
        transaction: {
          id: 'tx1',
          userId: 'user-123',
          amount: 1000,
          type: 'INCOME',
          date: expect.any(Date),
          category: { id: 'cat1', name: 'Salary' },
        },
        statusCode: 201,
      });
    });

    it('should create recurring transactions in a single atomic batch', async () => {
      const data = {
        categoryId: 'cat1',
        type: 'INCOME',
        amount: 1000,
        description: 'Salary',
        date: new Date().toISOString(),
        recurrence: 'MONTHLY',
      };

      await createTransactionService('user-123', data);

      expect(mockedTxCreate).toHaveBeenCalledTimes(1);
      expect(mockedTxCreate).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          categoryId: 'cat1',
          type: 'INCOME',
          amount: 1000,
          description: 'Salary',
          date: expect.any(Date),
          recurrence: 'MONTHLY',
        },
        include: { category: true },
      });
      // Recorrências geradas em lote atômico (createMany), não em loop sequencial
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockedTxCreateMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            recurrence: 'NONE',
            description: expect.stringMatching(/^\[REC #\d+\]/),
          }),
        ]),
      });
    });
  });

  describe('updateTransactionService', () => {
    it('should update a transaction', async () => {
      const mockTransaction = {
        id: 'tx1',
        userId: 'user-123',
        amount: 1000,
        type: 'INCOME',
        date: new Date(),
        category: { id: 'cat1', name: 'Salary' },
      };
      mockPrisma.transaction.findUnique.mockResolvedValue(mockTransaction);
      mockPrisma.transaction.update.mockResolvedValue({
        ...mockTransaction,
        amount: 2000,
      });

      const data = {
        amount: 2000,
      };

      const result = await updateTransactionService('user-123', 'tx1', data);

      expect(mockPrisma.transaction.findUnique).toHaveBeenCalledWith({
        where: { id: 'tx1', userId: 'user-123' },
      });
      expect(mockPrisma.transaction.update).toHaveBeenCalledWith({
        where: { id: 'tx1', userId: 'user-123' },
        data: {
          amount: 2000,
        },
        include: { category: true },
      });
      expect(result).toEqual({
        transaction: {
          ...mockTransaction,
          amount: 2000,
        },
      });
    });

    it('should throw AppError when transaction not found', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(null);

      const data = {
        amount: 2000,
      };

      await expect(
        updateTransactionService('user-123', 'tx1', data)
      ).rejects.toEqual(new AppError('Transação não encontrada', 404));
    });
  });

  describe('deleteTransactionService', () => {
    it('should delete a transaction', async () => {
      const mockTransaction = {
        id: 'tx1',
        userId: 'user-123',
        amount: 1000,
        type: 'INCOME',
        date: new Date(),
        category: { id: 'cat1', name: 'Salary' },
      };
      mockPrisma.transaction.findUnique.mockResolvedValue(mockTransaction);

      await deleteTransactionService('user-123', 'tx1');

      expect(mockPrisma.transaction.findUnique).toHaveBeenCalledWith({
        where: { id: 'tx1', userId: 'user-123' },
      });
      expect(mockPrisma.transaction.delete).toHaveBeenCalledWith({
        where: { id: 'tx1', userId: 'user-123' },
      });
    });

    it('should throw AppError when transaction not found', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(null);

      await expect(
        deleteTransactionService('user-123', 'tx1')
      ).rejects.toEqual(new AppError('Transação não encontrada', 404));
    });
  });
});
