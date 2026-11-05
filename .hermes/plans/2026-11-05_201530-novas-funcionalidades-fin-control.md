# Plano de Implementação — Novas Funcionalidades Fin-Control

## Goal

Adicionar quatro funcionalidades de alto valor ao Fin-Control: toggle de dark mode, transações recorrentes, importação de CSV e relatório mensal de gastos, seguindo TDD com commits frequentes.

## Current Context / Assumptions

- Monorepo dividido em `backend/` (Express + TypeScript + Prisma + PostgreSQL) e `frontend/` (React + Vite + TanStack Query + Tailwind).
- Schema Prisma em `backend/prisma/schema.prisma` já contém os campos `darkMode` (User), `recurrence` (Transaction) e enums `TransactionType`/`RecurrenceType`, mas a lógica de negócio ainda não os utiliza.
- Backend expõe rotas em `backend/src/routes/` com controllers em `backend/src/controllers/` e services em `backend/src/services/`.
- Frontend usa hooks customizados em `frontend/src/hooks/` e páginas em `frontend/src/pages/`.
- Testes de backend rodam com Vitest (`npm test` na pasta `backend/`). Testes de frontend ainda não configurados (vitest.config.ts existe em `frontend/`).
- RLS está ativo no banco; controllers já fazem verificação explícita de propriedade.
- O implementador tem zero contexto do códigobase e gosto duvidoso: portanto, cada task é prescritiva, com caminhos exatos e código copiável.

## Architecture / Proposed Approach

1. **Dark Mode**: persistir preferência do usuário no banco (coluna `darkMode` já existe) e no `localStorage`; aplicar classe `.dark` no `<html>` via Tailwind. Backend: endpoint `PATCH /api/user/preferences`. Frontend: componente `ThemeToggle` + contexto de tema.
2. **Transações Recorrentes**: serviço de backend que, dado uma transação com `recurrence !== NONE`, gera instâncias futuras automaticamente. Endpoint `POST /api/transactions/recurring` para listar próximas ocorrências.
3. **Importação CSV**: endpoint `POST /api/transactions/import` que recebe `multipart/form-data`, parseia CSV com colunas fixas (date, description, amount, type, categoryId) e cria transações em lote dentro de uma transação Prisma.
4. **Relatório Mensal**: página `/reports` com gráfico de barras (receitas vs despesas por mês) e tabela de categorias com totais. Backend: endpoint `GET /api/dashboard/monthly-report?month=YYYY-MM`.

## Step-by-Step Tasks

### Feature A: Dark Mode Toggle

**Task A1 — Backend: endpoint de preferências de tema**
Criar rota `PATCH /api/user/preferences` em `backend/src/routes/user.ts` que aceita `{ darkMode: boolean }` e atualiza o usuário autenticado via Prisma.

Arquivo: `backend/src/routes/user.ts`
```ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { updatePreferences } from '../controllers/user.controller';

const router = Router();

router.patch('/preferences', authenticateToken, updatePreferences);

export default router;
```

Arquivo: `backend/src/controllers/user.controller.ts` (adicionar função)
```ts
import { Request, Response } from 'express';
import { prisma } from '../config/database';

export const updatePreferences = async (req: Request, res: Response) => {
  const { darkMode } = req.body;
  if (typeof darkMode !== 'boolean') {
    throw new AppError(400, 'darkMode deve ser booleano');
  }
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { darkMode },
    select: { id: true, darkMode: true },
  });
  res.json({ data: user });
};
```

Comando de verificação:
```
cd backend && npx tsc --noEmit && echo "TSC_OK"
```
Saída esperada: `TSC_OK` (exit 0).

**Task A2 — Frontend: contexto de tema**
Criar `frontend/src/store/themeStore.ts` (já existe — inspecionar) ou adicionar um provider `ThemeProvider` que lê `localStorage` e aplica `classList.toggle('dark', ...)` no elemento `<html>`.

