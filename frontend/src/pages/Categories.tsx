import React, { useState } from 'react';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '../hooks/useCategories';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Modal } from '../components/ui/modal';
import { Alert } from '../components/ui/alert';
import { PageSkeleton } from '../components/ui/skeleton';
import { 
  Plus, Trash2, Edit, Tag, Utensils, Car, Home, HeartPulse, 
  BookOpen, Gamepad2, ShoppingBag, Repeat, TrendingUp, 
  MoreHorizontal, CreditCard, Coffee, Heart, Gift, Zap, Wallet, LucideIcon 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { CategoryFormData, Category } from '../types';
import { useForm } from 'react-hook-form';

// Cores disponíveis
const COLORS = [
  '#D4AF37', // Gold
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#EC4899', // Pink
  '#06B6D4', // Cyan
];

// Mapa de ícones Lucide
export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  'utensils': Utensils,
  'car': Car,
  'home': Home,
  'heart-pulse': HeartPulse,
  'book-open': BookOpen,
  'gamepad-2': Gamepad2,
  'shopping-bag': ShoppingBag,
  'repeat': Repeat,
  'trending-up': TrendingUp,
  'more-horizontal': MoreHorizontal,
  'credit-card': CreditCard,
  'coffee': Coffee,
  'heart': Heart,
  'gift': Gift,
  'zap': Zap,
  'wallet': Wallet,
  'tag': Tag,
};

export const CategoryIcon: React.FC<{ name?: string; className?: string; style?: React.CSSProperties }> = ({ 
  name, 
  className = 'w-5 h-5', 
  style 
}) => {
  const IconComponent = (name && CATEGORY_ICON_MAP[name]) || Tag;
  return <IconComponent className={className} style={style} />;
};

const ICONS = Object.keys(CATEGORY_ICON_MAP);

