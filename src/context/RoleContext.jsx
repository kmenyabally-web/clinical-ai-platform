import React, { createContext, useContext, useEffect, useState } from "react";
import { getAuth } from "firebase/auth";

const RoleContext = createContext();

export const RoleProvider = ({ children, profile }) => {
  const [role, setRole] = useState("STAFF");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const resolveRole = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;

        let token = null;

        if (user) {
          try {
            token = await user.getIdTokenResult();
          } catch {
            if (import.meta.env.DEV) {
              console.warn("Debug: token read failed");
            }
          }
        }

        const rawRole =
          profile?.role ||
          profile?.systemRole ||
          token?.claims?.role ||
          token?.claims?.claimRole ||
          "STAFF";

        const resolvedRole = String(rawRole).toUpperCase();

        if (import.meta.env.DEV) {
          console.log("Debug:", { role: resolvedRole });
        }

        setRole(resolvedRole);
      } catch (error) {
        console.error("Role resolution error:", error);
        setRole("STAFF");
      } finally {
        setLoading(false);
      }
    };

    resolveRole();
  }, [profile]);

  return (
    <RoleContext.Provider value={{ role, loading }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => useContext(RoleContext);
