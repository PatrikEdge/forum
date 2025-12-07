import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";

export async function GET(req: NextRequest) {
  const categoryId = req.nextUrl.searchParams.get("categoryId") || undefined;
  const threads = await prisma.thread.findMany({
    where: categoryId ? { categoryId } : {},
    include: {
      author: { select: { id: true, username: true } },
      category: true,
    },
    orderBy: [{ isPinned: "desc" }, { lastActive: "desc" }],
  });
  return NextResponse.json({ threads });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Nem vagy bejelentkezve" }, { status: 401 });

  const { title, excerpt, categoryId } = await req.json();
  if (!title || !categoryId) {
    return NextResponse.json({ error: "Hiányzó mezők" }, { status: 400 });
  }

  const thread = await prisma.thread.create({
    data: {
      title,
      excerpt: excerpt || "",
      authorId: user.id,
      categoryId,
    },
  });

  return NextResponse.json({ thread });
}
