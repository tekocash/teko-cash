// src/repositories/transaction-repository.ts
import { supabase, isOnline } from '@/lib/supabase/client';
import { Transaction } from '@/lib/supabase/schemas';
import { v4 as uuidv4 } from 'uuid';

/**
 * Repositorio para acceso a datos de transacciones
 * Implementa el patrón Repository para abstraer la lógica de acceso a datos
 */
export default class TransactionRepository {
  private static STORAGE_KEY = 'teko-transactions';
  private static PENDING_KEY = 'teko-pending-transactions';
  
  /**
   * Obtiene todas las transacciones de un usuario
   */
  async getTransactions(userId: string, options: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    direction?: 'asc' | 'desc';
    filters?: Record<string, any>;
  } = {}): Promise<Transaction[]> {
    const { 
      limit = 50, 
      offset = 0, 
      orderBy = 'date', 
      direction = 'desc',
      filters = {} 
    } = options;
    
    try {
      if (isOnline()) {
        // Construir la consulta
        let query = supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order(orderBy, { ascending: direction === 'asc' })
          .range(offset, offset + limit - 1);
        
        // Aplicar filtros adicionales
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        // Guardar en localStorage para acceso offline
        this.saveToLocalStorage(data);
        
        return data as Transaction[];
      } else {
        // Si estamos offline, usar datos en localStorage
        const transactions = this.getFromLocalStorage();
        
        // Filtrar por usuario y aplicar filtros adicionales
        let filtered = transactions.filter(t => t.user_id === userId);
        
        // Aplicar filtros adicionales
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            filtered = filtered.filter(t => {
                const propValue = t[key as keyof Transaction];
                return propValue === value;
              });
          }
        });
        
        // Ordenar
        filtered.sort((a, b) => {
            const valueA = a[orderBy as keyof Transaction] || '';
            const valueB = b[orderBy as keyof Transaction] || '';
          
          if (direction === 'asc') {
            return valueA > valueB ? 1 : -1;
          } else {
            return valueA < valueB ? 1 : -1;
          }
        });
        
        // Aplicar paginación
        return filtered.slice(offset, offset + limit);
      }
    } catch (error) {
      console.error('Error al obtener transacciones:', error);
      // Si hay error, intentar con localStorage
      const transactions = this.getFromLocalStorage();
      return transactions.filter(t => t.user_id === userId);
    }
  }
  
  /**
   * Obtiene una transacción por ID
   */
  async getTransactionById(id: string): Promise<Transaction | null> {
    try {
      if (isOnline()) {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        
        return data as Transaction;
      } else {
        const transactions = this.getFromLocalStorage();
        return transactions.find(t => t.id === id) || null;
      }
    } catch (error) {
      console.error('Error al obtener transacción:', error);
      const transactions = this.getFromLocalStorage();
      return transactions.find(t => t.id === id) || null;
    }
  }
  
  /**
   * Crea una nueva transacción
   */
  async createTransaction(
    id: string, 
    transaction: Omit<Transaction, 'id' | 'created_at'>,
    participants?: any[]
  ): Promise<Transaction> {
    // Completar datos de la transacción
    const newTransaction: Transaction = {
      ...transaction,
      id,
      created_at: new Date().toISOString(),
    };
    
    try {
      if (isOnline()) {
        // Insertar en Supabase
        const { data, error } = await supabase
          .from('transactions')
          .insert([newTransaction])
          .select()
          .single();
        
        if (error) throw error;
        
        // Si hay participantes, insertarlos
        if (participants && participants.length > 0) {
          const { error: participantsError } = await supabase
            .from('transaction_participants')
            .insert(participants);
          
          if (participantsError) throw participantsError;
        }
        
        // Guardar en localStorage
        this.saveTransactionToLocalStorage(data);
        
        return data as Transaction;
      } else {
        // Si estamos offline, guardar transacción y marcar como pendiente
        this.saveTransactionToLocalStorage(newTransaction);
        this.addPendingTransaction('insert', newTransaction);
        
        // Si hay participantes, guardarlos como pendientes
        if (participants && participants.length > 0) {
          participants.forEach(p => {
            this.addPendingTransaction('insert', p, 'transaction_participants');
          });
        }
        
        return newTransaction;
      }
    } catch (error) {
      console.error('Error al crear transacción:', error);
      // Si hay error, guardar como pendiente
      this.saveTransactionToLocalStorage(newTransaction);
      this.addPendingTransaction('insert', newTransaction);
      return newTransaction;
    }
  }
  
  // Métodos auxiliares para localStorage
  
  private getFromLocalStorage(): Transaction[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(TransactionRepository.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }
  
  private saveToLocalStorage(transactions: Transaction[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TransactionRepository.STORAGE_KEY, JSON.stringify(transactions));
  }
  
  private saveTransactionToLocalStorage(transaction: Transaction): void {
    const transactions = this.getFromLocalStorage();
    const index = transactions.findIndex(t => t.id === transaction.id);
    
    if (index >= 0) {
      transactions[index] = transaction;
    } else {
      transactions.push(transaction);
    }
    
    this.saveToLocalStorage(transactions);
  }
  
  private addPendingTransaction(
    action: 'insert' | 'update' | 'delete',
    data: any,
    table: string = 'transactions'
  ): void {
    if (typeof window === 'undefined') return;
    
    const pendingItems = localStorage.getItem(TransactionRepository.PENDING_KEY);
    const pending = pendingItems ? JSON.parse(pendingItems) : [];
    
    pending.push({ action, data, table });
    
    localStorage.setItem(TransactionRepository.PENDING_KEY, JSON.stringify(pending));
  }
}