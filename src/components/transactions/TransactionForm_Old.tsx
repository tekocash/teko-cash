'use client';
import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Calendar, 
  Tag, 
  AlignLeft, 
  Users, 
  Upload, 
  X, 
  Check, 
  ChevronDown,
  Plus,
  Minus,
  CreditCard,
  Building,
  Receipt,
  ChevronRight,
  ChevronUp,
  Info,
  MoreHorizontal,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { createTransaction } from '@/services/transaction-service';
import { useAuthStore } from '@/store/auth-store';
import { getUserCategories } from '@/services/category-service';
import { getUserFamilyGroups } from '@/services/family-service';
import { useRouter } from 'next/navigation';

// Tipos de datos basados en el esquema de BD
export type TransactionDirection = 'income' | 'expense';

interface Category {
  id: string;
  name: string;
  category_type: 'income' | 'expense';
  user_id: string | null;
  family_group_id: string | null;
  parent_id: string | null;
  icon?: string;
  color?: string;
}

interface FamilyGroup {
  id: string;
  name: string;
  type_calculo: 'fixed' | 'ratio';
}

interface PaymentMethod {
  id: string;
  name: string;
  bank?: string;
  details?: string;
}

interface TransactionType {
  id: string;
  name: string;
}

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
}

// Definir la interfaz de props para el componente
interface TransactionFormProps {
  initialDirection?: TransactionDirection;
}

// Datos de ejemplo
const mockPaymentMethods: PaymentMethod[] = [
  { id: 'pm1', name: 'Efectivo' },
  { id: 'pm2', name: 'Tarjeta Débito', bank: 'BBVA' },
  { id: 'pm3', name: 'Tarjeta Crédito', bank: 'Santander' },
  { id: 'pm4', name: 'Transferencia', bank: 'CaixaBank' },
];

const mockTransactionTypes: TransactionType[] = [
  { id: 'tt1', name: 'Fijo' },
  { id: 'tt2', name: 'Variable' },
  { id: 'tt3', name: 'Ocasional' },
];

