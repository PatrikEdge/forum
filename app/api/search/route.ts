import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({
      users: [],
      threads: [],
    });
  }

  const [users, threads] = await Promise.all([
    prisma.user.findMany({
      where: {
        username: {
          contains: q,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        role: true,
      },
      take: 5,
    }),

    prisma.thread.findMany({
      where: {
        OR: [
          {
            title: {
              contains: q,
              mode: "insensitive",
            },
          },
          {
            excerpt: {
              contains: q,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        excerpt: true,
        category: {
          select: { name: true },
        },
      },
      take: 5,
      orderBy: {
        lastActive: "desc",
      },
    }),
  ]);

  return NextResponse.json({ users, threads });
}
