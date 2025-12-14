import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ conversations: [] }, { status: 401 });

  const sent = await prisma.dMMessage.findMany({
    where: { fromId: user.id },
    select: { toId: true },
  });

  const received = await prisma.dMMessage.findMany({
    where: { toId: user.id },
    select: { fromId: true },
  });

  const partnerIds = Array.from(
    new Set([...sent.map(m => m.toId), ...received.map(m => m.fromId)])
  ).filter(id => id !== user.id);

  if (partnerIds.length === 0)
    return NextResponse.json({ conversations: [] });

  const partners = await prisma.user.findMany({
    where: { id: { in: partnerIds } },
    select: { id: true, username: true, avatarUrl: true },
  });

  const conversations = await Promise.all(
  partners.map(async (partner) => {
    const lastMessage = await prisma.dMMessage.findFirst({
      where: {
        OR: [
          { fromId: user.id, toId: partner.id },
          { fromId: partner.id, toId: user.id },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    const unreadCount = await prisma.dMMessage.count({
      where: {
        fromId: partner.id,
        toId: user.id,
        readAt: null,
      },
    });

    return {
      partner,
      lastMessage,
      unreadCount,
    };
  })
);

// 🔽 RENDEZÉS: legutóbbi üzenet legyen felül
conversations.sort((a, b) => {
  const aTime = a.lastMessage?.createdAt?.getTime() ?? 0;
  const bTime = b.lastMessage?.createdAt?.getTime() ?? 0;
  return bTime - aTime;
});

return NextResponse.json({ conversations });}
