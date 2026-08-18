import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/AppError';
import PDFDocument from 'pdfkit';
import { Transform } from 'stream';

interface AuthRequest extends Request {
  user?: { userId: string };
}

// ============================================
// Utilitários
// ============================================

const formatCurrency = (value: number): string => {
  return (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('pt-BR');
};

// ============================================
// Controllers
// ============================================

/**
 * NOVO: Busca os dados do usuário logado
 * Essa função é essencial para o AuthContext do Frontend não te expulsar da Dashboard
 */
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('Usuário não autenticado', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        currency: true,
        darkMode: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError('Usuário não encontrado', 404);
    }

    // Retorna no formato { data: user } que o Frontend espera
    res.status(200).json({ data: user });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro interno ao buscar perfil' });
  }
};

export const exportTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError('Usuário não autenticado', 401);

  const format = String(req.query.format ?? 'csv').toLowerCase();
  if (format !== 'pdf' && format !== 'csv') {
    throw new AppError('Formato inválido. Use pdf ou csv', 400);
  }

  const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : undefined;
  const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : undefined;

  const where: Record<string, unknown> = { userId };
  if (startDate || endDate) {
    where.date = {};
    if (startDate) {
      (where.date as Record<string, Date>).gte = startDate;
    }
    if (endDate) {
      (where.date as Record<string, Date>).lte = endDate;
    }
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: { category: true },
    orderBy: { date: 'desc' },
  });

  if (format === 'pdf') {
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.pdf');
    
    doc.pipe(res);
    
    doc.fontSize(20).text('FinControl - Relatório de Transações', { align: 'center' });
    doc.moveDown();
    
    const periodText = startDate && endDate
      ? `Periodo: ${formatDate(startDate)} a ${formatDate(endDate)}`
      : startDate
        ? `A partir de: ${formatDate(startDate)}`
        : endDate
          ? `Até: ${formatDate(endDate)}`
          : `Gerado em: ${formatDate(new Date())}`;
    
    doc.fontSize(12).text(periodText, { align: 'center' });
    doc.moveDown(2);
    
    const totalIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;
    
    doc.fontSize(14).text('Resumo', { underline: true });
    doc.fontSize(12);
    doc.text(`Total de Receitas: ${formatCurrency(totalIncome)}`);
    doc.text(`Total de Despesas: ${formatCurrency(totalExpense)}`);
    doc.text(`Saldo: ${formatCurrency(balance)}`);
    doc.moveDown(2);
    
    doc.fontSize(14).text('Transações', { underline: true });
    doc.moveDown();
    
    const tableTop = doc.y;
    doc.fontSize(10);
    doc.text('Data', 50, tableTop, { width: 80 });
    doc.text('Tipo', 130, tableTop, { width: 60 });
    doc.text('Categoria', 190, tableTop, { width: 100 });
    doc.text('Valor', 290, tableTop, { width: 80 });
    doc.text('Descrição', 370, tableTop, { width: 150 });
    
    doc.moveTo(50, tableTop + 15).lineTo(520, tableTop + 15).stroke();
    doc.moveDown();
    
    let yPosition = tableTop + 25;
    
    for (const tx of transactions) {
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }
      
      const dateStr = formatDate(new Date(tx.date));
      const typeStr = tx.type === 'INCOME' ? 'Receita' : 'Despesa';
      const amountStr = `${tx.type === 'INCOME' ? '+' : '-'}${formatCurrency(tx.amount)}`;
      const descStr = tx.description || '-';
      
      doc.text(dateStr, 50, yPosition, { width: 80 });
      doc.text(typeStr, 130, yPosition, { width: 60 });
      doc.text(tx.category?.name || 'Sem categoria', 190, yPosition, { width: 100 });
      doc.text(amountStr, 290, yPosition, { width: 80 });
      doc.text(descStr.substring(0, 30), 370, yPosition, { width: 150 });
      
      yPosition += 20;
    }
    
    doc.moveDown(2);
    doc.fontSize(10).text('FinControl - Controle Financeiro Pessoal', 50, 750, { align: 'center' });
    
    doc.end();
    return;
  }

  const header = 'ID,Data,Tipo,Categoria,Valor,Descricao\n';
  const rows = transactions.map((transaction) => {
    const date = transaction.date.toISOString().split('T')[0];
    const type = transaction.type;
    const amount = (transaction.amount / 100).toFixed(2);
    const category = (transaction.category?.name ?? 'Sem categoria').replace(/"/g, '""');
    const description = (transaction.description ?? '').replace(/[\r\n]/g, ' ').replace(/"/g, '""');
    return `"${transaction.id}","${date}","${type}","${category}","${amount}","${description}"`;
  });

  const csv = header + rows.join('\n');

  res.header('Content-Type', 'text/csv');
  res.attachment(`transactions.${format}`);
  res.send(csv);
};
