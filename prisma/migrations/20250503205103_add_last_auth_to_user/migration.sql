/*
  Warnings:

  - Added the required column `lastAuth` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastAuth" TIMESTAMP(3) NOT NULL;
