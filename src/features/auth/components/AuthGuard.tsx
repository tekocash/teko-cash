import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/auth-store';
import LoadingScreen from '../../../components/shared/LoadingScreen';

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, refreshSession } = useAuthStore();
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    refreshSession().finally(() => setSessionChecked(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!sessionChecked) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}