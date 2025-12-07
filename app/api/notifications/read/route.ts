import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Nem vagy bejelentkezve" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id szükséges" }, { status: 400 });

  await prisma.notification.updateMany({
    where: { id, userId: user.id },
    data: { isRead: true },
  });

  return NextResponse.json({ success: true });
}