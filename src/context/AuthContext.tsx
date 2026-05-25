"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  login: (userId: string, passkey: string) => Promise<boolean>;
  logout: () => void;
  changePasskey: (oldPass: string, newPass: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  login: async () => false,
  logout: () => {},
  changePasskey: async () => false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const authSession = sessionStorage.getItem("tensor_auth_active");
    if (authSession === "true") {
      setIsAuthenticated(true);
    }
    setIsLoaded(true);
  }, []);

  const login = async (userId: string, passkey: string) => {
    try {
      const res = await fetch('/api/auth/passkey');
      const data = await res.json();
      const currentPasskey = data.passkey;
      
      if (userId === "sattu_dealer" && passkey === currentPasskey) {
        setIsAuthenticated(true);
        sessionStorage.setItem("tensor_auth_active", "true");
        return true;
      }
    } catch (e) {
      console.error("Login fetch error", e);
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("tensor_auth_active");
  };

  const changePasskey = async (oldPass: string, newPass: string) => {
    try {
      const res = await fetch('/api/auth/passkey');
      const data = await res.json();
      const currentPasskey = data.passkey;
      
      if (oldPass === currentPasskey) {
        await fetch('/api/auth/passkey', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPasskey: newPass })
        });
        return true;
      }
    } catch (e) {
      console.error("Change passkey error", e);
    }
    return false;
  };

  if (!isLoaded) return null;

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, changePasskey }}>
      {children}
    </AuthContext.Provider>
  );
};
