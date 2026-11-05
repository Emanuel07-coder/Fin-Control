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

describe('Category Controller', () => {
  let authToken: string;
  let userId: string;
  let catId: string;

  beforeAll(async () => {
    const session = await createUniqueTestUser('category-test');
    authToken = session.accessToken;
    userId = session.userId!;

    const c = await request(app)
      .post(`${BASE_URL}/categories`)
      .set('Authorization', 'Bearer ' + authToken)
      .send({ name: 'Category 1', color: '#FF0000', icon: 'test' })
      .expect(201);
    catId = c.body.data.id;
  });

  afterAll(async () => {
    try {
      await prisma.$executeRawUnsafe(`SET app.current_user_id = '${userId}';`);
      await prisma.category.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    } catch {
      // Ignorar erros de limpeza
    }
  });

  describe('POST /categories', () => {
    it('should create a new category', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/categories`)
        .set('Authorization', 'Bearer ' + authToken)
        .send({ name: 'Test Category', color: '#FF0000', icon: 'test' })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe('Test Category');
    });

    it('should return 400 if name is missing', async () => {
      await request(app)
        .post(`${BASE_URL}/categories`)
        .set('Authorization', 'Bearer ' + authToken)
        .send({ color: '#FF0000', icon: 'test' })
        .expect(400);
    });
  });

  describe('GET /categories', () => {
    it('should return categories created by this user', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/categories`)
        .set('Authorization', 'Bearer ' + authToken)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data.some((c: any) => c.id === catId)).toBe(true);
    });
  });

  describe('PUT /categories/:id', () => {
    it('should update a category', async () => {
      const response = await request(app)
        .put(`${BASE_URL}/categories/${catId}`)
        .set('Authorization', 'Bearer ' + authToken)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.data.name).toBe('Updated Name');
    });

    it('should return 404 if category not found', async () => {
      await request(app)
        .put(`${BASE_URL}/categories/99999`)
        .set('Authorization', 'Bearer ' + authToken)
        .send({ name: 'Non-existent' })
        .expect(404);
    });
  });

  describe('DELETE /categories/:id', () => {
    it('should delete a category', async () => {
      const category = await request(app)
        .post(`${BASE_URL}/categories`)
        .set('Authorization', 'Bearer ' + authToken)
        .send({ name: 'To Delete', color: '#FF0000', icon: 'test' })
        .expect(201);
      const categoryId = category.body.data.id;

      await request(app)
        .delete(`${BASE_URL}/categories/${categoryId}`)
        .set('Authorization', 'Bearer ' + authToken)
        .expect(200);

      const response = await request(app)
        .get(`${BASE_URL}/categories`)
        .set('Authorization', 'Bearer ' + authToken)
        .expect(200);

      expect(response.body.data).not.toContainEqual(
        expect.objectContaining({ id: categoryId })
      );
    });

    it('should return 404 if category not found', async () => {
      await request(app)
        .delete(`${BASE_URL}/categories/99999`)
        .set('Authorization', 'Bearer ' + authToken)
        .expect(404);
    });
  });
});
