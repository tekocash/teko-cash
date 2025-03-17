// src/store/transaction-store.ts
import { create } from 'zustand';
import { Transaction } from '@/lib/supabase/schemas';
import { supabase, isOnline } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

interface PendingTransaction {
  id: string;
  data: any;
  action: 'insert' | 'update' | 'delete';
}

interface TransactionState {
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  currentTransaction: Transaction | null;
  isLoading: boolean;
  error: string | null;
  
  // Filtros
  filters: {
    startDate: string | null;
    endDate: string | null;
    categoryId: string | null;
    direction: 'income' | 'expense' | null;
    familyGroupId: string | null;
  };
  
  // Acciones
  fetchTransactions: (userId: string) => Promise<void>;
  createTransaction: (transaction: Omit<Transaction, 'id' | 'created_at'>) => Promise<Transaction>;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  setFilters: (filters: Partial<TransactionState['filters']>) => void;
  clearFilters: () => void;
  syncPendingTransactions: () => Promise<void>;
  
  // Método interno (no expuesto)
  applyFilters: (transactions: Transaction[]) => Transaction[];
}

// Transacciones pendientes en localStorage para modo offline
const getPendingTransactions = (): PendingTransaction[] => {
  if (typeof window === 'undefined') return [];
  const storedData = localStorage.getItem('teko-pending-transactions');
  return storedData ? JSON.parse(storedData) : [];
};

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  filteredTransactions: [],
  currentTransaction: null,
  isLoading: false,
  error: null,
  
  filters: {
    startDate: null,
    endDate: null,
    categoryId: null,
    direction: null,
    familyGroupId: null,
  },
  
  fetchTransactions: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });
      
      if (isOnline()) {
        // Consulta a Supabase si estamos online
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false });
        
        if (error) throw error;
        
        set({ 
          transactions: data as Transaction[], 
          filteredTransactions: get().applyFilters(data as Transaction[]),
          isLoading: false 
        });
        
        // Guardar en localStorage para acceso offline
        localStorage.setItem('teko-transactions', JSON.stringify(data));
      } else {
        // Si estamos offline, usamos datos en localStorage
        const storedData = localStorage.getItem('teko-transactions');
        const transactions = storedData ? JSON.parse(storedData) : [];
        
        set({ 
          transactions, 
          filteredTransactions: get().applyFilters(transactions),
          isLoading: false 
        });
      }
    } catch (error: any) {
      set({ 
        error: error.message || 'Error al cargar transacciones', 
        isLoading: false 
      });
    }
  },
  
  createTransaction: async (transactionData) => {
    try {
      set({ isLoading: true, error: null });
      
      // Crear objeto de transacción con ID y timestamp
      const newTransaction: Transaction = {
        ...transactionData,
        id: uuidv4(),
        created_at: new Date().toISOString(),
      };
      
      if (isOnline()) {
        // Si estamos online, insertar en Supabase
        const { data, error } = await supabase
          .from('transactions')
          .insert([newTransaction])
          .select()
          .single();
        
        if (error) throw error;
        
        // Actualizar el estado
        set((state) => ({
          transactions: [data as Transaction, ...state.transactions],
          filteredTransactions: get().applyFilters([data as Transaction, ...state.transactions]),
          isLoading: false,
        }));
        
        return data as Transaction;
      } else {
        // Si estamos offline, guardar en localStorage para sincronizar después
        const pendingTransactions = getPendingTransactions();
        pendingTransactions.push({
          id: newTransaction.id,
          data: newTransaction,
          action: 'insert'
        });
        
        localStorage.setItem('teko-pending-transactions', JSON.stringify(pendingTransactions));
        
        // Actualizar el estado
        set((state) => ({
          transactions: [newTransaction, ...state.transactions],
          filteredTransactions: get().applyFilters([newTransaction, ...state.transactions]),
          isLoading: false,
        }));
        
        return newTransaction;
      }
    } catch (error: any) {
      set({ 
        error: error.message || 'Error al crear transacción', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  updateTransaction: async (id: string, transactionData: Partial<Transaction>) => {
    try {
      set({ isLoading: true, error: null });
      
      // Encontrar la transacción actual
      const currentTransaction = get().transactions.find(t => t.id === id);
      
      if (!currentTransaction) {
        throw new Error('Transacción no encontrada');
      }
      
      // Mezclar datos actuales con actualizaciones
      const updatedTransaction: Transaction = {
        ...currentTransaction,
        ...transactionData,
      };
      
      if (isOnline()) {
        // Si estamos online, actualizar en Supabase
        const { data, error } = await supabase
          .from('transactions')
          .update(transactionData)
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        
        // Actualizar el estado
        set((state) => {
          const updatedTransactions = state.transactions.map(t => 
            t.id === id ? (data as Transaction) : t
          );
          
          return {
            transactions: updatedTransactions,
            filteredTransactions: get().applyFilters(updatedTransactions),
            isLoading: false,
          };
        });
        
        return data as Transaction;
      } else {
        // Si estamos offline, guardar en localStorage para sincronizar después
        const pendingTransactions = getPendingTransactions();
        pendingTransactions.push({
          id,
          data: transactionData,
          action: 'update'
        });
        
        localStorage.setItem('teko-pending-transactions', JSON.stringify(pendingTransactions));
        
        // Actualizar el estado
        set((state) => {
          const updatedTransactions = state.transactions.map(t => 
            t.id === id ? updatedTransaction : t
          );
          
          return {
            transactions: updatedTransactions,
            filteredTransactions: get().applyFilters(updatedTransactions),
            isLoading: false,
          };
        });
        
        return updatedTransaction;
      }
    } catch (error: any) {
      set({ 
        error: error.message || 'Error al actualizar transacción', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  deleteTransaction: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      if (isOnline()) {
        // Si estamos online, eliminar de Supabase
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
      } else {
        // Si estamos offline, guardar para sincronizar después
        const pendingTransactions = getPendingTransactions();
        pendingTransactions.push({
          id,
          data: null,
          action: 'delete'
        });
        
        localStorage.setItem('teko-pending-transactions', JSON.stringify(pendingTransactions));
      }
      
      // Actualizar el estado
      set((state) => {
        const updatedTransactions = state.transactions.filter(t => t.id !== id);
        
        return {
          transactions: updatedTransactions,
          filteredTransactions: get().applyFilters(updatedTransactions),
          isLoading: false,
        };
      });
    } catch (error: any) {
      set({ 
        error: error.message || 'Error al eliminar transacción', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  setFilters: (filters) => {
    set((state) => {
      const newFilters = { ...state.filters, ...filters };
      return {
        filters: newFilters,
        filteredTransactions: get().applyFilters(state.transactions),
      };
    });
  },
  
  clearFilters: () => {
    set((state) => ({
      filters: {
        startDate: null,
        endDate: null,
        categoryId: null,
        direction: null,
        familyGroupId: null,
      },
      filteredTransactions: state.transactions,
    }));
  },
  
  // Método para aplicar filtros
  applyFilters: (transactions: Transaction[]) => {
    const { filters } = get();
    return transactions.filter((transaction) => {
      // Filtrar por fecha
      if (filters.startDate && new Date(transaction.date) < new Date(filters.startDate)) {
        return false;
      }
      if (filters.endDate && new Date(transaction.date) > new Date(filters.endDate)) {
        return false;
      }
      // Filtrar por categoría
      if (filters.categoryId && transaction.category_id !== filters.categoryId) {
        return false;
      }
      // Filtrar por tipo (ingreso/gasto)
      if (filters.direction && transaction.direction !== filters.direction) {
        return false;
      }
      // Filtrar por grupo familiar
      if (filters.familyGroupId) {
        if (!transaction.family_group_id || transaction.family_group_id !== filters.familyGroupId) {
          return false;
        }
      }
      return true;
    });
  },
  
  // Sincronizar transacciones pendientes
  syncPendingTransactions: async () => {
    if (!isOnline()) return;
    
    try {
      set({ isLoading: true });
      
      const pendingTransactions = getPendingTransactions();
      if (pendingTransactions.length === 0) {
        set({ isLoading: false });
        return;
      }
      
      // Procesar cada transacción pendiente
      for (const { id, data, action } of pendingTransactions) {
        if (action === 'insert') {
          await supabase.from('transactions').insert([data]);
        } else if (action === 'update') {
          await supabase.from('transactions').update(data).eq('id', id);
        } else if (action === 'delete') {
          await supabase.from('transactions').delete().eq('id', id);
        }
      }
      
      // Limpiar transacciones pendientes
      localStorage.removeItem('teko-pending-transactions');
      
      // Recargar transacciones desde el servidor
      if (get().transactions.length > 0) {
        const userId = get().transactions[0]?.user_id;
        if (userId) {
          await get().fetchTransactions(userId);
        }
      }
      
      set({ isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message || 'Error al sincronizar transacciones', 
        isLoading: false 
      });
    }
  }
}));