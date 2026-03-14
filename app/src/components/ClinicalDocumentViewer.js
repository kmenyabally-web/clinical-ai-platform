// src/components/ClinicalDocumentViewer.js

/** [ENABLEMENT GATE: STAGE 5 - CLINICAL READ ENABLED]
 *
 * ClinicalDocumentViewer – Stage 5 “clean‑room” style viewer.
 *
 * This component:
 * - Displays the title, type, status, last review date, and
 *   full clinical text content of a single care folder document.
 * - Shows a “Confidential” header or watermark.
 * - Clearly labels “Last Reviewed By” to give clinical context.
 * - Includes a "Report Discrepancy" placeholder button so staff
 *   can flag out-of-date or incorrect content.
 *
 * It does NOT provide edit capabilities at this gate.
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { getDocumentContent } from "../services/careFolderService";

export default function ClinicalDocumentViewer({ patientId, docId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [document, setDocument] = useState(null);
  const [error, setError] = useState(null);
  const [reportMessage, setReportMessage] = useState(null);

  useEffect(() => {
    if (!patientId || !docId) {
      setError("Missing patient or document identifier.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setReportMessage(null);

    getDocumentContent(patientId, docId)
      .then((result) => {
        setDocument(result);
      })
      .catch((err) => {
        console.error("[clinical] getDocumentContent failed:", err);
        setError(err?.message ?? "Failed to load clinical document.");
      })
      .finally(() => setLoading(false));
  }, [patientId, docId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#005EB8" />
        <Text style={styles.infoText}>Loading clinical document…</Text>
      </View>
    );
  }

  if (error || !document) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error || "Document not found."}</Text>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.confidentialText}>
          CONFIDENTIAL – CLINICAL CONTENT
        </Text>
      </View>

      <Text style={styles.warningText}>
        You are accessing clinical content. This action is logged for
        safeguarding.
      </Text>

      <ScrollView style={styles.contentArea}>
        <Text style={styles.titleText}>
          {document.title || document.documentType || "Clinical document"}
        </Text>
        <Text style={styles.metaText}>
          Type: {document.documentType || "Unknown"}
        </Text>
        <Text style={styles.metaText}>
          Status: {document.status || "Unknown"}
        </Text>
        <Text style={styles.metaText}>
          Last review date:{" "}
          {document.lastReviewDate
            ? String(document.lastReviewDate)
            : "Not recorded"}
        </Text>
        <Text style={styles.metaText}>
          Last reviewed by: {document.lastReviewedBy || "Unknown"}
        </Text>

        <View style={styles.separator} />

        <Text style={styles.bodyLabel}>Clinical content</Text>
        <Text style={styles.bodyText}>
          {document.content || "No content recorded."}
        </Text>
      </ScrollView>

      {reportMessage && (
        <Text style={styles.reportMessage}>{reportMessage}</Text>
      )}

      <View style={styles.footerRow}>
        <TouchableOpacity
          style={styles.reportButton}
          onPress={() =>
            setReportMessage(
              "Report Discrepancy: This is a placeholder. In future stages, this will allow staff to flag issues to clinical governance."
            )
          }
        >
          <Text style={styles.reportButtonText}>Report Discrepancy</Text>
        </TouchableOpacity>

        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#F9FAFB",
  },
  headerBar: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: "#111827",
    marginBottom: 8,
  },
  confidentialText: {
    color: "#FBBF24",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  warningText: {
    fontSize: 13,
    color: "#92400E",
    backgroundColor: "#FFFBEB",
    borderColor: "#FBBF24",
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
  },
  infoText: {
    marginTop: 8,
    fontSize: 14,
    color: "#4B5563",
  },
  errorText: {
    fontSize: 14,
    color: "#B91C1C",
    marginBottom: 12,
  },
  contentArea: {
    flex: 1,
    marginBottom: 12,
  },
  titleText: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    color: "#111827",
  },
  metaText: {
    fontSize: 12,
    color: "#6B7280",
  },
  separator: {
    marginVertical: 12,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  bodyLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
    color: "#111827",
  },
  bodyText: {
    fontSize: 14,
    color: "#111827",
    lineHeight: 20,
  },
  reportMessage: {
    fontSize: 12,
    color: "#065F46",
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  reportButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F97316",
    borderRadius: 4,
  },
  reportButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
  },
  closeButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
});

