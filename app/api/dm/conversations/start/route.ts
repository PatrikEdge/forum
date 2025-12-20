import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { partnerId } = await req.json();
  if (!partnerId || typeof partnerId !== "string") {
    return NextResponse.json(
      { error: "Missing partnerId" },
      { status: 400 }
    );
  }

  // 🔒 KANONIKUS SORREND – EZ A KULCS
  const [user1Id, user2Id] = [user.id, partnerId].sort();

  let conversation = await prisma.dMConversation.findUnique({
    where: {
      user1Id_user2Id: { user1Id, user2Id },
    },
  });

  // ➕ NINCS → LÉTREHOZÁS (race-safe)
  if (!conversation) {
    try {
      conversation = await prisma.dMConversation.create({
        data: { user1Id, user2Id },
      });
    } catch (err) {
      // ⚠️ Ha egyszerre jön két create → unique constraint dob
      conversation = await prisma.dMConversation.findUnique({
        where: {
          user1Id_user2Id: { user1Id, user2Id },
        },
      });
    }
  }

  return NextResponse.json({ conversation });
}