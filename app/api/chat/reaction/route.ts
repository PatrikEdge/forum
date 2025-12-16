import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";
import { wssBroadcast } from "@/lib/wsBroadcast";
import { rateLimit } from "@/lib/rateLimit";

const EMOJI_MAX_LENGTH = 8;
const ALLOWED_EMOJIS = ["❤️", "😆", "👍", "😡", "😢", "😮"];

export async function POST(req: NextRequest) {
  try {
    // ================= AUTH =================
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: "Nem vagy bejelentkezve" },
        { status: 401 }
      );
    }

    // ================= RATE LIMIT =================
    const allowed = rateLimit(`reaction_${user.id}`, {
      windowMs: 5_000,
      max: 20,
    });

    if (!allowed) {
      return NextResponse.json(
        { error: "Túl sok reakció" },
        { status: 429 }
      );
    }

    // ================= BODY =================
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Érvénytelen kérés" },
        { status: 400 }
      );
    }

    const { messageId, emoji } = body;

    if (typeof messageId !== "string" || typeof emoji !== "string") {
      return NextResponse.json(
        { error: "Hiányzó vagy hibás mezők" },
        { status: 400 }
      );
    }

    const cleanEmoji = emoji.trim();

    if (
      !cleanEmoji ||
      cleanEmoji.length > EMOJI_MAX_LENGTH ||
      !ALLOWED_EMOJIS.includes(cleanEmoji)
    ) {
      return NextResponse.json(
        { error: "Nem engedélyezett emoji" },
        { status: 400 }
      );
    }

    // ================= MESSAGE EXISTS =================
const msgExists = await prisma.chatMessage.findUnique({
  where: { id: messageId },
  select: { id: true },
});

if (!msgExists) {
  return NextResponse.json(
    { error: "Üzenet nem található" },
    { status: 404 }
  );
}


    // ================= TOGGLE REACTION =================
    const existing = await prisma.chatReaction.findUnique({
      where: {
        userReactionUnique: {
          messageId,
          userId: user.id,
          emoji: cleanEmoji,
        },
      },
    });

    if (existing) {
      await prisma.chatReaction.delete({
        where: { id: existing.id },
      });
    } else {
      await prisma.chatReaction.create({
        data: {
          messageId,
          userId: user.id,
          emoji: cleanEmoji,
        },
      });
    }

    // ================= REBUILD STATE =================
    const all = await prisma.chatReaction.findMany({
      where: { messageId },
      include: {
        user: { select: { id: true, username: true } },
      },
    });

    const map = new Map<
      string,
      { emoji: string; users: string[]; mine: boolean }
    >();

    for (const r of all) {
      if (!map.has(r.emoji)) {
        map.set(r.emoji, {
          emoji: r.emoji,
          users: [],
          mine: false,
        });
      }

      const entry = map.get(r.emoji)!;
      entry.users.push(r.user.username);

      if (r.userId === user.id) {
        entry.mine = true;
      }
    }

    const reactions = Array.from(map.values()).map((r) => ({
      emoji: r.emoji,
      count: r.users.length,
      mine: r.mine,
      users: r.users,
    }));

    // ================= WS BROADCAST =================
    wssBroadcast({
      type: "chat_reaction",
      messageId,
      reactions,
    });

    return NextResponse.json({ success: true, reactions });
  } catch (err) {
    console.error("CHAT REACTION ERROR:", err);
    return NextResponse.json(
      { error: "Szerver hiba" },
      { status: 500 }
    );
  }
}