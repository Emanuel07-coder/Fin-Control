import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, FileText } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Alert } from '../components/ui/alert';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-rich-black p-4 sm:p-6 md:p-8 max-w-3xl mx-auto">
      <div className="card-premium rounded-xl border border-charcoal-lighter p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gold-accent/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-gold-accent" />
          </div>
          <h1 className="text-2xl font-display font-bold text-paper-dark">
            Política de Privacidade
          </h1>
        </div>

        <Alert variant="info" title="Última atualização">
          05 de novembro de 2026
        </Alert>

        <div className="space-y-6 text-paper-dark/70 text-sm leading-relaxed">
          <p>
            Esta Política de Privacidade explica como o FinControl coleta, usa,
            armazena e protege seus dados pessoais, em conformidade com a Lei
            Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
          </p>

          <h2 className="text-lg font-display font-bold text-paper-dark mt-8 mb-2">
            1. Dados Coletados
          </h2>
          <p>
            Coletamos os seguintes dados pessoais:
          </p>
          <ul className="ml-6 space-y-2 text-sm text-paper-dark/70 list-disc">
            <li>Nome completo, endereço de e-mail e senha (hashed)</li>
            <li>Moeda de preferência (padrão: BRL)</li>
            <li>Preferência de tema escuro/claro</li>
            <li>Transações financeiras (descrição, valor, tipo, data, categoria)</li>
            <li>Categorias personalizadas e orçamentos mensais</li>
          </ul>

          <h2 className="text-lg font-display font-bold text-paper-dark mt-8 mb-2">
            2. Finalidade do Tratamento
          </h2>
          <p>
            Seus dados são utilizados para:
          </p>
          <ul className="ml-6 space-y-2 text-sm text-paper-dark/70 list-disc">
            <li>Autenticação e gerenciamento de sua conta</li>
            <li>Registro e controle de suas transações financeiras</li>
            <li>Cálculo de saldo, receitas e despesas</li>
            <li>Geração de alertas de orçamento</li>
            <li>Exportação de dados (direito à portabilidade)</li>
            <li>Exclusão de dados (direito ao esquecimento)</li>
          </ul>

          <h2 className="text-lg font-display font-bold text-paper-dark mt-8 mb-2">
            3. Compartilhamento de Dados
          </h2>
          <p>
            O FinControl não compartilha seus dados pessoais com terceiros,
            exceto quando exigido por lei ou com seu consentimento explícito.
          </p>

          <h2 className="text-lg font-display font-bold text-paper-dark mt-8 mb-2">
            4. Seus Direitos (LGPD)
          </h2>
          <p>
            Você pode, a qualquer momento:
          </p>
          <ul className="ml-6 space-y-2 text-sm text-paper-dark/70 list-disc">
            <li>Acessar seus dados pessoais</li>
            <li>Corrigir dados incompletos ou desatualizados</li>
            <li>Exportar todos os seus dados em formato JSON</li>
            <li>Excluir sua conta e todos os dados associados</li>
            <li>Revogar seu consentimento</li>
          </ul>

          <h2 className="text-lg font-display font-bold text-paper-dark mt-8 mb-2">
            5. Segurança dos Dados
          </h2>
          <p>
            Utilizamos criptografia de senhas com bcryptjs, tokens JWT com
            expiração curta, cookies HttpOnly e SameSite, e Row Level Security
            (RLS) no banco de dados para garantir que cada usuário acesse apenas
            seus próprios dados.
          </p>

          <h2 className="text-lg font-display font-bold text-paper-dark mt-8 mb-2">
            6. Contato e Encarregado (DPO)
          </h2>
          <p>
            Para exercer seus direitos ou tirar dúvidas sobre esta Política de
            Privacidade, entre em contato através da seção
            <Link to="/settings" className="text-gold-accent hover:text-gold-light">
              Configurações
            </Link>
            ou envie um e-mail para <strong>privacy@fincontrol.app</strong>.
          </p>

          <div className="mt-8 pt-6 border-t border-charcoal-lighter">
            <p className="text-paper-dark/50 text-xs">
              © 2026 FinControl. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
