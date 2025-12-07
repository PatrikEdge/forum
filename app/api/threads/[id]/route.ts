import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Params {
  params: { id: string };
}

export async function GET(req: NextRequest, { params }: Params) {
  const thread = await prisma.thread.findUnique({
    where: { id: params.id },
    include: {
      author: { select: { id: true, username: true } },
      category: true,
      posts: {
        include: {
          author: { select: { id: true, username: true, avatarUrl: true, role: true } },
          likes: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!thread) {
    return NextResponse.json({ error: "Téma nem található" }, { status: 404 });
  }

  return NextResponse.json({ thread });
}
