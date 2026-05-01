# Fase 2A Autenticação Backend - Progresso

## ✅ Fase 1 Infra Completa
- schema.prisma, database singleton, seed.ts (10 cats padrão)

## 🔄 Fase 2A - Em Implementação (aprovado "vai na fé")
1. [ ] utils/AppError.ts class
2. [ ] utils/password.ts bcrypt salt 12
3. [ ] utils/jwt.ts sign/verify/rotate (15m/7d)
4. [ ] utils/schemas.ts Zod auth
5. [ ] controllers/auth.controller.ts full impl + rotation
6. [ ] middleware/auth.ts verifyToken
7. [ ] routes/auth.ts + rate-limit 10/min
8. [ ] routes/index.ts fix mount
9. [ ] app.ts/server.ts polish
10. [ ] Test / npm run dev

Execute após: `npm i express-rate-limit @types/express-rate-limit`

