import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

type Role = "USER" | "MODERATOR" | "ADMIN";

async function getRoleFromToken(token: string): Promise<Role | null> {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;

    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);

    const role = payload.role;
    if (role === "USER" || role === "MODERATOR" || role === "ADMIN") return role;
    return null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = await getRoleFromToken(token);

  if (!role) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const path = req.nextUrl.pathname;

  if (path.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/403", req.url));
  }

  if (path.startsWith("/moderator") && role !== "MODERATOR" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/403", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/moderator/:path*"],
};
