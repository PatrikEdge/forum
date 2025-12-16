import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";
import { rateLimit } from "@/lib/rateLimit";
import { wssBroadcast } from "@/lib/wsBroadcast";
import { extractMentions } from "@/lib/mentions";

const MAX_MESSAGE_LENGTH = 2000;
const HISTORY_LIMIT = 200;

// ======================= GET =======================
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);

  // 1️⃣ Messages
  const messages = await prisma.chatMessage.findMany({
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
    orderBy: { createdAt: "asc" },
    take: HISTORY_LIMIT,
  });

  if (messages.length === 0) {
    return NextResponse.json({ messages: [] });
  }

  const messageIds = messages.map((m) => m.id);

  // 2️⃣ Aggregált reaction count (DB-ben!)
  const grouped = await prisma.chatReaction.groupBy({
    by: ["messageId", "emoji"],
    where: {
      messageId: { in: messageIds },
    },
    _count: {
      _all: true,
    },
  });

  // 3️⃣ Saját reakciók (mine)
  const mine = user
    ? await prisma.chatReaction.findMany({
        where: {
          messageId: { in: messageIds },
          userId: user.id,
        },
        select: {
          messageId: true,
          emoji: true,
        },
      })
    : [];

  const mineSet = new Set(
    mine.map((r) => `${r.messageId}__${r.emoji}`)
  );

  // 4️⃣ Reaction map messageId szerint
  const reactionsByMessage = new Map<
    string,
    { emoji: string; count: number; mine: boolean }[]
  >();

  for (const r of grouped) {
    const arr =
      reactionsByMessage.get(r.messageId) ?? [];

    arr.push({
      emoji: r.emoji,
      count: r._count._all,
      mine: mineSet.has(`${r.messageId}__${r.emoji}`),
    });

    reactionsByMessage.set(r.messageId, arr);
  }

  // 5️⃣ Final shape
  const mappedMessages = messages.map((m) => ({
    ...m,
    reactions: reactionsByMessage.get(m.id) ?? [],
  }));

  return NextResponse.json({ messages: mappedMessages });
}

// ======================= POST =======================
export async function POST(req: NextRequest) {
  // ---------------- AUTH ----------------
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json(
      { error: "Nem vagy bejelentkezve" },
      { status: 401 }
    );
  }

  // ---------------- RATE LIMIT ----------------
  const allowed = rateLimit(`chat_${user.id}`, {
    windowMs: 10_000,
    max: 5,
  });

  if (!allowed) {
    return NextResponse.json(
      { error: "Túl gyors üzenetküldés" },
      { status: 429 }
    );
  }

  // ---------------- BODY ----------------
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Érvénytelen kérés" },
      { status: 400 }
    );
  }

  let { text, tempId } = body;

  if (typeof text !== "string") {
    return NextResponse.json(
      { error: "Hiányzó vagy hibás üzenet" },
      { status: 400 }
    );
  }

  text = text.trim();

  if (!text) {
    return NextResponse.json(
      { error: "Üres üzenet nem küldhető" },
      { status: 400 }
    );
  }

  if (text.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Az üzenet max ${MAX_MESSAGE_LENGTH} karakter lehet` },
      { status: 400 }
    );
  }

  // ---------------- CREATE MESSAGE ----------------
  const msg = await prisma.chatMessage.create({
    data: {
      text,
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

// ---------------- MENTIONS ----------------
const mentions = extractMentions(text);

if (mentions.length > 0) {
  const mentionedUsers = await prisma.user.findMany({
    where: {
      username: { in: mentions },
      NOT: { id: user.id }, // ne értesítse saját magát
    },
    select: { id: true, username: true },
  });

  if (mentionedUsers.length > 0) {
    // 🧠 DB notification
    await prisma.notification.createMany({
      data: mentionedUsers.map((u) => ({
        userId: u.id,
        type: "MENTION",
        title: "Megemlítés a chatben",
        message: `@${user.username} megemlített a globális chatben`,
      })),
    });

    // 🔔 REALTIME WS PUSH (MENTION)
    mentionedUsers.forEach((u) => {
      wssBroadcast({
        type: "notification",
        userId: u.id,
        notification: {
          type: "MENTION",
          title: "Megemlítés a chatben",
          message: `@${user.username} megemlített a globális chatben`,
          createdAt: new Date().toISOString(),
          isRead: false,
        },
      });
    });
  }
}

  // ---------------- CLIENT TEMP ID SUPPORT ----------------
const responseMessage = tempId
  ? { ...msg, tempId }
  : msg;

// 🔥 REALTIME BROADCAST
wssBroadcast({
  type: "global_message",
  message: responseMessage,
});

return NextResponse.json({ message: responseMessage });
}

