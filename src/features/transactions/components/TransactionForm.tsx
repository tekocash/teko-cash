// components/transactions/TransactionForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// Importar servicios
import { createTransaction } from '@/features/transactions/service/transaction-service';
import { getUserCategories } from '@/features/categories/services/category-service';
import { getUserFamilyGroups } from '@/features/family/services/family-service';
import { getUserPaymentMethods } from '@/features/payment-method/services/payment-method-service';
import { useAuthStore } from '@/store/auth-store';

// Importar adaptadores
import { 
  adaptCategories, 
  adaptFamilyGroups, 
  adaptPaymentMethods,
  prepareTransactionForApi
} from '@/lib/adapters/adapter-service';

// Importar componentes UI
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// Importar tipos de datos para la UI
import type { 
  TransactionDirection,
  PeriodicityType,
  Category,
  FamilyGroup,
  PaymentMethod,
  TransactionType, 
  Currency,
  TransactionFormData
} from '@/types/ui';

// Importar componentes del formulario
import { DirectionSelector } from '../../../components/organisms';
import { FamilyGroupSelector } from '../../../components/organisms';
import { AmountInput } from '../../../components/organisms';
import { CategorySelector } from '../../../components/organisms';
import { PaymentMethodSelector } from '../../../components/organisms';
import { TransactionTypeSelector } from '../../../components/organisms';
import { PeriodicitySelector } from '../../../components/organisms';
import { AdditionalInfoInput } from '../../../components/organisms';
import { ReceiptUploader } from '../../../components/organisms';
import { CommerceInput } from '../../../components/organisms';
import { SubmitButton } from '../../../components/organisms';
import { ErrorMessage } from '../../../components/organisms';
import { SuccessMessage } from '../../../components/organisms';
import { AdvancedOptionsToggle } from '../../../components/organisms';

// Definir la interfaz de props para el componente
interface TransactionFormProps {
  initialDirection?: TransactionDirection;
}

// Datos de ejemplo para tipos de transacción
// Esto debería venir de una consulta a Supabase en una implementación real
const mockTransactionTypes: TransactionType[] = [
  { id: 'tt1', name: 'Fijo' },
  { id: 'tt2', name: 'Variable' },
  { id: 'tt3', name: 'Ocasional' },
];

/**
 * Componente principal para el formulario de creación de transacciones
 * Integra todos los componentes modulares y maneja la lógica de estado y envío
 */
