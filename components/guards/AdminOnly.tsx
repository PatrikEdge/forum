"use client";

import { useUser } from "@/app/prodivers/UserProvider";
import { Role } from "@/lib/roles";

export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();

  if (loading) return null;
  if (!user) return null;
  if (user.role !== Role.ADMIN) return null;

  return <>{children}</>;
}