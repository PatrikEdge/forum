import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ conversations: [] });

  const messages = await prisma.dmMessage.findMany({
    where: { OR: [{ fromId: user.id }, { toId: user.id }] },
    orderBy: { createdAt: "desc" },
  });

  const map = new Map<string, { userId: string; lastMessage: string; lastAt: Date }>();

  for (const m of messages) {
    const otherId = m.fromId === user.id ? m.toId : m.fromId;
    const existing = map.get(otherId);
    if (!existing || existing.lastAt < m.createdAt) {
      map.set(otherId, {
        userId: otherId,
        lastMessage: m.text,
        lastAt: m.createdAt,
      });
    }
  }

  const userIds = Array.from(map.keys());
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, avatarUrl: true },
  });

  const conversations = userIds.map((id) => {
    const u = users.find((x) => x.id === id)!;
    const info = map.get(id)!;
    return {
      userId: u.id,
      username: u.username,
      avatarUrl: u.avatarUrl,
      lastMessage: info.lastMessage,
      lastAt: info.lastAt,
    };
  });

  return NextResponse.json({ conversations });
}
