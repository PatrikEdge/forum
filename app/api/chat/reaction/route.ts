import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";
import { wssBroadcast } from "@/lib/wsServer";

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { messageId, emoji } = await req.json();
    if (!messageId || !emoji)
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    // Toggle: ha már likeolta → törli, különben hozzáadja
    const existing = await prisma.chatReaction.findFirst({
      where: { messageId, userId: user.id, emoji },
    });

    if (existing) {
      await prisma.chatReaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.chatReaction.create({
        data: { messageId, userId: user.id, emoji },
      });
    }

    // 🔄 Új aggregált lista vissza a kliensnek
    const reactions = await prisma.chatReaction.groupBy({
      by: ["emoji"],
      _count: { emoji: true },
      where: { messageId },
    });

    // 👥 Kik reagáltak? (tooltiphez)
    const users = await prisma.chatReaction.findMany({
      where: { messageId },
      include: { user: { select: { username: true, id: true } } },
    });

    // Mapping: emoji → user list
    const enriched = reactions.map((r) => ({
      emoji: r.emoji,
      count: r._count.emoji,
      mine: users.some((u) => u.user.id === user.id && u.emoji === r.emoji),
      users: users.filter((u) => u.emoji === r.emoji).map((u) => u.user.username),
    }));

    // 🛰️ WebSocket broadcast minden élő kliensnek
    wssBroadcast({
      type: "chat_reaction",
      messageId,
      reactions: enriched,
    });

    return NextResponse.json({ success: true, reactions: enriched });
  } catch (err) {
    console.error("Reaction error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}