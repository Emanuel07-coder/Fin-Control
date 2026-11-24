import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options: any = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Fin-Control API',
      version: '1.0.0',
      description: 'API para controle financeiro pessoal com autenticação segura, gerenciamento de orçamentos, categorias, transações e dashboards.',
    },
    servers: [
      {
        url: process.env.APP_URL || 'http://localhost:3001',
        description: 'Servidor de desenvolvimento',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Autenticação',
        description: 'Endpoints de cadastro, login, refresh, logout e gestão de conta.',
      },
    ],
  },
  // Caminho para os arquivos que contêm as annotations (se usando jsdoc)
  // Como vamos definir manualmente, deixamos vazio ou apontamos para onde tiveremos os controllers
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // Ajustar conforme a estrutura
};

const swaggerSpec = swaggerJsdoc(options);

// Adicionar documentação manual do endpoint DELETE /api/auth/me
swaggerSpec.paths = swaggerSpec.paths || {};
swaggerSpec.paths['/api/auth/me'] = {
  delete: {
    tags: ['Autenticação'],
    summary: 'Excluir conta do usuário',
    description: 'Exclui a conta do usuário autenticado e todos os seus dados associados (refresh_tokens, categorias, transações e orçamentos) conforme LGPD.',
    security: [{ bearerAuth: [] }],
    responses: {
      '200': {
        description: 'Conta excluída com sucesso.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  example: 'Conta excluída com sucesso. Todos os dados pessoais foram removidos de forma irreversível conforme LGPD.',
                },
              },
            },
          },
        },
      },
      '401': {
        description: 'Token de acesso ausente ou inválido.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: {
                  type: 'string',
                  example: 'Token de acesso inválido ou expirado',
                },
              },
            },
          },
        },
      },
      '500': {
        description: 'Erro interno do servidor.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: {
                  type: 'string',
                  example: 'Erro interno ao excluir conta',
                },
              },
            },
          },
        },
      },
    },
  },
};

// Adicionar documentação manual do endpoint GET /api/user/me/export (LGPD - Portabilidade de Dados)
swaggerSpec.paths['/api/user/me/export'] = {
  get: {
    tags: ['Autenticação'],
    summary: 'Exportar todos os dados do usuário (Portabilidade LGPD)',
    description: 'Exporta todos os dados pessoais do usuário autenticado em formato JSON, incluindo perfil, categorias, transações e orçamentos, conforme o direito à portabilidade de dados da LGPD.',
    security: [{ bearerAuth: [] }],
    responses: {
      '200': {
        description: 'Dados exportados com sucesso em formato JSON.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                exportedAt: {
                  type: 'string',
                  format: 'date-time',
                  example: '2026-11-05T18:00:00.000Z',
                },
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', example: 'cmw3w0vxm00059lqv2j34stxk' },
                    name: { type: 'string', example: 'Usuário Teste' },
                    email: { type: 'string', example: 'usuario@exemplo.com' },
                    currency: { type: 'string', example: 'BRL' },
                    darkMode: { type: 'boolean', example: false },
                    createdAt: { type: 'string', format: 'date-time', example: '2026-11-01T10:00:00.000Z' },
                  },
                },
                categories: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      color: { type: 'string' },
                      icon: { type: 'string' },
                      isDefault: { type: 'boolean' },
                      userId: { type: 'string' },
                    },
                  },
                },
                transactions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      userId: { type: 'string' },
                      categoryId: { type: 'string' },
                      type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
                      amount: { type: 'number', description: 'Valor em centavos' },
                      description: { type: 'string' },
                      date: { type: 'string', format: 'date-time' },
                      recurrence: { type: 'string', enum: ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'] },
                      category: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          color: { type: 'string' },
                          icon: { type: 'string' },
                          isDefault: { type: 'boolean' },
                        },
                      },
                    },
                  },
                },
                budgets: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      userId: { type: 'string' },
                      categoryId: { type: 'string' },
                      amount: { type: 'number', description: 'Valor em centavos' },
                      month: { type: 'string', example: '2026-11' },
                      category: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          color: { type: 'string' },
                          icon: { type: 'string' },
                          isDefault: { type: 'boolean' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '401': {
        description: 'Token de acesso ausente ou inválido.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: {
                  type: 'string',
                  example: 'Token de acesso inválido ou expirado',
                },
              },
            },
          },
        },
      },
      '500': {
        description: 'Erro interno do servidor.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: {
                  type: 'string',
                  example: 'Erro interno ao exportar dados',
                },
              },
            },
          },
        },
      },
    },
  },
};

export const swaggerDocs = (app: any, port: number) => {
  // Rota para o JSON do Swagger
  app.use('/api/docs.json', swaggerUi.serve, swaggerUi.setup(null, { swaggerOptions: { explorer: true } }));

  // Rota para a interface do Swagger UI
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  console.log(`/api/docs disponível em http://localhost:${port}/api/docs`);
};