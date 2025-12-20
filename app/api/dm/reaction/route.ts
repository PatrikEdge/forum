import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";
import { NextRequest, NextResponse } from "next/server";
import { wssBroadcast } from "@/lib/wsBroadcast";

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messageId, emoji } = await req.json();
  if (!messageId || !emoji) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const existing = await prisma.dMReaction.findUnique({
    where: {
      messageId_userId_emoji: {
        messageId,
        userId: user.id,
        emoji,
      },
    },
  });

  if (existing) {
    await prisma.dMReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.dMReaction.create({
      data: {
        messageId,
        userId: user.id,
        emoji,
      },
    });
  }

  const reactions = await prisma.dMReaction.findMany({
  where: { messageId },
  select: {
    emoji: true,
    userId: true,
  },
});

  wssBroadcast({
    type: "dm_reaction",
    messageId,
    reactions,
  });

  return NextResponse.json({ ok: true });
}
