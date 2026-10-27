import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { checkSupabaseConfig, supabase } from '../lib/supabase';

interface AuthValue {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    // Obtener sesión inicial guardada en SecureStore
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setSession(session);
        setIsLoading(false);
      }
    }).catch(() => {
      if (mounted) setIsLoading(false);
    });

    // Escuchar cambios de autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (mounted) {
        setSession(currentSession);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value: AuthValue = {
    session,
    user: session?.user ?? null,
    isLoading,
    signIn: async (email: string, password: string) => {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        return error ? error.message : null;
      } catch (err: any) {
        return err?.message ?? 'Error inesperado al iniciar sesión';
      }
    },
    signUp: async (email: string, password: string) => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) return error.message;
        if (!data.session) {
          return 'Usuario registrado con éxito. Si la confirmación de correo está activa en Supabase, confirma tu correo antes de ingresar.';
        }
        return null;
      } catch (err: any) {
        return err?.message ?? 'Error inesperado al registrar usuario';
      }
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return ctx;
}

