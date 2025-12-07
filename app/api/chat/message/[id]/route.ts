import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const user = await getUserFromRequest(req);

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const msg = await prisma.chatMessage.findUnique({ where: { id } });

  if (!msg) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  // Csak a saját üzenetet törölheti, kivéve admin/mod
  if (msg.authorId !== user.id && user.role === "USER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.chatMessage.delete({ where: { id } });

  return NextResponse.json({ success: true });
}