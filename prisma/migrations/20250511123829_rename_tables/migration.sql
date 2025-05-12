/*
  Warnings:

  - You are about to drop the `Chat` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Message` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PublicLink` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_parentChatId_fkey";

-- DropForeignKey
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_userId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_chatId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_llmId_fkey";

-- DropForeignKey
ALTER TABLE "PublicLink" DROP CONSTRAINT "PublicLink_targetChatId_fkey";

-- DropForeignKey
ALTER TABLE "PublicLink" DROP CONSTRAINT "PublicLink_targetMessageId_fkey";

-- DropForeignKey
ALTER TABLE "_ChatToPublicLink" DROP CONSTRAINT "_ChatToPublicLink_A_fkey";

-- DropForeignKey
ALTER TABLE "_ChatToPublicLink" DROP CONSTRAINT "_ChatToPublicLink_B_fkey";

-- DropForeignKey
ALTER TABLE "_MessageToPublicLink" DROP CONSTRAINT "_MessageToPublicLink_A_fkey";

-- DropForeignKey
ALTER TABLE "_MessageToPublicLink" DROP CONSTRAINT "_MessageToPublicLink_B_fkey";

-- DropTable
DROP TABLE "Chat";

-- DropTable
DROP TABLE "Message";

-- DropTable
DROP TABLE "PublicLink";

-- CreateTable
CREATE TABLE "сhats" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "parentChatId" TEXT,
    "branchedAfterMessageId" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "сhats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "role" "MessageSenderRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "llmId" INTEGER,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_links" (
    "id" TEXT NOT NULL,
    "targetChatId" TEXT,
    "targetMessageId" TEXT,
    "type" "LinkType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "public_links_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "сhats" ADD CONSTRAINT "сhats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "сhats" ADD CONSTRAINT "сhats_parentChatId_fkey" FOREIGN KEY ("parentChatId") REFERENCES "сhats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "сhats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_llmId_fkey" FOREIGN KEY ("llmId") REFERENCES "ai_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_links" ADD CONSTRAINT "public_links_targetChatId_fkey" FOREIGN KEY ("targetChatId") REFERENCES "сhats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_links" ADD CONSTRAINT "public_links_targetMessageId_fkey" FOREIGN KEY ("targetMessageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChatToPublicLink" ADD CONSTRAINT "_ChatToPublicLink_A_fkey" FOREIGN KEY ("A") REFERENCES "сhats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChatToPublicLink" ADD CONSTRAINT "_ChatToPublicLink_B_fkey" FOREIGN KEY ("B") REFERENCES "public_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MessageToPublicLink" ADD CONSTRAINT "_MessageToPublicLink_A_fkey" FOREIGN KEY ("A") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MessageToPublicLink" ADD CONSTRAINT "_MessageToPublicLink_B_fkey" FOREIGN KEY ("B") REFERENCES "public_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
