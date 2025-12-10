import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Nem vagy bejelentkezve" }, { status: 401 });
  }

  const { threadId, text } = await req.json();
  if (!threadId || !text?.trim()) {
    return NextResponse.json({ error: "Hiányzó mezők" }, { status: 400 });
  }

  const post = await prisma.post.create({
    data: {
      text,
      threadId,
      authorId: user.id,
    },
  });

  return NextResponse.json({ post });
}