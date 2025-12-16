import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";
import path from "path";
import { promises as fs } from "fs";
import { v4 as uuid } from "uuid";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req) {
  // ---------------- AUTH ----------------
  const authUser = await getUserFromRequest(req);
  if (!authUser) {
    return NextResponse.json(
      { error: "Nem vagy bejelentkezve" },
      { status: 401 }
    );
  }

  // ---------------- RATE LIMIT (avatar spam ellen) ----------------
  const allowed = rateLimit(`avatar_${authUser.id}`, {
    windowMs: 60 * 1000,
    max: 5,
  });

  if (!allowed) {
    return NextResponse.json(
      { error: "Túl sok avatar feltöltés. Próbáld később." },
      { status: 429 }
    );
  }

  // ---------------- FORM DATA ----------------
  const formData = await req.formData();
  const file = formData.get("avatar");

  if (!file) {
    return NextResponse.json(
      { error: "Nincs feltöltött fájl" },
      { status: 400 }
    );
  }

  // ---------------- FILE VALIDATION ----------------
  const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Csak PNG, JPG vagy WEBP engedélyezett" },
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
    // ---------------- FILE SAVE ----------------
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.type.split("/")[1]; // png | jpeg | webp
    const fileName = `${uuid()}.${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "avatars");
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, fileName);
    await fs.writeFile(filePath, buffer);

    const avatarUrl = `/avatars/${fileName}`;

    // ---------------- OLD AVATAR CLEANUP ----------------
    if (authUser.avatarUrl?.startsWith("/avatars/")) {
      const oldPath = path.join(
        process.cwd(),
        "public",
        authUser.avatarUrl
      );

      // nem dobunk hibát, ha nem létezik
      await fs.unlink(oldPath).catch(() => {});
    }

    // ---------------- DB UPDATE ----------------
    await prisma.user.update({
      where: { id: authUser.id },
      data: { avatarUrl },
    });

    return NextResponse.json({ avatarUrl });
  } catch (err) {
    console.error("AVATAR UPLOAD ERROR:", err);
    return NextResponse.json(
      { error: "Hiba az avatar mentése közben." },
      { status: 500 }
    );
  }
}
