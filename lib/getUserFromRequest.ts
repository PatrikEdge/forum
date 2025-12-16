import { prisma } from "@/lib/prisma";
import { getSessionUserFromRequest } from "./getSessionUserFromRequest";
import type { NextRequest } from "next/server";
import type { IncomingMessage } from "http";

export async function getUserFromRequest(
  req: NextRequest | IncomingMessage
) {
  const session = getSessionUserFromRequest(req);
  if (!session) return null;

  return prisma.user.findUnique({
    where: { id: session.id },
  });
}
