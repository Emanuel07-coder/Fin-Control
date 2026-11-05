import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/utils/app';
import prisma from '../src/config/database';

const BASE_URL = '/api';

// Helper para gerar um usuário único por bloco e obter o token diretamente
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

  // Extrai os tokens da resposta do registro
  const accessToken = response.body?.data?.tokens?.accessToken || response.body?.data?.accessToken;
  const refreshToken = response.body?.data?.tokens?.refreshToken;

  if (!accessToken) {
    throw new Error(`Falha ao obter token para ${prefix}: ${JSON.stringify(response.body)}`);
  }

  return { accessToken, refreshToken, user: response.body?.data?.user, testUser };
};

// 1. Testes de Autenticação
describe('Auth Controller', () => {
  const testUser = {
    name: 'Test User',
    email: `auth-test-${Date.now()}@example.com`,
    password: 'TestPassword123',
  };

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: 'auth-test-' } },
    });
  });

  describe('POST /auth/register', () => {
    it('deve registrar um novo usuário', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/auth/register`)
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
    });

    it('deve falhar com email duplicado', async () => {
      await request(app)
        .post(`${BASE_URL}/auth/register`)
        .send(testUser)
        .expect(409);
    });

    it('deve falhar com dados inválidos', async () => {
      await request(app)
        .post(`${BASE_URL}/auth/register`)
        .send({ name: 'Test' })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('deve fazer login com credenciais válidas', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/auth/login`)
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('tokens');
    });

    it('deve falhar com senha incorreta', async () => {
      await request(app)
        .post(`${BASE_URL}/auth/login`)
        .send({
          email: testUser.email,
          password: 'WrongPassword123',
        })
        .expect(401);
    });

    it('deve falhar com usuário inexistente', async () => {
      await request(app)
        .post(`${BASE_URL}/auth/login`)
        .send({
          email: 'nonexistent@example.com',
          password: 'TestPassword123',
        })
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('deve renovar tokens com refresh token válido', async () => {
      const loginResponse = await request(app)
        .post(`${BASE_URL}/auth/login`)
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const refreshToken = loginResponse.body.data.tokens.refreshToken;

      const response = await request(app)
        .post(`${BASE_URL}/auth/refresh`)
        .send({ refreshToken })
        .expect(200);

      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });
  });

  describe('GET /auth/profile', () => {
    it('should return user profile when authenticated', async () => {
      const session = await createUniqueTestUser('profile-test');
      const response = await request(app)
        .get(`${BASE_URL}/auth/profile`)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('id', session.user.id);
      expect(response.body.data).toHaveProperty('email', session.user.email);
      expect(response.body.data).toHaveProperty('name', session.user.name);
    });

    it('should return error when user not authenticated', async () => {
      await request(app)
        .get(`${BASE_URL}/auth/profile`)
        .expect(401);
    });
  });

  describe('PUT /auth/profile', () => {
    it('should update user profile', async () => {
      const session = await createUniqueTestUser('profile-update-test');
      const response = await request(app)
        .put(`${BASE_URL}/auth/profile`)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.data).toHaveProperty('name', 'Updated Name');
    });

    it('should return error when user not authenticated', async () => {
      await request(app)
        .put(`${BASE_URL}/auth/profile`)
        .send({ name: 'Updated Name' })
        .expect(401);
    });
  });

  describe('POST /auth/change-password', () => {
    it('should update password', async () => {
      const session = await createUniqueTestUser('password-test');
      const response = await request(app)
        .post(`${BASE_URL}/auth/change-password`)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ currentPassword: 'TestPassword123', newPassword: 'NewPassword123' })
        .expect(200);

      // Assuming the response has a message or something
      expect(response.body).toHaveProperty('message');
    });

    it('should return error when user not authenticated', async () => {
      await request(app)
        .post(`${BASE_URL}/auth/change-password`)
        .send({ oldPassword: 'Test', newPassword: 'New' })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout user', async () => {
      const session = await createUniqueTestUser('logout-test');
      const response = await request(app)
        .post(`${BASE_URL}/auth/logout`)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ refreshToken: session.refreshToken }) // Assuming we have refreshToken from session
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should return error when user not authenticated', async () => {
      await request(app)
        .post(`${BASE_URL}/auth/logout`)
        .expect(401);
    });
  });

  describe('POST /auth/logout-all', () => {
    it('should logout user from all devices', async () => {
      const session = await createUniqueTestUser('logout-all-test');
      const response = await request(app)
        .post(`${BASE_URL}/auth/logout-all`)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should return error when user not authenticated', async () => {
      await request(app)
        .post(`${BASE_URL}/auth/logout-all`)
        .expect(401);
    });
  });
});

