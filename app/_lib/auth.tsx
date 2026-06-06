"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

export type Cliente = {
  id_cliente: number;
  nombre_completo: string;
  rut: string;
  email: string;
  telefono: string;
};

type AuthState = {
  cliente: Cliente | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (cliente: Cliente) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const API_URL =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

    async function checkAuth() {
      try {
        const res = await fetch(`${API_URL}/auth/perfil`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setCliente(data);
        }
      } catch {
        /* backend no disponible */
      }
      setIsLoading(false);
    }

    checkAuth();
  }, []);

  const login = useCallback((clienteData: Cliente) => {
    setCliente(clienteData);
  }, []);

  const logout = useCallback(async () => {
    const API_URL =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      /* ignorar error de red */
    }

    setCliente(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        cliente,
        isLoading,
        isAuthenticated: !!cliente,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return ctx;
}
