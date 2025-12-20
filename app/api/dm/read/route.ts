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
  const { conversationId } = await req.json();

  if (!conversationId || typeof conversationId !== "string") {
    return NextResponse.json(
      { error: "Missing conversationId" },
      { status: 400 }
    );
  }

// ---------------- MARK AS READ ----------------
const now = new Date();

const result = await prisma.dMMessage.updateMany({
  where: {
    conversationId,
    toId: user.id,
    readAt: null,
  },
  data: {
    readAt: now,
  },
});

// ---------------- WS NOTIFY SENDER ----------------
if (result.count > 0) {
  wssBroadcast({
    type: "dm_read",
    conversationId,
    readerId: user.id,
    readAt: now.toISOString(), // 🔥 UGYANAZ AZ IDŐ
  });
}

  return NextResponse.json({ ok: true });
}