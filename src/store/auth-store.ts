// src/store/auth-store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/lib/supabase/schemas';
import { supabase } from '@/lib/supabase/client';
import { Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  updateUserProfile: (displayName: string) => Promise<void>; // Nueva función añadida
}

// Escucha cambios de sesión globalmente (cubre el retorno del flujo OAuth)
supabase.auth.onAuthStateChange((_event, session) => {
  const store = useAuthStore.getState();
  if (session) {
    store.refreshSession();
  } else {
    useAuthStore.setState({ user: null, session: null });
  }
});

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isLoading: false,
      error: null,

      signIn: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;
          set({
            session: data.session,
            user: data.user as unknown as User,
            isLoading: false,
          });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      signInWithGoogle: async () => {
        try {
          set({ isLoading: true, error: null });
          // Prioritize explicit site URL and normalize trailing slash for OAuth callback URL
          const configuredSiteUrl = import.meta.env.VITE_SITE_URL?.trim();
          const siteUrl = (configuredSiteUrl || window.location.origin).replace(/\/+$/, '');
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${siteUrl}/dashboard`,
              queryParams: { prompt: 'select_account' },
            },
          });
          if (error) throw error;
          // isLoading se resetea cuando onAuthStateChange recibe SIGNED_IN tras la redirección
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },
      
      signUp: async (email: string, password: string, fullName: string) => {
        try {
          set({ isLoading: true, error: null });
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName,
              },
            },
          });
          if (error) throw error;
          set({
            session: data.session,
            user: data.user as unknown as User,
            isLoading: false,
          });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      signOut: async () => {
        try {
          const { error } = await supabase.auth.signOut();
          if (error) throw error;
          // Limpiar todos los caches del usuario de localStorage
          const CACHE_KEYS = [
            'teko-transactions',
            'teko_notif_prefs',
            'teko_budget_alerts_seen',
            'teko_pending_notifs',
          ];
          CACHE_KEYS.forEach(k => localStorage.removeItem(k));
          set({ user: null, session: null });
        } catch (error: any) {
          set({ error: error.message });
          throw error;
        }
      },

      refreshSession: async () => {
        try {
          set({ isLoading: true });
          const { data, error } = await supabase.auth.getSession();

          if (error) throw error;

          if (data?.session) {
            // Obtener datos del usuario
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('*')
              .eq('id', data.session.user.id)
              .single();

            if (userError) {
              // Si el error es que no existe el usuario, creamos el perfil
              if (userError.code === 'PGRST116') {
                
                // Crear perfil de usuario básico
                const { error: createError } = await supabase
                  .from('users')
                  .insert({
                    id: data.session.user.id,
                    email: data.session.user.email,
                    user_name: data.session.user.email?.split('@')[0] || 'usuario',
                    display_name: data.session.user.user_metadata?.full_name || 'Usuario',
                    type: 'standard'
                  });
                
                if (createError) throw createError;
                
                // Obtener el usuario recién creado
                const { data: newUserData, error: newUserError } = await supabase
                  .from('users')
                  .select('*')
                  .eq('id', data.session.user.id)
                  .single();
                
                if (newUserError) throw newUserError;
                
                set({
                  session: data.session,
                  user: newUserData,
                  isLoading: false,
                });
                
                return;
              }
              
              throw userError;
            }
            
            console.log('Datos de usuario obtenidos, actualizando estado...');
            set({
              session: data.session,
              user: userData,
              isLoading: false,
            });
          } else {
            console.log('No hay sesión activa');
            set({ session: null, user: null, isLoading: false });
          }
        } catch (error: any) {
          console.error('Error en refreshSession:', error);
          set({ error: error.message, isLoading: false });
        }
      },

      // Nueva función para actualizar el perfil del usuario
      updateUserProfile: async (displayName: string) => {
        try {
          set({ isLoading: true, error: null });
          const { user } = get();
          
          if (!user) throw new Error('Usuario no autenticado');
          
          // Actualizar en Supabase
          const { error } = await supabase
            .from('users')
            .update({ display_name: displayName })
            .eq('id', user.id);
          
          if (error) throw error;
          
          // Actualizar el estado local
          set((state) => ({
            user: state.user ? { ...state.user, display_name: displayName } : null,
            isLoading: false,
          }));
          
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },
    }),
    {
      name: 'teko-auth-storage',
      // Solo persistir datos del usuario (no el token de sesión — Supabase SDK lo maneja en su propio storage)
      partialize: (state) => ({ user: state.user }),
    }
  )
);
