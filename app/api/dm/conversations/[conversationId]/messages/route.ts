import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ conversationId: string }> }
) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ messages: [] }, { status: 401 });
    }

    const { conversationId } = await context.params;

    if (!conversationId) {
      return NextResponse.json({ messages: [] }, { status: 200 });
    }

    const conversation = await prisma.dMConversation.findUnique({
      where: { id: conversationId },
    });

    if (
      !conversation ||
      (conversation.user1Id !== user.id && conversation.user2Id !== user.id)
    ) {
      return NextResponse.json({ messages: [] }, { status: 200 });
    }

    const messages = await prisma.dMMessage.findMany({
  where: { conversationId },
  include: {
    from: { select: { id: true, username: true, avatarUrl: true } },
    to: { select: { id: true, username: true, avatarUrl: true } },
    reactions: {
      select: {
        emoji: true,
        userId: true,
        user: { select: { username: true } },
      },
    },
  },
  orderBy: { createdAt: "asc" },
});

    return NextResponse.json({ messages }, { status: 200 });
  } catch (err) {
    console.error("❌ DM messages route error:", err);
    return NextResponse.json({ messages: [] }, { status: 200 });
  }
}