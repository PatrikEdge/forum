import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, generateToken } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const key = `register_${ip}`;
    const allowed = rateLimit(key, { windowMs: 10 * 60 * 1000, max: 3 });

    if (!allowed) {
      return NextResponse.json(
        { error: "Túl sok regisztrációs próbálkozás. Próbáld újra később." },
        { status: 429 }
      );
    }

    const { username, email, password } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json({ error: "Hiányzó mezők" }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existing) {
      return NextResponse.json({ error: "A felhasználó már létezik" }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: { username, email, password: await hashPassword(password) },
    });

    const token = generateToken({ id: user.id });

    const res = NextResponse.json({
      user: { id: user.id, username: user.username, email: user.email },
    });

    const isProd = process.env.NODE_ENV === "production";

    res.cookies.set("token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Szerver hiba" }, { status: 500 });
  }
}
