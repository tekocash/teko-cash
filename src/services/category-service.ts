import { createClient } from '@supabase/supabase-js';

// Asumimos que estas variables están definidas en tu archivo .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// Tipos basados en el esquema de la base de datos
export interface Category {
  id: string;
  user_id: string | null;
  family_group_id: string | null;
  name: string;
  category_type: 'expense' | 'income';
  parent_id: string | null;
  created_at: string;
}

export interface CategoryPreference {
  id: string;
  user_id: string;
  category_id: string;
  is_enabled: boolean;
  color: string | null;
  icon: string | null;
  is_favorite: boolean | null;
  updated_at: string;
}

/**
 * Obtiene todas las categorías disponibles para un usuario
 * Incluye categorías globales, personales y de sus grupos familiares
 */
export const getUserCategories = async (
  userId: string,
  familyGroupId?: string | null
): Promise<{ data: Category[] | null; error: any }> => {
  let query = supabase
    .from('categories')
    .select('*')
    .or(`user_id.eq.${userId},user_id.is.null`);

  // Si el usuario está en un grupo familiar, también incluir sus categorías
  if (familyGroupId) {
    query = query.or(`family_group_id.eq.${familyGroupId},family_group_id.is.null`);
  } else {
    query = query.is('family_group_id', null);
  }

  const { data, error } = await query.order('name');

  return { data, error };
};

/**
 * Obtiene las preferencias de categorías del usuario
 */
export const getUserCategoryPreferences = async (
  userId: string
): Promise<{ data: CategoryPreference[] | null; error: any }> => {
  const { data, error } = await supabase
    .from('user_category_preferences')
    .select('*')
    .eq('user_id', userId);

  return { data, error };
};

/**
 * Obtiene una categoría por su ID
 */
export const getCategoryById = async (
  categoryId: string
): Promise<{ data: Category | null; error: any }> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', categoryId)
    .single();

  return { data, error };
};

/**
 * Crea una nueva categoría
 */
export const createCategory = async (
  category: Omit<Category, 'id' | 'created_at'>
): Promise<{ data: Category | null; error: any }> => {
  const { data, error } = await supabase
    .from('categories')
    .insert(category)
    .select()
    .single();

  return { data, error };
};

/**
 * Actualiza una categoría existente
 */
export const updateCategory = async (
  categoryId: string,
  updates: Partial<Category>
): Promise<{ data: Category | null; error: any }> => {
  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', categoryId)
    .select()
    .single();

  return { data, error };
};

/**
 * Elimina una categoría
 */
export const deleteCategory = async (
  categoryId: string
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId);

  return { error };
};

/**
 * Establece las preferencias de categoría para un usuario
 */
export const setUserCategoryPreference = async (
  preference: Omit<CategoryPreference, 'id' | 'updated_at'>
): Promise<{ data: CategoryPreference | null; error: any }> => {
  // Verificar si ya existe una preferencia para esta categoría y usuario
  const { data: existingPref } = await supabase
    .from('user_category_preferences')
    .select('id')
    .eq('user_id', preference.user_id)
    .eq('category_id', preference.category_id)
    .single();

  if (existingPref) {
    // Actualizar preferencia existente
    const { data, error } = await supabase
      .from('user_category_preferences')
      .update(preference)
      .eq('id', existingPref.id)
      .select()
      .single();

    return { data, error };
  } else {
    // Crear nueva preferencia
    const { data, error } = await supabase
      .from('user_category_preferences')
      .insert(preference)
      .select()
      .single();

    return { data, error };
  }
};

/**
 * Obtiene categorías con sus preferencias de usuario
 */
// Definir un tipo que combine Category y las propiedades de CategoryPreference que necesitamos
export type CategoryWithPreferences = {
  id: string;
  user_id: string | null;
  family_group_id: string | null;
  name: string;
  category_type: 'expense' | 'income';
  parent_id: string | null;
  created_at: string;
  is_enabled?: boolean;
  color?: string | null;
  icon?: string | null;
  is_favorite?: boolean | null;
};

export const getCategoriesWithPreferences = async (
  userId: string,
  familyGroupId?: string | null
): Promise<{ data: CategoryWithPreferences[] | null; error: any }> => {
  // Esta función combina los datos de categories y user_category_preferences
  // En una aplicación real, esto podría implementarse como una función RPC en PostgreSQL
  // o usando join en Supabase si está disponible

  // Primero obtenemos las categorías
  const { data: categories, error: categoriesError } = await getUserCategories(userId, familyGroupId);
  if (categoriesError || !categories) {
    return { data: null, error: categoriesError };
  }

  // Luego obtenemos las preferencias
  const { data: preferences, error: preferencesError } = await getUserCategoryPreferences(userId);
  if (preferencesError) {
    return { data: null, error: preferencesError };
  }

  // Mapear preferencias por category_id para acceso rápido
  const prefMap = new Map();
  preferences?.forEach(pref => {
    prefMap.set(pref.category_id, pref);
  });

  // Combinar datos con el tipo correcto
  const combinedData: CategoryWithPreferences[] = categories.map(category => {
    const pref = prefMap.get(category.id);
    if (pref) {
      return {
        ...category,
        is_enabled: pref.is_enabled,
        color: pref.color,
        icon: pref.icon,
        is_favorite: pref.is_favorite
      };
    }
    return {
      ...category,
      is_enabled: true, // Por defecto, todas las categorías están habilitadas
      color: null,
      icon: null,
      is_favorite: false
    };
  });

  return { data: combinedData, error: null };
};

export default {
  getUserCategories,
  getUserCategoryPreferences,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  setUserCategoryPreference,
  getCategoriesWithPreferences
};