Arquivo: `frontend/src/components/ui/theme-toggle.tsx` (novo)
```tsx
import { useThemeStore } from '../store/themeStore';
import { Sun, Moon } from 'lucide-react';
import { Button } from './button';

export const ThemeToggle: React.FC = () => {
  const { darkMode, toggleDarkMode } = useThemeStore();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleDarkMode}
      aria-label="Alternar tema escuro/claro"
    >
      {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
};
```

Comando de verificação:
```
cd frontend && node ./node_modules/typescript/bin/tsc --noEmit && echo "TSC_OK"
```
Saída esperada: `TSC_OK`.

**Task A3 — Frontend: adicionar ThemeToggle no Settings**
Inserir `<ThemeToggle />` na página `frontend/src/pages/Settings.tsx` acima do botão de exportar dados.

Comando de verificação:
```
cd frontend && node ./node_modules/typescript/bin/tsc --noEmit && echo "TSC_OK"
```
Saída esperada: `TSC_OK`.

---

### Feature B: Transações Recorrentes

**Task B1 — Backend: service para gerar ocorrências recorrentes**
Adicionar função `generateRecurringTransactions` em `backend/src/services/transaction.service.ts` que, dada uma data de referência, cria transações futuras para templates com `recurrence !== NONE`.

Arquivo: `backend/src/services/transaction.service.ts` (adicionar)
```ts
import { Prisma, RecurrenceType } from '@prisma/client';
import { addDays, addWeeks, addMonths } from 'date-fns';

export const generateRecurringTransactions = async (userId: string, from: Date, to: Date) => {
  const templates = await prisma.transaction.findMany({
    where: { userId, recurrence: { not: 'NONE' } },
    include: { category: true },
  });

  const generated: Array<Prisma.TransactionCreateInput> = [];

  for (const template of templates) {
    let current = new Date(template.date);
    while (current <= to) {
      if (current >= from && current.getTime() !== template.date.getTime()) {
        generated.push({
          userId,
          categoryId: template.categoryId,
          type: template.type,
          amount: template.amount,
          description: template.description,
          date: current,
          recurrence: template.recurrence,
        });
      }
      switch (template.recurrence) {
        case 'DAILY': current = addDays(current, 1); break;
        case 'WEEKLY': current = addWeeks(current, 1); break;
        case 'MONTHLY': current = addMonths(current, 1); break;
        default: current = new Date(current.getTime() + 86400000 * 365); break;
      }
    }
  }

  if (generated.length === 0) return [];
  return prisma.transaction.createMany({ data: generated });
};
```

Comando de verificação:
```
cd backend && npx tsc --noEmit && echo "TSC_OK"
```
Saída esperada: `TSC_OK`.

**Task B2 — Backend: endpoint para listar próximas ocorrências**
Adicionar rota `GET /api/transactions/recurring/upcoming` em `backend/src/routes/transactions.ts`.

Arquivo: `backend/src/routes/transactions.ts` (adicionar)
```ts
router.get('/recurring/upcoming', authenticateToken, transactionController.getUpcomingRecurring);
```

Comando de verificação:
```
cd backend && npx tsc --noEmit && echo "TSC_OK"
```
Saída esperada: `TSC_OK`.

---

### Feature C: Importação CSV de Transações

**Task C1 — Backend: endpoint de importação CSV**
Adicionar rota `POST /api/transactions/import` em `backend/src/routes/transactions.ts` que aceita `multipart/form-data` com campo `file` (CSV). Usar `csv-parse` para parsear.

Arquivo: `backend/src/routes/transactions.ts` (adicionar)
```ts
import multer from 'multer';
const upload = multer({ dest: 'uploads/' });

router.post('/import', authenticateToken, upload.single('file'), transactionController.importCSV);
```

Arquivo: `backend/src/controllers/transaction.controller.ts` (adicionar)
```ts
import { Request, Response } from 'express';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import { transactionService } from '../services/transaction.service';

export const importCSV = async (req: Request, res: Response) => {
  if (!req.file) throw new AppError(400, 'Arquivo CSV é obrigatório');
  const content = fs.readFileSync(req.file.path, 'utf-8');
  const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });
  const transactions = await transactionService.importFromCSV(req.user!.id, records);
  fs.unlinkSync(req.file.path);
  res.status(201).json({ data: transactions });
};
```

