import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";
import { NextRequest, NextResponse } from "next/server";
import { wssBroadcast } from "@/lib/wsBroadcast";

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId, text } = await req.json();
  if (!conversationId || !text?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const conversation = await prisma.dMConversation.findUnique({
    where: { id: conversationId },
  });

  if (
    !conversation ||
    (conversation.user1Id !== user.id &&
      conversation.user2Id !== user.id)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const toId =
    conversation.user1Id === user.id
      ? conversation.user2Id
      : conversation.user1Id;

  const message = await prisma.dMMessage.create({
    data: {
      conversationId,
      fromId: user.id,
      toId,
      text: text.trim(),
    },
    include: {
      from: true,
      to: true,
    },
  });

  await prisma.dMConversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  wssBroadcast({
    type: "dm_message",
    message,
  });

  return NextResponse.json({ message });
}
