import { NextRequest } from "next/server";
import { verifyToken } from "./auth";
import { prisma } from "./prisma";

export async function getUserFromRequest(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || !payload.id) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  return user;
}
