import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, generateToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
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
      data: {
        username,
        email,
        password: hashPassword(password),
      },
    });

    const token = generateToken({ id: user.id });

    const res = NextResponse.json({ user: { id: user.id, username: user.username, email: user.email } });
    res.cookies.set("token", token, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
    });
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Szerver hiba" }, { status: 500 });
  }
}
