import React, { useState, useEffect } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { Button } from '../components/ui/button';

interface CookieBannerProps {}

export const CookieBanner: React.FC<CookieBannerProps> = () => {
  const [isVisible, setIsVisible] = useState<boolean>(true);

  useEffect(() => {
    const accepted = localStorage.getItem('cookie_consent');
    if (accepted === 'true') {
      setIsVisible(false);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookie_consent', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6" role="region" aria-label="Notificação de cookies">
      <div className="mx-auto max-w-2xl rounded-xl border border-charcoal-lighter bg-near-black shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 text-sm text-paper-dark/70 leading-relaxed">
          <ShieldCheck className="w-5 h-5 text-gold-accent flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium text-paper-dark">
              Usamos cookies essenciais para autenticação e segurança da sua conta.
            </p>
            <p className="text-xs text-paper-dark/50 mt-1">
              Esses cookies são necessários para o funcionamento do site e não
              coletam dados pessoais sensíveis.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={acceptCookies}
            className="border-charcoal-lighter text-paper-dark/80"
          >
            Entendi
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="border-charcoal-lighter text-paper-dark/80"
            onClick={() => window.location.href = '/terms'}
          >
            Termos de Uso
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="border-charcoal-lighter text-paper-dark/80"
            onClick={() => window.location.href = '/privacy'}
          >
            Política de Privacidade
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
