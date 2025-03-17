// src/components/transactions/TransactionForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { Calendar as CalendarIcon, DollarSign, Tag, FileText, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useTransactionStore } from '@/store/transaction-store';
import { Transaction } from '@/lib/supabase/schemas';

// Definir esquema de validación con Zod
// Esto establece las reglas para cada campo del formulario
const transactionSchema = z.object({
  // El tipo de transacción debe ser "income" o "expense"
  direction: z.enum(['income', 'expense']),
  
  // El monto debe ser un número positivo
  amount: z.coerce.number().positive('El monto debe ser mayor a cero'),
  
  // La fecha es requerida
  date: z.string().min(1, 'La fecha es requerida'),
  
  // La descripción es requerida
  concepto: z.string().min(1, 'La descripción es requerida'),
  
  // La categoría es requerida
  category_id: z.string().min(1, 'La categoría es requerida'),
  
  // Estos campos son opcionales
  comercio: z.string().optional(),
  additional_info: z.string().optional(),
  family_group_id: z.string().optional(),
  use_group_ratio: z.boolean().optional(),
});

// Crear un tipo a partir del esquema para usar con TypeScript
type TransactionFormValues = z.infer<typeof transactionSchema>;

// Datos de ejemplo para categorías (en una app real, vendrían de una API o store)
const sampleCategories = [
  { id: 'cat1', name: 'Alimentación', type: 'expense' },
  { id: 'cat2', name: 'Transporte', type: 'expense' },
  { id: 'cat3', name: 'Vivienda', type: 'expense' },
  { id: 'cat4', name: 'Salario', type: 'income' },
  { id: 'cat5', name: 'Freelance', type: 'income' },
];

// Datos de ejemplo para grupos familiares
const sampleFamilyGroups = [
  { id: 'fam1', name: 'Mi Familia' },
  { id: 'fam2', name: 'Amigos' },
];

// Definir la interfaz para las props que recibe el componente
// Esto es lo que resolvió el error que estabas viendo
interface TransactionFormProps {
  // Función que se llama cuando la transacción se guarda exitosamente
  onSuccess?: () => void;
  
  // Datos iniciales para edición (opcional)
  initialData?: Partial<Transaction>;
  
  // Indica si estamos editando una transacción existente
  isEditing?: boolean;
}

