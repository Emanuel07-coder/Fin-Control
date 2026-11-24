import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { Alert } from '../components/ui/alert';
import api from '../services/api';
import { LogOut, Trash2, User, ShieldAlert, ArrowLeft, Download, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Settings: React.FC = () => {
  const { user, logout, deleteAccount } = useAuth();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
    } catch {
      // Erro já é tratado no AuthContext (redireciona para /login)
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const response = await api.get('/user/me/export', {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'fincontrol-data.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Não foi possível exportar seus dados. Tente novamente mais tarde.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-rich-black p-4 sm:p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-paper-dark mb-2">
            Configurações da Conta
          </h1>
          <p className="text-paper-dark/60 text-sm">
            Gerencie suas preferências e dados de conta no FinControl.
          </p>
        </div>

        <div className="card-premium rounded-xl border border-charcoal-lighter p-6 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-lg bg-gold-accent/10 flex items-center justify-center">
              <User className="w-5 h-5 text-gold-accent" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-paper-dark">
                {user?.name || 'Usuário'}
              </h2>
              <p className="text-sm text-paper-dark/60">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-charcoal-lighter bg-near-black/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-charcoal-lighter flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-gold-accent" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-paper-dark font-medium">Exportar Meus Dados</p>
                  <p className="text-xs text-paper-dark/50">
                    Baixe todos os seus dados em formato JSON (LGPD - Portabilidade)
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportData}
                disabled={isExporting}
                className="gap-2 border-charcoal-lighter text-gold-accent hover:bg-gold-accent/10"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>{isExporting ? 'Exportando...' : 'Exportar'}</span>
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-charcoal-lighter bg-near-black/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-charcoal-lighter flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <p className="text-paper-dark font-medium">Excluir minha conta</p>
                  <p className="text-xs text-paper-dark/50">
                    Apague permanentemente todos os seus dados
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsDeleteModalOpen(true)}
                className="text-red-400 hover:bg-red-900/20 border-red-500/30"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir Conta</span>
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-charcoal-lighter bg-near-black/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-charcoal-lighter flex items-center justify-center">
                  <LogOut className="w-4 h-4 text-paper-dark/60" />
                </div>
                <div>
                  <p className="text-paper-dark font-medium">Sair da conta</p>
                  <p className="text-xs text-paper-dark/50">
                    Encerrar a sessão atual
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={logout}
                className="gap-2 border-charcoal-lighter"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Link to="/dashboard" className="text-gold-accent hover:text-gold-light flex items-center gap-2 text-sm font-medium">
            <ArrowLeft className="w-3 h-3" />
            <span>Voltar ao Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Excluir Minha Conta"
      >
        <Alert variant="danger" title="Atenção: Ação Irreversível">
          Ao excluir sua conta, todos os seus dados serão permanentemente apagados, incluindo:
        </Alert>
        <ul className="mb-6 space-y-2 text-sm text-paper-dark/70 list-disc list-inside">
          <li>Todas as suas transações financeiras</li>
          <li>Todas as suas categorias personalizadas</li>
          <li>Todos os seus orçamentos definidos</li>
          <li>Seu perfil e preferências de conta</li>
        </ul>
        <p className="text-paper-dark/50 text-sm mb-6">
          Esta ação não pode ser desfeita. Após a exclusão, você precisará criar uma nova conta para usar o FinControl novamente.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="secondary"
            onClick={() => setIsDeleteModalOpen(false)}
            disabled={isDeleting}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            variant="secondary"
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            className="flex-1 bg-red-900 hover:bg-red-800 border-red-500/50 text-red-400"
          >
            {isDeleting ? (
              <>
                <span className="animate-pulse">Excluindo...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                <span>Excluir Minha Conta</span>
              </>
            )}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Settings;
