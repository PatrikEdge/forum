import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ conversations: [] }, { status: 401 });
  }

  const conversations = await prisma.dMConversation.findMany({
    where: {
      OR: [{ user1Id: user.id }, { user2Id: user.id }],
    },
    include: {
      user1: { select: { id: true, username: true, avatarUrl: true } },
      user2: { select: { id: true, username: true, avatarUrl: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: {
      lastMessageAt: "desc", // NULL-ok a végére mennek
    },
  });

  const result = await Promise.all(
    conversations.map(async (conv) => {
      const partner =
        conv.user1Id === user.id ? conv.user2 : conv.user1;

      const unreadCount = await prisma.dMMessage.count({
        where: {
          conversationId: conv.id,
          toId: user.id,
          readAt: null,
        },
      });

      return {
        id: conv.id,
        partner,
        lastMessage: conv.messages[0] ?? null,
        unreadCount,
      };
    })
  );

  return NextResponse.json({ conversations: result });
}