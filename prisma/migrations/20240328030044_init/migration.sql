/*
  Warnings:

  - You are about to drop the `Product` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ProductToShoppingCart` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Product";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_ProductToShoppingCart";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "_PurchasevisitorToShoppingCart" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_PurchasevisitorToShoppingCart_A_fkey" FOREIGN KEY ("A") REFERENCES "Purchasevisitor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_PurchasevisitorToShoppingCart_B_fkey" FOREIGN KEY ("B") REFERENCES "ShoppingCart" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_PurchasevisitorToShoppingCart_AB_unique" ON "_PurchasevisitorToShoppingCart"("A", "B");

-- CreateIndex
CREATE INDEX "_PurchasevisitorToShoppingCart_B_index" ON "_PurchasevisitorToShoppingCart"("B");