export default function TransactionForm({ initialDirection = 'expense' }: TransactionFormProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
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
  const [periodicity, setPeriodicity] = useState<PeriodicityType>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Estados para los datos cargados desde la API
  const [categories, setCategories] = useState<Category[]>([]);
  const [familyGroups, setFamilyGroups] = useState<FamilyGroup[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [recentCommerces, setRecentCommerces] = useState<string[]>([]);
  
  // Estados para UI
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Monedas disponibles
  const currencies: Currency[] = [
    { id: 'cur3', code: 'PYG', name: 'Guaraní paraguayo', symbol: '₲' },
    { id: 'cur2', code: 'USD', name: 'Dólar estadounidense', symbol: '$' },
    { id: 'cur1', code: 'EUR', name: 'Euro', symbol: '€' },
  ];

  // Cargar datos al montar el componente
  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user]);

  /**
   * Carga todos los datos necesarios para el formulario desde los servicios de Supabase
   * y utiliza los adaptadores para transformarlos al formato esperado por los componentes
   */
  const loadData = async () => {
    if (!user?.id) return;
    
    try {
      // Cargar categorías desde Supabase
      const { data: categoriesData, error: categoriesError } = await getUserCategories(user.id);
      if (categoriesError) throw categoriesError;
      if (categoriesData) {
        // Adaptar datos de categorías usando el servicio adaptador
        const uiCategories = adaptCategories(categoriesData);
        setCategories(uiCategories);
      }
      
      // Cargar grupos familiares desde Supabase
      const { data: groupsData, error: groupsError } = await getUserFamilyGroups(user.id);
      if (groupsError) throw groupsError;
      if (groupsData) {
        // Adaptar datos de grupos familiares usando el servicio adaptador
        const uiGroups = adaptFamilyGroups(groupsData);
        setFamilyGroups(uiGroups);
      }
      
      // Cargar métodos de pago desde Supabase
      const { data: methodsData, error: methodsError } = await getUserPaymentMethods(user.id);
      if (methodsError) throw methodsError;
      if (methodsData) {
        // Adaptar datos de métodos de pago usando el servicio adaptador
        const uiMethods = adaptPaymentMethods(methodsData);
        setPaymentMethods(uiMethods);
      }
      
      // En una implementación real, cargaríamos los comercios recientes desde Supabase
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
    } catch (err: any) {
      console.error('Error al cargar datos:', err);
      setErrorMessage(`Error al cargar datos: ${err.message || 'Error desconocido'}`);
    }
  };

  /**
   * Verifica si el formulario es válido para enviar
   */
  const isFormValid = (): boolean => {
    return Boolean(
      amount && 
      parseFloat(amount) > 0 && 
      date && 
      categoryId
    );
  };

  /**
   * Maneja el envío del formulario a Supabase
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    
    if (!isFormValid()) {
      setErrorMessage("Por favor completa los campos obligatorios: monto, fecha y categoría.");
      return;
    }
    
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Preparar datos para enviar a Supabase
      const formData: TransactionFormData = {
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
        periodicity, // Usamos directamente el valor de periodicidad
        budget_id: null,
        nro_operacion: '',
      };
      
      // Enviar a la API de Supabase
      const { data, error } = await createTransaction(formData);
 
      if (error) throw error;
      
      setSuccessMessage(direction === 'expense' ? 'Gasto registrado con éxito!' : 'Ingreso registrado con éxito!');
    } catch (err: any) {
      console.error('Error al guardar la transacción:', err);
      setErrorMessage(`Error al guardar: ${err.message || 'Inténtalo de nuevo'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Resetea todos los campos del formulario
   */
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

  /**
   * Navega a la pantalla de creación de nueva categoría
   */
  const handleNewCategoryClick = () => {
    navigate(`/dashboard/categories/new?type=${direction}&familyGroupId=${familyGroupId || ''}`);
  };

  /**
   * Navega a la pantalla de creación de nuevo método de pago
   */
  const handleNewPaymentMethodClick = () => {
    navigate('/dashboard/payment-methods/new');
  };

  /**
   * Función para manejar cambios de periodicidad
   */
  const handlePeriodicityChange = (newPeriodicity: PeriodicityType) => {
    setPeriodicity(newPeriodicity);
  };

  return (
    <div className="max-w-xl mx-auto relative">
      {/* Overlay de éxito */}
      {successMessage && (
        <SuccessMessage
          message={successMessage}
          onNewTransaction={resetForm}
          onGoToDashboard={() => navigate('/dashboard')}
        />
      )}
  
      <Card className="shadow-lg">
        {/* Encabezado */}
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between mb-4">
            <Link 
              to="/dashboard"
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <ArrowLeft size={20} />
            </Link>
            <h2 className="text-xl font-bold text-center flex-1">
              {direction === 'expense' ? 'Registrar Gasto' : 'Registrar Ingreso'}
            </h2>
            <div className="w-5"></div> {/* Espacio para equilibrar el layout */}
          </div>
  
          {/* Selector de tipo de transacción */}
          <DirectionSelector
            direction={direction}
            onDirectionChange={setDirection}
          />
        </CardHeader>
  
        {/* Cuerpo del formulario */}
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit}>
            <ErrorMessage message={errorMessage} />
  
            {/* Selector de grupo familiar destacado */}
            {familyGroups.length > 0 && (
              <FamilyGroupSelector
                familyGroups={familyGroups}
                selectedGroupId={familyGroupId}
                onGroupChange={setFamilyGroupId}
                useGroupRatio={useGroupRatio}
                onRatioChange={setUseGroupRatio}
                direction={direction}
              />
            )}
  
            {/* Monto y moneda */}
            <AmountInput
              amount={amount}
              onAmountChange={setAmount}
              currencyId={currencyId}
              onCurrencyChange={setCurrencyId}
              currencies={currencies}
            />
            {/* Categoría */}
            <CategorySelector
              categories={categories}
              selectedCategoryId={categoryId}
              onCategoryChange={setCategoryId}
              direction={direction}
              onNewCategoryClick={handleNewCategoryClick}
            />
  
            {/* Fecha */}
            <div className="mb-6">
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fecha *
              </label>
              <Input
                type="date"
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
  
            {/* Descripción */}
            <div className="mb-6">
              <label htmlFor="concepto" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descripción
              </label>
              <Input
                type="text"
                id="concepto"
                placeholder={direction === 'expense' ? "¿Para qué fue este gasto?" : "¿Cuál es la fuente de este ingreso?"}
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
              />
            </div>
  
            {/* Comercio (solo para gastos) */}
            {direction === 'expense' && (
              <CommerceInput
                value={comercio}
                onChange={setComercio}
                recentCommerces={recentCommerces}
              />
            )}
  
            {/* Opciones avanzadas */}
            <AdvancedOptionsToggle
              showOptions={showAdvancedOptions}
              onToggle={() => setShowAdvancedOptions(!showAdvancedOptions)}
            />
  
            {showAdvancedOptions && (
              <div className="space-y-6 pb-4 animate-fadeIn">
                {/* Método de pago (solo para gastos) */}
                {direction === 'expense' && (
                  <PaymentMethodSelector
                    paymentMethods={paymentMethods}
                    selectedMethodId={paymentMethodId}
                    onMethodChange={setPaymentMethodId}
                    onNewMethodClick={handleNewPaymentMethodClick}
                  />
                )}
  
                {/* Tipo de transacción */}
                <TransactionTypeSelector
                  transactionTypes={mockTransactionTypes}
                  selectedTypeId={transactionTypeId}
                  onTypeChange={setTransactionTypeId}
                />
  
                {/* Periodicidad */}
                <PeriodicitySelector
                  periodicity={periodicity}
                  onPeriodicityChange={handlePeriodicityChange}
                />
  
                {/* Información adicional */}
                <AdditionalInfoInput
                  value={additionalInfo}
                  onChange={setAdditionalInfo}
                />
  
                {/* Subir comprobante */}
                <ReceiptUploader
                  receipt={receipt}
                  onReceiptChange={setReceipt}
                />
              </div>
            )}
  
            {/* Botones de acción */}
            <div className="mt-8 flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
              >
                Cancelar
              </Button>
              <SubmitButton
                isSubmitting={isSubmitting}
                isValid={isFormValid()}
                direction={direction}
              />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}