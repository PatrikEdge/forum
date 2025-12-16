import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { username: string } }
) {
  const user = await prisma.user.findUnique({
    where: { username: params.username },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      role: true,
      joinedAt: true,
      lastOnlineAt: true,
      chatMessages: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const lastChatAt = user.chatMessages[0]?.createdAt ?? null;

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      role: user.role,
      joinedAt: user.joinedAt,
      lastOnlineAt: user.lastOnlineAt,
      lastChatAt,
    },
  });
}