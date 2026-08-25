"use client";

import { useCallback, useEffect, useState } from "react";
import { ADMIN_API_KEY_STORAGE } from "./admin-api";

export function useAdminAccess() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setApiKey(sessionStorage.getItem(ADMIN_API_KEY_STORAGE));
      setReady(true);
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  const entrar = useCallback((key: string) => {
    sessionStorage.setItem(ADMIN_API_KEY_STORAGE, key);
    setApiKey(key);
  }, []);

  const salir = useCallback(() => {
    sessionStorage.removeItem(ADMIN_API_KEY_STORAGE);
    setApiKey(null);
  }, []);

  return { apiKey, ready, entrar, salir };
}
