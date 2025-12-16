export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json(
      { error: "Missing thread id" },
      { status: 400 }
    );
  }

  const currentUser = await getUserFromRequest(req);

  const thread = await prisma.thread.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          role: true,
        },
      },
      category: true,
      posts: {
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              role: true,
            },
          },
          likes: {
            select: {
              userId: true,
            },
          },
        },
      },
    },
  });

  if (!thread) {
    return NextResponse.json(
      { error: "Thread not found" },
      { status: 404 }
    );
  }

  /* -------------------- NORMALIZE POSTS -------------------- */
  const posts = thread.posts.map((post) => ({
    id: post.id,
    text: post.text,
    createdAt: post.createdAt,
    author: post.author,
    threadId: post.threadId,
    likesCount: post.likes.length,
    userLiked: currentUser
      ? post.likes.some((l) => l.userId === currentUser.id)
      : false,
  }));

  return NextResponse.json({
    thread: {
      id: thread.id,
      title: thread.title,
      excerpt: thread.excerpt,
      createdAt: thread.createdAt,
      lastActive: thread.lastActive,
      isPinned: thread.isPinned,
      isLocked: thread.isLocked,
      author: thread.author,
      category: thread.category,
      posts,
    },
  });
}