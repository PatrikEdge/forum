import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";

export async function GET(req: NextRequest) {
  const sessionUser = await getUserFromRequest(req);

  if (!sessionUser) {
    return NextResponse.json(null, { status: 401 });
  }

  // 🔥 TELJES USER + STATOK
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
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

    // 🔥 STATISZTIKÁK
    postsCount: user._count.posts,
    threadsCount: user._count.threads,
    likesReceived,
  });
}
