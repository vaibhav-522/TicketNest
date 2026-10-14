import { createContext, useContext, useEffect, useState } from 'react';

// Create context with default values for SSR safety
const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  loading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// AuthProvider component for wrapping the app
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        if (res.ok) {
          const result = await res.json();
          setUser(result.user);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    if (res.ok) {
      const result = await res.json();
      setUser(result.user);
      setIsAuthenticated(true);
      // Store token in localStorage as fallback
      localStorage.setItem('vanny-user-token', result.token || '');
      localStorage.setItem('vanny-user-name', result.user?.name || '');
    } else {
      throw new Error('Login failed');
    }
  };

  // Logout function
  const logout = async () => {
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });

    if (res.ok) {
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('vanny-user-token');
      localStorage.removeItem('vanny-user-name');
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
