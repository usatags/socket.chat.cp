/*
  Warnings:

  - You are about to drop the `_PurchasevisitorToShoppingCart` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_PurchasevisitorToShoppingCart";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "image" TEXT NOT NULL,
    "link" TEXT
);

-- CreateTable
CREATE TABLE "_ProductToShoppingCart" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ProductToShoppingCart_A_fkey" FOREIGN KEY ("A") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ProductToShoppingCart_B_fkey" FOREIGN KEY ("B") REFERENCES "ShoppingCart" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_ProductToShoppingCart_AB_unique" ON "_ProductToShoppingCart"("A", "B");

-- CreateIndex
CREATE INDEX "_ProductToShoppingCart_B_index" ON "_ProductToShoppingCart"("B");
