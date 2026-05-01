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
  return (value / 100).toFixed(2).replace('.', ',');
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('pt-BR');
};

// ============================================
// Controllers
// ============================================

export const exportTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError('Usuário não autenticado', 401);

  const format = String(req.query.format ?? 'csv').toLowerCase();
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

  // TD-12: Exportação PDF com pdfkit
  if (format === 'pdf') {
    const doc = new PDFDocument({ margin: 50 });
    
    // Configurar resposta como stream
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.pdf');
    
    doc.pipe(res);
    
    // Título
    doc.fontSize(20).text('FinControl - Relatório de Transações', { align: 'center' });
    doc.moveDown();
    
    // Informações do período
    const periodText = startDate && endDate
      ? `Periodo: ${formatDate(startDate)} a ${formatDate(endDate)}`
      : startDate
        ? `A partir de: ${formatDate(startDate)}`
        : endDate
          ? `Até: ${formatDate(endDate)}`
          : `Gerado em: ${formatDate(new Date())}`;
    
    doc.fontSize(12).text(periodText, { align: 'center' });
    doc.moveDown(2);
    
    // Resumo
    const totalIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;
    
    doc.fontSize(14).text('Resumo', { underline: true });
    doc.fontSize(12);
    doc.text(`Total de Receitas: R$ ${formatCurrency(totalIncome)}`);
    doc.text(`Total de Despesas: R$ ${formatCurrency(totalExpense)}`);
    doc.text(`Saldo: R$ ${formatCurrency(balance)}`);
    doc.moveDown(2);
    
    // Tabela de transações
    doc.fontSize(14).text('Transações', { underline: true });
    doc.moveDown();
    
    // Cabeçalho da tabela
    const tableTop = doc.y;
    doc.fontSize(10);
    doc.text('Data', 50, tableTop, { width: 80 });
    doc.text('Tipo', 130, tableTop, { width: 60 });
    doc.text('Categoria', 190, tableTop, { width: 100 });
    doc.text('Valor', 290, tableTop, { width: 80 });
    doc.text('Descrição', 370, tableTop, { width: 150 });
    
    doc.moveTo(50, tableTop + 15).lineTo(520, tableTop + 15).stroke();
    doc.moveDown();
    
    // Linhas da tabela
    let yPosition = tableTop + 25;
    
    for (const tx of transactions) {
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }
      
      const dateStr = formatDate(new Date(tx.date));
      const typeStr = tx.type === 'INCOME' ? 'Receita' : 'Despesa';
      const amountStr = `${tx.type === 'INCOME' ? '+' : '-'}R$ ${formatCurrency(tx.amount)}`;
      const descStr = tx.description || '-';
      
      doc.text(dateStr, 50, yPosition, { width: 80 });
      doc.text(typeStr, 130, yPosition, { width: 60 });
      doc.text(tx.category?.name || 'Sem categoria', 190, yPosition, { width: 100 });
      doc.text(amountStr, 290, yPosition, { width: 80 });
      doc.text(descStr.substring(0, 30), 370, yPosition, { width: 150 });
      
      yPosition += 20;
    }
    
    // Rodapé
    doc.moveDown(2);
    doc.fontSize(10).text('FinControl - Controle Financeiro Pessoal', 50, 750, { align: 'center' });
    
    doc.end();
    return;
  }

  // CSV (padrão)
  const header = 'ID,Data,Tipo,Categoria,Valor,Descricao\n';
  const rows = transactions.map((transaction) => {
    const date = transaction.date.toISOString().split('T')[0];
    const type = transaction.type;
    const amount = formatCurrency(transaction.amount);
    const category = transaction.category?.name ?? 'Sem categoria';
    const description = transaction.description?.replace(/[\n,]/g, ' ') ?? '';
    return `${transaction.id},${date},${type},${category},${amount},${description}`;
  });

  const csv = header + rows.join('\n');

  res.header('Content-Type', 'text/csv');
  res.attachment(`transactions.${format}`);
  res.send(csv);
};
