-- AlterTable
ALTER TABLE "DMConversation" ALTER COLUMN "lastMessageAt" DROP NOT NULL,
ALTER COLUMN "lastMessageAt" DROP DEFAULT;
