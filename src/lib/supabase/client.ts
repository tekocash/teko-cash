import { createClient } from '@supabase/supabase-js'

// Key used to persist custom self-hosted connection settings
export const CUSTOM_CONN_KEY = 'teko_custom_connection'

export interface CustomConnection {
  url: string
  key: string
}

/** Returns custom connection from localStorage if valid, otherwise falls back to env vars */
function getSupabaseConfig(): { url: string; key: string } {
  try {
    const raw = localStorage.getItem(CUSTOM_CONN_KEY)
    if (raw) {
      const cfg: CustomConnection = JSON.parse(raw)
      if (cfg.url && cfg.key) return cfg
    }
  } catch {
    // ignore parse errors
  }
  return {
    url: import.meta.env.VITE_PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL,
    key: import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY,
  }
}

const { url: supabaseUrl, key: supabaseKey } = getSupabaseConfig()

// Validación en tiempo de ejecución
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Faltan variables de entorno para Supabase. Verifica tu archivo .env'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)

/** Returns true if the user has configured a custom self-hosted connection */
export function hasCustomConnection(): boolean {
  try {
    const raw = localStorage.getItem(CUSTOM_CONN_KEY)
    if (!raw) return false
    const cfg: CustomConnection = JSON.parse(raw)
    return !!(cfg.url && cfg.key)
  } catch {
    return false
  }
}

// Función para detectar si tenemos conexión a internet
export const isOnline = (): boolean => {
  return typeof navigator !== 'undefined' && navigator.onLine;
};