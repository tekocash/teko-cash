'use client';
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import DashboardLayout from '../dashboard/DashboardLayout';
import { Plus, Edit, Trash, X, Check, Filter, Search, ChevronDown, Minus } from 'lucide-react';
import {
  getCategoriesWithPreferences,
  createCategory,
  updateCategory,
  deleteCategory,
  setUserCategoryPreference,
  CategoryWithPreferences
} from '@/services/category-service';
import { getUserFamilyGroups, FamilyGroup } from '@/services/family-service';

// Paleta de colores predefinidos
const COLOR_PALETTE = [
  '#EF4444', // red
  '#F97316', // orange
  '#F59E0B', // amber
  '#84CC16', // lime
  '#10B981', // emerald
  '#14B8A6', // teal
  '#06B6D4', // cyan
  '#0EA5E9', // sky
  '#3B82F6', // blue
  '#6366F1', // indigo
  '#8B5CF6', // violet
  '#A855F7', // purple
  '#D946EF', // fuchsia
  '#EC4899', // pink
  '#0F172A', // slate
];

// Emoji predefinidos
const EMOJI_OPTIONS = [
  '💰', '🛒', '🍔', '🏠', '🚗', '⛽', '💊', '🎓', '📱', '💻', 
  '📺', '🎮', '👕', '👖', '👟', '💄', '💼', '✈️', '🏨', '🎫', 
  '🎬', '🍿', '🏋️', '🧘', '🏊', '🎯', '🏆', '🎁', '💝', '🐶', 
  '📚', '🎵', '🎨', '🔨', '💸', '💳', '🏦', '📈', '📊', '🏢'
];

