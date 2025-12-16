export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";

export async function GET(req: NextRequest) {
  const currentUser = await getUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json({ users: [] }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json({ users: [] });
  }

  const users = await prisma.user.findMany({
    where: {
      id: { not: currentUser.id },
      username: {
        contains: q,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
    },
    orderBy: {
      username: "asc",
    },
    take: 10,
  });

  return NextResponse.json({ users });
}