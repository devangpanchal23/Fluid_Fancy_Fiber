import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import NotFound from "./components/NotFound.jsx";
import GlobalErrorBoundary from "./components/GlobalErrorBoundary.jsx";
import PageMetadata from "./components/PageMetadata.jsx";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import "./index.css";

const AdminApp = lazy(() => import("./admin/AdminApp.jsx"));
const PrivacyPage = lazy(() => import("./components/LegalPage.jsx").then((module) => ({ default: module.PrivacyPage })));
const TermsPage = lazy(() => import("./components/LegalPage.jsx").then((module) => ({ default: module.TermsPage })));

function AdminFallback() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#17140f" }}>
      <span
        style={{
          width: 28,
          height: 28,
          border: "2.5px solid rgba(244,240,232,0.25)",
          borderTopColor: "#b9a684",
          borderRadius: "50%",
          animation: "spin 800ms linear infinite"
        }}
      />
      <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <GlobalErrorBoundary>
        <PageMetadata />
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/privacy" element={<Suspense fallback={<div className="ff-section" aria-busy="true">Loading page…</div>}><PrivacyPage /></Suspense>} />
          <Route path="/terms" element={<Suspense fallback={<div className="ff-section" aria-busy="true">Loading page…</div>}><TermsPage /></Suspense>} />
          <Route
            path="/admin/*"
            element={
              <Suspense fallback={<AdminFallback />}>
                <AdminApp />
              </Suspense>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </GlobalErrorBoundary>
      <Analytics />
      <SpeedInsights />
    </BrowserRouter>
  </React.StrictMode>
);
