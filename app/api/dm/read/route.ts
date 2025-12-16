import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";
import { NextRequest, NextResponse } from "next/server";
import { wssBroadcast } from "@/lib/wsBroadcast";

export async function POST(req: NextRequest) {
  // ---------------- AUTH ----------------
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ---------------- INPUT ----------------
  const { partnerId } = await req.json();
  if (!partnerId || typeof partnerId !== "string") {
    return NextResponse.json(
      { error: "Missing partnerId" },
      { status: 400 }
    );
  }

  // ---------------- MARK AS READ ----------------
  const result = await prisma.dMMessage.updateMany({
    where: {
      fromId: partnerId,
      toId: user.id,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  // ---------------- UPDATE CONVERSATION ACTIVITY ----------------
  if (result.count > 0) {
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

    // ---------------- WS NOTIFY SENDER ----------------
    wssBroadcast({
      type: "dm_read",
      partnerId,
      readerId: user.id,
    });
  }

  return NextResponse.json({ ok: true });
}