export default function TransactionForm({ 
  onSuccess, 
  initialData, 
  isEditing = false 
}: TransactionFormProps) {
  // Obtener el usuario actual del store de autenticación
  const { user } = useAuthStore();
  
  // Obtener funciones del store de transacciones
  const { createTransaction, updateTransaction, isLoading } = useTransactionStore();
  
  // Estado para el tipo de transacción (gasto o ingreso)
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>(
    initialData?.direction || 'expense'
  );
  
  // Estado para mostrar/ocultar opciones de grupo familiar
  const [showFamilyOptions, setShowFamilyOptions] = useState(!!initialData?.family_group_id);
  
  // Configurar react-hook-form con validación de Zod
  const { 
    register,          // Para registrar campos del formulario
    handleSubmit,      // Para manejar el envío del formulario
    control,           // Para componentes controlados
    setValue,          // Para establecer valores programáticamente
    watch,             // Para observar cambios en campos
    reset,             // Para resetear el formulario
    formState: { errors } // Para acceder a errores de validación
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    // Valores iniciales para el formulario
    defaultValues: {
      direction: initialData?.direction || 'expense',
      amount: initialData?.amount || 0,
      date: initialData?.date 
        ? format(new Date(initialData.date), 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd'),
      concepto: initialData?.concepto || '',
      category_id: initialData?.category_id || '',
      comercio: initialData?.comercio || '',
      additional_info: initialData?.additional_info || '',
      family_group_id: initialData?.family_group_id || '',
      use_group_ratio: initialData?.use_group_ratio || false,
    }
  });
  
  // Filtrar categorías según el tipo de transacción seleccionado
  const filteredCategories = sampleCategories.filter(
    category => category.type === transactionType
  );
  
  // Cuando cambia el tipo de transacción, actualizar el campo direction
  // y resetear la categoría seleccionada porque las categorías son diferentes
  useEffect(() => {
    setValue('direction', transactionType);
    setValue('category_id', ''); // Resetear categoría al cambiar tipo
  }, [transactionType, setValue]);
  
  // Manejar envío del formulario
  const onSubmit = async (data: TransactionFormValues) => {
    // Verificar que hay un usuario autenticado
    if (!user) return;
    
    try {
      // Preparar datos de la transacción
      const transactionData = {
        ...data,
        user_id: user.id,
        // Asegurarse de que estos campos no sean undefined
        family_group_id: data.family_group_id || null,
        use_group_ratio: data.use_group_ratio || false,
      };
      
      if (isEditing && initialData?.id) {
        // Si estamos editando, actualizar la transacción existente
        await updateTransaction(initialData.id, transactionData);
        toast.success('Transacción actualizada con éxito');
      } else {
        // Si es nueva, crear la transacción
        await createTransaction(transactionData);
        toast.success('Transacción creada con éxito');
        reset(); // Limpiar formulario después de crear
      }
      
      // Llamar al callback de éxito si existe
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar la transacción');
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
        {isEditing ? 'Editar transacción' : 'Nueva transacción'}
      </h2>
      
      {/* Formulario de transacción */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Tipo de transacción (Gasto/Ingreso) */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Tipo de transacción
          </label>
          <div className="flex space-x-4">
            {/* Botón de Gasto */}
            <button
              type="button"
              onClick={() => setTransactionType('expense')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium ${
                transactionType === 'expense'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Gasto
            </button>
            {/* Botón de Ingreso */}
            <button
              type="button"
              onClick={() => setTransactionType('income')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium ${
                transactionType === 'income'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Ingreso
            </button>
          </div>
        </div>
        
        {/* Campo Monto */}
        <div className="space-y-2">
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Monto
          </label>
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <DollarSign className="h-5 w-5 text-gray-400" />
            </div>
            {/* Input para el monto */}
            <input
              id="amount"
              type="number"
              step="0.01"
              {...register('amount')}
              className={`block w-full pl-10 pr-4 py-2 rounded-md focus:ring-2 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.amount
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-300'
              }`}
              placeholder="0.00"
              disabled={isLoading}
            />
          </div>
          {/* Mostrar mensaje de error si existe */}
          {errors.amount && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.amount.message}</p>
          )}
        </div>
        
        {/* Campo Fecha */}
        <div className="space-y-2">
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Fecha
          </label>
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <CalendarIcon className="h-5 w-5 text-gray-400" />
            </div>
            {/* Input para la fecha */}
            <input
              id="date"
              type="date"
              {...register('date')}
              className={`block w-full pl-10 pr-4 py-2 rounded-md focus:ring-2 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.date
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-300'
              }`}
              disabled={isLoading}
            />
          </div>
          {/* Mostrar mensaje de error si existe */}
          {errors.date && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.date.message}</p>
          )}
        </div>
        
        {/* Campo Categoría */}
        <div className="space-y-2">
          <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Categoría
          </label>
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Tag className="h-5 w-5 text-gray-400" />
            </div>
            {/* Select para elegir categoría */}
            <select
              id="category_id"
              {...register('category_id')}
              className={`block w-full pl-10 pr-4 py-2 rounded-md focus:ring-2 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.category_id
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-300'
              }`}
              disabled={isLoading}
            >
              <option value="">Selecciona una categoría</option>
              {/* Mostrar solo categorías del tipo seleccionado */}
              {filteredCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          {/* Mostrar mensaje de error si existe */}
          {errors.category_id && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.category_id.message}</p>
          )}
        </div>
        
        {/* Campo Descripción */}
        <div className="space-y-2">
          <label htmlFor="concepto" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Descripción
          </label>
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FileText className="h-5 w-5 text-gray-400" />
            </div>
            {/* Input para la descripción */}
            <input
              id="concepto"
              type="text"
              {...register('concepto')}
              className={`block w-full pl-10 pr-4 py-2 rounded-md focus:ring-2 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.concepto
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-300'
              }`}
              placeholder="Descripción de la transacción"
              disabled={isLoading}
            />
          </div>
          {/* Mostrar mensaje de error si existe */}
          {errors.concepto && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.concepto.message}</p>
          )}
        </div>
        
        {/* Campo Comercio (opcional) */}
        <div className="space-y-2">
          <label htmlFor="comercio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Comercio (opcional)
          </label>
          {/* Input para el comercio */}
          <input
            id="comercio"
            type="text"
            {...register('comercio')}
            className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:outline-none focus:border-blue-500 focus:ring-blue-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Nombre del comercio"
            disabled={isLoading}
          />
        </div>
        
        {/* Opciones específicas para gastos */}
        {transactionType === 'expense' && (
          <div className="space-y-4">
            {/* Checkbox para habilitar gastos compartidos */}
            <div className="flex items-center">
              <input
                id="showFamilyOptions"
                type="checkbox"
                checked={showFamilyOptions}
                onChange={(e) => setShowFamilyOptions(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
              />
              <label htmlFor="showFamilyOptions" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Este gasto es compartido con mi grupo familiar
              </label>
            </div>
            
            {/* Si el gasto es compartido, mostrar opciones adicionales */}
            {showFamilyOptions && (
              <>
                {/* Selección de grupo familiar */}
                <div className="space-y-2">
                  <label htmlFor="family_group_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Grupo familiar
                  </label>
                  <select
                    id="family_group_id"
                    {...register('family_group_id')}
                    className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:outline-none focus:border-blue-500 focus:ring-blue-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    disabled={isLoading}
                  >
                    <option value="">Selecciona un grupo</option>
                    {sampleFamilyGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Opción para usar regla de reparto del grupo */}
                <div className="flex items-center">
                  <input
                    id="use_group_ratio"
                    type="checkbox"
                    {...register('use_group_ratio')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
                    disabled={isLoading}
                  />
                  <label htmlFor="use_group_ratio" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Usar la regla de reparto configurada en el grupo
                  </label>
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Botón para guardar la transacción */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              {/* Spinner para indicar carga */}
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Guardando...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <CheckCircle className="mr-2 h-5 w-5" />
              {isEditing ? 'Actualizar transacción' : 'Guardar transacción'}
            </span>
          )}
        </button>
      </form>
    </div>
  );
}