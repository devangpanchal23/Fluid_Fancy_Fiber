import { Component } from "react";

export default class GlobalErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error("Application rendering failed", error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="ff-section" style={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
          <div className="ff-container" style={{ maxWidth: 680, textAlign: "center" }}>
            <div className="ff-kicker">Fluid Fancy Fibre</div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(42px, 7vw, 72px)" }}>We hit a snag</h1>
            <p className="ff-modal-lede">Please reload the page and try again.</p>
            <button className="ff-btn ff-btn-primary" onClick={() => window.location.reload()}>Reload page</button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
