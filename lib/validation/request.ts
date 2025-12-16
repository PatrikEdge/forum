import { z } from "zod";
import { NextRequest } from "next/server";

export async function parseJsonBody<T extends z.ZodTypeAny>(
  req: NextRequest | Request,
  schema: T
): Promise<z.infer<T> | null> {
  let raw: unknown;

  try {
    raw = await (req as Request).json();
  } catch {
    return null;
  }

  const result = schema.safeParse(raw);
  if (!result.success) return null;

  return result.data;
}
