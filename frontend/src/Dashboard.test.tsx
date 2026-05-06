import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import { AuthProvider, useAuth } from '../context/AuthContext';
import * as hooks from '../hooks/useDashboard';

// Mock modules
vi.mock('../hooks/useDashboard');
vi.mock('../context/AuthContext', () => {
  return {
    __esModule: true,
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
    useAuth: vi.fn(),
  };
});

const mockUseAuth = vi.fn();
vi.mocked(useAuth).mockImplementation(mockUseAuth);


describe('Dashboard', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { name: 'Test User', currency: 'BRL' },
      logout: vi.fn(),
    });
  });

  it('renders loading state with skeleton cards', () => {
    (hooks.useDashboard as vi.Mock).mockReturnValue({
      isLoading: true,
      error: null,
      data: null,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Dashboard />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByRole('heading', { name: /Dashboard/i })).toBeInTheDocument();
    expect(screen.getAllByTestId('stats-card-skeleton')).toHaveLength(3);
  });

  it('renders cards with balance data correctly', async () => {
    const mockData = {
      balance: 50000, // R$500
      income: 100000,
      expense: 50000,
      categories: [],
      budgets: [],
      alerts: [],
    };

    (hooks.useDashboard as vi.Mock).mockReturnValue({
      isLoading: false,
      error: null,
      data: mockData,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Dashboard />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Saldo')).toBeInTheDocument();
      expect(screen.getByText('R$ 500,00')).toBeInTheDocument();
      expect(screen.getByText('R$ 1.000,00')).toBeInTheDocument();
      expect(screen.getByText('R$ 500,00')).toBeInTheDocument();
      expect(screen.getByText(/Test User/)).toBeInTheDocument();
    });
  });

  it('renders user greeting and logout button', () => {
    (hooks.useDashboard as vi.Mock).mockReturnValue({
      isLoading: false,
      error: null,
      data: { balance: 0, income: 0, expense: 0, categories: [], budgets: [], alerts: [] },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Dashboard />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText(/Bem-vindo de volta, Test User/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sair/i })).toBeInTheDocument();
  });

  it('handles error state', () => {
    (hooks.useDashboard as vi.Mock).mockReturnValue({
      isLoading: false,
      error: { message: 'Erro de servidor' },
      data: null,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Dashboard />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Erro ao carregar')).toBeInTheDocument();
  });
});
