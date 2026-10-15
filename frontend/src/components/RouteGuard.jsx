import { Navigate, Outlet } from "react-router-dom";
import { useUser } from "../context/useUser";
import { getRouteAccess } from "../context/authState";

function RouteGuard({ requiredRole }) {
  const { user, isAuthenticated } = useUser();
  const access = getRouteAccess({ user, isAuthenticated, requiredRole });

  if (!access.allowed) {
    return <Navigate to={access.redirectTo} replace />;
  }

  return <Outlet />;
}

export default RouteGuard;
