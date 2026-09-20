import { Route, Routes } from "react-router-dom";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import { ToastProvider } from "./context/ToastContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";
import AdminLogin from "./pages/AdminLogin";
import Dashboard from "./pages/Dashboard";
import ProductList from "./pages/ProductList";
import ProductForm from "./pages/ProductForm";
import MediaLibrary from "./pages/MediaLibrary";
import CategoryManager from "./pages/CategoryManager";
import VariantList from "./pages/VariantList";
import VariantForm from "./pages/VariantForm";
import VideoList from "./pages/VideoList";
import VideoForm from "./pages/VideoForm";
import PersonList from "./pages/PersonList";
import PersonForm from "./pages/PersonForm";
import ConeLibraryList from "./pages/ConeLibraryList";
import ConeLibraryForm from "./pages/ConeLibraryForm";
import EnquiryList from "./pages/EnquiryList";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import "./admin.css";

export default function AdminApp() {
  return (
    <AdminAuthProvider>
      <ToastProvider>
        <Routes>
          <Route index element={<AdminLogin />} />
          <Route
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="products" element={<ProductList />} />
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/:id/edit" element={<ProductForm />} />
            <Route path="products/:productId/variants" element={<VariantList />} />
            <Route path="products/:productId/variants/new" element={<VariantForm />} />
            <Route path="products/:productId/variants/:id/edit" element={<VariantForm />} />
            <Route path="media" element={<MediaLibrary />} />
            <Route path="categories" element={<CategoryManager />} />
            <Route path="videos" element={<VideoList />} />
            <Route path="videos/new" element={<VideoForm />} />
            <Route path="videos/:id/edit" element={<VideoForm />} />
            <Route path="people" element={<PersonList />} />
            <Route path="people/new" element={<PersonForm />} />
            <Route path="people/:id/edit" element={<PersonForm />} />
            <Route path="cone-library" element={<ConeLibraryList />} />
            <Route path="cone-library/new" element={<ConeLibraryForm />} />
            <Route path="cone-library/:id/edit" element={<ConeLibraryForm />} />
            <Route path="enquiries" element={<EnquiryList />} />
            <Route path="settings" element={<Settings />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </ToastProvider>
    </AdminAuthProvider>
  );
}
