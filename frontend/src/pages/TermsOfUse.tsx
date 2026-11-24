import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, FileText } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Alert } from '../components/ui/alert';

export const TermsOfUse: React.FC = () => {
  return (
    <div className="min-h-screen bg-rich-black p-4 sm:p-6 md:p-8 max-w-3xl mx-auto">
      <div className="card-premium rounded-xl border border-charcoal-lighter p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gold-accent/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-gold-accent" />
          </div>
          <h1 className="text-2xl font-display font-bold text-paper-dark">
            Termos de Uso
          </h1>
        </div>

        <Alert variant="info" title="Última atualização">
          05 de novembro de 2026
        </Alert>

        <div className="space-y-6 text-paper-dark/70 text-sm leading-relaxed">
          <p>
            Estes Termos de Uso regem o uso do aplicativo FinControl (o
            &ldquo;App&rdquo;), uma ferramenta de controle financeiro pessoal.
            Ao acessar ou usar o App, você concorda com estes termos.
          </p>

          <h2 className="text-lg font-display font-bold text-paper-dark mt-8 mb-2">
            1. Aceitação dos Termos
          </h2>
          <p>
            Ao criar uma conta no FinControl, você declara ter capacidade civil
            para contratar e concorda em estar vinculado a estes Termos de Uso e
            à nossa Política de Privacidade. Se você não concordar, não deverá
            usar o App.
          </p>

          <h2 className="text-lg font-display font-bold text-paper-dark mt-8 mb-2">
            2. Conta de Usuário
          </h2>
          <p>
            Você é responsável por manter a confidencialidade de suas credenciais
            de acesso e por todas as atividades que ocorram sob sua conta.
            Recomendamos o uso de senhas fortes e a ativação de todas as medidas
            de segurança disponíveis.
          </p>

          <h2 className="text-lg font-display font-bold text-paper-dark mt-8 mb-2">
            3. Uso Permitido
          </h2>
          <p>
            O FinControl destina-se exclusivamente ao controle financeiro pessoal.
            Você não deve utilizar o App para fins ilegais, fraudulentos ou que
            possam danificar o funcionamento do sistema.
          </p>

          <h2 className="text-lg font-display font-bold text-paper-dark mt-8 mb-2">
            4. Dados Pessoais e LGPD
          </h2>
          <p>
            O FinControl coleta e trata dados pessoais em conformidade com a Lei
            Geral de Proteção de Dados (LGPD). Você tem direito a acessar,
            corrigir, exportar e excluir seus dados a qualquer momento através
            das opções na página de Configurações.
          </p>

          <h2 className="text-lg font-display font-bold text-paper-dark mt-8 mb-2">
            5. Limitação de Responsabilidade
          </h2>
          <p>
            O FinControl é fornecido &ldquo;no estado em que se encontra&rdquo;,
            sem garantias de qualquer tipo. Não nos responsabilizamos por
            prejuízos decorrentes do uso inadequado do App.
          </p>

          <h2 className="text-lg font-display font-bold text-paper-dark mt-8 mb-2">
            6. Modificações nos Termos
          </h2>
          <p>
            Podemos atualizar estes Termos de Uso periodicamente. Notificaremos
            os usuários por e-mail sobre mudanças significativas. O uso
            contínuo do App após tais mudanças constitui aceitação dos novos
            termos.
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

export default TermsOfUse;
