import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/utils/app';
import { prisma } from '../src/config/database';

const BASE_URL = '/api';

const createUniqueTestUser = async (prefix: string) => {
  const uniqueEmail = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
  const testUser = {
    name: `${prefix} User`,
    email: uniqueEmail,
    password: 'TestPassword123',
  };

  const response = await request(app)
    .post(`${BASE_URL}/auth/register`)
    .send(testUser);

  const accessToken = response.body.data?.tokens?.accessToken || response.body.data?.accessToken;
  const userId = response.body.data?.user?.id;

  if (!accessToken) {
    throw new Error(`Falha ao obter token para ${prefix}: ${JSON.stringify(response.body)}`);
  }

  return { accessToken, userId };
};

describe('Transaction Controller', () => {
  let authToken: string;
  let userId: string;
  let categoryId: string;

  beforeAll(async () => {
    const session = await createUniqueTestUser('tx-test');
    authToken = session.accessToken;
    userId = session.userId!;

    const categoryResponse = await request(app)
      .post(`${BASE_URL}/categories`)
      .set('Authorization', 'Bearer ' + authToken)
      .send({ name: 'Test Category', color: '#FF0000', icon: 'test' })
      .expect(201);

    categoryId = categoryResponse.body.data.id;
  });

  afterAll(async () => {
    try {
      await prisma.$executeRawUnsafe(`SET app.current_user_id = '${userId}';`);
      await prisma.transaction.deleteMany({ where: { userId } });
      await prisma.category.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    } catch {
      // Ignorar erros de limpeza
    }
  });

  describe('POST /transactions', () => {
    it('should create a new transaction', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/transactions`)
        .set('Authorization', 'Bearer ' + authToken)
        .send({
          name: 'Test Transaction',
          amount: 1000,
          type: 'INCOME',
          date: new Date().toISOString(),
          description: 'Test description',
          categoryId,
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.description).toBe('Test description');
    });

    it('should return 400 if required fields are missing', async () => {
      await request(app)
        .post(`${BASE_URL}/transactions`)
        .set('Authorization', 'Bearer ' + authToken)
        .send({})
        .expect(400);
    });
  });

  describe('GET /transactions', () => {
    it('should return transactions created by this user', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/transactions`)
        .set('Authorization', 'Bearer ' + authToken)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PUT /transactions/:id', () => {
    it('should update a transaction', async () => {
      const createResponse = await request(app)
        .post(`${BASE_URL}/transactions`)
        .set('Authorization', 'Bearer ' + authToken)
        .send({
          description: 'Original Description',
          amount: 1000,
          type: 'INCOME',
          date: new Date().toISOString(),
          categoryId,
        })
        .expect(201);
      const transactionId = createResponse.body.data.id;

      const response = await request(app)
        .put(`${BASE_URL}/transactions/${transactionId}`)
        .set('Authorization', 'Bearer ' + authToken)
        .send({ description: 'Updated Description' })
        .expect(200);

      expect(response.body.data.description).toBe('Updated Description');
    });

    it('should return 404 if transaction not found', async () => {
      await request(app)
        .put(`${BASE_URL}/transactions/99999`)
        .set('Authorization', 'Bearer ' + authToken)
        .send({ name: 'Non-existent' })
        .expect(404);
    });
  });

  describe('DELETE /transactions/:id', () => {
    it('should delete a transaction', async () => {
      const createResponse = await request(app)
        .post(`${BASE_URL}/transactions`)
        .set('Authorization', 'Bearer ' + authToken)
        .send({
          name: 'To Delete',
          amount: 500,
          type: 'EXPENSE',
          date: new Date().toISOString(),
          description: 'To be deleted',
          categoryId,
        })
        .expect(201);
      const transactionId = createResponse.body.data.id;

      await request(app)
        .delete(`${BASE_URL}/transactions/${transactionId}`)
        .set('Authorization', 'Bearer ' + authToken)
        .expect(200);

      const response = await request(app)
        .get(`${BASE_URL}/transactions`)
        .set('Authorization', 'Bearer ' + authToken)
        .expect(200);

      expect(response.body.data).not.toContainEqual(
        expect.objectContaining({ id: transactionId })
      );
    });

    it('should return 404 if transaction not found', async () => {
      await request(app)
        .delete(`${BASE_URL}/transactions/99999`)
        .set('Authorization', 'Bearer ' + authToken)
        .expect(404);
    });
  });
});
