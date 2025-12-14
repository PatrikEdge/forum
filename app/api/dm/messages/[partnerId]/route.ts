import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { partnerId: string } }
) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ messages: [] }, { status: 401 });

  const { partnerId } = await params;

  const messages = await prisma.dMMessage.findMany({
    where: {
      OR: [
        { fromId: user.id, toId: partnerId },
        { fromId: partnerId, toId: user.id }
      ]
    },
    include: {
      from: true,
      to: true
    },
    orderBy: { createdAt: "asc" }
  });

  return NextResponse.json({ messages });
}
