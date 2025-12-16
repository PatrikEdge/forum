import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const runtime = "nodejs";

// ---------------- VALIDATION SCHEMA ----------------
const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, "A felhasználónév túl rövid")
    .max(30, "A felhasználónév túl hosszú")
    .optional(),
  email: z
    .string()
    .email("Érvénytelen email cím")
    .max(255)
    .optional(),
  password: z
    .string()
    .min(8, "A jelszó legalább 8 karakter")
    .max(128)
    .optional(),
});

export async function PUT(req: NextRequest) {
  // ---------------- AUTH ----------------
  const authUser = await getUserFromRequest(req);
  if (!authUser) {
    return NextResponse.json(
      { error: "Nem vagy bejelentkezve" },
      { status: 401 }
    );
  }

  // ---------------- PARSE + VALIDATE ----------------
  let body;
  try {
    body = updateProfileSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Érvénytelen adatok" },
      { status: 400 }
    );
  }

  const data: {
    username?: string;
    email?: string;
    password?: string;
  } = {};

  if (body.username) {
    data.username = body.username.trim();
  }

  if (body.email) {
    data.email = body.email.trim().toLowerCase();
  }

  if (body.password) {
    data.password = await bcrypt.hash(body.password, 10);
  }

  // ---------------- NO CHANGES ----------------
  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "Nincs módosítandó adat" },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.user.update({
      where: { id: authUser.id },
      data,
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
    console.error("PROFILE UPDATE ERROR:", err);

    // ---------------- UNIQUE CONSTRAINT ----------------
    if (err.code === "P2002") {
      const field = err.meta?.target?.[0];
      if (field === "email") {
        return NextResponse.json(
          { error: "Ez az email már foglalt" },
          { status: 409 }
        );
      }
      if (field === "username") {
        return NextResponse.json(
          { error: "Ez a felhasználónév már foglalt" },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: "Nem sikerült frissíteni a profilt" },
      { status: 500 }
    );
  }
}