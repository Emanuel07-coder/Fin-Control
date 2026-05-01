import { PrismaClient } from '@prisma/client';
import prisma from '../src/config/database';

const DEFAULT_CATEGORIES = [
  { name: 'Alimentação', color: '#EF4444', icon: 'utensils', isDefault: true },
  { name: 'Transporte', color: '#F97316', icon: 'car', isDefault: true },
  { name: 'Moradia', color: '#3B82F6', icon: 'home', isDefault: true },
  { name: 'Saúde', color: '#22C55E', icon: 'heart-pulse', isDefault: true },
  { name: 'Educação', color: '#8B5CF6', icon: 'book-open', isDefault: true },
  { name: 'Lazer', color: '#EC4899', icon: 'gamepad-2', isDefault: true },
  { name: 'Compras', color: '#14B8A6', icon: 'shopping-bag', isDefault: true },
  { name: 'Assinaturas', color: '#6366F1', icon: 'repeat', isDefault: true },
  { name: 'Investimentos', color: '#06B6D4', icon: 'trending-up', isDefault: true },
  { name: 'Outros', color: '#6B7280', icon: 'more-horizontal', isDefault: true },
];

async function main() {
  console.log('Seeding default categories...');

  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES,
    skipDuplicates: true, // baseado em unique constraint
  });
  console.log(`Created ${DEFAULT_CATEGORIES.length} default categories`);

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

