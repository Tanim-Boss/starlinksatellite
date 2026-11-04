import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Rendered instead of the children once something below has thrown. */
  fallback: ReactNode;
  /** Shown in the console next to the error, to make triage obvious. */
  label?: string;
}

interface ErrorBoundaryState {
  failed: boolean;
}

/**
 * Keeps one broken subtree from taking the whole page down.
 *
 * React unmounts the entire tree when a render throws and nothing catches it,
 * which on a site like this one looks exactly like "the page did not load":
 * a blank screen, no content, no error. The 3D scenes are wrapped in this so a
 * missing WebGL context, a shader that will not compile or a driver reset only
 * costs the reader the model — never the article around it.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[starlink-field-guide] ${this.props.label ?? "render error"}`, error, info.componentStack);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
