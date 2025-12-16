import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";
import { rateLimit } from "@/lib/rateLimit";
import { parseJsonBody } from "@/lib/validation/request";
import { createPostSchema } from "@/lib/validation/schemas";

export async function POST(req: NextRequest) {
  try {
    // ---------------- AUTH ----------------
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: "Nem vagy bejelentkezve" },
        { status: 401 }
      );
    }

    // ---------------- RATE LIMIT ----------------
    const ip =
      req.headers
        .get("x-forwarded-for")
        ?.split(",")[0]
        ?.trim() || "unknown";

    if (
      !rateLimit(`post_${user.id}_${ip}`, {
        windowMs: 60_000,
        max: 15,
      })
    ) {
      return NextResponse.json(
        { error: "Túl sok hozzászólás rövid idő alatt" },
        { status: 429 }
      );
    }

    // ---------------- VALIDATION ----------------
    const body = await parseJsonBody(req, createPostSchema);
    if (!body) {
      return NextResponse.json(
        { error: "Érvénytelen adatok" },
        { status: 400 }
      );
    }

    const { threadId, text } = body;

    // ---------------- THREAD CHECK ----------------
    const thread = await prisma.thread.findUnique({
      where: { id: threadId },
      select: { id: true, isLocked: true },
    });

    if (!thread) {
      return NextResponse.json(
        { error: "A thread nem található" },
        { status: 404 }
      );
    }

    if (thread.isLocked) {
      return NextResponse.json(
        { error: "Ez a thread le van zárva" },
        { status: 403 }
      );
    }

    // ---------------- TRANSACTION ----------------
    const post = await prisma.$transaction(async (tx) => {
      const createdPost = await tx.post.create({
        data: {
          text,
          threadId,
          authorId: user.id,
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              role: true,
            },
          },
        },
      });

      await tx.thread.update({
        where: { id: threadId },
        data: { lastActive: new Date() },
      });

      return createdPost;
    });

    return NextResponse.json({ post });
  } catch (err) {
    console.error("CREATE POST ERROR:", err);
    return NextResponse.json(
      { error: "Szerver hiba" },
      { status: 500 }
    );
  }
}