Instalar dependência:
```
cd backend && npm install csv-parse @types/multer multer
```
Saída esperada: pacotes instalados sem erro.

Comando de verificação:
```
cd backend && npx tsc --noEmit && echo "TSC_OK"
```
Saída esperada: `TSC_OK`.

**Task C2 — Frontend: componente de upload CSV**
Criar `frontend/src/components/ui/csv-import.tsx` (novo) com input de arquivo e botão "Importar Transações".

Arquivo: `frontend/src/components/ui/csv-import.tsx` (novo)
```tsx
import { useState } from 'react';
import { Button } from './button';
import { Upload } from 'lucide-react';
import api from '../services/api';

interface CSVImportProps {
  onSuccess?: () => void;
}

export const CSVImport: React.FC<CSVImportProps> = ({ onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post('/transactions/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onSuccess?.();
      setFile(null);
    } catch {
      alert('Erro ao importar CSV. Verifique o formato do arquivo.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        type="file"
        accept=".csv"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-paper-dark/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gold-accent/10 file:text-gold-accent hover:file:bg-gold-accent/20"
      />
      <Button type="submit" variant="secondary" disabled={isUploading}>
        {isUploading ? <Upload className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        <span>{isUploading ? 'Importando...' : 'Importar Transações CSV'}</span>
      </Button>
    </form>
  );
};
```

Comando de verificação:
```
cd frontend && node ./node_modules/typescript/bin/tsc --noEmit && echo "TSC_OK"
```
Saída esperada: `TSC_OK`.

---

### Feature D: Relatório Mensal de Gastos

**Task D1 — Backend: endpoint de relatório mensal**
Adicionar rota `GET /api/dashboard/monthly-report` em `backend/src/routes/dashboard.ts`.

Arquivo: `backend/src/routes/dashboard.ts` (adicionar)
```ts
router.get('/monthly-report', authenticateToken, dashboardController.getMonthlyReport);
```

Arquivo: `backend/src/controllers/dashboard.controller.ts` (adicionar)
```ts
export const getMonthlyReport = async (req: Request, res: Response) => {
  const { month } = req.query;
  if (!month || typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month)) {
    throw new AppError(400, 'month deve estar no formato YYYY-MM');
  }
  const [year, monthNum] = month.split('-').map(Number);
  const start = new Date(year, monthNum - 1, 1);
  const end = new Date(year, monthNum, 0);

  const transactions = await prisma.transaction.findMany({
    where: { userId: req.user!.id, date: { gte: start, lte: end } },
    include: { category: true },
  });

  const income = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);

  const byCategory = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((acc, t) => {
      const cat = t.category?.name || 'Sem categoria';
      acc[cat] = (acc[cat] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  res.json({ data: { month, income, expense, balance: income - expense, byCategory } });
};
```

Comando de verificação:
```
cd backend && npx tsc --noEmit && echo "TSC_OK"
```
Saída esperada: `TSC_OK`.

**Task D2 — Frontend: página de relatório**
Criar `frontend/src/pages/Reports.tsx` (novo) com gráfico de barras simples (usando divs do Tailwind, sem lib externa) e tabela de categorias.

