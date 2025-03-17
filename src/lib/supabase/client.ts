// src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Verificación de variables de entorno
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'ERROR: Las variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY deben estar configuradas'
  );
}

// Cliente de Supabase para uso en el navegador
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'teko-cash-auth',
  },
});

// Función para detectar si tenemos conexión a internet
export const isOnline = (): boolean => {
  return typeof navigator !== 'undefined' && navigator.onLine;
};