import React from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import TransactionForm from '@/components/transactions/TransactionForm';

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