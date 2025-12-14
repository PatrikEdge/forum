import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";
import { NextRequest, NextResponse } from "next/server";
import { wssBroadcast } from "@/lib/wsServer";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ messageId: string }> }
) {
  // ✅ PARAMS HELYES KIBONTÁSA
  const { messageId } = await context.params;

  if (!messageId) {
    return NextResponse.json(
      { error: "Missing messageId" },
      { status: 400 }
    );
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { text } = await req.json();
  if (!text?.trim()) {
    return NextResponse.json({ error: "Üres üzenet" }, { status: 400 });
  }

  const msg = await prisma.dMMessage.findUnique({
    where: { id: messageId },
  });

  if (!msg || msg.fromId !== user.id) {
    return NextResponse.json({ error: "Nincs jogosultság" }, { status: 403 });
  }

  if (msg.revoked) {
    return NextResponse.json({ error: "Visszavont üzenet" }, { status: 400 });
  }

  if (msg.editCount >= 3) {
    return NextResponse.json(
      { error: "Szerkesztési limit elérve" },
      { status: 400 }
    );
  }

  const updated = await prisma.dMMessage.update({
    where: { id: messageId },
    data: {
      text: text.trim(),
      editCount: { increment: 1 },
      editedAt: new Date(),
    },
    include: {
      from: true,
      to: true,
    },
  });

  // 🔥 WS broadcast
  wssBroadcast({
    type: "dm_edit",
    message: updated,
  });

  return NextResponse.json({ message: updated });
}
