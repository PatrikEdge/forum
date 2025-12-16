export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({
      notifications: 0,
      messages: 0,
    });
  }

  try {
    // 🔔 Olvasatlan értesítések száma
    const unreadNotifications = await prisma.notification.count({
      where: {
        userId: user.id,
        isRead: false,
      },
    });

    // 💬 Olvasatlan DM beszélgetések száma
    const unreadDMs = await prisma.dMMessage.findMany({
      where: {
        toId: user.id,
        readAt: null,
      },
      distinct: ["fromId"],
      select: {
        fromId: true,
      },
    });

    return NextResponse.json({
      notifications: unreadNotifications,
      messages: unreadDMs.length,
    });
  } catch (err) {
    console.error("Unread counts error:", err);
    return NextResponse.json(
      { error: "Failed to load unread counts" },
      { status: 500 }
    );
  }
}
