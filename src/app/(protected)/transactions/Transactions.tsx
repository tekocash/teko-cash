import React from 'react';
import DashboardLayout from '@/features/dashboard/components/DashboardLayout';
import TransactionForm from '@/features/transactions/components/TransactionForm';

export const metadata = {
  title: 'Nueva Transacción | Teko Cash',
  description: 'Registra una nueva transacción en tu cuenta de Teko Cash',
};

export default function NewTransactionPage() {
  return (
    <DashboardLayout>
      <TransactionForm />
    </DashboardLayout>
  );
}