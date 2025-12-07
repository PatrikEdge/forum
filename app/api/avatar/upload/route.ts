import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const authUser = await getUserFromRequest(req);
  if (!authUser) {
    return NextResponse.json({ error: "Nem vagy bejelentkezve" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("avatar") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Avatar fájl szükséges" }, { status: 400 });
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "Max 2MB méret engedélyezett." }, { status: 400 });
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    const updated = await prisma.user.update({
      where: { id: authUser.id },
      data: { avatarUrl: dataUrl },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        role: true,
        joinedAt: true,
      },
    });

    return NextResponse.json({ user: updated });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: "Nem sikerült az avatar frissítése." },
      { status: 500 }
    );
  }
}
