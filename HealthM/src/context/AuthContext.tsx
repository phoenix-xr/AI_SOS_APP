import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { api, User as CustomBackendUser } from '../services/api';
import { storage } from '../services/storage';
import { supabase } from '../services/supabase';

export interface AuthUser {
  id: string | number;
  username: string;
  email: string;
  full_name?: string | null;
  is_active?: boolean;
  created_at?: string;
  provider: 'supabase' | 'custom_backend';
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authMode: 'supabase' | 'custom_backend';
  setAuthMode: (mode: 'supabase' | 'custom_backend') => void;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (payload: {
    username: string;
    email: string;
    password: string;
    full_name?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authMode, setAuthMode] = useState<'supabase' | 'custom_backend'>('custom_backend');

  // Restore authenticated session on app launch
  const restoreSession = useCallback(async () => {
    try {
      setIsLoading(true);

      if (authMode === 'supabase') {
        const { data, error } = await supabase.auth.getSession();
        if (data?.session && !error) {
          const sbUser = data.session.user;
          setToken(data.session.access_token);
          setUser({
            id: sbUser.id,
            username:
              sbUser.user_metadata?.username ||
              sbUser.email?.split('@')[0] ||
              'user',
            email: sbUser.email || '',
            full_name: sbUser.user_metadata?.full_name || null,
            is_active: true,
            created_at: sbUser.created_at,
            provider: 'supabase',
          });
          setIsLoading(false);
          return;
        }
      }

      // Check custom backend token fallback
      const savedToken = await storage.getToken();
      if (savedToken) {
        try {
          const currentUser: CustomBackendUser = await api.getMe(savedToken);
          setToken(savedToken);
          setUser({
            ...currentUser,
            provider: 'custom_backend',
          });
        } catch {
          await storage.clearAll();
          setToken(null);
          setUser(null);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [authMode]);

  useEffect(() => {
    restoreSession();

    // Listen to Supabase auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (authMode === 'supabase') {
          if (session) {
            setToken(session.access_token);
            setUser({
              id: session.user.id,
              username:
                session.user.user_metadata?.username ||
                session.user.email?.split('@')[0] ||
                'user',
              email: session.user.email || '',
              full_name: session.user.user_metadata?.full_name || null,
              is_active: true,
              created_at: session.user.created_at,
              provider: 'supabase',
            });
          } else {
            setToken(null);
            setUser(null);
          }
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [authMode, restoreSession]);

  const login = async (usernameOrEmail: string, password: string) => {
    if (authMode === 'supabase') {
      const email = usernameOrEmail.includes('@')
        ? usernameOrEmail.trim()
        : `${usernameOrEmail.trim().toLowerCase()}@healthmitra.com`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.session) {
        setToken(data.session.access_token);
        setUser({
          id: data.session.user.id,
          username:
            data.session.user.user_metadata?.username ||
            data.session.user.email?.split('@')[0] ||
            'user',
          email: data.session.user.email || '',
          full_name: data.session.user.user_metadata?.full_name || null,
          is_active: true,
          created_at: data.session.user.created_at,
          provider: 'supabase',
        });
      }
    } else {
      const response = await api.login(usernameOrEmail, password);
      setToken(response.access_token);
      setUser({
        ...response.user,
        provider: 'custom_backend',
      });
      await storage.saveToken(response.access_token);
      await storage.saveUser(response.user);
    }
  };

  const register = async (payload: {
    username: string;
    email: string;
    password: string;
    full_name?: string;
  }) => {
    if (authMode === 'supabase') {
      const { data, error } = await supabase.auth.signUp({
        email: payload.email.trim(),
        password: payload.password,
        options: {
          data: {
            username: payload.username.trim(),
            full_name: payload.full_name?.trim() || null,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.session) {
        setToken(data.session.access_token);
        setUser({
          id: data.session.user.id,
          username: payload.username.trim(),
          email: payload.email.trim(),
          full_name: payload.full_name?.trim() || null,
          is_active: true,
          created_at: data.session.user.created_at,
          provider: 'supabase',
        });
      } else if (data.user && !data.session) {
        // Confirmation email required
        throw new Error(
          'Account created! Please check your email to confirm your account before logging in.'
        );
      }
    } else {
      const response = await api.register(payload);
      setToken(response.access_token);
      setUser({
        ...response.user,
        provider: 'custom_backend',
      });
      await storage.saveToken(response.access_token);
      await storage.saveUser(response.user);
    }
  };

  const logout = async () => {
    if (authMode === 'supabase') {
      await supabase.auth.signOut();
    }
    await storage.clearAll();
    setToken(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    if (authMode === 'supabase') {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUser(prev =>
          prev
            ? {
                ...prev,
                full_name: data.user.user_metadata?.full_name || prev.full_name,
                username: data.user.user_metadata?.username || prev.username,
              }
            : null
        );
      }
    } else if (token) {
      const freshUser = await api.getMe(token);
      setUser({
        ...freshUser,
        provider: 'custom_backend',
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        authMode,
        setAuthMode,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
