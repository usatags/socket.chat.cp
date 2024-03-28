/*
  Warnings:

  - Made the column `userId` on table `ShoppingCart` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ShoppingCart" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShoppingCart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ShoppingCart" ("amount", "createdAt", "id", "total", "updatedAt", "userId") SELECT "amount", "createdAt", "id", "total", "updatedAt", "userId" FROM "ShoppingCart";
DROP TABLE "ShoppingCart";
ALTER TABLE "new_ShoppingCart" RENAME TO "ShoppingCart";
CREATE UNIQUE INDEX "ShoppingCart_userId_key" ON "ShoppingCart"("userId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
