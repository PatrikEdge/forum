import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserFromRequest } from "@/lib/getSessionUserFromRequest";

export async function GET(req: NextRequest) {
  const session = getSessionUserFromRequest(req);

  if (!session) {
    return NextResponse.json(null, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      username: true,
      email: true,
      avatarUrl: true,
      role: true,
      joinedAt: true,

      _count: {
        select: {
          posts: true,
          threads: true,
        },
      },

      posts: {
        select: {
          likes: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json(null, { status: 404 });
  }

  const likesReceived = user.posts.reduce(
    (sum, post) => sum + post.likes.length,
    0
  );

  return NextResponse.json({
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role: user.role,
    joinedAt: user.joinedAt,

    postsCount: user._count.posts,
    threadsCount: user._count.threads,
    likesReceived,
  });
}
