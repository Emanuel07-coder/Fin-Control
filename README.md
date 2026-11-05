# Fin-Control

Controle financeiro pessoal com autenticação segura, gerenciamento de orçamentos, categorias, transações e dashboards.

## Sumário

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [API Endpoints](#api-endpoints)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Setup e Instalação](#setup-e-instalação)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Testes](#testes)
- [Documentação da API](#documentação-da-api)
- [Licença](#licença)

## Visão Geral

Fin-Control é uma aplicação full-stack para controle financeiro pessoal, permettantdo aos usuários:
- Gerenciar receitas e despesas
- Organizar transações por categorias
- Criar e acompanhar orçamentos mensais
- Visualizar dashboards com insights financeiros
- Autenticação segura com JWT e refresh tokens

## Arquitetura

```mermaid
graph TB
    subgraph Frontend [Frontend (React/Vite)]
        direction TB
        UI[Interface do Usuário] --> State[Gerenciamento de Estado]
        State --> API[Comunicação com API]
    end

    subgraph Backend [Backend (Node.js/Express)]
        direction TB
        API[Rotinas API] --> Controllers[Controllers]
        Controllers --> Services[Services (Lógica de Negócio)]
        Services --> Prisma[Prisma ORM]
        Prisma --> DB[(Banco de Dados PostgreSQL)]
    end

    Frontend -->|HTTP requests| Backend
    Backend -->|HTTP responses| Frontend
```

### Camadas da Aplicação

1. **Frontend**: Construído com React e Vite, utilizando Tailwind CSS para estilização e Lucide para ícones.
2. **Backend**: API RESTful com Node.js, Express e Prisma ORM para comunicação com o banco de dados PostgreSQL.
3. **Banco de Dados**: PostgreSQL com schema definido em Prisma, contendo tabelas para usuários, categorias, transações, orçamentos e tokens de refresh.

## 🔌 API Endpoints

### Autenticação
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/register` | Registrar novo usuário |
| POST | `/api/auth/login` | Autenticar usuário |
| POST | `/api/auth/refresh` | Renovar access token |
| POST | `/api/auth/logout` | Logout da sessão atual |
| POST | `/api/auth/logout-all` | Logout de todas as sessões |

### Usuário
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/profile` | Obter perfil do usuário logado |
| PUT | `/api/profile` | Atualizar perfil do usuário |
| PUT | `/api/profile/password` | Alterar senha do usuário |

### Categorias
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/categories` | Listar todas as categorias do usuário |
| POST | `/api/categories` | Criar nova categoria |
| GET | `/api/categories/:id` | Obter categoria por ID |
| PUT | `/api/categories/:id` | Atualizar categoria |
| DELETE | `/api/categories/:id` | Excluir categoria |

### Transações
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/transactions` | Listar transações com filtros opcionais |
| POST | `/api/transactions` | Criar nova transação |
| GET | `/api/transactions/:id` | Obter transação por ID |
| PUT | `/api/transactions/:id` | Atualizar transação |
| DELETE | `/api/transactions/:id` | Excluir transação |
| GET | `/api/transactions/summary/monthly` | Obter resumo mensal de transações |
| GET | `/api/transactions/summary/yearly` | Obter resumo anual de transações |

### Orçamentos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/budgets` | Listar orçamentos do usuário |
| POST | `/api/budgets` | Criar novo orçamento |
| GET | `/api/budgets/:id` | Obter orçamento por ID |
| PUT | `/api/budgets/:id` | Atualizar orçamento |
| DELETE | `/api/budgets/:id` | Excluir orçamento |
| GET | `/api/budgets/summary/:month` | Obter resumo de orçamentos para um mês específico |

### Relatórios e Exportação
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/user/export/pdf` | Exportar relatório financial em PDF |
| GET | `/api/user/export/excel` | Exportar relatório financial em Excel |

## Tecnologias Utilizadas

### Frontend
- **React 18** - Biblioteca para construção de interfaces
- **Vite** - Build tool e servidor de desenvolvimento
- **Tailwind CSS** - Framework CSS utility-first
- **Lucide React** - Conjunto de ícones
- **Zod** - Validação de esquemas TypeScript
- **React Hook Form** - Gerenciamento de formulários
- **Axios** - Cliente HTTP

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **Prisma ORM** - ORM para banco de dados
- **PostgreSQL** - Banco de dados relacional
- **JSON Web Tokens** - Autenticação
- **Bcrypt** - Hash de senhas
- **Zod** - Validação de dados
- **Swagger/OpenAPI** - Documentação da API
- **Helmet** - Segurança de cabeçalhos HTTP
- **CORS** - Compartilhamento de recursos entre origens
- **Rate Limiting** - Limitação de taxa de requisições

### DevOps & Testing
- **Vitest** - Framework de teste
- **TypeScript** - Tipagem estática
- **ESLint** - Linting de código
- **Prettier** - Formatação de código

## Setup e Instalação

### Pré-requisitos
- Node.js >= 18
- PostgreSQL >= 14
- Git

### Passo a Passo

1. **Clonar o repositório**
   ```bash
   git clone https://github.com/seu-usuario/fin-control.git
   cd fin-control
   ```

2. **Configurar variáveis de ambiente**
   Copie o arquivo `.env.example` para `.env` e preencha as variáveis:
   ```bash
   cp .env.example .env
   ```
   ```
   # Backend
   DATABASE_URL="postgresql://usuario:senha@localhost:5432/fincontrol"
   JWT_SECRET="sua-chave-secreta-jwt"
   JWT_EXPIRES_IN="15m"
   JWT_REFRESH_EXPIRES_IN="7d"
   APP_URL="http://localhost:3001"
   NODE_ENV="development"
   PORT=3001

   # Frontend
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
   npx prisma migrate dev --name init
   ```

5. **Iniciar a aplicação**
   ```bash
   # Backend (em um terminal)
   cd backend
   npm run dev

   # Frontend (em outro terminal)
   cd frontend
   npm run dev
   ```

6. **Acessar a aplicação**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - Documentação da API: http://localhost:3001/api/docs

## Testes

### Backend
```bash
cd backend
npm test
```
Ou para ver cobertura:
```bash
cd backend
npm run test:coverage
```

### Frontend
```bash
cd frontend
npm test
```
Ou para ver cobertura:
```bash
cd frontend
npm run test:coverage
```

### Executar todos os testes
```bash
npm test
```

## Documentação da API

A documentação interativa da API está disponível via Swagger UI:
- URL: http://localhost:3001/api/docs
- JSON specification: http://localhost:3001/api/docs.json

## Variáveis de Ambiente

### Backend (`.env`)
| Variável | Descrição | Padrão |
|----------|-----------|---------|
| `DATABASE_URL` | String de conexão com PostgreSQL | Obrigatório |
| `JWT_SECRET` | Chave secreta para assinatura JWT | Obrigatório |
| `JWT_EXPIRES_IN` | Tempo de expiração do access token | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Tempo de expiração do refresh token | `7d` |
| `APP_URL` | URL da aplicação | `http://localhost:3001` |
| `NODE_ENV` | Ambiente de execução | `development` |
| `PORT` | Porta do servidor | `3001` |

### Frontend (`.env`)
| Variável | Descrição |
|----------|-----------|
| `VITE_APP_URL` | URL da API backend |

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/FeatureIncrivel`)
3. Commit suas mudanças (`git commit -am 'Add some FeatureIncrivel'`)
4. Push para a branch (`git push origin feature/FeatureIncrivel`)
5. Abra um Pull Request

---

Feito para o controle financeiro pessoal