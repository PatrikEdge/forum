import { verifyToken } from "@/lib/auth";
import { Role } from "@prisma/client";
import type { NextRequest } from "next/server";
import type { IncomingMessage } from "http";

export type SessionUser = {
  id: string;
  role: Role;
};

export function getSessionUserFromRequest(
  req: NextRequest | IncomingMessage
): SessionUser | null {
  let token: string | undefined;

  // 1) Cookie (Next API)
  if ("cookies" in req && typeof (req as any).cookies?.get === "function") {
    token = (req as any).cookies.get("token")?.value;
  }

  // 2) Cookie string (WS upgrade)
  if (!token && "headers" in req && typeof (req as any).headers?.cookie === "string") {
    const raw = (req as any).headers.cookie
      .split(";")
      .map((v: string) => v.trim())
      .find((v: string) => v.startsWith("token="));
    if (raw) token = raw.split("=")[1];
  }

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload?.id || !payload?.role) return null;

  return {
    id: payload.id,
    role: payload.role as Role,
  };
}
