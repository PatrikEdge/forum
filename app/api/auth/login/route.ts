import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, generateToken } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const key = `login_${ip}`;
    const allowed = rateLimit(key, { windowMs: 5 * 60 * 1000, max: 5 });

    if (!allowed) {
      return NextResponse.json(
        { error: "Túl sok próbálkozás. Próbáld újra később." },
        { status: 429 }
      );
    }

    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Hiányzó mezők" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await verifyPassword(password, user.password))) {
      return NextResponse.json({ error: "Hibás belépési adatok" }, { status: 401 });
    }

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
      maxAge: 60 * 60 * 24 * 7, // 7 nap
    });

    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Szerver hiba" }, { status: 500 });
  }
}
