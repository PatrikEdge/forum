import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { Role } from "@prisma/client";

export async function POST(req: NextRequest) {
  const user = await requireRole(req, [Role.MODERATOR, Role.ADMIN]);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { threadId } = await req.json();
  if (typeof threadId !== "string") {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  await prisma.thread.update({
    where: { id: threadId },
    data: { isLocked: true },
  });

  return NextResponse.json({ success: true });
}
