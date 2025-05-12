/*
  Warnings:

  - You are about to drop the column `openRouterToken` on the `SiteSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SiteSettings" DROP COLUMN "openRouterToken",
ADD COLUMN     "openRouterApiKey" TEXT;
