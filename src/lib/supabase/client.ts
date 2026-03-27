import { createClient } from '@supabase/supabase-js'

// 1. Importar variables de entorno — soporta ambos prefijos (VITE_PUBLIC_ para Netlify, VITE_ para local)
const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

// 2. Validación en tiempo de ejecución
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Faltan variables de entorno para Supabase. Verifica tu archivo .env'
  )
}

// 3. Crear y exportar el cliente
export const supabase = createClient(supabaseUrl, supabaseKey)

// Función para detectar si tenemos conexión a internet
export const isOnline = (): boolean => {
  return typeof navigator !== 'undefined' && navigator.onLine;
};