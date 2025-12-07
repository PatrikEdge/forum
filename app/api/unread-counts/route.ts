import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ notifications: 0, messages: 0 });
  }

  // Olvasatlan értesítések
  const unreadNotifications = await prisma.notification.count({
    where: {
      userId: user.id,
      isRead: false,
    },
  });

  // Olvasatlan DM-ek száma
  const conversations = await prisma.dMMessage.findMany({
    where: {
      OR: [
        { fromId: user.id },
        { toId: user.id },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  // Csoportosítás beszélgetésenként
  const conversationMap = new Map<string, any>();
  conversations.forEach((msg) => {
    const otherUserId = msg.fromId === user.id ? msg.toId : msg.fromId;
    
    if (!conversationMap.has(otherUserId)) {
      conversationMap.set(otherUserId, msg);
    }
  });

  // Olvasatlan beszélgetések száma
  let unreadMessages = 0;
  conversationMap.forEach((lastMsg) => {
    if (lastMsg.toId === user.id && !lastMsg.read) {
      unreadMessages++;
    }
  });

  return NextResponse.json({
    notifications: unreadNotifications,
    messages: unreadMessages,
  });
}