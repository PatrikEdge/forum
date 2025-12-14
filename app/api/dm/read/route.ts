import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";
import { NextRequest, NextResponse } from "next/server";
import { wssBroadcast } from "@/lib/wsServer";

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { partnerId } = await req.json();
  const result = await prisma.dMMessage.updateMany({
  where: {
    fromId: partnerId,
    toId: user.id,
    readAt: null,
  },
  data: {
    readAt: new Date(),
  },
});


  if (result.count > 0) {
    wssBroadcast({ type: "dm_read", partnerId: user.id, readerId: partnerId });
  }

  return NextResponse.json({ ok: true });
}
