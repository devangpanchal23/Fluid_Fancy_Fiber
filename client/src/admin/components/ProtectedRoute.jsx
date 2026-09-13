import { Navigate } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";

export default function ProtectedRoute({ children }) {
  const { admin, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="ff-admin-splash">
        <span className="ff-admin-spinner" />
      </div>
    );
  }
  if (!admin) return <Navigate to="/admin" replace />;
  return children;
}
