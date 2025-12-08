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
    return NextResponse.json({ error: "Nincs feltöltött fájl" }, { status: 400 });
  }

  const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Csak PNG, JPG vagy WEBP engedélyezett" },
      { status: 400 }
    );
  }

  const allowedExt = [".png", ".jpg", ".jpeg", ".webp"];
  const fileName = file.name.toLowerCase();
  if (!allowedExt.some(ext => fileName.endsWith(ext))) {
    return NextResponse.json(
      { error: "A fájl kiterjesztése nem támogatott" },
      { status: 400 }
    );
  }

  const maxSize = 2 * 1024 * 1024; // 2MB
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: "A fájl mérete nem lehet nagyobb, mint 2MB" },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
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
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Nem sikerült az avatar frissítése." },
      { status: 500 }
    );
  }
}