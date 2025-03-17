'use client';
import { useState, useEffect } from 'react';
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
  Minus
} from 'lucide-react';

// Tipos de datos
type TransactionType = 'expense' | 'income';

type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType | 'both';
};

type FamilyGroup = {
  id: string;
  name: string;
  members: number;
};

// Categorías predefinidas basadas en el documento
const predefinedCategories: Category[] = [
  { id: 'food', name: 'Alimentación', icon: '🍔', color: '#10B981', type: 'expense' },
  { id: 'transport', name: 'Transporte', icon: '🚗', color: '#3B82F6', type: 'expense' },
  { id: 'home', name: 'Hogar', icon: '🏠', color: '#F59E0B', type: 'expense' },
  { id: 'entertainment', name: 'Entretenimiento', icon: '🎬', color: '#EC4899', type: 'expense' },
  { id: 'health', name: 'Salud', icon: '⚕️', color: '#EF4444', type: 'expense' },
  { id: 'education', name: 'Educación', icon: '📚', color: '#8B5CF6', type: 'expense' },
  { id: 'shopping', name: 'Compras', icon: '🛍️', color: '#F97316', type: 'expense' },
  { id: 'bills', name: 'Servicios', icon: '📱', color: '#0EA5E9', type: 'expense' },
  { id: 'salary', name: 'Salario', icon: '💰', color: '#16A34A', type: 'income' },
  { id: 'freelance', name: 'Freelance', icon: '💻', color: '#8B5CF6', type: 'income' },
  { id: 'gifts', name: 'Regalos', icon: '🎁', color: '#EC4899', type: 'both' },
  { id: 'investments', name: 'Inversiones', icon: '📈', color: '#0EA5E9', type: 'both' },
];

// Grupos familiares de ejemplo
const sampleFamilyGroups: FamilyGroup[] = [
  { id: 'family1', name: 'Familia', members: 4 },
  { id: 'roommates', name: 'Compañeros de piso', members: 3 },
];

