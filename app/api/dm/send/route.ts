import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Nem vagy bejelentkezve" }, { status: 401 });

  const { toId, text } = await req.json();
  if (!toId || !text) {
    return NextResponse.json({ error: "Hiányzó mezők" }, { status: 400 });
  }

  const msg = await prisma.dmMessage.create({
    data: {
      fromId: user.id,
      toId,
      text,
    },
  });

  await prisma.notification.create({
    data: {
      type: "dm",
      title: "Új privát üzenet",
      message: `${user.username} üzenetet küldött neked.`,
      userId: toId,
    },
  });

  return NextResponse.json({ message: msg });
}
