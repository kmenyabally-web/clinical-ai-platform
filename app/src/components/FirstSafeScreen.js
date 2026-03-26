// src/components/FirstSafeScreen.js

/** [ENABLEMENT GATE: STAGE 2 - NON-CLINICAL]
 *
 * FirstSafeScreen
 *
 * This component is the primary landing screen for Stage 2.
 * It verifies the user's identity and organisational scope using
 * the useGovernance() hook, without reading or exposing any
 * clinical, person-level, or inspection data.
 *
 * It is intended to be audit-ready and regulator-friendly:
 * - Shows only non-clinical metadata (email, role, organisation name).
 * - Provides clear feedback on loading, success, and governance errors.
 * - Includes a footer stating the current governance gate.
 */

import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useGovernance } from "../hooks/useGovernance";
import { auth } from "../firebase";

export default function FirstSafeScreen() {
  const { isLoading, isAuthenticated, userRole, orgName, error } =
    useGovernance();

  const currentUser = auth.currentUser;
  const userEmail = currentUser?.email || "Unknown email";

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#005EB8" />
        <Text style={styles.loadingText}>Verifying Governance Context...</Text>
        <Text style={styles.footer}>
          System Operating under Stage 2 Governance: Non-Clinical Metadata Read
          Only. No PHI/Clinical Data Accessible.
        </Text>
      </View>
    );
  }

  // Governance error state: authenticated but missing or invalid organisation context
  if (isAuthenticated && error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>
          Governance Violation: Access Restricted. Contact Administrator.
        </Text>
        <Text style={styles.detailText}>
          The system could not confirm a complete governance context for your
          account.
        </Text>
        <Text style={styles.detailText}>Signed-in identity: {userEmail}</Text>
        <Text style={styles.detailText}>
          Reported role: {userRole || "Unknown role"}
        </Text>
        <Text style={styles.footer}>
          System Operating under Stage 2 Governance: Non-Clinical Metadata Read
          Only. No PHI/Clinical Data Accessible.
        </Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>SanctumCare Clinical Readiness Environment</Text>
        <Text style={styles.detailText}>You are not currently signed in.</Text>
        <Text style={styles.footer}>
          System Operating under Stage 2 Governance: Non-Clinical Metadata Read
          Only. No PHI/Clinical Data Accessible.
        </Text>
      </View>
    );
  }

  // Success state: authenticated, governance context verified
  return (
    <View style={styles.container}>
      <Text style={styles.title}>SanctumCare Clinical Readiness Environment</Text>
      <View style={styles.card}>
        <Text style={styles.label}>User Email</Text>
        <Text style={styles.value}>{userEmail}</Text>

        <Text style={styles.label}>Role</Text>
        <Text style={styles.value}>{userRole || "Unknown role"}</Text>

        <Text style={styles.label}>Organisation</Text>
        <Text style={styles.value}>{orgName || "Unknown organisation"}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Governance Verified</Text>
        </View>
      </View>
      <Text style={styles.infoText}>
        This screen confirms your identity and organisational scope only. No
        clinical or inspection data is displayed at this stage.
      </Text>
      <Text style={styles.footer}>
        System Operating under Stage 2 Governance: Non-Clinical Metadata Read
        Only. No PHI/Clinical Data Accessible.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: "center",
    backgroundColor: "#F5F7FA",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 24,
    color: "#003087",
    textAlign: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: "center",
    color: "#003087",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#D8DDE6",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4C6272",
    marginTop: 8,
  },
  value: {
    fontSize: 16,
    color: "#111827",
    marginTop: 2,
  },
  infoText: {
    fontSize: 14,
    color: "#4C6272",
    marginTop: 8,
    textAlign: "center",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#D4351C",
    marginBottom: 12,
    textAlign: "center",
  },
  detailText: {
    fontSize: 14,
    color: "#111827",
    marginTop: 4,
    textAlign: "center",
  },
  footer: {
    fontSize: 12,
    color: "#4C6272",
    marginTop: 24,
    textAlign: "center",
  },
  badge: {
    marginTop: 16,
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#E5F5E0",
    borderWidth: 1,
    borderColor: "#2E7D32",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2E7D32",
  },
});

