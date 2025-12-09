import { NextRequest } from "next/server";
import { verifyToken } from "./auth";
import { prisma } from "./prisma";
import type { IncomingMessage } from "http";

export async function getUserFromRequest(req: NextRequest | IncomingMessage) {
  let token: string | undefined;

  // 1) Cookie (Next API)
  if ("cookies" in req && typeof req.cookies.get === "function") {
    token = req.cookies.get("token")?.value;
  }

  // 2) Cookie string (WS upgrade)
  if (!token && "headers" in req && typeof req.headers?.cookie === "string") {
    const raw = req.headers.cookie
      .split(";")
      .map(v => v.trim())
      .find(v => v.startsWith("token="));
    if (raw) token = raw.split("=")[1];
  }

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload?.id) return null;

  return prisma.user.findUnique({ where: { id: payload.id } });
}