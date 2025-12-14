export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";
import { wssBroadcast } from "@/lib/wsServer";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ messageId: string }> }
) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json(
      { error: "Nem vagy bejelentkezve" },
      { status: 401 }
    );
  }

  // 🔑 ITT A FONTOS RÉSZ: params await!
  const { messageId } = await context.params;

  if (!messageId) {
    return NextResponse.json(
      { error: "Hiányzó üzenet ID" },
      { status: 400 }
    );
  }

  const { text } = await req.json();
  if (!text?.trim()) {
    return NextResponse.json(
      { error: "Üres üzenet" },
      { status: 400 }
    );
  }

  // 🔎 DM keresés – STRING ID
  let msg = await prisma.dMMessage.findUnique({
    where: { id: messageId },
    include: { from: true, to: true },
  });

  let type: "dm" | "global" = "dm";

  // 🔎 Globális chat keresés – STRING ID
  if (!msg) {
    msg = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: { author: true },
    });
    type = "global";
  }

  if (!msg) {
    return NextResponse.json(
      { error: "Üzenet nem található" },
      { status: 404 }
    );
  }

  // 🔐 Jogosultság
  const myId = user.id;
  const isOwner =
    type === "dm" ? msg.fromId === myId : msg.authorId === myId;

  if (!isOwner) {
    const dbUser = await prisma.user.findUnique({
      where: { id: myId },
      select: { role: true },
    });

    if (dbUser?.role !== "ADMIN" && dbUser?.role !== "MODERATOR") {
      return NextResponse.json(
        { error: "Nincs jogosultságod szerkeszteni" },
        { status: 403 }
      );
    }
  }

  // 🔧 UPDATE – STRING ID
  let updated;
  if (type === "dm") {
    updated = await prisma.dMMessage.update({
      where: { id: messageId },
      data: { text: text.trim() },
      include: { from: true, to: true },
    });
  } else {
    updated = await prisma.chatMessage.update({
      where: { id: messageId },
      data: { text: text.trim(), edited: true },
      include: { author: true },
    });
  }

  // 📢 Broadcast
  wssBroadcast({
    type: type === "dm" ? "dm_edit" : "chat_edit",
    message: updated,
  });

  return NextResponse.json({ message: updated });
}
