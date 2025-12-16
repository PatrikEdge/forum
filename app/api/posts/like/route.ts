import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";
import { rateLimit } from "@/lib/rateLimit";
import { parseJsonBody } from "@/lib/validation/request";
import { likePostSchema } from "@/lib/validation/schemas";

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
      !rateLimit(`like_${user.id}_${ip}`, {
        windowMs: 30_000,
        max: 30,
      })
    ) {
      return NextResponse.json(
        { error: "Túl sok like művelet" },
        { status: 429 }
      );
    }

    // ---------------- VALIDATION ----------------
    const body = await parseJsonBody(req, likePostSchema);
    if (!body) {
      return NextResponse.json(
        { error: "Érvénytelen adatok" },
        { status: 400 }
      );
    }

    const { postId } = body;

    // ---------------- POST EXISTS ----------------
    const postExists = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    if (!postExists) {
      return NextResponse.json(
        { error: "A poszt nem található" },
        { status: 404 }
      );
    }

    // ---------------- TOGGLE LIKE (ATOMIC) ----------------
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.like.findUnique({
        where: {
          userId_postId: {
            userId: user.id,
            postId,
          },
        },
      });

      if (existing) {
        await tx.like.delete({ where: { id: existing.id } });
        return { liked: false };
      }

      await tx.like.create({
        data: {
          userId: user.id,
          postId,
        },
      });

      return { liked: true };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("LIKE ERROR:", err);
    return NextResponse.json(
      { error: "Szerver hiba" },
      { status: 500 }
    );
  }
}