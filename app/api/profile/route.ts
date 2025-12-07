import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function PUT(req: NextRequest) {
  const authUser = await getUserFromRequest(req);
  if (!authUser) {
    return NextResponse.json({ error: "Nem vagy bejelentkezve" }, { status: 401 });
  }

  const { username, email, password } = await req.json();

  const data: any = {};
  if (username) data.username = username;
  if (email) data.email = email;
  if (password && password.trim().length > 0) {
    data.password = await bcrypt.hash(password, 10);
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
    console.error(err);
    return NextResponse.json(
      { error: "Nem sikerült frissíteni a profilt." },
      { status: 500 }
    );
  }
}
