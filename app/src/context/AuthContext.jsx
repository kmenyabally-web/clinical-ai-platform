import { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../firebase";
import { productionLogger } from "../lib/productionLogger";
import { DEV_AUTH_BYPASS } from "../config/devAuth";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  function login(email, password) {
    if (DEV_AUTH_BYPASS) {
      // Simulate a successful login in dev mode.
      const mockUser = {
        uid: "dev-user",
        email: "developer@local.dev",
        displayName: "Development User",
        role: "admin",
        organisationId: "dev-organisation",
      };
      setUser(mockUser);
      setLoading(false);
      return Promise.resolve({ user: mockUser });
    }
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    if (DEV_AUTH_BYPASS) {
      const mockUser = {
        uid: "dev-user",
        email: "developer@local.dev",
        displayName: "Development User",
        role: "admin",
        organisationId: "dev-organisation",
      };
      setUser(mockUser);
      return Promise.resolve();
    }
    if (user?.uid) productionLogger.auth.signOut(user.uid);
    return signOut(auth);
  }

  useEffect(() => {
    if (DEV_AUTH_BYPASS) {
      const mockUser = {
        uid: "dev-user",
        email: "developer@local.dev",
        displayName: "Development User",
        role: "admin",
        organisationId: "dev-organisation",
      };
      // eslint-disable-next-line no-console
      console.warn("⚠ DEV AUTH BYPASS ENABLED — NOT FOR PRODUCTION");
      setUser(mockUser);
      setLoading(false);
      return () => {};
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}