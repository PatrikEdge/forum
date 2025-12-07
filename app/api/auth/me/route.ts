import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/getUser";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);

  if (!user) {
    return NextResponse.json(null, { status: 401 });
  }

  return NextResponse.json({
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role: user.role,
    joinedAt: user.joinedAt,
  });
}
