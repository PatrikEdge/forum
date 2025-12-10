import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";
import { wssBroadcast } from "@/lib/wsServer"; // vagy ahonnan exportálod

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json(
      { error: "Nem vagy bejelentkezve" },
      { status: 401 }
    );
  }

  const { toId, text } = await req.json();
  if (!toId || !text?.trim()) {
    return NextResponse.json({ error: "Hiányzó mezők" }, { status: 400 });
  }

  const saved = await prisma.dMMessage.create({
    data: {
      fromId: user.id,
      toId,
      text: text.trim(),
    },
    include: {
      from: true,
      to: true,
    },
  });

  const messagePayload = {
    id: saved.id,
    text: saved.text,
    fromId: saved.fromId,
    toId: saved.toId,
    createdAt: saved.createdAt,
    read: saved.read,
    fromUser: {
      id: saved.from.id,
      username: saved.from.username,
      avatarUrl: saved.from.avatarUrl,
    },
    toUser: {
      id: saved.to.id,
      username: saved.to.username,
      avatarUrl: saved.to.avatarUrl,
    },
  };

  // Értesítés DB-be
  await prisma.notification.create({
    data: {
      type: "dm",
      title: "Új privát üzenet",
      message: `${saved.from.username} üzenetet küldött neked.`,
      userId: toId,
    },
  });

  // Broadcast WS-en (hogy aki online, azonnal lássa)
  wssBroadcast({
    type: "dm_message",
    message: messagePayload,
  });

  return NextResponse.json({ message: messagePayload });
}