import { NextResponse } from "next/server";

export async function POST() {
  // Törli a token cookie-t
  const res = NextResponse.json({ success: true });
  res.cookies.set("token", "", {
    httpOnly: true,
    secure: false,
    expires: new Date(0),
  });
  return res;
}