// Form para categoria
const CategoryForm: React.FC<{
  initialData?: Partial<Category>;
  onSubmit: (data: CategoryFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}> = ({ initialData, onSubmit, onCancel, isLoading }) => {
  const { register, handleSubmit } = useForm<CategoryFormData>({
    defaultValues: initialData || {},
  });
  const [selectedColor, setSelectedColor] = useState(initialData?.color || COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(initialData?.icon || ICONS[0]);
  
  const handleFormSubmit = (data: CategoryFormData) => {
    onSubmit({
      ...data,
      color: selectedColor,
      icon: selectedIcon,
    });
  };
  
  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Nome */}
      <div>
        <label className="block text-sm text-paper-dark/60 mb-2">Nome</label>
        <Input
          placeholder="Ex: Alimentação"
          {...register('name', { required: true })}
        />
      </div>
      
      {/* Cor */}
      <div>
        <label className="block text-sm text-paper-dark/60 mb-2">Cor</label>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setSelectedColor(color)}
              className={`w-8 h-8 rounded-full transition-all ${
                selectedColor === color 
                  ? 'ring-2 ring-offset-2 ring-offset-near-black ring-gold-accent' 
                  : 'opacity-60 hover:opacity-100'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
      
      {/* Ícone */}
      <div>
        <label className="block text-sm text-paper-dark/60 mb-2">Ícone</label>
        <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto p-1">
          {ICONS.map((iconName) => (
            <button
              key={iconName}
              type="button"
              onClick={() => setSelectedIcon(iconName)}
              className={`p-2.5 rounded-lg border flex items-center justify-center transition-all ${
                selectedIcon === iconName
                  ? 'border-gold-accent bg-gold-accent/20 text-gold-accent'
                  : 'border-charcoal-lighter text-paper-dark/60 hover:text-paper-dark hover:border-charcoal-lighter'
              }`}
            >
              <CategoryIcon name={iconName} className="w-5 h-5" />
            </button>
          ))}
        </div>
      </div>
      
      {/* Preview */}
      <div>
        <label className="block text-sm text-paper-dark/60 mb-2">Preview</label>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-charcoal-light border border-charcoal-lighter">
          <div 
            className="p-2 rounded-full"
            style={{ backgroundColor: `${selectedColor}30` }}
          >
            <CategoryIcon name={selectedIcon} className="w-5 h-5" style={{ color: selectedColor }} />
          </div>
          <span className="text-paper-dark">Exemplo de Categoria</span>
        </div>
      </div>
      
      {/* Botões */}
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
};

const Categories: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  const { data: categories, isLoading, error } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();
  
  const handleCreate = async (data: CategoryFormData) => {
    try {
      await createMutation.mutateAsync(data);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Erro ao criar:', err);
    }
  };
  
  const handleUpdate = async (data: CategoryFormData) => {
    if (!editingCategory) return;
    try {
      await updateMutation.mutateAsync({ id: editingCategory.id, data });
      setEditingCategory(null);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Erro ao atualizar:', err);
    }
  };
  
  const handleDelete = async (id: string, isDefault: boolean) => {
    if (isDefault) {
      alert('Categorias padrão não podem ser excluídas');
      return;
    }
    if (confirm('Tem certeza que deseja excluir esta categoria?')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (err) {
        console.error('Erro ao excluir:', err);
      }
    }
  };
  
  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };
  
  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-rich-black p-6 md:p-8">
        <PageSkeleton />
      </div>
    );
  }
  
  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-rich-black p-6 md:p-8">
        <Alert variant="danger" title="Erro">
          {error.message || 'Erro ao carregar categorias'}
        </Alert>
      </div>
    );
  }
  
  // Separar categorias padrão e do usuário
  const defaultCategories = categories?.filter(c => c.isDefault) || [];
  const userCategories = categories?.filter(c => !c.isDefault) || [];
  
  return (
    <div className="min-h-screen bg-rich-black p-6 md:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto mb-8"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-paper-dark mb-1">
              Categorias
            </h1>
            <p className="text-paper-dark/60">
              Gerencie suas categorias de transação
            </p>
          </div>
          <Button onClick={() => { setEditingCategory(null); setIsModalOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Categoria
          </Button>
        </div>
      </motion.div>
      
      {/* Categorias Padrão */}
      {defaultCategories.length > 0 && (
        <div className="max-w-7xl mx-auto mb-8">
          <h2 className="text-lg font-display font-bold text-paper-dark mb-4">
            Categorias Padrão
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {defaultCategories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center gap-3 p-4 rounded-xl bg-charcoal-light/50 border border-charcoal-lighter"
              >
                <div 
                  className="p-2.5 rounded-full"
                  style={{ backgroundColor: `${cat.color}30` }}
                >
                  <CategoryIcon name={cat.icon} className="w-4 h-4" style={{ color: cat.color }} />
                </div>
                <span className="text-paper-dark text-sm font-medium truncate">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Categorias do Usuário */}
      <div className="max-w-7xl mx-auto">
        <h2 className="text-lg font-display font-bold text-paper-dark mb-4">
          Suas Categorias
        </h2>
        {userCategories.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {userCategories.map((cat) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group relative flex items-center gap-3 p-4 rounded-xl bg-charcoal-light/50 border border-charcoal-lighter hover:border-gold-accent/30 transition-all"
              >
                <div 
                  className="p-2.5 rounded-full"
                  style={{ backgroundColor: `${cat.color}30` }}
                >
                  <CategoryIcon name={cat.icon} className="w-4 h-4" style={{ color: cat.color }} />
                </div>
                <span className="text-paper-dark text-sm font-medium truncate">{cat.name}</span>
                
                {/* Ações */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-near-black/80 rounded-lg p-0.5">
                  <button
                    onClick={() => openEditModal(cat)}
                    className="p-1.5 rounded hover:bg-charcoal-lighter"
                    title="Editar"
                  >
                    <Edit className="w-3.5 h-3.5 text-paper-dark/60 hover:text-gold-accent" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id, cat.isDefault)}
                    className="p-1.5 rounded hover:bg-red-900/20"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-charcoal-light mb-4">
              <Tag className="w-8 h-8 text-paper-dark/40" />
            </div>
            <h3 className="text-xl font-display font-bold text-paper-dark mb-2">
              Nenhuma categoria personalizada
            </h3>
            <p className="text-paper-dark/60 text-center max-w-sm mb-6">
              Crie categorias para organizar melhor suas transações
            </p>
            <Button onClick={() => { setEditingCategory(null); setIsModalOpen(true); }} className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Categoria
            </Button>
          </div>
        )}
      </div>
      
      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingCategory(null); }}
        title={editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
      >
        <CategoryForm
          initialData={editingCategory || undefined}
          onSubmit={editingCategory ? handleUpdate : handleCreate}
          onCancel={() => { setIsModalOpen(false); setEditingCategory(null); }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
    </div>
  );
};

export default Categories;
