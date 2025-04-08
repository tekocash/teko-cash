import React from 'react';
import DashboardLayout from '@/features/dashboard/components/DashboardLayout';
import TransactionForm from '@/features/transactions/components/TransactionForm';

export const metadata = {
  title: 'Nuevo Ingreso | Teko Cash',
  description: 'Registra un nuevo ingreso en tu cuenta de Teko Cash',
};

export default function IncomeTransactionPage() {
  return (
    <DashboardLayout>
      <TransactionForm initialDirection="income" />
    </DashboardLayout>
  );
}