// 2. Testes de Categorias
describe('Categories Controller', () => {
  let authToken: string;

  beforeAll(async () => {
    const session = await createUniqueTestUser('category-test');
    authToken = session.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: 'category-test-' } },
    });
  });

  describe('GET /categories', () => {
    it('deve listar categorías', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/categories`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /categories', () => {
    it('deve criar uma nova categoría', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/categories`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Category',
          color: '#FF0000',
          icon: 'test',
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('name', 'Test Category');
    });
  });
});

// 3. Testes de Transações
describe('Transactions Controller', () => {
  let authToken: string;
  let categoryId: string;

  beforeAll(async () => {
    const session = await createUniqueTestUser('tx-test');
    authToken = session.accessToken;

    const categoryResponse = await request(app)
      .get(`${BASE_URL}/categories`)
      .set('Authorization', `Bearer ${authToken}`);

    if (categoryResponse.body?.data?.length > 0) {
      categoryId = categoryResponse.body.data[0].id;
    } else {
      const newCat = await request(app)
        .post(`${BASE_URL}/categories`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Tx Category', color: '#00FF00', icon: 'tag' });
      categoryId = newCat.body.data.id;
    }
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: 'tx-test-' } },
    });
  });

  describe('POST /transactions', () => {
    it('deve criar uma nova transação', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/transactions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoryId,
          type: 'EXPENSE',
          amount: 1000,
          date: new Date().toISOString(),
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('amount', 1000);
    });
  });

  describe('GET /transactions', () => {
    it('deve listar transações', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/transactions`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });
  });
});

// 4. Testes de Orçamentos
describe('Budgets Controller', () => {
  let authToken: string;
  let categoryId: string;

  beforeAll(async () => {
    const session = await createUniqueTestUser('budget-test');
    authToken = session.accessToken;

    const categoryResponse = await request(app)
      .get(`${BASE_URL}/categories`)
      .set('Authorization', `Bearer ${authToken}`);

    if (categoryResponse.body?.data?.length > 0) {
      categoryId = categoryResponse.body.data[0].id;
    } else {
      const newCat = await request(app)
        .post(`${BASE_URL}/categories`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Budget Category', color: '#0000FF', icon: 'wallet' });
      categoryId = newCat.body?.data?.id;
    }
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: 'budget-test-' } },
    });
  });

  describe('POST /budgets', () => {
    it('deve criar um orçamento com upsert', async () => {
      const currentMonth = new Date();
      const month = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;

      const response = await request(app)
        .post(`${BASE_URL}/budgets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoryId,
          amount: 5000,
          month,
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('amount', 5000);
    });

    it('deve atualizar orçamento existente (upsert)', async () => {
      const currentMonth = new Date();
      const month = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;

      await request(app)
        .post(`${BASE_URL}/budgets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoryId,
          amount: 10000,
          month,
        })
        .expect(201);
    });
  });

  describe('GET /budgets', () => {
    it('deve listar orçamentos', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/budgets`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });
  });
});

// 5. Testes de Dashboard
describe('Dashboard Controller', () => {
  let authToken: string;

  beforeAll(async () => {
    const session = await createUniqueTestUser('dash-test');
    authToken = session.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: 'dash-test-' } },
    });
  });

  describe('GET /dashboard', () => {
    it('deve carregar dashboard', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/dashboard`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('balance');
      expect(response.body.data).toHaveProperty('income');
      expect(response.body.data).toHaveProperty('expense');
      expect(response.body.data).toHaveProperty('categories');
      expect(response.body.data).toHaveProperty('budgets');
      expect(response.body.data).toHaveProperty('alerts');
    });

    it('deve suportar filtro de mês', async () => {
      const month = '2026-09';
      
      const response = await request(app)
        .get(`${BASE_URL}/dashboard`)
        .query({ month })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('currentMonthData');
    });
  });
});
