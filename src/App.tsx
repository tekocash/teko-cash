import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import AuthGuard from './features/auth/components/AuthGuard';
import LoadingScreen from './components/shared/LoadingScreen';
import DashboardLayout from './features/dashboard/components/DashboardLayout';

function ProtectedLayout() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
    </AuthGuard>
  );
}

// Lazy loading de páginas
const LoginPage = lazy(() => import('./app/public/auth/Login'));
const RegisterPage = lazy(() => import('./app/public/auth/Register'));
const DashboardPage = lazy(() => import('./app/protected/dashboard/Dashboard'));
const TransactionsPage = lazy(() => import('./app/(protected)/transactions/Transactions'));
const BudgetsPage = lazy(() => import('./app/protected/budgets/Budgets'));
const FamilyPage = lazy(() => import('./app/protected/family/Family'));
const SettingsPage = lazy(() => import('./app/protected/settings/Settings'));
const CategoriesPage = lazy(() => import('./features/categories/CategoryManagment'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>

       {/*  Ruta base pública (cuando entras a /) */}
        <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Rutas públicas/auth */}
          <Route path="/login" element={<LoginPage />} />

          <Route path="/register" element={<RegisterPage />} />
          
          {/* Rutas protegidas */}
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/budgets" element={<BudgetsPage />} />
            <Route path="/family" element={<FamilyPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;