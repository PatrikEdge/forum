import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, generateToken } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { parseJsonBody } from "@/lib/validation/request";
import { registerSchema } from "@/lib/validation/schemas";

const isProd = process.env.NODE_ENV === "production";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (!rateLimit(`register_${ip}`, { windowMs: 10 * 60 * 1000, max: 3 })) {
    return NextResponse.json(
      { error: "Túl sok regisztrációs próbálkozás." },
      { status: 429 }
    );
  }

  const body = await parseJsonBody(req, registerSchema);
  if (!body) {
    return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });
  }

  const { username, email, password } = body;

  const exists = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (exists) {
    return NextResponse.json(
      { error: "A felhasználó már létezik" },
      { status: 400 }
    );
  }

  const user = await prisma.user.create({
    data: {
      username,
      email,
      password: await hashPassword(password),
    },
  });

  const token = generateToken({ id: user.id, role: user.role });

  const res = NextResponse.json({
    user: { id: user.id, username: user.username, email: user.email },
  });

  res.cookies.set("token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}

