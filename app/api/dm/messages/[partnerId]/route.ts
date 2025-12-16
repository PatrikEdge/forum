import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { partnerId: string } }
) {
  // ---------------- AUTH ----------------
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ messages: [] }, { status: 401 });
  }

  const { partnerId } = params;
  if (!partnerId) {
    return NextResponse.json(
      { error: "Missing partnerId" },
      { status: 400 }
    );
  }

  // ---------------- MARK AS READ ----------------
  await prisma.dMMessage.updateMany({
    where: {
      fromId: partnerId,
      toId: user.id,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  // ---------------- FETCH MESSAGES ----------------
  const messages = await prisma.dMMessage.findMany({
    where: {
      OR: [
        { fromId: user.id, toId: partnerId },
        { fromId: partnerId, toId: user.id },
      ],
    },
    include: {
      from: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
        },
      },
      to: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // ---------------- UPDATE CONVERSATION ACTIVITY ----------------
  const conversation = await prisma.dMConversation.findFirst({
    where: {
      OR: [
        { user1Id: user.id, user2Id: partnerId },
        { user1Id: partnerId, user2Id: user.id },
      ],
    },
  });

  if (conversation) {
    await prisma.dMConversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });
  }

  return NextResponse.json({ messages });
}
