import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ conversations: [] });

  const messages = await prisma.dMMessage.findMany({
    where: { OR: [{ fromId: user.id }, { toId: user.id }] },
    orderBy: { createdAt: "desc" },
  });

  const users = new Map<string, {
    userId: string;
    username: string;
    avatarUrl: string | null;
    lastMessage: string;
  }>();

  for (const msg of messages) {
    const otherUserId = msg.fromId === user.id ? msg.toId : msg.fromId;

    if (!users.has(otherUserId)) {
      const other = await prisma.user.findUnique({
        where: { id: otherUserId },
        select: { id: true, username: true, avatarUrl: true },
      });

      if (other) {
        users.set(otherUserId, {
          userId: other.id,
          username: other.username,
          avatarUrl: other.avatarUrl,
          lastMessage: msg.text,
        });
      }
    }
  }

  return NextResponse.json({ conversations: Array.from(users.values()) });
}
