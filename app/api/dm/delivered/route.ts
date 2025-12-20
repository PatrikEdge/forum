import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";
import { NextRequest, NextResponse } from "next/server";
import { wssBroadcast } from "@/lib/wsBroadcast";

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId } = await req.json();
  if (!conversationId || typeof conversationId !== "string") {
    return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
  }

  const now = new Date();

  // ✅ csak azokat jelöljük deliverednek, amik NEKEM jöttek (toId = én),
  // és még nem voltak delivered
  const msgs = await prisma.dMMessage.findMany({
    where: {
      conversationId,
      toId: user.id,
      deliveredAt: null,
    },
    select: { id: true },
  });

  if (msgs.length === 0) {
    return NextResponse.json({ ok: true, updated: 0 });
  }

  await prisma.dMMessage.updateMany({
    where: {
      id: { in: msgs.map(m => m.id) },
    },
    data: { deliveredAt: now },
  });

  // ✅ WS jelzés a másik félnek is (ő fogja mutatni ✔✔-t)
  wssBroadcast({
    type: "dm_delivered",
    conversationId,
    messageIds: msgs.map(m => m.id),
    deliveredAt: now.toISOString(),
  });

  return NextResponse.json({ ok: true, updated: msgs.length });
}