export default function TransactionForm() {
  // Estados del formulario
  const [step, setStep] = useState<number>(1);
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [familyGroup, setFamilyGroup] = useState<string>('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState<boolean>(false);
  const [showFamilyDropdown, setShowFamilyDropdown] = useState<boolean>(false);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filtrar categorías según el tipo de transacción
  const filteredCategories = predefinedCategories.filter(
    cat => cat.type === type || cat.type === 'both'
  );

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Aquí iría la lógica para guardar la transacción en la base de datos
    // Por ahora solo simulamos un proceso de guardado
    
    try {
      // Simulación de envío a API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Datos a enviar
      const transactionData = {
        type,
        amount: parseFloat(amount),
        date,
        categoryId: category,
        description,
        familyGroupId: familyGroup || null,
        receiptImage: receipt ? 'url_to_uploaded_image' : null,
      };
      
      console.log('Transacción guardada:', transactionData);
      
      // Resetear formulario
      resetForm();
      
      // Mostrar mensaje de éxito (esto se puede mejorar con un sistema de notificaciones)
      alert('Transacción guardada con éxito!');
    } catch (error) {
      console.error('Error al guardar la transacción:', error);
      alert('Error al guardar la transacción. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resetear formulario
  const resetForm = () => {
    setStep(1);
    setType('expense');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setCategory('');
    setDescription('');
    setFamilyGroup('');
    setReceipt(null);
  };

  // Manejar subida de comprobante
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setReceipt(e.target.files[0]);
    }
  };

  // Obtener nombre de categoría seleccionada
  const getSelectedCategoryName = () => {
    const selected = predefinedCategories.find(cat => cat.id === category);
    return selected ? `${selected.icon} ${selected.name}` : 'Seleccionar categoría';
  };

  // Obtener nombre de grupo familiar seleccionado
  const getSelectedFamilyName = () => {
    const selected = sampleFamilyGroups.find(group => group.id === familyGroup);
    return selected ? selected.name : 'Ninguno';
  };

  // Avanzar al siguiente paso si están completos los datos necesarios
  useEffect(() => {
    if (step === 1 && amount && amount !== '0') {
      setStep(2);
    }
  }, [amount, step]);

  // Función para validar si el formulario está completo
  const isFormComplete = () => {
    return (
      amount && 
      parseFloat(amount) > 0 && 
      date && 
      category
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">
        {type === 'expense' ? 'Registrar Gasto' : 'Registrar Ingreso'}
      </h2>

      <div className="flex items-center justify-center space-x-4 mb-6">
        <button
          type="button"
          onClick={() => setType('expense')}
          className={`flex-1 py-2 px-4 rounded-md flex items-center justify-center space-x-2 ${
            type === 'expense'
              ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300 border border-red-200 dark:border-red-800'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border border-transparent'
          }`}
        >
          <Minus size={18} />
          <span>Gasto</span>
        </button>
        <button
          type="button"
          onClick={() => setType('income')}
          className={`flex-1 py-2 px-4 rounded-md flex items-center justify-center space-x-2 ${
            type === 'income'
              ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300 border border-green-200 dark:border-green-800'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border border-transparent'
          }`}
        >
          <Plus size={18} />
          <span>Ingreso</span>
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Paso 1: Monto */}
        <div className={`mb-4 ${step === 1 ? 'block' : 'hidden'}`}>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Monto
          </label>
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <DollarSign size={18} className="text-gray-400" />
            </div>
            <input
              type="number"
              id="amount"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="block w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg"
              step="0.01"
              min="0"
              required
              autoFocus
            />
          </div>
        </div>

        {/* Paso 2: Resto del formulario */}
        <div className={step >= 2 ? 'block' : 'hidden'}>
          {/* Fecha */}
          <div className="mb-4">
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fecha
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar size={18} className="text-gray-400" />
              </div>
              <input
                type="date"
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
          </div>

          {/* Categoría */}
          <div className="mb-4 relative">
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Categoría
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="flex justify-between items-center w-full pl-3 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <div className="flex items-center">
                  <Tag size={18} className="text-gray-400 mr-2" />
                  <span>{getSelectedCategoryName()}</span>
                </div>
                <ChevronDown size={18} className="text-gray-400" />
              </button>

              {showCategoryDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto">
                  {filteredCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => {
                        setCategory(cat.id);
                        setShowCategoryDropdown(false);
                      }}
                    >
                      <span className="mr-2" style={{ color: cat.color }}>
                        {cat.icon}
                      </span>
                      <span className="text-gray-900 dark:text-white">{cat.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Descripción */}
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descripción
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <AlignLeft size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                id="description"
                placeholder="Descripción (opcional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Grupo Familiar */}
          <div className="mb-4 relative">
            <label htmlFor="familyGroup" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Grupo Familiar
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFamilyDropdown(!showFamilyDropdown)}
                className="flex justify-between items-center w-full pl-3 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <div className="flex items-center">
                  <Users size={18} className="text-gray-400 mr-2" />
                  <span>{getSelectedFamilyName()}</span>
                </div>
                <ChevronDown size={18} className="text-gray-400" />
              </button>

              {showFamilyDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => {
                      setFamilyGroup('');
                      setShowFamilyDropdown(false);
                    }}
                  >
                    <span className="text-gray-900 dark:text-white">Ninguno</span>
                  </button>
                  
                  {sampleFamilyGroups.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => {
                        setFamilyGroup(group.id);
                        setShowFamilyDropdown(false);
                      }}
                    >
                      <span className="text-gray-900 dark:text-white">
                        {group.name} ({group.members} miembros)
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Subir comprobante */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Comprobante (opcional)
            </label>
            {receipt ? (
              <div className="flex items-center p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">
                <div className="flex-1 truncate">{receipt.name}</div>
                <button
                  type="button"
                  onClick={() => setReceipt(null)}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600 dark:text-gray-400">
                    <label
                      htmlFor="receipt"
                      className="relative cursor-pointer bg-white dark:bg-transparent rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none"
                    >
                      <span>Subir archivo</span>
                      <input
                        id="receipt"
                        name="receipt"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleReceiptUpload}
                      />
                    </label>
                    <p className="pl-1">o arrastra y suelta</p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    PNG, JPG, GIF hasta 10MB
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isFormComplete() || isSubmitting}
              className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white flex items-center ${
                isFormComplete() && !isSubmitting
                  ? 'bg-blue-600 hover:bg-blue-700'
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
                  <Check size={18} className="mr-1" />
                  Guardar
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}