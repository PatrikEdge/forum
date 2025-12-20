export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";
import { wssBroadcast } from "@/lib/wsBroadcast";

const MAX_LENGTH = 2000;

export async function PUT(req: NextRequest) {
  // ================= AUTH =================
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json(
      { error: "Nem vagy bejelentkezve" },
      { status: 401 }
    );
  }

  // ✅ FIX: messageId kinyerése URL-ből
  const url = new URL(req.url);
  const parts = url.pathname.split("/");
  const messageId = parts[parts.length - 1];

  if (!messageId || messageId === "message") {
    return NextResponse.json(
      { error: "Hiányzó üzenet ID" },
      { status: 400 }
    );
  }

  // ================= BODY =================
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Érvénytelen kérés" },
      { status: 400 }
    );
  }

  const { text } = body;
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json(
      { error: "Hiányzó vagy üres szöveg" },
      { status: 400 }
    );
  }

  const trimmed = text.trim();
  if (trimmed.length > 2000) {
    return NextResponse.json(
      { error: "Max 2000 karakter engedélyezett" },
      { status: 400 }
    );
  }

  // ================= FIND MESSAGE =================
  const dm = await prisma.dMMessage.findUnique({
    where: { id: messageId },
    include: { from: true, to: true },
  });

  const global = !dm
    ? await prisma.chatMessage.findUnique({
        where: { id: messageId },
        include: { author: true },
      })
    : null;

  if (!dm && !global) {
    return NextResponse.json(
      { error: "Üzenet nem található" },
      { status: 404 }
    );
  }

  const isDM = Boolean(dm);
  const ownerId = isDM ? dm!.fromId : global!.authorId;

  // ================= AUTH =================
  if (ownerId !== user.id) {
    if (user.role !== "ADMIN" && user.role !== "MODERATOR") {
      return NextResponse.json(
        { error: "Nincs jogosultságod szerkeszteni" },
        { status: 403 }
      );
    }
  }

  // ================= UPDATE =================
  const updated = isDM
    ? await prisma.dMMessage.update({
        where: { id: messageId },
        data: {
          text: trimmed,
          editCount: { increment: 1 },
          editedAt: new Date(),
        },
        include: { from: true, to: true },
      })
    : await prisma.chatMessage.update({
        where: { id: messageId },
        data: {
          text: trimmed,
          edited: true,
        },
        include: { author: true },
      });

  // ================= WS =================
  wssBroadcast({
    type: isDM ? "dm_edit" : "chat_edit",
    message: updated,
  });

  return NextResponse.json({ message: updated });
}