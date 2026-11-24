import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateBody, validateQuery, validateParams } from '../src/middleware/validate';
import { z } from 'zod';

// Mock the Request, Response, and NextFunction
const mockReq = {} as any;
const mockRes = {
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
} as any;
const mockNext = vi.fn();

describe('Validate Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReq.body = {};
    mockReq.query = {};
    mockReq.params = {};
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateBody', () => {
    it('should call next if validation passes', () => {
      const schema = z.object({ name: z.string() });
      mockReq.body = { name: 'John' };

      validateBody(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should call next with a ZodError if validation fails', () => {
      const schema = z.object({ name: z.string() });
      mockReq.body = {};

      validateBody(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.anything());
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(z.ZodError);
    });

    it('should call next with a ZodError if validation fails with specific error', () => {
      const schema = z.object({ age: z.number().positive() });
      mockReq.body = { age: -5 };

      validateBody(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.anything());
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(z.ZodError);
    });
  });

  describe('validateQuery', () => {
    it('should call next if validation passes', () => {
      const schema = z.object({ page: z.number() });
      mockReq.query = { page: 1 };

      validateQuery(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should call next with a ZodError if validation fails', () => {
      const schema = z.object({ page: z.number() });
      mockReq.query = {};

      validateQuery(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.anything());
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(z.ZodError);
    });

    it('should call next with a ZodError if validation fails with specific error', () => {
      const schema = z.object({ page: z.number().positive() });
      mockReq.query = { page: -5 };

      validateQuery(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.anything());
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(z.ZodError);
    });
  });

  describe('validateParams', () => {
    it('should call next if validation passes', () => {
      const schema = z.object({ id: z.string() });
      mockReq.params = { id: '123' };

      validateParams(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should call next with a ZodError if validation fails', () => {
      const schema = z.object({ id: z.string() });
      mockReq.params = {};

      validateParams(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.anything());
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(z.ZodError);
    });

    it('should call next with a ZodError if validation fails with specific error', () => {
      const schema = z.object({ id: z.number() });
      mockReq.params = { id: 'invalid' };

      validateParams(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.anything());
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(z.ZodError);
    });
  });
});