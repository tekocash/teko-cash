// features/sync/hooks/useSync.ts
import { SyncService } from  '../services/sync-service' ;

export function useSync() {
  const syncData = async () => {
    try {
      await SyncService.syncPendingTransactions()
    } catch (error) {
      console.error('Sync failed', error)
    }
  }

  return { syncData }
}