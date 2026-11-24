import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';
import app from '../utils/app';
import prisma from '../config/database';
import { signAccessToken } from '../utils/jwt';

const request = supertest(app);

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function truncateTables() {
  await prisma.transaction.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
}

async function seedUser() {
  return prisma.user.create({
    data: {
      email: `user_${Date.now()}@test.com`,
      name: 'Usuário Teste',
      passwordHash: 'hash_teste',
      currency: 'BRL',
    },
  });
}

async function authHeaders(userId: string) {
  const token = signAccessToken({ userId, id: userId });
  return { Authorization: `Bearer ${token}` };
}

describe('Dashboard controller (cálculo em centavos)', () => {
  beforeEach(async () => {
    await truncateTables();
  });

  afterEach(async () => {
    await truncateTables();
    await prisma.$disconnect();
  });

  it('deve retornar receita/saldo em centavos exatos (sem divisão por 100)', async () => {
    const user = await seedUser();
    const category = await prisma.category.create({
      data: { userId: user.id, name: 'Salário', color: '#10B981', icon: 'dollar-sign' },
    });

    // Receita de 150000 centavos (R$ 1.500,00). Se o controller dividisse por 100,
    // a API retornaria 1500 (errado). Esperamos 150000 exato.
    await prisma.transaction.create({
      data: {
        userId: user.id,
        categoryId: category.id,
        type: 'INCOME',
        amount: 150000, // centavos
        description: 'Receita de teste',
        date: new Date(),
      },
    });

    const res = await request
      .get('/api/dashboard')
      .set(await authHeaders(user.id))
      .expect(200);

    expect(res.body.data.income).toBe(150000);
    expect(res.body.data.expense).toBe(0);
    expect(res.body.data.balance).toBe(150000);
    expect(res.body.data.alerts).toEqual([]);
  });

  it('deve marcar alerta danger quando gasto excede orçamento (centavos vs centavos)', async () => {
    const user = await seedUser();
    const category = await prisma.category.create({
      data: { userId: user.id, name: 'Alimentação', color: '#EF4444', icon: 'shopping-cart' },
    });

    const month = currentMonth();

    // Orçamento de 50000 centavos (R$ 500,00) para a categoria no mês atual.
    await prisma.budget.create({
      data: { userId: user.id, categoryId: category.id, amount: 50000, month },
    });

    // Despesa de 150000 centavos (R$ 1.500,00) na mesma categoria e mês.
    await prisma.transaction.create({
      data: {
        userId: user.id,
        categoryId: category.id,
        type: 'EXPENSE',
        amount: 150000, // centavos
        description: 'Compra de teste',
        date: new Date(),
      },
    });

    const res = await request
      .get('/api/dashboard')
      .set(await authHeaders(user.id))
      .expect(200);

    expect(res.body.data.expense).toBe(150000);
    expect(res.body.data.income).toBe(0);
    expect(res.body.data.balance).toBe(-150000);

    const alerts = res.body.data.alerts;
    expect(alerts.length).toBe(1);
    expect(alerts[0].level).toBe('danger');
    expect(alerts[0].spent).toBe(150000); // centavos exatos
    expect(alerts[0].total).toBe(50000); // centavos exatos (budget.amount)
    expect(alerts[0].categoryId).toBe(category.id);
  });
});
