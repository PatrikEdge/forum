import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const runtime = "nodejs";

// ---------------- VALIDATION SCHEMA ----------------
const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const updateProfileSchema = z
  .object({
    username: z.preprocess(
      emptyToUndefined,
      z.string().min(3).max(30).optional()
    ),

    email: z.preprocess(
      emptyToUndefined,
      z.string().email().max(255).optional()
    ),

    password: z.preprocess(
      emptyToUndefined,
      z.string().min(8, "Az új jelszó legalább 8 karakter").max(128).optional()
    ),

    // 🔥 NINCS min() !!
    currentPassword: z.preprocess(
      emptyToUndefined,
      z.string().optional()
    ),
  })
  .refine(
    (data) => !data.password || data.currentPassword,
    {
      message: "Jelszó módosításához meg kell adni a jelenlegi jelszót",
      path: ["currentPassword"],
    }
  );

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

  // ---------------- USERNAME ----------------
  if (body.username) {
    data.username = body.username.trim();
  }

  // ---------------- EMAIL ----------------
  if (body.email) {
    data.email = body.email.trim().toLowerCase();
  }

  // ---------------- PASSWORD CHANGE ----------------
  if (body.password) {
    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { password: true },
    });

    if (!dbUser?.password) {
      return NextResponse.json(
        { error: "Felhasználó nem található" },
        { status: 404 }
      );
    }

    const isValid = await bcrypt.compare(
      body.currentPassword!,
      dbUser.password
    );

    if (!isValid) {
      return NextResponse.json(
        { error: "Hibás jelenlegi jelszó" },
        { status: 401 }
      );
    }

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