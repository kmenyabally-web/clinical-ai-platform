import React, { createContext, useContext, useEffect, useState } from "react";
import { getAuth } from "firebase/auth";

const RoleContext = createContext();

export const RoleProvider = ({ children, profile }) => {
  const [role, setRole] = useState("STAFF");
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
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
          token?.claims?.claimRole ||
          token?.claims?.role ||
          "STAFF";

        const resolvedRole = String(rawRole).toUpperCase();
        const resolvedIsGlobalAdmin =
          resolvedRole === "SUPER_ADMIN" || profile?.isGlobalAdmin === true;
        const resolvedIsSuperAdmin = resolvedRole === "SUPER_ADMIN";

        console.log("🔥 ROLE:", resolvedRole, "GLOBAL:", resolvedIsGlobalAdmin);
        console.log("🔥 SUPER ADMIN:", resolvedIsSuperAdmin);

        if (import.meta.env.DEV) {
          console.log("Debug:", { role: resolvedRole });
        }

        setRole(resolvedRole);
        setIsGlobalAdmin(resolvedIsGlobalAdmin);
        setIsSuperAdmin(resolvedIsSuperAdmin);
      } catch (error) {
        console.error("Role resolution error:", error);
        setRole("STAFF");
        setIsGlobalAdmin(false);
        setIsSuperAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    resolveRole();
  }, [profile]);

  return (
    <RoleContext.Provider value={{ role, isGlobalAdmin, isSuperAdmin, loading }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => useContext(RoleContext);