Arquivo: `frontend/src/pages/Reports.tsx` (novo)
```tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const Reports: React.FC = () => {
  const { user } = useAuth();
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    api.get(`/dashboard/monthly-report?month=${month}`).then((r) => setReport(r.data.data));
  }, [month]);

  if (!report) return <div className="p-8">Carregando...</div>;

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold text-paper-dark">Relatório Mensal</h1>
      <div className="flex gap-4 items-center">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="input-premium p-2 rounded-lg border border-charcoal-lighter"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl border border-charcoal-lighter bg-near-black">
          <p className="text-xs text-paper-dark/50 uppercase">Receitas</p>
          <p className="text-2xl font-bold text-emerald-text">+{report.income / 100}</p>
        </div>
        <div className="p-6 rounded-xl border border-charcoal-lighter bg-near-black">
          <p className="text-xs text-paper-dark/50 uppercase">Despesas</p>
          <p className="text-2xl font-bold text-burgundy-text">-{report.expense / 100}</p>
        </div>
        <div className="p-6 rounded-xl border border-charcoal-lighter bg-near-black">
          <p className="text-xs text-paper-dark/50 uppercase">Saldo</p>
          <p className="text-2xl font-bold text-gold-accent">{report.balance / 100}</p>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[{ name: 'Receitas', value: report.income }, { name: 'Despesas', value: report.expense }]}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#D4AF37" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
```

Instalar dependência:
```
cd frontend && npm install recharts
```
Saída esperada: `recharts` instalado.

Comando de verificação:
```
cd frontend && node ./node_modules/typescript/bin/tsc --noEmit && echo "TSC_OK"
```
Saída esperada: `TSC_OK`.

**Task D3 — Frontend: adicionar rota e link de Relatórios**
Adicionar rota `/reports` em `frontend/src/App.tsx` e link na sidebar `frontend/src/components/ui/sidebar.tsx`.

Comando de verificação:
```
cd frontend && node ./node_modules/typescript/bin/tsc --noEmit && echo "TSC_OK"
```
Saída esperada: `TSC_OK`.

---

## Tests / Validation

Cada task de código segue o ciclo TDD:

1. Escrever teste falhando (RED)
2. Rodar `npm test` (backend) ou equivalente (frontend) e confirmar falha
3. Implementar código mínimo
4. Rodar teste novamente e confirmar passagem (GREEN)
5. Refatorar se necessário
6. Commit

Exemplo de comando para backend:
```
cd backend && npx vitest run transaction.controller.test.ts --reporter=verbose
```
Saída esperada (após implementação): todos os testes passam (ex: `Test Files 1 passed | Tests 8 passed`).

Exemplo de comando para frontend (quando vitest estiver configurado):
```
cd frontend && npx vitest run --reporter=verbose
```
Saída esperada: todos os testes passam.

Validação final de regressão:
```
cd backend && npx tsc --noEmit && npx prisma validate && npm test && echo "BACKEND_OK"
cd frontend && node ./node_modules/typescript/bin/tsc --noEmit && echo "FRONTEND_OK"
```
Saída esperada: `BACKEND_OK` e `FRONTEND_OK`.

---

## Risks, Tradeoffs, and Open Questions

1. **date-fns vs manual date math**: o Task B1 usa `date-fns` para adicionar dias/semanas/meses. Precisa instalar (`npm install date-fns`). Alternativa: implementar com `Date` nativo para evitar dependência, mas `date-fns` é mais seguro para meses com dias diferentes.
2. **csv-parse sincrono vs assíncrono**: o Task C1 usa `csv-parse/sync` para simplicidade. Arquivos grandes podem bloquear o event loop; considerar streaming se arquivos > 1MB forem comuns.
3. **Recharts no frontend**: adiciona ~100kB ao bundle. Alternativa: gráfico de barras puro com divs do Tailwind (menor dependência, mais código manual).
4. **RLS nos testes de importação CSV**: o endpoint de importação roda como usuário autenticado; testes precisam criar usuário via API e injetar `app.current_user_id` nas queries de limpeza, seguindo o padrão já estabelecido em `backend/tests/`.
5. **Open question**: o usuário quer notificações por email quando um orçamento é ultrapassado? Isso exigiria um provider de email (Resend/SendGrid) e um job cron. Não está escopo deste plano.
6. **Open question**: dark mode deve ser aplicado globalmente (Tailwind `dark:` variant) ou apenas em componentes específicos? Plano assume Tailwind `dark:` no `tailwind.config.js` (já configurado presumivelmente).
