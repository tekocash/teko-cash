import { useEffect, ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'react-hot-toast';
import LoadingScreen from '@/components/shared/LoadingScreen';

interface AuthProviderProps {
  children: ReactNode;
}

const AUTH_ROUTES = ['/login', '/register', '/reset-password'];
const PROTECTED_PREFIXES = ['/dashboard', '/transactions', '/budgets', '/family', '/settings'];

export default function AuthProvider({ children }: AuthProviderProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, session, refreshSession } = useAuthStore();
  const [ready, setReady] = useState(false);

  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  const isProtectedRoute = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    const init = async () => {
      try {
        await refreshSession();
      } catch {
        if (isProtectedRoute) {
          toast.error('Tu sesión ha expirado');
          navigate('/login');
        }
      } finally {
        setReady(true);
      }
    };

    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ready) return;

    if (!session && isProtectedRoute) {
      navigate(`/login?redirectTo=${pathname}`, { replace: true });
    } else if (session && isAuthRoute) {
      navigate('/dashboard', { replace: true });
    }
  }, [ready, session, isAuthRoute, isProtectedRoute, navigate, pathname]);

  if (!ready) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
