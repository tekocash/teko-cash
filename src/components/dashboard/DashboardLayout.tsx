'use client';
import React, { useState, ReactNode } from 'react';
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
  BarChart2, 
  Users, 
  FileText, 
  HelpCircle,
  DollarSign,
  CreditCard,
  PieChart,
  Calendar,
  Plus
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
  const { user, session, signOut } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState<boolean>(false);
  const [createMenuOpen, setCreateMenuOpen] = useState<boolean>(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleProfileDropdown = () => setProfileDropdownOpen(!profileDropdownOpen);
  const toggleCreateMenu = () => setCreateMenuOpen(!createMenuOpen);

  const handleLogout = () => {
    // Suponiendo que clearSession es el método para cerrar sesión
    if (signOut) {
      signOut();
    }
    window.location.href = '/login';
  };

  const menuItems: MenuItem[] = [
    { icon: <Home size={20} />, title: 'Inicio', path: '/dashboard' },
    { icon: <DollarSign size={20} />, title: 'Gastos e Ingresos', path: '/dashboard/transactions' },
    { icon: <PieChart size={20} />, title: 'Presupuestos', path: '/dashboard/budgets' },
    { icon: <Users size={20} />, title: 'Grupos Familiares', path: '/dashboard/family' },
    { icon: <CreditCard size={20} />, title: 'Métodos de Pago', path: '/dashboard/payment-methods' },
    { icon: <BarChart2 size={20} />, title: 'Reportes', path: '/dashboard/reports' },
    { icon: <Settings size={20} />, title: 'Configuración', path: '/dashboard/settings' },
  ];

  // Opciones del menú de crear
  const createOptions = [
    { icon: <DollarSign size={18} />, title: 'Registrar Gasto', path: '/dashboard/expenses/new' },
    { icon: <Plus size={18} />, title: 'Registrar Ingreso', path: '/dashboard/incomes/new' },
    { icon: <PieChart size={18} />, title: 'Crear Presupuesto', path: '/dashboard/budgets/new' },
    { icon: <Users size={18} />, title: 'Crear Grupo Familiar', path: '/dashboard/family/new' },
  ];

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
          <div className="text-xl font-bold text-gray-800 dark:text-white">Teko Cash</div>
          <button onClick={toggleSidebar} className="lg:hidden text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={24} />
          </button>
        </div>

        <nav className="mt-5 px-2">
          <ul className="space-y-2">
            {menuItems.map((item, index) => (
              <li key={index}>
                <a 
                  href={item.path} 
                  className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md group transition-colors"
                >
                  <span className="mr-3 text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300">
                    {item.icon}
                  </span>
                  <span>{item.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
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
                {/* Botón de Crear/Añadir */}
                <div className="relative">
                  <button 
                    onClick={toggleCreateMenu}
                    className="p-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 w-8 h-8 flex items-center justify-center"
                  >
                    <Plus size={20} />
                  </button>

                  {/* Dropdown del menú de crear */}
                  {createMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border dark:border-gray-700">
                      {createOptions.map((option, index) => (
                        <a 
                          key={index}
                          href={option.path} 
                          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <span className="mr-2">{option.icon}</span>
                          {option.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notificaciones */}
                <button className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full">
                  <Bell size={20} />
                </button>

                {/* Perfil */}
                <div className="relative">
                  <button onClick={toggleProfileDropdown} className="flex items-center text-sm rounded-full focus:outline-none">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <User size={20} className="text-gray-500 dark:text-gray-400" />
                      </div>
                      <span className="hidden md:inline-block text-gray-700 dark:text-gray-300">{user?.email || user?.display_name || 'Usuario'}</span>
                      <ChevronDown size={16} className="text-gray-500 dark:text-gray-400" />
                    </div>
                  </button>

                  {/* Dropdown del perfil */}
                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border dark:border-gray-700">
                      <a href="/dashboard/profile" className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <User size={16} className="mr-2" />
                        Perfil
                      </a>
                      <a href="/dashboard/settings" className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <Settings size={16} className="mr-2" />
                        Configuración
                      </a>
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
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gray-100 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;