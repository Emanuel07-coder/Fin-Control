import { test, expect } from '@playwright/test';

test.describe('FinControl - Fluxo Crítico de Autenticação e Conta', () => {

  test('usuário pode se cadastrar, fazer login, acessar configurações e excluir conta', async ({ page }) => {
    // Gerar email único para evitar conflitos de execução
    const timestamp = Date.now();
    const email = `e2e-user-${timestamp}@example.com`;
    const password = 'Teste@123456';
    const name = 'Usuário E2E Teste';

    // 1) Acessar página de registro
    await test.step('Acessar página de registro', async () => {
      await page.goto('/register');
      await expect(page).toHaveURL('/register');
      await expect(page.locator('h1')).toContainText('Junte-se a nós');
    });

    // 2) Preencher formulário de registro (incluindo checkbox LGPD)
    await test.step('Preencher formulário de registro com checkbox LGPD', async () => {
      await page.fill('input[name="name"]', name);
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.check('input[name="terms"]');
      await page.click('button[type="submit"]:has-text("Criar conta")');
    });

    // 3) Validar redirecionamento para o dashboard após registro
    await test.step('Validar redirecionamento para dashboard após registro', async () => {
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('h1')).toContainText('Dashboard');
    });

    // 4) Acessar página de configurações
    await test.step('Acessar página de configurações', async () => {
      await page.click('a:has-text("Configurações")');
      await expect(page).toHaveURL('/settings');
      await expect(page.locator('h1')).toContainText('Configurações da Conta');
    });

    // 5) Clicar em "Excluir Conta" para abrir modal
    await test.step('Abrir modal de exclusão de conta', async () => {
      await page.click('button:has-text("Excluir Conta")');
      await expect(page.locator('text=Excluir Minha Conta')).toBeVisible();
      await expect(page.locator('text=Atenção: Ação Irreversível')).toBeVisible();
    });

    // 6) Confirmar exclusão no modal
    await test.step('Confirmar exclusão de conta no modal', async () => {
      await page.click('button:has-text("Excluir Minha Conta")');
      await expect(page).toHaveURL('/login');
    });
  });

});
