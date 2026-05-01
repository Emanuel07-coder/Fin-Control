import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/utils/app';
import prisma from '../src/config/database';
import { hashPassword } from '../src/utils/password';

const BASE_URL = '/api';

// Testes de autenticação
describe('Auth Controller', () => {
  const testUser = {
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123',
  };

  afterAll(async () => {
    // Limpar dados de teste
    await prisma.user.deleteMany({
      where: { email: { contains: 'test-' } },
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
      // Primeiro faz login para obter tokens
      const loginResponse = await request(app)
        .post(`${BASE_URL}/auth/login`)
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const refreshToken = loginResponse.body.data.tokens.refreshToken;

      // Renova tokens
      const response = await request(app)
        .post(`${BASE_URL}/auth/refresh`)
        .send({ refreshToken })
        .expect(200);

      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });
  });
});

// Testes de categorías
describe('Categories Controller', () => {
  let authToken: string;
  const testUser = {
    name: 'Category Test',
    email: `category-test-${Date.now()}@example.com`,
    password: 'TestPassword123',
  };

  beforeAll(async () => {
    // Criar usuário de teste
    const response = await request(app)
      .post(`${BASE_URL}/auth/register`)
      .send(testUser);

    authToken = response.body.data.tokens.accessToken;
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

// Testes de transações
describe('Transactions Controller', () => {
  let authToken: string;
  let categoryId: string;
  const testUser = {
    name: 'Transaction Test',
    email: `transaction-test-${Date.now()}@example.com`,
    password: 'TestPassword123',
  };

  beforeAll(async () => {
    // Criar usuário e obter token
    const userResponse = await request(app)
      .post(`${BASE_URL}/auth/register`)
      .send(testUser);

    authToken = userResponse.body.data.tokens.accessToken;

    // Obter uma categoría padrão
    const categoryResponse = await request(app)
      .get(`${BASE_URL}/categories`)
      .set('Authorization', `Bearer ${authToken}`);

    categoryId = categoryResponse.body.data[0].id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: 'transaction-test-' } },
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

// Testes de orçamentos
describe('Budgets Controller', () => {
  let authToken: string;
  let categoryId: string;
  const testUser = {
    name: 'Budget Test',
    email: `budget-test-${Date.now()}@example.com`,
    password: 'TestPassword123',
  };

  beforeAll(async () => {
    const userResponse = await request(app)
      .post(`${BASE_URL}/auth/register`)
      .send(testUser);

    authToken = userResponse.body.data.tokens.accessToken;

    const categoryResponse = await request(app)
      .get(`${BASE_URL}/categories`)
      .set('Authorization', `Bearer ${authToken}`);

    categoryId = categoryResponse.body.data[0].id;
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

// Testes de Dashboard
describe('Dashboard Controller', () => {
  let authToken: string;
  const testUser = {
    name: 'Dashboard Test',
    email: `dashboard-test-${Date.now()}@example.com`,
    password: 'TestPassword123',
  };

  beforeAll(async () => {
    const userResponse = await request(app)
      .post(`${BASE_URL}/auth/register`)
      .send(testUser);

    authToken = userResponse.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: 'dashboard-test-' } },
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
      const month = '2024-01';
      
      const response = await request(app)
        .get(`${BASE_URL}/dashboard`)
        .query({ month })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('currentMonthData');
    });
  });
});
