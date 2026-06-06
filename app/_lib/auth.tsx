"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

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
  logout: () => Promise<boolean>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

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

  useEffect(() => {
    function handleSessionExpired() {
      setCliente(null);
      router.push("/inicio-sesion?expired=1");
    }

    window.addEventListener("auth:session-expired", handleSessionExpired);
    return () =>
      window.removeEventListener("auth:session-expired", handleSessionExpired);
  }, [router]);

  const login = useCallback((clienteData: Cliente) => {
    setCliente(clienteData);
  }, []);

  const logout = useCallback(async (): Promise<boolean> => {
    const API_URL =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

    try {
      const res = await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        setCliente(null);
        return true;
      }

      return false;
    } catch {
      return false;
    }
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
