import React from 'react';
import DashboardLayout from '@/features/dashboard/components/DashboardLayout';
import TransactionForm from '@/features/transactions/components/TransactionForm';

export const metadata = {
  title: 'Nuevo Gasto | Teko Cash',
  description: 'Registra un nuevo gasto en tu cuenta de Teko Cash',
};

export default function ExpenseTransactionPage() {
  return (
    <DashboardLayout>
      <TransactionForm initialDirection="expense" />
    </DashboardLayout>
  );
}