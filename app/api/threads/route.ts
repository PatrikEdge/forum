export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";
import { parseJsonBody } from "@/lib/validation/request";
import { createThreadSchema } from "@/lib/validation/schemas";
import { rateLimit } from "@/lib/rateLimit";

/* -------------------------------------------------------------------------- */
/*                                   GET                                      */
/* -------------------------------------------------------------------------- */
export async function GET(req: NextRequest) {
  const categoryId = req.nextUrl.searchParams.get("categoryId") ?? undefined;
  const page = Number(req.nextUrl.searchParams.get("page") ?? 1);

  const take = 20;
  const skip = (page - 1) * take;

  const threads = await prisma.thread.findMany({
    where: categoryId ? { categoryId } : {},
    take,
    skip,
    include: {
      author: {
        select: {
          id: true,
          username: true,
        },
      },
      category: true,
      _count: {
        select: {
          posts: true,
        },
      },
    },
    orderBy: [
      { isPinned: "desc" },
      { lastActive: "desc" },
    ],
  });

  return NextResponse.json({ threads, page });
}

/* -------------------------------------------------------------------------- */
/*                                   POST                                     */
/* -------------------------------------------------------------------------- */
export async function POST(req: NextRequest) {
  try {
    /* ------------------------------ AUTH ---------------------------------- */
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: "Nem vagy bejelentkezve" },
        { status: 401 }
      );
    }

    /* --------------------------- RATE LIMIT ------------------------------- */
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (
      !rateLimit(`create_thread_${ip}`, {
        windowMs: 60_000,
        max: 5,
      })
    ) {
      return NextResponse.json(
        { error: "Túl sok kérés" },
        { status: 429 }
      );
    }

    /* ----------------------------- VALIDATION ----------------------------- */
    const body = await parseJsonBody(req, createThreadSchema);
    if (!body) {
      return NextResponse.json(
        { error: "Érvénytelen adatok" },
        { status: 400 }
      );
    }

    const { title, excerpt, categoryId } = body;

    /* --------------------------- SANITIZATION ------------------------------ */
    const cleanTitle = title.trim();
    const cleanExcerpt = excerpt.trim();

    /* ------------------------------ CREATE -------------------------------- */
    const thread = await prisma.thread.create({
      data: {
        title: cleanTitle,
        excerpt: cleanExcerpt,
        categoryId,
        authorId: user.id,
        isPinned: false,
        isLocked: false,
        lastActive: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
          },
        },
        category: true,
        _count: {
          select: {
            posts: true,
          },
        },
      },
    });

    return NextResponse.json({ thread });
  } catch (err) {
    console.error("CREATE THREAD ERROR:", err);
    return NextResponse.json(
      { error: "Szerver hiba" },
      { status: 500 }
    );
  }
}