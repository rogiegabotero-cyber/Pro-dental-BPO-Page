import { useState } from "react";
import { FaEye } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import "../assets/Style/floatingClientPreview.css";

export default function FloatingClientPreview() {
  const { isAdmin, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [clientPreview, setClientPreview] = useState(false);
  const isAdminRoute = location.pathname.startsWith("/admin");

  if (loading || !isAdmin) return null;

  const openClientPreview = () => {
    // Toggle between admin and visitor views for admins
    if (isAdminRoute) {
      setClientPreview(true);
      navigate("/");
    } else {
      setClientPreview(false);
      navigate("/admin");
    }
  };

  return (
    <button
      className="client-preview-eye"
      type="button"
      onClick={openClientPreview}
      aria-label="View client preview"
      title="View client preview"
    >
      <FaEye aria-hidden="true" />
    </button>
  );
}
