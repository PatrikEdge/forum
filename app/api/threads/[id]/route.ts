import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const currentUser = await getUserFromRequest(req);

  const thread = await prisma.thread.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, username: true, avatarUrl: true, role: true } },
      category: true,
      posts: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, username: true, avatarUrl: true, role: true } },
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
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  // 🔥 NORMALIZÁLÁS
  const normalizedPosts = thread.posts.map((post) => ({
    ...post,
    likesCount: post.likes.length,
    userLiked: currentUser
      ? post.likes.some((l) => l.userId === currentUser.id)
      : false,
    likes: undefined, // ne küldjük le nyersen
  }));

  return NextResponse.json({
    thread: {
      ...thread,
      posts: normalizedPosts,
    },
  });
}
