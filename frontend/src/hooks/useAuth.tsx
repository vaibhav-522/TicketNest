import { createContext, useContext, useEffect, useState } from 'react';

type User = {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
};

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (response.ok) {
          const result = await response.json();
          setUser(result.user);
        } else if (response.status !== 401) {
          throw new Error(`Could not restore the session (${response.status})`);
        }
      } catch (error) {
        console.error('Authentication initialization failed:', error);
      } finally {
        setLoading(false);
      }
    };

    void initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Login failed');
    }
    setUser(result.user);
  };

  const logout = async () => {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Logout failed');
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: user !== null, loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
