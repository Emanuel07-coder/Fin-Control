# Plano de Teste Manual - Fin-Control (E2E / QA)

## Objetivo
Validar o fluxo crítico ponta a ponta do Fin-Control no navegador real (Google Chrome no Windows), simulando o uso de um usuário final, incluindo acessibilidade por teclado, exportação de dados (LGPD) e exclusão de conta.

## Pré-requisitos
- Backend rodando na porta `http://localhost:3001`
- Frontend rodando na porta `http://localhost:5173`
- Navegador: Google Chrome (recomendado) ou Microsoft Edge
- Banco de dados PostgreSQL acessível (ou já preparado via migrações)

---

## Checklist de Teste Visual

### 1. Registro com Consentimento LGPD
- [ ] Acessar `http://localhost:5173/register`
- [ ] Verificar que a página carrega sem erros de console
- [ ] Preencher Nome, Email e Senha
- [ ] **Checkbox "Li e concordo com os Termos de Uso e Política de Privacidade"**: verificar que está desmarcado por padrão
- [ ] Tentar submeter o formulário sem marcar o checkbox → deve exibir erro de validação
- [ ] Marcar o checkbox e submeter → deve redirecionar para `/dashboard`

### 2. Navegação por Teclado (Tab)
- [ ] Acessar qualquer página do sistema (ex: Dashboard)
- [ ] Pressionar `Tab` repetidamente e verificar que o foco visível (outline/anel dourado) aparece em cada elemento interativo
- [ ] Ordem do foco: links do sidebar → inputs de formulário → botões → links do rodapé
- [ ] `Enter` em links deve navegar corretamente
- [ ] `Space` ou `Enter` em botões deve ativá-los

### 3. Exportação de Dados (LGPD - Portabilidade)
- [ ] Acessar a página de Configurações (`/settings`)
- [ ] Clicar em "Exportar Meus Dados" (ou similar)
- [ ] Verificar que um arquivo `.json` é baixado automaticamente
- [ ] Abrir o arquivo baixado e verificar que contém: dados do usuário, categorias, transações e orçamentos

### 4. Exclusão de Conta (LGPD)
- [ ] Acessar a página de Configurações (`/settings`)
- [ ] Clicar no botão de alerta "Excluir Conta"
- [ ] **Modal deve abrir** com título "Excluir Minha Conta"
- [ ] O modal deve conter aviso: "Esta ação é irreversível e apagará suas transações, categorias e orçamentos"
- [ ] Clicar em "Cancelar" → modal fecha, usuário permanece na página
- [ ] Clicar novamente em "Excluir Conta" → abrir modal
- [ ] Clicar em "Excluir Minha Conta" no modal → deve redirecionar para `/login`
- [ ] Tentar acessar qualquer rota protegida após exclusão → deve redirecionar para `/login`

### 5. Cookie Banner (LGPD)
- [ ] Abrir o site em uma janela de navegação anônima (incógnita)
- [ ] Verificar que o banner de cookies aparece no rodapé
- [ ] Clicar em "Entendi" → banner desaparece
- [ ] Recarregar a página → banner não deve reaparecer (salvo no localStorage)
- [ ] Limpar o `localStorage` (`localStorage.removeItem('cookie_consent')`) e recarregar → banner reaparece

### 6. Páginas de Transparência (CDC e LGPD)
- [ ] Clicar no link "Termos de Uso" na sidebar → deve abrir `/terms` com um `<h1>` principal
- [ ] Clicar no link "Política de Privacidade" na sidebar → deve abrir `/privacy` com um `<h1>` principal
- [ ] Verificar que ambas as páginas têm conteúdo estruturado em tópicos
- [ ] Verificar que há um link/canal de atendimento ("Fale Conosco") acessível

### 7. Logout
- [ ] Estar logado em qualquer página
- [ ] Clicar em "Sair da Conta" na sidebar
- [ ] Deve redirecionar para `/login`

---

## Critérios de Aprovação
1. Nenhum erro de JavaScript no console do navegador durante todo o fluxo
2. Todos os redirecionamentos funcionam conforme esperado
3. O modal de exclusão é exibido e confirma corretamente
4. O arquivo de exportação é baixado e contém JSON válido
5. Navegação por teclado funciona sem usar o mouse
6. Elementos ARIA (`aria-label`, `aria-expanded`, `aria-hidden`) estão presentes nos devidos elementos

---

## Problemas Conhecidos / Limitações
- Testes E2E automatizados com Playwright estão configurados na pasta `frontend/tests/`, mas exigem dependências de sistema do navegador que podem não estar disponíveis no WSL2 sem `sudo`.
- Para rodar Playwright no CI/CD, use um container com navegadores pré-instalados (ex: `mcr.microsoft.com/playwright` ou imagem similar).
