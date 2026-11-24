import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getMe, exportTransactions } from '../src/controllers/user.controller';
import { AppError } from '../src/utils/AppError';
import prisma from '../src/config/database';

// Mock prisma
vi.mock('../src/config/database', () => {
  return {
    default: {
      user: {
        findUnique: vi.fn(),
      },
      transaction: {
        findMany: vi.fn(),
      },
    },
  };
});

const mockPrisma = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn> };
  transaction: { findMany: ReturnType<typeof vi.fn> };
};

// Mock pdfkit for PDF export
let pdfkitMockInstance;
vi.mock('pdfkit', () => {
  return {
    default: class {
      constructor() {
        pdfkitMockInstance = {
          pipe: vi.fn(),
          fontSize: vi.fn().mockReturnThis(),
          text: vi.fn().mockReturnThis(),
          end: vi.fn(),
          moveDown: vi.fn().mockReturnThis(),
          moveTo: vi.fn().mockReturnThis(),
          lineTo: vi.fn().mockReturnThis(),
          stroke: vi.fn().mockReturnThis(),
        };
        return pdfkitMockInstance;
      }
    },
  };
});

describe('User Controller', () => {
  const mockReq = {
    user: { userId: 'user-123' },
  } as any;
  const mockRes = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis(),
    attachment: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMe', () => {
    it('should return user data when authenticated', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        currency: 'BRL',
        darkMode: false,
        createdAt: new Date(),
      });

      await getMe(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        data: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
          currency: 'BRL',
          darkMode: false,
          createdAt: expect.any(Date),
        },
      });
    });

    it('should return error when user not authenticated', async () => {
      const reqNoUser = { user: undefined } as any;
      await getMe(reqNoUser, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Usuário não autenticado',
      });
    });

    it('should return error when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await getMe(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Usuário não encontrado',
      });
    });

    it('should return 500 on unexpected error', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('DB error'));
      await getMe(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Erro interno ao buscar perfil',
      });
    });
  });

  describe('exportTransactions', () => {
    it('should throw AppError when user not authenticated', async () => {
      const reqNoUser = { user: undefined } as any;
      await expect(exportTransactions(reqNoUser, mockRes)).rejects.toEqual(
        new AppError('Usuário não autenticado', 401)
      );
    });

    it('should return CSV when format=csv', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([
        {
          id: 'tx1',
          date: new Date('2024-01-01'),
          type: 'INCOME',
          amount: 1000,
          description: 'Salary',
          category: { name: 'Salário' },
          recurrence: 'NONE',
        },
      ]);

      const mockReqWithQuery = {
        ...mockReq,
        query: { format: 'csv' },
      } as any;

      await exportTransactions(mockReqWithQuery, mockRes);

      expect(mockRes.header).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockRes.attachment).toHaveBeenCalledWith(expect.stringContaining('.csv'));
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('should return PDF when format=pdf', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      const mockReqWithQuery = {
        ...mockReq,
        query: { format: 'pdf' },
      } as any;

      await exportTransactions(mockReqWithQuery, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('.pdf')
      );
    });

    it('should throw AppError on invalid format', async () => {
      const mockReqWithQuery = {
        ...mockReq,
        query: { format: 'xml' },
      } as any;
      await expect(
        exportTransactions(mockReqWithQuery, mockRes)
      ).rejects.toEqual(new AppError('Formato inválido. Use pdf ou csv', 400));
    });

    it('should filter transactions by date range when startDate and endDate are provided', async () => {
      const mockTransactions = [
        { id: 'tx1', date: new Date('2024-01-01'), amount: 1000, type: 'INCOME', description: 'Test', category: { name: 'Test' } },
      ];
      mockPrisma.transaction.findMany.mockResolvedValue(mockTransactions);

      const mockReqWithQuery = {
        ...mockReq,
        query: {
          format: 'csv',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        },
      } as any;

      await exportTransactions(mockReqWithQuery, mockRes);

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        })
      );
    });

    it('should generate correct CSV content', async () => {
      const mockTransactions = [
        {
          id: 'tx1',
          date: new Date('2024-01-01'),
          type: 'INCOME',
          amount: 1000,
          description: 'Salary',
          category: { name: 'Salary' },
        },
        {
          id: 'tx2',
          date: new Date('2024-01-02'),
          type: 'EXPENSE',
          amount: 500,
          description: 'Lunch',
          category: { name: 'Food' },
        },
      ];
      mockPrisma.transaction.findMany.mockResolvedValue(mockTransactions);

      const mockReqWithQuery = {
        ...mockReq,
        query: { format: 'csv' },
      } as any;

      await exportTransactions(mockReqWithQuery, mockRes);

      const expectedCsv = 'ID,Data,Tipo,Categoria,Valor,Descricao\n' +
        `"tx1","2024-01-01","INCOME","Salary","10.00","Salary"\n` +
        `"tx2","2024-01-02","EXPENSE","Food","5.00","Lunch"`;

      expect(mockRes.send).toHaveBeenCalledWith(expectedCsv);
    });

    it('should generate PDF with transaction data', async () => {
      const mockTransactions = [
        {
          id: 'tx1',
          date: new Date('2024-01-01'),
          type: 'INCOME',
          amount: 1000,
          description: 'Salary',
          category: { name: 'Salary' },
        },
      ];
      mockPrisma.transaction.findMany.mockResolvedValue(mockTransactions);

      const mockReqWithQuery = {
        ...mockReq,
        query: { format: 'pdf' },
      } as any;

      await exportTransactions(mockReqWithQuery, mockRes);

      // Expect that the text method was called with the date string at x=50 for the first transaction
      // The first 12 calls are for headers and summary, so the 13th call is the first transaction's date
      expect(pdfkitMockInstance.text).toHaveBeenNthCalledWith(13,
        '01/01/2024',
        50,
        expect.any(Number),
        { width: 80 }
      );
    });
  });
});