import { NextResponse } from "next/server";

export async function POST() {
  // Törli a token cookie-t
  const res = NextResponse.json({ success: true });
  const isProd = process.env.NODE_ENV === "production";

res.cookies.set("token", "", {
  httpOnly: true,
  secure: isProd,
  sameSite: "strict",
  path: "/",
  expires: new Date(0),
});
  return res;
}
