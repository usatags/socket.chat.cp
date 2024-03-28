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
CREATE TABLE "ShoppingCart" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "total" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShoppingCart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_ProductToShoppingCart" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ProductToShoppingCart_A_fkey" FOREIGN KEY ("A") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ProductToShoppingCart_B_fkey" FOREIGN KEY ("B") REFERENCES "ShoppingCart" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ShoppingCart_userId_key" ON "ShoppingCart"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "_ProductToShoppingCart_AB_unique" ON "_ProductToShoppingCart"("A", "B");

-- CreateIndex
CREATE INDEX "_ProductToShoppingCart_B_index" ON "_ProductToShoppingCart"("B");
