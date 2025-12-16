export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";
import { wssBroadcast } from "@/lib/wsBroadcast";

const MAX_LENGTH = 2000;

export async function PUT(
  req: NextRequest,
  context: { params: { messageId: string } }
) {
  // ================= AUTH =================
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json(
      { error: "Nem vagy bejelentkezve" },
      { status: 401 }
    );
  }

  const { messageId } = context.params;
  if (!messageId) {
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

  let { text } = body;
  if (typeof text !== "string") {
    return NextResponse.json(
      { error: "Hiányzó szöveg" },
      { status: 400 }
    );
  }

  text = text.trim();
  if (!text) {
    return NextResponse.json(
      { error: "Üres üzenet nem menthető" },
      { status: 400 }
    );
  }

  if (text.length > MAX_LENGTH) {
    return NextResponse.json(
      { error: `Max ${MAX_LENGTH} karakter engedélyezett` },
      { status: 400 }
    );
  }

  // ================= FIND MESSAGE =================
  // 1️⃣ próbáljuk DM-ként
  const dm = await prisma.dMMessage.findUnique({
    where: { id: messageId },
    include: { from: true, to: true },
  });

  // 2️⃣ ha nem DM, próbáljuk globálként
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

  // ================= AUTHORIZATION =================
  if (ownerId !== user.id) {
    if (user.role !== "ADMIN" && user.role !== "MODERATOR") {
      return NextResponse.json(
        { error: "Nincs jogosultságod szerkeszteni" },
        { status: 403 }
      );
    }
  }

  // ================= UPDATE =================
  let updated;

  if (isDM) {
    updated = await prisma.dMMessage.update({
      where: { id: messageId },
      data: {
        text,
        editCount: { increment: 1 },
        editedAt: new Date(),
      },
      include: { from: true, to: true },
    });
  } else {
    updated = await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        text,
        edited: true,
      },
      include: { author: true },
    });
  }

  // ================= WS BROADCAST =================
  wssBroadcast({
    type: isDM ? "dm_edit" : "chat_edit",
    message: updated,
  });

  return NextResponse.json({ message: updated });
}
