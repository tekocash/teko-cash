import React from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import TransactionForm from '@/components/transactions/TransactionForm';

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