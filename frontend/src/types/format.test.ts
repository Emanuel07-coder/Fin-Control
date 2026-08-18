import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, formatMonth, getCurrentMonth, parseToCentavos } from '../types';

// ============================================
// Testes de utilidades de tipo
// ============================================

describe('formatCurrency', () => {
  it('deve formatar valores corretamente', () => {
    expect(formatCurrency(1000)).toBe('R$ 10,00');
    expect(formatCurrency(1050)).toBe('R$ 10,50');
    expect(formatCurrency(99)).toBe('R$ 0,99');
    expect(formatCurrency(0)).toBe('R$ 0,00');
  });

  it('deve formatar com diferentes moedas', () => {
    expect(formatCurrency(1000, 'USD')).toBe('US$ 10,00');
    expect(formatCurrency(1000, 'EUR')).toBe('€ 10,00');
  });
});

describe('formatDate', () => {
  it('deve formatar datas ISO para formato brasileiro', () => {
    expect(formatDate('2024-01-15T00:00:00.000Z')).toBe('15/01/2024');
  });
});

describe('formatMonth', () => {
  it('deve formatar YYYY-MM para mês/ano completo', () => {
    expect(formatMonth('2024-01')).toBe('janeiro de 2024');
    expect(formatMonth('2024-12')).toBe('dezembro de 2024');
  });
});

describe('getCurrentMonth', () => {
  it('deve retornar o mês atual no formato YYYY-MM', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    expect(getCurrentMonth()).toBe(expected);
  });
});

// ============================================
// Testes de formatação de centavos
// ============================================

describe('parseToCentavos', () => {
  it('deve converter valores decimais corretamente', () => {
    expect(parseToCentavos('100,50')).toBe(10050);
    expect(parseToCentavos('100.50')).toBe(10050);
    expect(parseToCentavos('1.000,00')).toBe(100000);
    expect(parseToCentavos('0,99')).toBe(99);
  });

  it('deve lidar com entradas inválidas', () => {
    expect(parseToCentavos('')).toBe(0);
    expect(parseToCentavos('abc')).toBe(0);
    expect(parseToCentavos('R$')).toBe(0);
  });
});
