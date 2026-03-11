import React, { useState, ReactNode, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import {
  Menu,
  X,
  User,
  Bell,
  Settings,
  LogOut,
  ChevronDown,
  Home,
  Users,
  DollarSign,
  PieChart,
  Plus,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

// Tipo para los elementos del menú
interface MenuItem {
  icon: React.ReactElement;
  title: string;
  path: string;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState<boolean>(false);
  const [createMenuOpen, setCreateMenuOpen] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Detectar si es dispositivo móvil
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    // Verificar inicialmente
    checkIfMobile();
    
    // Agregar listener para cambios de tamaño de ventana
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Cerrar sidebar al cambiar de ruta en móviles
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [pathname, isMobile]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleProfileDropdown = () => {
    setProfileDropdownOpen(!profileDropdownOpen);
    if (createMenuOpen) setCreateMenuOpen(false);
  };
  const toggleCreateMenu = () => {
    setCreateMenuOpen(!createMenuOpen);
    if (profileDropdownOpen) setProfileDropdownOpen(false);
  };

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => {
      if (profileDropdownOpen) setProfileDropdownOpen(false);
      if (createMenuOpen) setCreateMenuOpen(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [profileDropdownOpen, createMenuOpen]);

  const handleLogout = async () => {
    if (signOut) {
      await signOut();
    }
    navigate('/login', { replace: true });
  };

  const menuItems: MenuItem[] = [
    { icon: <Home size={20} />, title: 'Inicio', path: '/dashboard' },
    { icon: <DollarSign size={20} />, title: 'Gastos e Ingresos', path: '/transactions' },
    { icon: <PieChart size={20} />, title: 'Presupuestos', path: '/budgets' },
    { icon: <Users size={20} />, title: 'Grupos Familiares', path: '/family' },
    { icon: <Settings size={20} />, title: 'Configuración', path: '/settings' },
  ];

  // Opciones del menú de crear
  const createOptions = [
    { icon: <DollarSign size={18} className="text-red-500" />, title: 'Registrar Gasto', path: '/transactions?type=expense' },
    { icon: <Plus size={18} className="text-green-500" />, title: 'Registrar Ingreso', path: '/transactions?type=income' },
    { icon: <PieChart size={18} className="text-blue-500" />, title: 'Crear Presupuesto', path: '/budgets' },
    { icon: <Users size={18} className="text-purple-500" />, title: 'Crear Grupo Familiar', path: '/family' },
  ];

  // Determinar si una ruta está activa
  const isActiveRoute = (path: string) => {
    if (path === '/dashboard' && pathname === '/dashboard') {
      return true;
    }
    return path !== '/dashboard' && pathname?.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Overlay para móvil cuando el menú está abierto */}
      <div className={`
        fixed inset-0 z-40 lg:hidden bg-gray-600 bg-opacity-75 transition-opacity ease-linear duration-300
        ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
      `} onClick={toggleSidebar}></div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform 
        transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-4 border-b dark:border-gray-700">
          <Link to="/dashboard" className="text-xl font-bold text-gray-800 dark:text-white">
            Teko Cash
          </Link>
          <button onClick={toggleSidebar} className="lg:hidden text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={24} />
          </button>
        </div>

        <nav className="mt-5 px-2">
          <ul className="space-y-2">
            {menuItems.map((item, index) => {
              const active = isActiveRoute(item.path);
              return (
                <li key={index}>
                  <Link 
                    to={item.path} 
                    className={`flex items-center px-4 py-2 rounded-md group transition-colors ${
                      active 
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className={`mr-3 ${
                      active 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                    }`}>
                      {item.icon}
                    </span>
                    <span>{item.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Información de usuario en el sidebar */}
        <div className="absolute bottom-0 w-full p-4 border-t dark:border-gray-700">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <User size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {user?.display_name || user?.email?.split('@')[0] || 'Usuario'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]">
                {user?.email || ''}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm z-10">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <button onClick={toggleSidebar} className="text-gray-500 dark:text-gray-400 lg:hidden">
                  <Menu size={24} />
                </button>
                <div className="ml-4 lg:ml-0 text-xl font-semibold text-gray-800 dark:text-white lg:hidden">
                  Teko Cash
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Botón de Crear/Añadir en modo desktop */}
                <div className="relative hidden md:block" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={toggleCreateMenu}
                    className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={18} className="mr-1.5" />
                    <span>Crear</span>
                  </button>

                  {/* Dropdown del menú de crear */}
                  {createMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border dark:border-gray-700">
                      {createOptions.map((option, index) => (
                        <Link 
                          key={index}
                          to={option.path} 
                          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <span className="mr-2">{option.icon}</span>
                          {option.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notificaciones */}
                <button className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full">
                  <Bell size={20} />
                </button>

                {/* Perfil */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button onClick={toggleProfileDropdown} className="flex items-center text-sm rounded-full focus:outline-none">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <User size={20} className="text-gray-500 dark:text-gray-400" />
                      </div>
                      <span className="hidden md:inline-block text-gray-700 dark:text-gray-300">
                        {user?.display_name || user?.email?.split('@')[0] || 'Usuario'}
                      </span>
                      <ChevronDown size={16} className="text-gray-500 dark:text-gray-400" />
                    </div>
                  </button>

                  {/* Dropdown del perfil */}
                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border dark:border-gray-700">
                      <Link to="/dashboard/profile" className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <User size={16} className="mr-2" />
                        Perfil
                      </Link>
                      <Link to="/dashboard/settings" className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <Settings size={16} className="mr-2" />
                        Configuración
                      </Link>
                      <button onClick={handleLogout} className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <LogOut size={16} className="mr-2" />
                        Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Contenido principal */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8 bg-gray-100 dark:bg-gray-900">
          {children}
        </main>

        {/* Mobile bottom navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-around px-2 h-16">
          <Link
            to="/dashboard"
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors ${
              pathname === '/dashboard' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            <Home size={20} />
            <span className="text-[10px]">Inicio</span>
          </Link>
          <Link
            to="/transactions"
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors ${
              pathname.startsWith('/transactions') ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            <DollarSign size={20} />
            <span className="text-[10px]">Gastos</span>
          </Link>
          {/* Center Add button */}
          <Link
            to="/transactions?action=new&type=expense"
            className="flex flex-col items-center -mt-5"
          >
            <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40">
              <Plus size={22} className="text-white" />
            </div>
          </Link>
          <Link
            to="/budgets"
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors ${
              pathname.startsWith('/budgets') ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            <PieChart size={20} />
            <span className="text-[10px]">Budgets</span>
          </Link>
          <Link
            to="/settings"
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors ${
              pathname.startsWith('/settings') ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            <Settings size={20} />
            <span className="text-[10px]">Config</span>
          </Link>
        </nav>
      </div>
    </div>
  );
};

export default DashboardLayout;