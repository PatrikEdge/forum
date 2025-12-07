import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params; // ⭐ FONTOS!

  const thread = await prisma.thread.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, username: true, avatarUrl: true, role: true } },
      category: true,
      posts: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, username: true, avatarUrl: true, role: true } },
          likes: true,
        },
      },
    },
  });

  if (!thread) {
    return Response.json({ error: "Thread not found" }, { status: 404 });
  }

  return Response.json({ thread });
}