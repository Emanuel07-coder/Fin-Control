import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getTransactionsService,
  createTransactionService,
  updateTransactionService,
  deleteTransactionService,
} from '../src/services/transaction.service';
import { AppError } from '../src/utils/AppError';
import prisma, { getPrismaWithUser } from '../src/config/database';
import {
  transactionSchema,
  transactionUpdateSchema,
  transactionFiltersSchema,
} from '../src/utils/schemas';

// Mock dependencies - self-contained factory (no external variables)
vi.mock('../src/config/database', () => {
  const mPrisma = {
    $transaction: vi.fn(async (callback) => {
      const mTx = { $executeRawUnsafe: vi.fn() };
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
    getPrismaWithUser: vi.fn(() => mPrisma),
  };
});

vi.mock('../src/utils/schemas', () => {
  return {
    transactionSchema: { parse: vi.fn((input) => input) },
    transactionUpdateSchema: { parse: vi.fn((input) => input) },
    transactionFiltersSchema: { parse: vi.fn((input) => input) },
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
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    vi.resetAllMocks();
    mockReq = {
      user: { userId: 'user-123' },
      query: {},
      body: {},
      params: { id: 'tx-1' },
    } as any;
    mockRes = {} as any;
    vi.mocked(getPrismaWithUser).mockImplementation(() => mockPrisma);
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

      vi.mocked(transactionFiltersSchema.parse).mockReturnValue({
        page: 1,
        limit: 20,
        categoryId: undefined,
        type: undefined,
        startDate: undefined,
        endDate: undefined,
      });

      const result = await getTransactionsService(mockReq, mockRes);

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
        where: {},
        include: { category: true },
        orderBy: { date: 'desc' },
        skip: 0,
        take: 20,
      });
      expect(mockPrisma.transaction.count).toHaveBeenCalledWith({ where: {} });
      expect(result).toEqual({
        message: 'Transações carregadas',
        data: mockTransactions,
        pagination: { page: 1, limit: 20, total: 1 },
      });
    });

    it('should throw AppError when user not authenticated', async () => {
      mockReq.user = undefined;
      await expect(getTransactionsService(mockReq, mockRes)).rejects.toEqual(
        new AppError('Usuário não autenticado', 401)
      );
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

      vi.mocked(transactionSchema.parse).mockReturnValue({
        categoryId: 'cat1',
        type: 'INCOME',
        amount: 1000,
        description: 'Salary',
        date: new Date().toISOString(),
        recurrence: 'NONE',
      });

      const result = await createTransactionService(mockReq, mockRes);

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
        message: 'Transação criada com sucesso',
        data: {
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

    it('should create recurring transactions when recurrence is not NONE', async () => {
      mockPrisma.transaction.create.mockResolvedValue({
        id: 'tx1',
        userId: 'user-123',
        amount: 1000,
        type: 'INCOME',
        date: new Date(),
        category: { id: 'cat1', name: 'Salary' },
      });

      vi.mocked(transactionSchema.parse).mockReturnValue({
        categoryId: 'cat1',
        type: 'INCOME',
        amount: 1000,
        description: 'Salary',
        date: new Date().toISOString(),
        recurrence: 'MONTHLY',
      });

      await createTransactionService(mockReq, mockRes);

      expect(mockPrisma.transaction.create).toHaveBeenCalledTimes(13);
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

      vi.mocked(transactionUpdateSchema.parse).mockReturnValue({
        amount: 2000,
      });

      mockReq.params = { id: 'tx1' };

      const result = await updateTransactionService(mockReq, mockRes);

      expect(mockPrisma.transaction.findUnique).toHaveBeenCalledWith({
        where: { id: 'tx1' },
      });
      expect(mockPrisma.transaction.update).toHaveBeenCalledWith({
        where: { id: 'tx1' },
        data: {
          amount: 2000,
        },
        include: { category: true },
      });
      expect(result).toEqual({
        message: 'Transação atualizada com sucesso',
        data: {
          ...mockTransaction,
          amount: 2000,
        },
      });
    });

    it('should throw AppError when transaction not found', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(null);

      vi.mocked(transactionUpdateSchema.parse).mockReturnValue({
        amount: 2000,
      });

      await expect(updateTransactionService(mockReq, mockRes)).rejects.toEqual(
        new AppError('Transação não encontrada', 404)
      );
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

      mockReq.params = { id: 'tx1' };

      await deleteTransactionService(mockReq, mockRes);

      expect(mockPrisma.transaction.findUnique).toHaveBeenCalledWith({
        where: { id: 'tx1' },
      });
      expect(mockPrisma.transaction.delete).toHaveBeenCalledWith({
        where: { id: 'tx1' },
      });
    });

    it('should throw AppError when transaction not found', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(null);

      await expect(deleteTransactionService(mockReq, mockRes)).rejects.toEqual(
        new AppError('Transação não encontrada', 404)
      );
    });
  });
});
