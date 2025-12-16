import { z } from "zod";

// ----------------- Shared primitives -----------------

export const cuidSchema = z.string().min(1);
export const emailSchema = z.string().email().max(255);

export const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(20);

export const registerPasswordSchema = z
  .string()
  .min(8, "A jelszónak legalább 8 karakternek kell lennie")
  .max(128);

export const loginPasswordSchema = z.string().min(1);

// ----------------- AUTH -----------------

export const loginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
});

export const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: registerPasswordSchema,
});

// ----------------- THREADS / POSTS (tipikus) -----------------

export const createThreadSchema = z.object({
  title: z.string().trim().min(3).max(120),
  excerpt: z.string().trim().min(1).max(300),
  categoryId: cuidSchema,
});

export const createPostSchema = z.object({
  threadId: cuidSchema,
  text: z.string().trim().min(1).max(5000),
});

export const likePostSchema = z.object({
  postId: cuidSchema,
});

// ----------------- WS messages -----------------

export const wsMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("global_message"),
    text: z.string().min(1).max(2000),
  }),
  z.object({
    type: z.literal("chat_edit"),
    id: z.string(),
    text: z.string().min(1).max(2000),
  }),
  z.object({
    type: z.literal("dm_message"),
    toId: z.string(),
    text: z.string().min(1).max(2000),
  }),
]);
