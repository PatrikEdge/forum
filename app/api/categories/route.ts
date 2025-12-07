import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const defaultCategories = [
    { name: "Általános" },
    { name: "Kertészet" },
    { name: "Növénygondozás" },
    { name: "Segítség" },
    { name: "Egyéb" }
  ];

  const existingCount = await prisma.category.count();
  if (existingCount === 0) {
    await prisma.category.createMany({ data: defaultCategories });
  }

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ categories });
}
