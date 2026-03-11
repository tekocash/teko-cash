import { useSearchParams } from 'react-router-dom';
import TransactionForm from '@/features/transactions/components/TransactionForm';
import TransactionList from '@/features/transactions/components/TransactionList';

export default function TransactionsPage() {
  const [searchParams] = useSearchParams();
  const action = searchParams.get('action');

  if (action === 'new') {
    return <TransactionForm />;
  }

  return <TransactionList />;
}
