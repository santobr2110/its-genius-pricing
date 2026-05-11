import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { PermissionKey } from "@/lib/permissions";

interface Props {
  permission: PermissionKey;
  children: ReactNode;
  fallback?: ReactNode;
}

export default function Can({ permission, children, fallback = null }: Props) {
  const { can } = useAuth();
  return can(permission) ? <>{children}</> : <>{fallback}</>;
}
