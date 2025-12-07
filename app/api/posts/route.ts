import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";

export async function GET(req: NextRequest) {
  const threadId = req.nextUrl.searchParams.get("threadId");
  if (!threadId) {
    return NextResponse.json({ error: "threadId szükséges" }, { status: 400 });
  }

  const posts = await prisma.post.findMany({
    where: { threadId },
    include: {
      author: { select: { id: true, username: true, avatarUrl: true, role: true } },
      likes: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ posts });
}

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
