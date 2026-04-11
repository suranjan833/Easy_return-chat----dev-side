import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const location = useLocation();
  const auth = JSON.parse(localStorage.getItem("auth"));
  const roleId = auth?.user?.role_id;

  // ❌ Not logged in
  if (!auth) {
    return <Navigate to="/auth-login" replace />;
  }

  // ❌ Logged in but role not allowed
  if (allowedRoles.length && !allowedRoles.includes(roleId)) {
    return <Navigate to="/analytics" replace />;
  }

  return children;
};

export default ProtectedRoute;
