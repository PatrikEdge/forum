import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";

interface Params {
  params: { userId: string };
}

export async function GET(req: NextRequest, { params }: Params) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ messages: [] }, { status: 401 });

  const otherId = params.userId;

  const messages = await prisma.dMMessage.findMany({
    where: {
      OR: [
        { fromId: user.id, toId: otherId },
        { fromId: otherId, toId: user.id },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  // Jelöld olvasottá a bejövő üzeneteket
  await prisma.dMMessage.updateMany({
    where: {
      fromId: otherId,
      toId: user.id,
      read: false,
    },
    data: { read: true },
  });

  return NextResponse.json({ messages });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Nem vagy bejelentkezve" }, { status: 401 });
  }

  const messageId = params.id;

  // Üzenet megkeresése
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    return NextResponse.json({ error: "Üzenet nem található" }, { status: 404 });
  }

  // Jogosultság ellenőrzés
  const canDelete =
    message.authorId === user.id ||
    user.role === "MODERATOR" ||
    user.role === "ADMIN";

  if (!canDelete) {
    return NextResponse.json({ error: "Nincs jogosultságod törölni" }, { status: 403 });
  }

  await prisma.chatMessage.delete({
    where: { id: messageId },
  });

  return NextResponse.json({ success: true });
}