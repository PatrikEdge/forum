import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";
import { NextRequest, NextResponse } from "next/server";
import { wssBroadcast } from "@/lib/wsBroadcast";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const { messageId } = await params;

  if (!messageId) {
    return NextResponse.json(
      { error: "Missing messageId param" },
      { status: 400 }
    );
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const msg = await prisma.dMMessage.findUnique({
    where: { id: messageId },
  });

  if (!msg || msg.fromId !== user.id) {
    return NextResponse.json({ error: "Nincs jogosultság" }, { status: 403 });
  }

  if (msg.revoked) {
    return NextResponse.json({ error: "Már visszavonva" }, { status: 400 });
  }

  await prisma.dMMessage.update({
    where: { id: msg.id },
    data: {
      revoked: true,
      text: "Az üzenet visszavonva",
      editedAt: new Date(),
    },
  });

  if (msg.conversationId) {
    await prisma.dMConversation.update({
      where: { id: msg.conversationId },
      data: { lastMessageAt: new Date() },
    });
  }

  wssBroadcast({
    type: "dm_revoke",
    messageId: msg.id,
  });

  return NextResponse.json({ ok: true });
}