export default function CategoryManagement() {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryWithPreferences[]>([]);
  const [familyGroups, setFamilyGroups] = useState<FamilyGroup[]>([]);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  
  // Estados para el formulario de crear/editar
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category_type: 'expense' as 'expense' | 'income',
    icon: '📁',
    color: '#3B82F6',
    parent_id: null as string | null,
    family_group_id: null as string | null
  });
  
  // Estados para filtros
  const [activeFilter, setActiveFilter] = useState<'all' | 'expense' | 'income' | 'personal' | 'family'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Mensaje de éxito/error
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Cargar datos
  useEffect(() => {
    if (user?.id) {
      loadCategories();
      loadFamilyGroups();
    }
  }, [user]);

  // Cargar categorías
  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await getCategoriesWithPreferences(user!.id);
      if (error) throw error;
      setCategories(data || []);
    } catch (err: any) {
      setErrorMessage(`Error al cargar categorías: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar grupos familiares
  const loadFamilyGroups = async () => {
    try {
      const { data, error } = await getUserFamilyGroups(user!.id);
      if (error) throw error;
      setFamilyGroups(data || []);
    } catch (err: any) {
      console.error('Error al cargar grupos familiares:', err);
    }
  };

  // Filtrar categorías según criterios
  const filteredCategories = categories.filter(cat => {
    // Filtrar por tipo (gasto/ingreso) y ámbito (personal/familiar)
    if (activeFilter === 'expense' && cat.category_type !== 'expense') return false;
    if (activeFilter === 'income' && cat.category_type !== 'income') return false;
    if (activeFilter === 'personal' && cat.family_group_id !== null) return false;
    if (activeFilter === 'family' && cat.family_group_id === null) return false;
    
    // Filtrar por texto de búsqueda
    if (searchQuery && !cat.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    
    return true;
  });

  // Manejar creación de categoría
  const handleCreateCategory = async () => {
    if (!user?.id || !formData.name.trim()) return;
    
    try {
      // Crear la categoría
      const categoryData = {
        name: formData.name.trim(),
        category_type: formData.category_type,
        user_id: user.id,
        family_group_id: formData.family_group_id,
        parent_id: formData.parent_id
      };
      
      const { data: category, error } = await createCategory(categoryData);
      
      if (error) throw error;
      
      if (category) {
        // Guardar preferencias (color e icono)
        await setUserCategoryPreference({
          user_id: user.id,
          category_id: category.id,
          is_enabled: true,
          color: formData.color,
          icon: formData.icon,
          is_favorite: false
        });
        
        loadCategories(); // Recargar lista de categorías
        setSuccessMessage('Categoría creada con éxito');
        resetForm();
      }
    } catch (err: any) {
      setErrorMessage(`Error al crear categoría: ${err.message}`);
    }
  };

  // Manejar actualización de categoría
  const handleUpdateCategory = async () => {
    if (!user?.id || !editingCategoryId || !formData.name.trim()) return;
    
    try {
      // Actualizar la categoría
      const categoryData = {
        name: formData.name.trim(),
        category_type: formData.category_type,
        parent_id: formData.parent_id
      };
      
      const { error: categoryError } = await updateCategory(editingCategoryId, categoryData);
      
      if (categoryError) throw categoryError;
      
      // Actualizar preferencias
      const { error: prefError } = await setUserCategoryPreference({
        user_id: user.id,
        category_id: editingCategoryId,
        is_enabled: true,
        color: formData.color,
        icon: formData.icon,
        is_favorite: false
      });
      
      if (prefError) throw prefError;
      
      loadCategories(); // Recargar lista de categorías
      setSuccessMessage('Categoría actualizada con éxito');
      resetForm();
    } catch (err: any) {
      setErrorMessage(`Error al actualizar categoría: ${err.message}`);
    }
  };

  // Manejar eliminación de categoría
  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta categoría?')) return;
    
    try {
      const { error } = await deleteCategory(categoryId);
      
      if (error) throw error;
      
      loadCategories(); // Recargar lista de categorías
      setSuccessMessage('Categoría eliminada con éxito');
    } catch (err: any) {
      setErrorMessage(`Error al eliminar categoría: ${err.message}`);
    }
  };

  // Abrir formulario para editar
  const startEditCategory = (category: CategoryWithPreferences) => {
    setFormData({
      name: category.name,
      category_type: category.category_type,
      icon: category.icon || '📁',
      color: category.color || '#3B82F6',
      parent_id: category.parent_id,
      family_group_id: category.family_group_id
    });
    setEditingCategoryId(category.id);
    setFormOpen(true);
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      name: '',
      category_type: 'expense',
      icon: '📁',
      color: '#3B82F6',
      parent_id: null,
      family_group_id: null
    });
    setEditingCategoryId(null);
    setFormOpen(false);
    setShowColorPicker(false);
    setShowEmojiPicker(false);
  };

  // Obtener nombre del grupo familiar
  const getFamilyGroupName = (groupId: string | null) => {
    if (!groupId) return null;
    return familyGroups.find(g => g.id === groupId)?.name || 'Grupo Familiar';
  };

  // Obtener categorías padres disponibles
  const getAvailableParentCategories = () => {
    return categories.filter(cat => 
      // Debe ser del mismo tipo (gasto/ingreso)
      cat.category_type === formData.category_type && 
      // No debe ser una subcategoría
      cat.parent_id === null &&
      // Si estamos editando, no puede ser la misma categoría
      (!editingCategoryId || cat.id !== editingCategoryId) &&
      // Si es categoría familiar, debe pertenecer al mismo grupo
      (formData.family_group_id === null || 
       cat.family_group_id === formData.family_group_id ||
       cat.family_group_id === null)
    );
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Gestión de Categorías</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Administra tus categorías para organizar gastos e ingresos
          </p>
        </div>
        
        {!formOpen && (
          <button
            onClick={() => {
              resetForm();
              setFormOpen(true);
            }}
            className="mt-4 sm:mt-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Plus size={18} className="mr-1" />
            <span>Nueva Categoría</span>
          </button>
        )}
      </div>

      {/* Mensajes de éxito/error */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 flex items-start">
          <Check className="flex-shrink-0 h-5 w-5 mr-2 mt-0.5" />
          <div className="flex-grow">
            <p>{successMessage}</p>
            <button 
              onClick={() => setSuccessMessage('')}
              className="text-sm underline mt-1"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
      
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 flex items-start">
          <X className="flex-shrink-0 h-5 w-5 mr-2 mt-0.5" />
          <div className="flex-grow">
            <p>{errorMessage}</p>
            <button 
              onClick={() => setErrorMessage('')}
              className="text-sm underline mt-1"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Formulario de crear/editar categoría */}
      {formOpen && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            {editingCategoryId ? 'Editar Categoría' : 'Nueva Categoría'}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Nombre de categoría */}
            <div>
              <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                id="categoryName"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Ej: Supermercado, Salario, etc."
                required
              />
            </div>
            
            {/* Tipo de categoría */}
            <div>
              <label htmlFor="categoryType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tipo
              </label>
              <select
                id="categoryType"
                value={formData.category_type}
                onChange={(e) => setFormData({...formData, category_type: e.target.value as 'expense' | 'income'})}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                disabled={!!editingCategoryId} // No permitir cambiar el tipo si estamos editando
              >
                <option value="expense">Gasto</option>
                <option value="income">Ingreso</option>
              </select>
            </div>
            
            {/* Icono */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Icono
              </label>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white flex items-center"
              >
                <span className="text-xl mr-2">{formData.icon}</span>
                <span>{formData.icon} - Cambiar icono</span>
              </button>
              
              {showEmojiPicker && (
                <div className="absolute z-10 mt-1 p-2 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto">
                  <div className="grid grid-cols-8 gap-1">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setFormData({...formData, icon: emoji});
                          setShowEmojiPicker(false);
                        }}
                        className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Color */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Color
              </label>
              <button
               type="button"
               onClick={() => setShowColorPicker(!showColorPicker)}
               className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white flex items-center"
             >
               <div
                 className="w-6 h-6 rounded-full mr-2"
                 style={{ backgroundColor: formData.color }}
               ></div>
               <span>Seleccionar color</span>
             </button>
             
             {showColorPicker && (
               <div className="absolute z-10 mt-1 p-2 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto">
                 <div className="grid grid-cols-5 gap-1">
                   {COLOR_PALETTE.map((color) => (
                     <button
                       key={color}
                       type="button"
                       onClick={() => {
                         setFormData({...formData, color});
                         setShowColorPicker(false);
                       }}
                       className="w-8 h-8 rounded-full hover:ring-2 hover:ring-offset-2 hover:ring-gray-400"
                       style={{ backgroundColor: color }}
                     ></button>
                   ))}
                 </div>
                 <div className="mt-2">
                   <label htmlFor="customColor" className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                     Color personalizado:
                   </label>
                   <input
                     type="color"
                     id="customColor"
                     value={formData.color}
                     onChange={(e) => setFormData({...formData, color: e.target.value})}
                     className="w-full h-8 cursor-pointer"
                   />
                 </div>
               </div>
             )}
           </div>
           
           {/* Categoría padre */}
           <div>
             <label htmlFor="parentCategory" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
               Categoría padre (opcional)
             </label>
             <select
               id="parentCategory"
               value={formData.parent_id || ''}
               onChange={(e) => setFormData({...formData, parent_id: e.target.value || null})}
               className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
             >
               <option value="">Ninguna (categoría principal)</option>
               {getAvailableParentCategories().map((cat) => (
                 <option key={cat.id} value={cat.id}>
                   {cat.name}
                 </option>
               ))}
             </select>
           </div>
           
           {/* Grupo familiar */}
           {familyGroups.length > 0 && (
             <div>
               <label htmlFor="familyGroup" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                 Grupo familiar (opcional)
               </label>
               <select
                 id="familyGroup"
                 value={formData.family_group_id || ''}
                 onChange={(e) => setFormData({...formData, family_group_id: e.target.value || null})}
                 className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                 disabled={!!editingCategoryId} // No permitir cambiar el grupo familiar si estamos editando
               >
                 <option value="">Ninguno (categoría personal/global)</option>
                 {familyGroups.map((group) => (
                   <option key={group.id} value={group.id}>
                     {group.name}
                   </option>
                 ))}
               </select>
             </div>
           )}
         </div>
         
         {/* Vista previa */}
         <div className="mb-4 p-4 border border-gray-200 dark:border-gray-700 rounded-md">
           <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Vista previa:</h3>
           <div className="flex items-center space-x-2">
             <div 
               className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
               style={{ backgroundColor: formData.color, color: '#ffffff' }}
             >
               {formData.icon}
             </div>
             <div>
               <p className="font-medium text-gray-900 dark:text-white">{formData.name || 'Nombre de categoría'}</p>
               <p className="text-xs text-gray-500 dark:text-gray-400">
                 {formData.category_type === 'expense' ? 'Gasto' : 'Ingreso'}
                 {formData.family_group_id && ` • ${getFamilyGroupName(formData.family_group_id)}`}
                 {formData.parent_id && ` • Subcategoría`}
               </p>
             </div>
           </div>
         </div>
         
         {/* Botones de acción */}
         <div className="flex justify-end space-x-2">
           <button
             type="button"
             onClick={resetForm}
             className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
           >
             Cancelar
           </button>
           <button
             type="button"
             onClick={editingCategoryId ? handleUpdateCategory : handleCreateCategory}
             disabled={!formData.name.trim()}
             className={`px-4 py-2 rounded-md text-white ${
               formData.name.trim() 
                 ? 'bg-blue-600 hover:bg-blue-700' 
                 : 'bg-blue-400 cursor-not-allowed'
             }`}
           >
             {editingCategoryId ? 'Actualizar' : 'Crear'} Categoría
           </button>
         </div>
       </div>
     )}

     {/* Filtros */}
     <div className="flex flex-col sm:flex-row sm:items-center bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6 border border-gray-200 dark:border-gray-700">
       <div className="flex flex-wrap gap-2 mb-3 sm:mb-0 sm:mr-4">
         <button
           onClick={() => setActiveFilter('all')}
           className={`px-3 py-1 text-sm rounded-full ${
             activeFilter === 'all'
               ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
               : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
           }`}
         >
           Todas
         </button>
         <button
           onClick={() => setActiveFilter('expense')}
           className={`px-3 py-1 text-sm rounded-full ${
             activeFilter === 'expense'
               ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
               : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
           }`}
         >
           Gastos
         </button>
         <button
           onClick={() => setActiveFilter('income')}
           className={`px-3 py-1 text-sm rounded-full ${
             activeFilter === 'income'
               ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
               : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
           }`}
         >
           Ingresos
         </button>
         <button
           onClick={() => setActiveFilter('personal')}
           className={`px-3 py-1 text-sm rounded-full ${
             activeFilter === 'personal'
               ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
               : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
           }`}
         >
           Personales
         </button>
         <button
           onClick={() => setActiveFilter('family')}
           className={`px-3 py-1 text-sm rounded-full ${
             activeFilter === 'family'
               ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
               : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
           }`}
         >
           Familiares
         </button>
       </div>
       
       <div className="relative flex-grow">
         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
           <Search className="text-gray-400" size={18} />
         </div>
         <input
           type="text"
           placeholder="Buscar categoría..."
           value={searchQuery}
           onChange={(e) => setSearchQuery(e.target.value)}
           className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
         />
       </div>
     </div>

     {/* Lista de categorías */}
     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
       {/* Categorías de gastos */}
       <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
         <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
           <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mr-2">
             <Minus size={12} className="text-red-600 dark:text-red-400" />
           </span>
           Categorías de Gastos
         </h2>
         
         {isLoading ? (
           <div className="p-10 text-center">
             <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
             <p className="mt-2 text-gray-600 dark:text-gray-400">Cargando categorías...</p>
           </div>
         ) : (
           filteredCategories.filter(cat => cat.category_type === 'expense').length === 0 ? (
             <div className="p-10 text-center text-gray-500 dark:text-gray-400">
               No se encontraron categorías de gastos
             </div>
           ) : (
             <div className="space-y-3">
               {filteredCategories
                 .filter(cat => cat.category_type === 'expense' && cat.parent_id === null)
                 .map(category => (
                   <div key={category.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center">
                         <div 
                           className="w-10 h-10 rounded-full flex items-center justify-center text-xl mr-3 flex-shrink-0"
                           style={{ backgroundColor: category.color || '#EF4444', color: '#ffffff' }}
                         >
                           {category.icon || '📁'}
                         </div>
                         <div>
                           <h3 className="font-medium text-gray-900 dark:text-white">{category.name}</h3>
                           <p className="text-xs text-gray-500 dark:text-gray-400">
                             {category.family_group_id ? 
                               `Familiar (${getFamilyGroupName(category.family_group_id)})` : 
                               category.user_id ? 'Personal' : 'Global'}
                           </p>
                         </div>
                       </div>
                       
                       <div className="flex space-x-1">
                         <button
                           onClick={() => startEditCategory(category)}
                           className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                         >
                           <Edit size={18} />
                         </button>
                         
                         {/* Solo permitir eliminar categorías personales */}
                         {category.user_id === user?.id && (
                           <button
                             onClick={() => handleDeleteCategory(category.id)}
                             className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                           >
                             <Trash size={18} />
                           </button>
                         )}
                       </div>
                     </div>
                     
                     {/* Subcategorías */}
                     {filteredCategories.filter(subcat => subcat.parent_id === category.id).length > 0 && (
                       <div className="mt-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-2">
                         {filteredCategories
                           .filter(subcat => subcat.parent_id === category.id)
                           .map(subcat => (
                             <div key={subcat.id} className="flex items-center justify-between py-1">
                               <div className="flex items-center">
                                 <div 
                                   className="w-6 h-6 rounded-full flex items-center justify-center text-sm mr-2 flex-shrink-0"
                                   style={{ backgroundColor: subcat.color || '#EF4444', color: '#ffffff' }}
                                 >
                                   {subcat.icon || '📁'}
                                 </div>
                                 <span className="text-sm text-gray-700 dark:text-gray-300">{subcat.name}</span>
                               </div>
                               
                               <div className="flex space-x-1">
                                 <button
                                   onClick={() => startEditCategory(subcat)}
                                   className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                 >
                                   <Edit size={14} />
                                 </button>
                                 
                                 {subcat.user_id === user?.id && (
                                   <button
                                     onClick={() => handleDeleteCategory(subcat.id)}
                                     className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                   >
                                     <Trash size={14} />
                                   </button>
                                 )}
                               </div>
                             </div>
                           ))}
                       </div>
                     )}
                   </div>
                 ))}
             </div>
           )
         )}
       </div>
       
       {/* Categorías de ingresos */}
       <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
         <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
           <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mr-2">
             <Plus size={12} className="text-green-600 dark:text-green-400" />
           </span>
           Categorías de Ingresos
         </h2>
         
         {isLoading ? (
           <div className="p-10 text-center">
             <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
             <p className="mt-2 text-gray-600 dark:text-gray-400">Cargando categorías...</p>
           </div>
         ) : (
           filteredCategories.filter(cat => cat.category_type === 'income').length === 0 ? (
             <div className="p-10 text-center text-gray-500 dark:text-gray-400">
               No se encontraron categorías de ingresos
             </div>
           ) : (
             <div className="space-y-3">
               {filteredCategories
                 .filter(cat => cat.category_type === 'income' && cat.parent_id === null)
                 .map(category => (
                   <div key={category.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center">
                         <div 
                           className="w-10 h-10 rounded-full flex items-center justify-center text-xl mr-3 flex-shrink-0"
                           style={{ backgroundColor: category.color || '#10B981', color: '#ffffff' }}
                         >
                           {category.icon || '📁'}
                         </div>
                         <div>
                           <h3 className="font-medium text-gray-900 dark:text-white">{category.name}</h3>
                           <p className="text-xs text-gray-500 dark:text-gray-400">
                             {category.family_group_id ? 
                               `Familiar (${getFamilyGroupName(category.family_group_id)})` : 
                               category.user_id ? 'Personal' : 'Global'}
                           </p>
                         </div>
                       </div>
                       
                       <div className="flex space-x-1">
                         <button
                           onClick={() => startEditCategory(category)}
                           className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                         >
                           <Edit size={18} />
                         </button>
                         
                         {/* Solo permitir eliminar categorías personales */}
                         {category.user_id === user?.id && (
                           <button
                             onClick={() => handleDeleteCategory(category.id)}
                             className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                           >
                             <Trash size={18} />
                           </button>
                         )}
                       </div>
                     </div>
                     
                     {/* Subcategorías */}
                     {filteredCategories.filter(subcat => subcat.parent_id === category.id).length > 0 && (
                       <div className="mt-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-2">
                         {filteredCategories
                           .filter(subcat => subcat.parent_id === category.id)
                           .map(subcat => (
                             <div key={subcat.id} className="flex items-center justify-between py-1">
                               <div className="flex items-center">
                                 <div 
                                   className="w-6 h-6 rounded-full flex items-center justify-center text-sm mr-2 flex-shrink-0"
                                   style={{ backgroundColor: subcat.color || '#10B981', color: '#ffffff' }}
                                 >
                                   {subcat.icon || '📁'}
                                 </div>
                                 <span className="text-sm text-gray-700 dark:text-gray-300">{subcat.name}</span>
                               </div>
                               
                               <div className="flex space-x-1">
                                 <button
                                   onClick={() => startEditCategory(subcat)}
                                   className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                 >
                                   <Edit size={14} />
                                 </button>
                                 
                                 {subcat.user_id === user?.id && (
                                   <button
                                     onClick={() => handleDeleteCategory(subcat.id)}
                                     className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                   >
                                     <Trash size={14} />
                                   </button>
                                 )}
                               </div>
                             </div>
                           ))}
                       </div>
                     )}
                   </div>
                 ))}
             </div>
           )
         )}
       </div>
     </div>
   </DashboardLayout>
 );
}