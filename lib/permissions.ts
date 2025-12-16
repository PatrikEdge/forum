//Egyelőre nincs használatban
import { Role } from "@prisma/client";

export function isAdmin(role?: Role | string) {
  return role === "ADMIN";
}

export function isModerator(role?: Role | string) {
  return role === "MODERATOR" || role === "ADMIN";
}

export function canEditPost(params: {
  userId: string;
  userRole?: Role | string;
  authorId: string;
}) {
  if (params.userId === params.authorId) return true;
  if (isModerator(params.userRole)) return true;
  return false;
}

export function canDeletePost(params: {
  userId: string;
  userRole?: Role | string;
  authorId: string;
}) {
  return canEditPost(params);
}

export function canLockThread(role?: Role | string) {
  return isModerator(role);
}

export function canPinThread(role?: Role | string) {
  return role === "ADMIN";
}
