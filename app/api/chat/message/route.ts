import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";

export async function GET() {
  return NextResponse.json({
    messages: await prisma.chatMessage.findMany({
      include: {
        author: {
          select: { id: true, username: true, avatarUrl: true, role: true },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    }),
  });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Nem vagy bejelentkezve" }, { status: 401 });

  const { text, tempId } = await req.json();
  if (!text) return NextResponse.json({ error: "Hiányzó mezők" }, { status: 400 });

  let msg = await prisma.chatMessage.create({
    data: { text, authorId: user.id },
    include: { author: true },
  });

  if (tempId) msg = { ...msg, tempId };
  return NextResponse.json({ message: msg });
}
