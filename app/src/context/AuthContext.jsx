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
const DEV_RECOVERY_USER = {
  uid: "dev-user",
  email: "developer@local.dev",
  displayName: "Development User",
  role: "admin",
  organisationId: "dev-organisation",
};

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  function login(email, password) {
    if (DEV_AUTH_BYPASS) {
      // Simulate a successful login in dev mode.
      const mockUser = DEV_RECOVERY_USER;
      setUser(mockUser);
      setLoading(false);
      return Promise.resolve({ user: mockUser });
    }
    return signInWithEmailAndPassword(auth, email, password);
  }

  const handleSignOut = async () => {
    try {
      if (!DEV_AUTH_BYPASS && user?.uid) {
        productionLogger.auth.signOut(user.uid);
      }
      if (!DEV_AUTH_BYPASS) {
        await signOut(auth);
      } else {
        setUser(null);
      }
      window.location.href = "/login";
    } catch (e) {
      console.error("Sign out failed", e);
    }
  };

  function logout() {
    return handleSignOut();
  }

  useEffect(() => {
    if (DEV_AUTH_BYPASS) {
      const mockUser = DEV_RECOVERY_USER;
      // eslint-disable-next-line no-console
      console.warn("⚠ DEV AUTH BYPASS ENABLED — NOT FOR PRODUCTION");
      setUser(mockUser);
      setLoading(false);
      return () => {};
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log("Debug:", { authUid: currentUser.uid ? "present" : "absent" });
        }
        setUser(currentUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    handleSignOut,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}