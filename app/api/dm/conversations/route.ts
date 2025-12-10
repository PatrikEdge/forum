import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ conversations: [] }, { status: 401 });
  }

  // 🔍 Találjuk meg az összes partner ID-t
  const sent = await prisma.dMMessage.findMany({
    where: { fromId: user.id },
    select: { toId: true },
  });

  const received = await prisma.dMMessage.findMany({
    where: { toId: user.id },
    select: { fromId: true },
  });

  const partnerIds = Array.from(
    new Set([
      ...sent.map((m) => m.toId),
      ...received.map((m) => m.fromId),
    ])
  ).filter((id) => id !== user.id);

  // 🧠 Ha nincs még beszélgetés: üres lista
  if (partnerIds.length === 0) {
    return NextResponse.json({ conversations: [] });
  }

  // 👤 Töltsük le a partnerek adatait
  const partners = await prisma.user.findMany({
    where: { id: { in: partnerIds } },
    select: { id: true, username: true, avatarUrl: true },
  });

  // 📩 Unread count per partner
  const conversations = await Promise.all(
    partners.map(async (partner) => {
      const unreadCount = await prisma.dMMessage.count({
        where: { fromId: partner.id, toId: user.id, read: false },
      });

      return {
        user1Id: user.id,
        user2Id: partner.id,
        user1: { id: user.id, username: user.username, avatarUrl: user.avatarUrl },
        user2: partner,
        unreadCount,
      };
    })
  );

  return NextResponse.json({ conversations });
}