import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getBudgets,
  upsertBudget,
  updateBudget,
  deleteBudget,
} from '../src/controllers/budget.controller';
import { AppError } from '../src/utils/AppError';
import prisma from '../src/config/database';

// Mock prisma
vi.mock('../src/config/database', () => {
  return {
    default: {
      budget: {
        findMany: vi.fn(),
        count: vi.fn(),
        upsert: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      category: {
        findFirst: vi.fn(),
      },
    },
  };
});

const mockPrisma = prisma as unknown as {
  budget: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  category: { findFirst: ReturnType<typeof vi.fn> };
};

describe('Budget Controller', () => {
  const mockReq = {
    user: { userId: 'user-123' },
    query: {},
    params: {},
    body: {},
  } as any;
  const mockRes = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBudgets', () => {
    it('should return 401 if user not authenticated', async () => {
      const req = { user: undefined } as any;
      await expect(getBudgets(req, mockRes)).rejects.toEqual(
        new AppError('Usuário não autenticado', 401)
      );
    });

    it('should return budgets with pagination', async () => {
      mockPrisma.budget.findMany.mockResolvedValue([
        { id: 'b1', userId: 'user-123', categoryId: 'c1', amount: 1000, month: '2024-01' },
      ]);
      mockPrisma.budget.count.mockResolvedValue(1);

      const req = {
        ...mockReq,
        query: { page: '1', limit: '10' },
      } as any;

      await getBudgets(req, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Orçamentos carregados',
        data: [{ id: 'b1', userId: 'user-123', categoryId: 'c1', amount: 1000, month: '2024-01' }],
        pagination: { page: 1, limit: 10, total: 1 },
      });
    });
  });

  describe('upsertBudget', () => {
    it('should return 401 if user not authenticated', async () => {
      const req = { user: undefined } as any;
      await expect(upsertBudget(req, mockRes)).rejects.toEqual(
        new AppError('Usuário não autenticado', 401)
      );
    });

    it('should throw validation error on invalid body', async () => {
      const req = { ...mockReq, body: { amount: 'not a number' } } as any;
      await expect(upsertBudget(req, mockRes)).rejects.toEqual(
        new AppError('Erro de validação', 400)
      );
    });

    it('should throw 404 if category not found or not authorized', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(null);
      const req = {
        ...mockReq,
        body: { categoryId: 'c999', amount: 500, month: '2024-01' },
      } as any;
      await expect(upsertBudget(req, mockRes)).rejects.toEqual(
        new AppError('Categoria não encontrada ou não autorizada', 404)
      );
    });

    it('should create new budget when not exists', async () => {
      mockPrisma.category.findFirst.mockResolvedValue({ id: 'c1', isDefault: true });
      mockPrisma.budget.upsert.mockResolvedValue({
        id: 'newBudget',
        userId: 'user-123',
        categoryId: 'c1',
        amount: 500,
        month: '2024-01',
      });

      const req = {
        ...mockReq,
        body: { categoryId: 'c1', amount: 500, month: '2024-01' },
      } as any;

      await upsertBudget(req, mockRes);

      expect(mockPrisma.budget.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          userId_categoryId_month: {
            userId: 'user-123',
            categoryId: 'c1',
            month: '2024-01',
          },
        },
        create: expect.objectContaining({
          amount: 500,
        }),
        update: expect.objectContaining({
          amount: 500,
        }),
      }));
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Orçamento salvo com sucesso',
        data: expect.objectContaining({ id: 'newBudget' }),
      });
    });

    it('should update existing budget when exists', async () => {
      mockPrisma.category.findFirst.mockResolvedValue({ id: 'c1', isDefault: true });
      mockPrisma.budget.upsert.mockResolvedValue({
        id: 'existingBudget',
        userId: 'user-123',
        categoryId: 'c1',
        amount: 600,
        month: '2024-01',
      });

      const req = {
        ...mockReq,
        body: { categoryId: 'c1', amount: 600, month: '2024-01' },
      } as any;

      await upsertBudget(req, mockRes);

      expect(mockPrisma.budget.upsert).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Orçamento salvo com sucesso',
        data: expect.objectContaining({ id: 'existingBudget' }),
      });
    });
  });

  describe('updateBudget', () => {
    it('should return 401 if user not authenticated', async () => {
      const req = { user: undefined } as any;
      await expect(updateBudget(req, mockRes)).rejects.toEqual(
        new AppError('Usuário não autenticado', 401)
      );
    });

    it('should throw validation error on invalid body', async () => {
      const req = { ...mockReq, body: { amount: 'not a number' } } as any;
      await expect(updateBudget(req, mockRes)).rejects.toEqual(
        new AppError('Erro de validação', 400)
      );
    });

    it('should return 404 if budget not found or not owned', async () => {
      mockPrisma.budget.findUnique.mockResolvedValue(null);
      const req = { ...mockReq, params: { id: 'budget-xyz' } } as any;
      await expect(updateBudget(req, mockRes)).rejects.toEqual(
        new AppError('Orçamento não encontrado', 404)
      );
    });

    it('should update budget when found', async () => {
      mockPrisma.budget.findUnique.mockResolvedValue({
        id: 'budget-1',
        userId: 'user-123',
        amount: 300,
        categoryId: 'c1',
        month: '2024-01',
      });
      mockPrisma.budget.update.mockResolvedValue({
        id: 'budget-1',
        userId: 'user-123',
        amount: 350,
        categoryId: 'c1',
        month: '2024-01',
      });

      const req = {
        ...mockReq,
        params: { id: 'budget-1' },
        body: { amount: 350 },
      } as any;

      await updateBudget(req, mockRes);

      expect(mockPrisma.budget.update).toHaveBeenCalledWith({
        where: { id: 'budget-1' },
        data: { amount: 350 },
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Orçamento atualizado com sucesso',
        data: expect.objectContaining({ id: 'budget-1', amount: 350 }),
      });
    });
  });

  describe('deleteBudget', () => {
    it('should return 401 if user not authenticated', async () => {
      const req = { user: undefined } as any;
      await expect(deleteBudget(req, mockRes)).rejects.toEqual(
        new AppError('Usuário não autenticado', 401)
      );
    });

    it('should return 404 if budget not found or not owned', async () => {
      mockPrisma.budget.findUnique.mockResolvedValue(null);
      const req = { ...mockReq, params: { id: 'budget-xyz' } } as any;
      await expect(deleteBudget(req, mockRes)).rejects.toEqual(
        new AppError('Orçamento não encontrado', 404)
      );
    });

    it('should delete budget when found', async () => {
      mockPrisma.budget.findUnique.mockResolvedValue({
        id: 'budget-1',
        userId: 'user-123',
      });
      mockPrisma.budget.delete.mockResolvedValue({});

      const req = { ...mockReq, params: { id: 'budget-1' } } as any;

      await deleteBudget(req, mockRes);

      expect(mockPrisma.budget.delete).toHaveBeenCalledWith({
        where: { id: 'budget-1' },
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Orçamento excluído com sucesso',
      });
    });
  });
});