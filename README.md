# Fin-Control

Controle financeiro pessoal full-stack com autenticação segura (JWT + refresh tokens), Row Level Security (RLS) no PostgreSQL, gerenciamento de orçamentos, categorias, transações, dashboards e conformidade LGPD/CDC.

## Sumário

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [API Endpoints](#api-endpoints)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Segurança e Conformidade](#segurança-e-conformidade)
- [Setup e Instalação](#setup-e-instalação)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Testes](#testes)
- [Documentação da API (Swagger)](#documentação-da-api-swagger)
- [Licença](#licença)

## Visão Geral

Fin-Control é uma aplicação full-stack para controle financeiro pessoal, permitindo aos usuários:

- Gerenciar receitas e despesas por categoria
- Criar e acompanhar orçamentos mensais com alertas de limite
- Visualizar dashboard com saldo, totais e transações recentes
- Exportar todos os dados em JSON (direito à portabilidade — LGPD)
- Excluir conta e todos os dados associados (LGPD)
- Autenticação segura com JWT, refresh tokens e cookies HttpOnly
- Navegação acessível (WCAG/LBI): HTML semântico, ARIA, foco visível por teclado

## Arquitetura

O projeto é um **monorepo** dividido em duas pastas:

```
Fin-Control/
├── backend/          # Node.js + Express + TypeScript + Prisma + PostgreSQL
├── frontend/         # React + Vite + TypeScript + Tailwind CSS
└── prisma/           # Schema e migrações do banco de dados (está em backend/prisma)
```

```mermaid
graph TB
    subgraph Frontend [Frontend (React/Vite)]
        direction TB
        UI[Interface do Usuário] --> State[Zustand + TanStack Query]
        State --> API[Axios (com withCredentials)]
    end

    subgraph Backend [Backend (Node.js/Express)]
        direction TB
        API[Rotinas API] --> Middleware[Auth + Rate Limit + Error]
        Middleware --> Controllers[Controllers]
        Controllers --> Services[Services (Lógica de Negócio)]
        Services --> Prisma[Prisma ORM + RLS Extension]
        Prisma --> DB[(Banco de Dados PostgreSQL com RLS)]
    end

    Frontend -->|HTTP requests (cookies HttpOnly)| Backend
    Backend -->|HTTP responses| Frontend
```

### Camadas da Aplicação

1. **Frontend**: React 18 + Vite, Tailwind CSS para estilização, Lucide React para ícones, Framer Motion para animações, Zustand para estado global, TanStack Query para cache de servidor, React Hook Form + Zod para formulários, Playwright para testes E2E.
2. **Backend**: API RESTful com Node.js, Express e TypeScript. Prisma ORM com extensão que injeta `app.current_user_id` para políticas de Row Level Security (RLS) no PostgreSQL.
3. **Banco de Dados**: PostgreSQL com schema Prisma contendo tabelas: `users`, `categories`, `transactions`, `budgets`, `refresh_tokens`. RLS está habilitado em todas as tabelas sensíveis.

## 🔌 API Endpoints

Todas as rotas estão sob o prefixo `/api`. Rotas de usuário exigem autenticação via JWT (Bearer token) e cookies HttpOnly.

### Autenticação (`/api/auth`)

| Método | Rota | Descrição | Protegido |
|--------|------|-----------|-----------|
| POST | `/api/auth/register` | Registrar novo usuário (com checkbox de termos LGPD) | Não |
| POST | `/api/auth/login` | Autenticar usuário | Não |
| POST | `/api/auth/refresh` | Renovar access token via refresh token | Não |
| POST | `/api/auth/logout` | Logout da sessão atual | Sim |
| POST | `/api/auth/logout-all` | Logout de todas as sessões (revoga refresh tokens) | Sim |
| DELETE | `/api/auth/me` | Excluir conta e todos os dados associados (LGPD) | Sim |
| GET | `/api/auth/profile` | Obter perfil do usuário logado | Sim |
| PUT | `/api/auth/profile` | Atualizar perfil do usuário | Sim |
| POST | `/api/auth/change-password` | Alterar senha do usuário | Sim |

### Usuário (`/api/user`)

| Método | Rota | Descrição | Protegido |
|--------|------|-----------|-----------|
| GET | `/api/user/me` | Obter dados do usuário autenticado | Sim |
| GET | `/api/user/export` | Exportar transações do usuário | Sim |
| GET | `/api/user/me/export` | Exportação completa de todos os dados (JSON) — LGPD Portabilidade | Sim |

### Categorias (`/api/categories`)

| Método | Rota | Descrição | Protegido |
|--------|------|-----------|-----------|
| GET | `/api/categories` | Listar categorias do usuário | Sim |
| POST | `/api/categories` | Criar nova categoria | Sim |
| GET | `/api/categories/:id` | Obter categoria por ID | Sim |
| PUT | `/api/categories/:id` | Atualizar categoria (verificação de propriedade) | Sim |
| DELETE | `/api/categories/:id` | Excluir categoria (verificação de propriedade) | Sim |

### Transações (`/api/transactions`)

| Método | Rota | Descrição | Protegido |
|--------|------|-----------|-----------|
| GET | `/api/transactions` | Listar transações com filtros opcionais | Sim |
| POST | `/api/transactions` | Criar nova transação | Sim |
| GET | `/api/transactions/:id` | Obter transação por ID | Sim |
| PUT | `/api/transactions/:id` | Atualizar transação (verificação de propriedade) | Sim |
| DELETE | `/api/transactions/:id` | Excluir transação (verificação de propriedade) | Sim |

### Orçamentos (`/api/budgets`)

| Método | Rota | Descrição | Protegido |
|--------|------|-----------|-----------|
| GET | `/api/budgets` | Listar orçamentos do usuário | Sim |
| POST | `/api/budgets` | Criar novo orçamento | Sim |
| GET | `/api/budgets/:id` | Obter orçamento por ID | Sim |
| PUT | `/api/budgets/:id` | Atualizar orçamento (verificação de propriedade) | Sim |
| DELETE | `/api/budgets/:id` | Excluir orçamento (verificação de propriedade) | Sim |

### Dashboard (`/api/dashboard`)

| Método | Rota | Descrição | Protegido |
|--------|------|-----------|-----------|
| GET | `/api/dashboard` | Resumo do dashboard: saldo, receitas, despesas, transações recentes, alertas de orçamento | Sim |

## Tecnologias Utilizadas

### Frontend (`frontend/`)

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| React | 18.3.1 | Interface do usuário |
| Vite | 8.3.1 | Build tool e dev server |
| TypeScript | 5.5.3 | Tipagem estática |
| Tailwind CSS | 3.4.10 | Estilização utility-first |
| Lucide React | 0.441.0 | Ícones |
| Framer Motion | 12.38.0 | Animações |
| Zustand | 4.5.2 | Gerenciamento de estado |
| TanStack Query | 5.100.6 | Cache e sincronização de servidor |
| React Hook Form | 7.52.2 | Formulários |
| Zod | 4.6.7 | Validação de esquemas |
| Axios | 1.7.7 | Cliente HTTP (com `withCredentials: true`) |
| date-fns | 3.6.0 | Manipulação de datas |
| Playwright | 1.49.0 | Testes E2E |
| Vitest | 5.0.2 | Testes unitários |

### Backend (`backend/`)

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Node.js | 22 | Runtime |
| Express | 4.19.2 | Framework web |
| TypeScript | 5.5.3 | Tipagem estática |
| Prisma ORM | 6.3.1 | ORM e migrações |
| PostgreSQL | 14+ | Banco de dados relacional |
| JSON Web Tokens | 9.0.3 | Autenticação |
| bcryptjs | 2.4.3 | Hash de senhas |
| Zod | 4.6.7 | Validação de dados |
| Swagger/OpenAPI | 6.2.8 / 5.0.1 | Documentação da API |
| Helmet | 7.2.0 | Segurança de cabeçalhos HTTP |
| CORS | 2.8.5 | Compartilhamento de recursos entre origens |
| express-rate-limit | 8.4.1 | Limitação de taxa |
| pdfkit | 0.15.0 | Geração de PDF |

### DevOps & Testing

| Tecnologia | Uso |
|------------|-----|
| Vitest | Testes unitários e de integração (backend e frontend) |
| Playwright | Testes E2E (frontend) |
| GitHub Actions | CI/CD (`.github/workflows/ci.yml`) |
| ESLint | Linting de código |
| Prettier | Formatação de código |

## Segurança e Conformidade

### Segurança (P0 a P2)

- **JWT com validação obrigatória**: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET` e `JWT_ACCESS_SECRET` são validadas na inicialização do servidor (`backend/src/config/env.ts`).
- **Refresh token rotation**: tokens armazenados como cookies HttpOnly, reenviados automaticamente pelo Axios (`withCredentials: true`).
- **CSRF protection**: token CSRF enviado no header `X-CSRF-Token` para métodos não-GET.
- **Rate limiting**: limitação de 10 requisições por minuto em rotas de autenticação.
- **Row Level Security (RLS)**: habilitado nas tabelas `categories`, `transactions`, `budgets` e `refresh_tokens`, com políticas baseadas em `app.current_user_id`.
- **Defesa em profundidade**: RLS no banco + verificação explícita de propriedade (`userId === existing.userId`) em controllers de update/delete.
- **Helmet + CORS**: cabeçalhos de segurança e controle de origem.

### Conformidade LGPD e CDC (P4)

- **Direito à Portabilidade**: endpoint `GET /api/user/me/export` retorna todos os dados do usuário em JSON para download.
- **Direito à Exclusão**: endpoint `DELETE /api/auth/me` remove a conta e todos os dados associados (transações, categorias, orçamentos, refresh tokens) em cascata.
- **Consentimento Explícito**: checkbox obrigatório no registro ("Li e concordo com os Termos de Uso e Política de Privacidade").
- **Cookie Banner**: aviso no rodapé sobre cookies essenciais, com preferência salva em `localStorage`.
- **Transparência**: páginas `/terms` (Termos de Uso) e `/privacy` (Política de Privacidade) com conteúdo estruturado.
- **Canal de Atendimento (CDC)**: link "Fale Conosco" acessível.

### Acessibilidade (P5 — WCAG/LBI)

- **HTML semântico**: `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`.
- **ARIA labels**: `aria-label` em botões com ícones, `aria-expanded` no menu mobile, `aria-current="page"` no link ativo.
- **Ícones decorativos**: `aria-hidden="true"` para leitores de tela.
- **Foco visível**: `focus-visible:ring-2` com cor primária (dourado) em botões e inputs.
- **Hierarquia de cabeçalhos**: um único `<h1>` por página, `<h2>` e `<h3>` em ordem lógica.
- **Navegação por teclado**: todos os interativos acessíveis via `Tab`.

## Setup e Instalação

### Pré-requisitos

- Node.js >= 20 (recomendado 22)
- PostgreSQL >= 14
- Git

### Passo a Passo

1. **Clonar o repositório**

   ```bash
   git clone https://github.com/seu-usuario/fin-control.git
   cd fin-control
   ```

2. **Configurar variáveis de ambiente**

   Copie o arquivo `.env.example` para `.env` no backend e preencha:

   ```bash
   cd backend
   cp .env.example .env
   ```

   Exemplo de `.env`:

   ```env
   # Banco de dados
   DATABASE_URL="postgresql://usuario:senha@localhost:5432/fincontrol?schema=public"

   # JWT (gere com: openssl rand -base64 64)
   JWT_SECRET="sua-chave-secreta-aqui"
   JWT_REFRESH_SECRET="sua-chave-refresh-aqui"
   JWT_ACCESS_SECRET="sua-chave-access-aqui"

   # Servidor
   PORT=3001
   NODE_ENV="development"
   APP_URL="http://localhost:3001"
   ```

   No frontend, crie `.env` baseado em:

   ```env
   VITE_APP_URL="http://localhost:3001"
   ```

3. **Instalar dependências**

   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

4. **Executar migrações do banco de dados**

   ```bash
   cd backend
   npx prisma generate
   npx prisma migrate deploy
   ```

5. **Iniciar a aplicação**

   ```bash
   # Backend (terminal 1)
   cd backend
   npm run dev

   # Frontend (terminal 2)
   cd frontend
   npm run dev
   ```

6. **Acessar a aplicação**

   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - Documentação Swagger: http://localhost:3001/api/docs

## Testes

### Backend

O backend possui 104 testes passando (100%) cobrindo services, controllers e autenticação.

```bash
cd backend
npm test
```

### Frontend

```bash
cd frontend
npm test
```

### Testes E2E (Playwright)

Configurados para rodar contra o servidor de desenvolvimento:

```bash
cd frontend
npx playwright test
```

### Validação de tipos e schema

```bash
# Backend
cd backend
npx tsc --noEmit
npx prisma validate

# Frontend
cd frontend
node ./node_modules/typescript/bin/tsc --noEmit
```

## Documentação da API (Swagger)

A documentação interativa está disponível via Swagger UI:

- UI: http://localhost:3001/api/docs
- JSON: http://localhost:3001/api/docs.json

## Plano de Teste Manual

Um checklist detalhado para validação manual no navegador está disponível em `MANUAL_TEST_PLAN.md`, cobrindo registro, login, navegação por teclado (Tab), exportação de dados, exclusão de conta, cookie banner e páginas de transparência.

## Variáveis de Ambiente

### Backend (`backend/.env`)

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `DATABASE_URL` | String de conexão PostgreSQL | Sim |
| `JWT_SECRET` | Chave para assinar access tokens | Sim |
| `JWT_REFRESH_SECRET` | Chave para assinar refresh tokens | Sim |
| `JWT_ACCESS_SECRET` | Chave adicional para access tokens | Sim |
| `PORT` | Porta do servidor | Não (padrão: 3001) |
| `NODE_ENV` | Ambiente (`development`/`production`) | Não |
| `APP_URL` | URL pública da aplicação | Não |

### Frontend (`frontend/.env`)

| Variável | Descrição |
|----------|-----------|
| `VITE_APP_URL` | URL da API backend |

## Licença

Este projeto está licenciado sob a licença MIT — veja o arquivo [LICENSE](LICENSE) para detalhes.

## Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nome-da-feature`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona alguma coisa'`)
4. Push para a branch (`git push origin feature/nome-da-feature`)
5. Abra um Pull Request

---

Feito para o controle financeiro pessoal, com foco em segurança, conformidade LGPD/CDC e acessibilidade web.
