import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";

export async function GET(req: NextRequest) {
  const current = await getUserFromRequest(req);
  if (!current) return NextResponse.json({ users: [] });

  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 1) return NextResponse.json({ users: [] });

  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: current.id } },
        {
          username: {
            contains: q,
            mode: "insensitive",
          },
        },
      ],
    },
    select: { id: true, username: true, avatarUrl: true },
    take: 10,
  });

  return NextResponse.json({ users });
}
