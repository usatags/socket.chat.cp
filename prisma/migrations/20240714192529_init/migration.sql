/*
  Warnings:

  - You are about to drop the column `hasFee` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `insuranceProvider` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `optionSelectedInsurance` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `optionSelectedPlate` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `purchaseType` on the `Purchase` table. All the data in the column will be lost.
  - You are about to alter the column `insurancePrice` on the `Purchase` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Int`.
  - You are about to alter the column `total` on the `Purchase` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Int`.
  - Added the required column `user_id` to the `Purchase` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Purchasevisitor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vin" TEXT,
    "color" TEXT,
    "email" TEXT,
    "state" TEXT,
    "name" TEXT,
    "lastName" TEXT,
    "address" TEXT,
    "city" TEXT,
    "houseType" TEXT,
    "zip" TEXT,
    "phone" TEXT,
    "driverLicense" TEXT,
    "hasVehicleInSurance" TEXT,
    "wantToGetVehicleInsurance" TEXT,
    "vehicleInsurance" TEXT,
    "details" TEXT,
    "isTruck" TEXT,
    "total" INTEGER DEFAULT 0,
    "continuePurchase" BOOLEAN,
    "completed" BOOLEAN DEFAULT false,
    "options" TEXT,
    "cancelled" BOOLEAN DEFAULT false,
    "failedTries" INTEGER DEFAULT 0,
    "image" TEXT,
    "vehicleType" TEXT,
    "buyingType" TEXT,
    "paypalPaymentId" TEXT,
    "insuranceType" TEXT,
    "insuranceDescription" TEXT,
    "insurancePrice" INTEGER,
    "isInsurance" BOOLEAN,
    "vehicleTitle" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
    "userId" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShoppingCart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_PurchasevisitorToShoppingCart" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_PurchasevisitorToShoppingCart_A_fkey" FOREIGN KEY ("A") REFERENCES "Purchasevisitor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_PurchasevisitorToShoppingCart_B_fkey" FOREIGN KEY ("B") REFERENCES "ShoppingCart" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Purchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversation_id" TEXT,
    "vin" TEXT,
    "color" TEXT,
    "email" TEXT,
    "state" TEXT,
    "name" TEXT,
    "lastName" TEXT,
    "address" TEXT,
    "city" TEXT,
    "houseType" TEXT,
    "zip" TEXT,
    "phone" TEXT,
    "driverLicense" TEXT,
    "hasVehicleInSurance" TEXT,
    "wantToGetVehicleInsurance" TEXT,
    "vehicleInsurance" TEXT,
    "details" TEXT,
    "isTruck" TEXT,
    "total" INTEGER DEFAULT 0,
    "continuePurchase" BOOLEAN,
    "completed" BOOLEAN DEFAULT false,
    "user_id" TEXT NOT NULL,
    "options" TEXT,
    "cancelled" BOOLEAN DEFAULT false,
    "failedTries" INTEGER DEFAULT 0,
    "image" TEXT,
    "vehicleType" TEXT,
    "buyingType" TEXT,
    "paypalPaymentId" TEXT,
    "insuranceType" TEXT,
    "insuranceDescription" TEXT,
    "insurancePrice" INTEGER,
    "isInsurance" BOOLEAN,
    "vehicleTitle" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Purchase_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "Conversation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Purchase_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Purchase" ("address", "city", "color", "createdAt", "details", "driverLicense", "email", "houseType", "id", "image", "insurancePrice", "isInsurance", "lastName", "name", "paypalPaymentId", "phone", "state", "total", "vehicleInsurance", "vehicleType", "vin", "zip") SELECT "address", "city", "color", "createdAt", "details", "driverLicense", "email", "houseType", "id", "image", "insurancePrice", "isInsurance", "lastName", "name", "paypalPaymentId", "phone", "state", "total", "vehicleInsurance", "vehicleType", "vin", "zip" FROM "Purchase";
DROP TABLE "Purchase";
ALTER TABLE "new_Purchase" RENAME TO "Purchase";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "ShoppingCart_userId_key" ON "ShoppingCart"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "_PurchasevisitorToShoppingCart_AB_unique" ON "_PurchasevisitorToShoppingCart"("A", "B");

-- CreateIndex
CREATE INDEX "_PurchasevisitorToShoppingCart_B_index" ON "_PurchasevisitorToShoppingCart"("B");