export default function TransactionForm({ initialDirection = 'expense' }: TransactionFormProps) {
  const { user } = useAuthStore();
  const router = useRouter();
  
  // Estados del formulario
  const [direction, setDirection] = useState<TransactionDirection>(initialDirection);
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [concepto, setConcepto] = useState<string>('');
  const [comercio, setComercio] = useState<string>('');
  const [familyGroupId, setFamilyGroupId] = useState<string>('');
  const [useGroupRatio, setUseGroupRatio] = useState<boolean>(true);
  const [paymentMethodId, setPaymentMethodId] = useState<string>('');
  const [transactionTypeId, setTransactionTypeId] = useState<string>('');
  const [currencyId, setCurrencyId] = useState<string>('cur3'); // PYG por defecto 
  const [receipt, setReceipt] = useState<File | null>(null);
  const [additionalInfo, setAdditionalInfo] = useState<string>('');
  const [periodicity, setPeriodicity] = useState<'mensual' | 'trimestral' | 'anual' | 'ocasional' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Estados para los datos cargados desde la API
  const [categories, setCategories] = useState<Category[]>([]);
  const [familyGroups, setFamilyGroups] = useState<FamilyGroup[]>([]);
  const [recentCommerces, setRecentCommerces] = useState<string[]>([]);
  
  // Estados para UI
  const [showCategoryDropdown, setShowCategoryDropdown] = useState<boolean>(false);
  const [showFamilyDropdown, setShowFamilyDropdown] = useState<boolean>(false);
  const [showPaymentMethodDropdown, setShowPaymentMethodDropdown] = useState<boolean>(false);
  const [showTransactionTypeDropdown, setShowTransactionTypeDropdown] = useState<boolean>(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState<boolean>(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Monedas disponibles - Ahora correctamente dentro del componente
  const currencies = [
    { id: 'cur3', code: 'PYG', name: 'Guaraní paraguayo', symbol: '₲' },
    { id: 'cur2', code: 'USD', name: 'Dólar estadounidense', symbol: '$' },
    { id: 'cur1', code: 'EUR', name: 'Euro', symbol: '€' },
  ];

  // Un array de comercios recientes para autocompletado (esto vendría de la BD en una app real)
  const [filteredCommerces, setFilteredCommerces] = useState<string[]>([]);
  
  // Cargar categorías y grupos familiares al montar el componente
  useEffect(() => {
    if (user?.id) {
      // Cargar categorías
      const loadCategories = async () => {
        try {
          const { data, error } = await getUserCategories(user.id);
          if (data && !error) {
            setCategories(data);
          }
        } catch (err) {
          console.error('Error al cargar categorías:', err);
        }
      };
      
      // Cargar grupos familiares
      const loadFamilyGroups = async () => {
        try {
          const { data, error } = await getUserFamilyGroups(user.id);
          if (data && !error) {
            setFamilyGroups(data);
          }
        } catch (err) {
          console.error('Error al cargar grupos familiares:', err);
        }
      };
      
      // Cargar comercios recientes para autocompletado
      const loadRecentCommerces = async () => {
        // Esto sería una llamada a tu API en la aplicación real
        // Por ahora, usamos datos de ejemplo
        setRecentCommerces([
          'Mercadona', 
          'ZARA', 
          'MediaMarkt', 
          'El Corte Inglés',
          'Amazon',
          'Netflix',
          'Uber',
          'Cafetería Central'
        ]);
      };
      
      loadCategories();
      loadFamilyGroups();
      loadRecentCommerces();
    }
  }, [user]);

  // Filtrar comercios para autocompletado
  useEffect(() => {
    if (comercio.length > 0) {
      const filtered = recentCommerces.filter(
        c => c.toLowerCase().includes(comercio.toLowerCase())
      );
      setFilteredCommerces(filtered);
    } else {
      setFilteredCommerces([]);
    }
  }, [comercio, recentCommerces]);

  // Filtrar categorías según el tipo de transacción
  const filteredCategories = categories.filter(
    cat => cat.category_type === direction
  );

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    
    if (!isFormComplete()) {
      setErrorMessage("Por favor completa los campos obligatorios: monto, fecha y categoría.");
      return;
    }
    
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      
      // Preparar datos para enviar
      const transactionData = {
        user_id: user.id,
        direction,
        amount: parseFloat(amount),
        date,
        category_id: categoryId,
        concepto,
        comercio: comercio || null,
        family_group_id: familyGroupId || null,
        use_group_ratio: !!familyGroupId && useGroupRatio,
        payment_method_id: paymentMethodId || null,
        transaction_type_id: transactionTypeId || null,
        currency_id: currencyId,
        additional_info: additionalInfo || null,
        periodicity: periodicity,
        budget_id: null,      
        nro_operacion: '',
      };
      
      // Enviar a la API
      const { data, error } = await createTransaction(transactionData);
 
      if (error) throw error;
      
      setSuccessMessage(direction === 'expense' ? 'Gasto registrado con éxito!' : 'Ingreso registrado con éxito!');
      
      // Después de 1.5 segundos, redirigir o resetear
      setTimeout(() => {
        resetForm();
        // Opcional: redirigir a una página específica
        // router.push('/dashboard');
      }, 1500);
    } catch (err: any) {
      console.error('Error al guardar la transacción:', err);
      setErrorMessage(`Error al guardar: ${err.message || 'Inténtalo de nuevo'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resetear formulario
  const resetForm = () => {
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setCategoryId('');
    setConcepto('');
    setComercio('');
    setFamilyGroupId('');
    setUseGroupRatio(true);
    setPaymentMethodId('');
    setTransactionTypeId('');
    setReceipt(null);
    setAdditionalInfo('');
    setPeriodicity(null);
    setSuccessMessage(null);
    setErrorMessage(null);
    setShowAdvancedOptions(false);
  };

  // Manejar subida de comprobante
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setReceipt(e.target.files[0]);
    }
  };

  // Obtener nombre de categoría seleccionada
  const getSelectedCategoryName = () => {
    const selected = categories.find(cat => cat.id === categoryId);
    return selected ? `${selected.icon || ''} ${selected.name}` : 'Seleccionar categoría';
  };

  // Obtener nombre de grupo familiar seleccionado
  const getSelectedFamilyName = () => {
    const selected = familyGroups.find(group => group.id === familyGroupId);
    return selected ? selected.name : 'Ninguno';
  };

  // Obtener nombre del método de pago seleccionado
  const getSelectedPaymentMethod = () => {
    const selected = mockPaymentMethods.find(method => method.id === paymentMethodId);
    return selected ? selected.name : 'Seleccionar método de pago';
  };

  // Obtener nombre del tipo de transacción seleccionado
  const getSelectedTransactionType = () => {
    const selected = mockTransactionTypes.find(type => type.id === transactionTypeId);
    return selected ? selected.name : 'Seleccionar tipo';
  };

  // Obtener símbolo de la moneda seleccionada
  const getSelectedCurrencySymbol = () => {
    const selected = currencies.find(currency => currency.id === currencyId);
    return selected ? selected.symbol : '₲';
  };

  // Verificar si el formulario está completo
  const isFormComplete = () => {
    return (
      amount && 
      parseFloat(amount) > 0 && 
      date && 
      categoryId
    );
  };

  // Función para seleccionar cantidad predefinida
  const setQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  return (
    <div className="max-w-xl mx-auto relative">
      {/* Overlay de éxito */}
      {successMessage && (
        <div className="absolute inset-0 bg-white dark:bg-gray-800 z-10 flex items-center justify-center rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600 dark:text-green-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{successMessage}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Tu transacción ha sido guardada correctamente.
            </p>
            <div className="flex space-x-3 justify-center">
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Nueva transacción
              </button>
              <Link
                href="/dashboard"
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Ir al dashboard
              </Link>
            </div>
          </div>
        </div>
      )}
  
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        {/* Encabezado */}
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <Link 
              href="/dashboard" 
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <ArrowLeft size={20} />
            </Link>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white text-center flex-1">
              {direction === 'expense' ? 'Registrar Gasto' : 'Registrar Ingreso'}
            </h2>
            <div className="w-5"></div> {/* Espacio para equilibrar el layout */}
          </div>
  
          {/* Selector de tipo de transacción */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setDirection('expense')}
              className={`flex-1 py-3 flex items-center justify-center space-x-2 ${
                direction === 'expense'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              <Minus size={18} />
              <span>Gasto</span>
            </button>
            <button
              type="button"
              onClick={() => setDirection('income')}
              className={`flex-1 py-3 flex items-center justify-center space-x-2 ${
                direction === 'income'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              <Plus size={18} />
              <span>Ingreso</span>
            </button>
          </div>
        </div>
  
        {/* Cuerpo del formulario */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-md bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-sm">
              {errorMessage}
            </div>
          )}
  
          {/* Selector de grupo familiar destacado */}
          {familyGroups.length > 0 && (
            <div className="mb-6 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 p-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ¿A qué cartera pertenece esta transacción?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFamilyGroupId('')}
                  className={`p-3 rounded-lg border ${
                    familyGroupId === ''
                      ? 'border-blue-500 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  } flex items-center justify-center`}
                >
                  <span>Personal</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setFamilyGroupId(familyGroups[0].id);
                    setShowFamilyDropdown(familyGroups.length > 1);
                  }}
                  className={`p-3 rounded-lg border ${
                    familyGroupId !== ''
                      ? 'border-blue-500 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  } flex items-center justify-center`}
                >
                  <span>{familyGroups.length === 1 
                    ? familyGroups[0].name 
                    : familyGroupId 
                      ? getSelectedFamilyName() 
                      : 'Familiar'}</span>
                </button>
  
                {/* Dropdown para seleccionar grupo familiar específico si hay más de uno */}
                {familyGroups.length > 1 && familyGroupId && (
                  <div className="col-span-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setShowFamilyDropdown(!showFamilyDropdown)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md flex items-center justify-between bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                    >
                      <span>{getSelectedFamilyName()}</span>
                      <ChevronDown size={16} />
                    </button>
                    
                    {showFamilyDropdown && (
                      <div className="mt-1 w-full bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 z-10 absolute">
                        {familyGroups.map(group => (
                          <button
                            key={group.id}
                            type="button"
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                            onClick={() => {
                              setFamilyGroupId(group.id);
                              setShowFamilyDropdown(false);
                            }}
                          >
                            {group.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Opción para usar la proporción del grupo */}
                {familyGroupId && direction === 'expense' && (
                  <div className="col-span-2 mt-1">
                    <label className="inline-flex items-center">
                      <input 
                        type="checkbox" 
                        checked={useGroupRatio} 
                        onChange={(e) => setUseGroupRatio(e.target.checked)}
                        className="form-checkbox h-4 w-4 text-blue-600 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Usar proporción predefinida del grupo
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}
  
          {/* Monto */}
          <div className="relative flex mb-6">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 dark:text-gray-400">{getSelectedCurrencySymbol()}</span>
              </div>
              <input
                type="number"
                id="amount"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="block w-full pl-8 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-l-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xl"
                step="0.01"
                min="0"
                autoFocus
              />
            </div>
            <button
              type="button"
              onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
              className="px-3 py-3 border border-gray-300 dark:border-gray-600 border-l-0 rounded-r-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              {currencies.find(c => c.id === currencyId)?.code || 'PYG'}
            </button>
            
            {showCurrencyDropdown && (
              <div className="absolute right-0 top-full mt-1 z-10 bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700">
                {currencies.map(currency => (
                  <button
                    key={currency.id}
                    type="button"
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => {
                      setCurrencyId(currency.id);
                      setShowCurrencyDropdown(false);
                    }}
                  >
                    <span className="mr-2">{currency.symbol}</span>
                    <span>{currency.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
  
          {/* Cantidades rápidas */}
          <div className="mb-6 flex flex-wrap gap-2">
            {[10000, 20000, 50000, 100000].map(value => (
              <button
                key={value}
                type="button"
                onClick={() => setQuickAmount(value)}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
              >
                {getSelectedCurrencySymbol()}{value.toLocaleString()}
              </button>
            ))}
          </div>
  
          {/* Categoría */}
          <div className="mb-6 relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Categoría *
            </label>
            <button
              type="button"
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="flex items-center justify-between w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <div className="flex items-center">
                {categoryId ? (
                  <>
                    <span className="text-xl mr-2">
                      {categories.find(c => c.id === categoryId)?.icon || '📁'}
                    </span>
                    <span>{getSelectedCategoryName()}</span>
                  </>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">Selecciona una categoría</span>
                )}
              </div>
              <ChevronDown size={20} className="text-gray-400" />
            </button>
  
            {showCategoryDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto">
                {filteredCategories.length > 0 ? (
                  <div className="grid grid-cols-2 gap-1 p-2">
                    {filteredCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        className="flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => {
                          setCategoryId(cat.id);
                          setShowCategoryDropdown(false);
                        }}
                      >
                        <span className="text-xl mr-2">{cat.icon || '📁'}</span>
                        <span className="text-gray-900 dark:text-white truncate">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    No hay categorías disponibles
                  </div>
                )}
              </div>
            )}
          </div>
  
          {/* Fecha */}
          <div className="mb-6">
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fecha *
            </label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="block w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
  
          {/* Descripción */}
          <div className="mb-6">
            <label htmlFor="concepto" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descripción
            </label>
            <input
              type="text"
              id="concepto"
              placeholder="¿Para qué fue este gasto?"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="block w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
  
          {/* Comercio (solo para gastos) */}
          {direction === 'expense' && (
            <div className="mb-6 relative">
              <label htmlFor="comercio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Comercio
              </label>
              <input
                type="text"
                id="comercio"
                placeholder="¿Dónde compraste?"
                value={comercio}
                onChange={(e) => setComercio(e.target.value)}
                className="block w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              
              {/* Sugerencias de autocompletado */}
              {filteredCommerces.length > 0 && comercio && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700">
                  {filteredCommerces.slice(0, 5).map((commerce, index) => (
                    <button
                      key={index}
                      type="button"
                      className="block w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                      onClick={() => {
                        setComercio(commerce);
                        setFilteredCommerces([]);
                      }}
                    >
                      {commerce}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
  
          {/* Opciones avanzadas */}
          <div className="mb-4">
            <button
              type="button"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="flex items-center justify-between w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <span className="text-gray-700 dark:text-gray-300 font-medium">Opciones avanzadas</span>
                {showAdvancedOptions ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            </div>
    
            {showAdvancedOptions && (
              <div className="space-y-6 pb-4 animate-fadeIn">
                {/* Método de pago (solo para gastos) */}
                {direction === 'expense' && (
                  <div className="relative">
                    <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Método de pago
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPaymentMethodDropdown(!showPaymentMethodDropdown)}
                      className="flex items-center justify-between w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <div className="flex items-center">
                        <CreditCard size={18} className="text-gray-400 mr-2" />
                        <span>{getSelectedPaymentMethod()}</span>
                      </div>
                      <ChevronDown size={16} className="text-gray-400" />
                    </button>
    
                    {showPaymentMethodDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700">
                        {mockPaymentMethods.map((method) => (
                          <button
                            key={method.id}
                            type="button"
                            className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => {
                              setPaymentMethodId(method.id);
                              setShowPaymentMethodDropdown(false);
                            }}
                          >
                            <span className="text-gray-900 dark:text-white">
                              {method.name} {method.bank ? `(${method.bank})` : ''}
                            </span>
                          </button>
                        ))}
                        <button
                          type="button"
                          className="flex items-center w-full px-4 py-2 text-left text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => {
                            // Aquí irías a una página para agregar un nuevo método de pago
                            // O abrirías un modal
                            setShowPaymentMethodDropdown(false);
                          }}
                        >
                          <Plus size={16} className="mr-1" />
                          <span>Añadir nuevo método</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
    
                {/* Tipo de transacción */}
                <div className="relative">
                  <label htmlFor="transactionType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo de transacción
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowTransactionTypeDropdown(!showTransactionTypeDropdown)}
                    className="flex items-center justify-between w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <div className="flex items-center">
                      <Tag size={18} className="text-gray-400 mr-2" />
                      <span>{getSelectedTransactionType()}</span>
                    </div>
                    <ChevronDown size={16} className="text-gray-400" />
                  </button>
    
                  {showTransactionTypeDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700">
                      {mockTransactionTypes.map((type) => (
                        <button
                          key={type.id}
                          type="button"
                          className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => {
                            setTransactionTypeId(type.id);
                            setShowTransactionTypeDropdown(false);
                          }}
                        >
                          <span className="text-gray-900 dark:text-white">{type.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
    
                {/* Periodicidad */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Periodicidad
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['mensual', 'trimestral', 'anual', 'ocasional'] as const).map((period) => (
                      <button
                        key={period}
                        type="button"
                        onClick={() => setPeriodicity(periodicity === period ? null : period)}
                        className={`p-2 rounded-lg border ${
                          periodicity === period
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {period.charAt(0).toUpperCase() + period.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
    
                {/* Información adicional */}
                <div>
                  <label htmlFor="additionalInfo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Información adicional
                  </label>
                  <textarea
                    id="additionalInfo"
                    placeholder="Notas o detalles adicionales"
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    rows={3}
                    className="block w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  ></textarea>
                </div>
    
                {/* Subir comprobante */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Comprobante
                  </label>
                  {receipt ? (
                    <div className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                      <div className="flex-1 truncate">{receipt.name}</div>
                      <button
                        type="button"
                        onClick={() => setReceipt(null)}
                        className="ml-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
                      <div className="space-y-1">
                        <Receipt className="mx-auto h-8 w-8 text-gray-400" />
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-transparent rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500">
                            <span>Subir un archivo</span>
                            <input 
                              id="file-upload" 
                              name="file-upload" 
                              type="file" 
                              className="sr-only" 
                              onChange={handleReceiptUpload}
                              accept="image/*,.pdf"
                            />
                          </label>
                          <p className="pl-1">o arrastra y suelta</p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          PNG, JPG, PDF hasta 10MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
    
            {/* Campo para crear nueva categoría */}
            {!categoryId && (
              <div className="mb-6 mt-2">
                <button
                  type="button"
                  className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
                  onClick={() => {
                    // Aquí irías a una página para crear nueva categoría
                    // O abrirías un modal
                    router.push(`/dashboard/categories/new?type=${direction}&familyGroupId=${familyGroupId || ''}`);
                  }}
                >
                  <Plus size={16} className="mr-1" />
                  <span>Crear nueva categoría{familyGroupId ? ' familiar' : ' personal'}</span>
                </button>
              </div>
            )}
    
            {/* Botones de acción */}
            <div className="mt-8 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  // Redirigir al dashboard o página anterior
                  router.back();
                }}
                className="px-5 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-5 py-3 rounded-lg shadow-sm text-sm font-medium text-white flex items-center ${
                  isFormComplete() && !isSubmitting
                    ? direction === 'expense' 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-green-600 hover:bg-green-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check size={16} className="mr-1" />
                    {direction === 'expense' ? 'Guardar gasto' : 'Guardar ingreso'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }