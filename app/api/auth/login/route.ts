import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { parseJsonBody } from "@/lib/validation/request";
import { loginSchema } from "@/lib/validation/schemas";

const isProd = process.env.NODE_ENV === "production";

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for") ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (!rateLimit(ip)) {
    return NextResponse.json(
      { error: "Túl sok próbálkozás." },
      { status: 429 }
    );
  }

  const body = await parseJsonBody(req, loginSchema);
  if (!body) {
    return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });
  }

  const { email, password } = body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      { error: "Hibás email vagy jelszó." },
      { status: 401 }
    );
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json(
      { error: "Hibás email vagy jelszó." },
      { status: 401 }
    );
  }

  const token = generateToken({ id: user.id, role: user.role });

  const res = NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
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

