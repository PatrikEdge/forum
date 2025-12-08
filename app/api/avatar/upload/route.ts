import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";
import path from "path";
import { promises as fs } from "fs";
import { v4 as uuid } from "uuid";

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

  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: "A fájl mérete nem lehet nagyobb, mint 2MB" },
      { status: 400 }
    );
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileName = uuid() + ".jpg";
    const uploadDir = path.join(process.cwd(), "public", "avatars");
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, fileName);
    await fs.writeFile(filePath, buffer);

    const avatarUrl = `/avatars/${fileName}`;

    await prisma.user.update({
      where: { id: authUser.id },
      data: { avatarUrl },
    });

    return NextResponse.json({ avatarUrl });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Hiba az avatar mentése közben." }, { status: 500 });
  }
}