import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { PermissionKey } from "@/lib/permissions";
import { Loader2 } from "lucide-react";

interface Props {
  children: ReactNode;
  permission?: PermissionKey;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, permission, requireAdmin }: Props) {
  const { user, loading, can, isAdmin, role } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!role) {
    return <Navigate to="/sem-acesso" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/sem-acesso" replace />;
  }

  if (permission && !can(permission)) {
    return <Navigate to="/sem-acesso" replace />;
  }

  return <>{children}</>;
}