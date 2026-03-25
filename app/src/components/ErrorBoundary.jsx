import { Component } from "react";
import { captureException } from "../lib/errorMonitoring";

/**
 * Catches React render errors and reports them. Wrap the app or key trees.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    captureException(error, { componentStack: errorInfo?.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "2rem", maxWidth: 480, margin: "2rem auto", textAlign: "center" }}>
          <h2 style={{ color: "#c62828" }}>System error. Please refresh.</h2>
          <p style={{ color: "#475569", fontSize: 14 }}>We&apos;ve logged this. You can try again below.</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            style={{ padding: "8px 16px", marginTop: 8, cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
