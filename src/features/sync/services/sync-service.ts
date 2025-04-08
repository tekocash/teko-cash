// features/sync/services/sync-service.ts
import { supabase } from '@/lib/supabase'

type SyncResult = {
  success: boolean
  error?: string
}

export const SyncService = {
  async syncPendingTransactions(): Promise<SyncResult> {
    try {
      const { error } = await supabase.from('transactions').upsert([/* datos */])
      return { success: !error, error: error?.message }
    } catch (err) {
      return { success: false, error: 'Error desconocido' }
    }
  }
}

// Exporta el tipo si es necesario
export type { SyncResult }