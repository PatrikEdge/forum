import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getSessionUserFromRequest } from "@/lib/getSessionUserFromRequest";

export function requireRole(req: NextRequest, roles: Role[]) {
  const user = getSessionUserFromRequest(req);

  if (!user) {
    return {
      error: NextResponse.json({ error: "Nem vagy bejelentkezve" }, { status: 401 }),
    };
  }

  if (!roles.includes(user.role)) {
    return {
      error: NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 }),
    };
  }

  return { user };
}
