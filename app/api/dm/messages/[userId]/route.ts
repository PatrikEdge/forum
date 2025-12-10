import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";
import { wssBroadcast } from "@/lib/wsServer"; // path-ot igazítsd

interface RouteParams {
  params: { userId: string };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ messages: [] }, { status: 401 });
  }

  const otherId = params.userId;
  if (!otherId) {
    return NextResponse.json({ messages: [] }, { status: 400 });
  }

  const messages = await prisma.dMMessage.findMany({
    where: {
      OR: [
        { fromId: user.id, toId: otherId },
        { fromId: otherId, toId: user.id },
      ],
    },
    orderBy: { createdAt: "asc" },
    include: {
      from: true,
      to: true,
    },
  });

  // jelöld olvasottnak azokat, amiket a másik küldött nekem
  await prisma.dMMessage.updateMany({
    where: {
      fromId: otherId,
      toId: user.id,
      read: false,
    },
    data: { read: true },
  });

  // read receipt a partnernek (WhatsApp stílus: két zöld pipa)
  wssBroadcast({
    type: "dm_read",
    readerId: user.id,   // aki MOST olvasta
    partnerId: otherId,  // akinek az üzeneteit olvasta
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      text: m.text,
      fromId: m.fromId,
      toId: m.toId,
      createdAt: m.createdAt,
      read: m.read,
      fromUser: {
        id: m.from.id,
        username: m.from.username,
        avatarUrl: m.from.avatarUrl,
      },
      toUser: {
        id: m.to.id,
        username: m.to.username,
        avatarUrl: m.to.avatarUrl,
      },
    })),
  });
}