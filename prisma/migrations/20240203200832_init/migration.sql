/*
  Warnings:

  - Made the column `image` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `phone_number` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "socketId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_User" ("active", "email", "id", "image", "password", "phone_number", "socketId", "username") SELECT "active", "email", "id", "image", "password", "phone_number", "socketId", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
