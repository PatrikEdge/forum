import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";
import { NextResponse as NextResp } from "next/server"; 

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id: messageId } = await context.params;

  try {
    const { text } = await req.json();
    if (!messageId) return NextResp.json({ error: "Hiányzó üzenetazonosító." }, { status: 400 });
    if (!text?.trim()) return NextResp.json({ error: "Hiányzó vagy érvénytelen szöveg." }, { status: 400 });

    const user = await getUserFromRequest(req);
    if (!user) return NextResp.json({ error: "Nincs azonosítva" }, { status: 401 });

    const msg = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!msg) return NextResp.json({ error: "Üzenet nem található" }, { status: 404 });
    if (msg.authorId !== user.id && user.role === "USER") return NextResp.json({ error: "Nincs jogosultság" }, { status: 403 });

    const updatedMsg = await prisma.chatMessage.update({
  where: { id: messageId },
  data: { text: text.trim(), edited: true },
  include: {
    author: {
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        role: true,
      },
    },
  },
});

// 🔥 WebSocket broadcast
globalThis.wsClients?.forEach((client) => {
  try {
    client.send(
      JSON.stringify({
        type: "chat_edit",
        message: updatedMsg,
      })
    );
  } catch {}
});

    return NextResp.json({ success: true, updatedMsg });
  } catch (error) {
    console.error("PUT ERROR:", error);
    return NextResp.json({ error: "Szerverhiba" }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id: messageId } = await context.params;

  try {
    if (!messageId) return NextResp.json({ error: "Hiányzó üzenetazonosító." }, { status: 400 });

    const user = await getUserFromRequest(req);
    if (!user) return NextResp.json({ error: "Not authenticated" }, { status: 401 });

    const msg = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!msg) return NextResp.json({ error: "Message not found" }, { status: 404 });
    if (msg.authorId !== user.id && user.role === "USER") return NextResp.json({ error: "Forbidden" }, { status: 403 });

    await prisma.chatMessage.delete({ where: { id: messageId } });
    return NextResp.json({ success: true });
  } catch (error) {
    console.error("DELETE ERROR:", error);
    return NextResp.json({ error: "Szerverhiba" }, { status: 500 });
  }
}
