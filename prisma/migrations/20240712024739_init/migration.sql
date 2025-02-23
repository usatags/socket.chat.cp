/*
  Warnings:

  - You are about to drop the `Product` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Purchasevisitor` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ShoppingCart` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_PurchasevisitorToShoppingCart` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `buyingType` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `cancelled` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `completed` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `continuePurchase` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `conversation_id` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `failedTries` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `hasVehicleInSurance` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `insuranceDescription` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `insuranceType` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `isTruck` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `options` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleInsurance` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleTitle` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleType` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `wantToGetVehicleInsurance` on the `Purchase` table. All the data in the column will be lost.
  - You are about to alter the column `insurancePrice` on the `Purchase` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.
  - You are about to alter the column `total` on the `Purchase` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.
  - Added the required column `insuranceProvider` to the `Purchase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `optionSelectedPlate` to the `Purchase` table without a default value. This is not possible if the table is not empty.
  - Made the column `address` on table `Purchase` required. This step will fail if there are existing NULL values in that column.
  - Made the column `city` on table `Purchase` required. This step will fail if there are existing NULL values in that column.
  - Made the column `color` on table `Purchase` required. This step will fail if there are existing NULL values in that column.
  - Made the column `details` on table `Purchase` required. This step will fail if there are existing NULL values in that column.
  - Made the column `driverLicense` on table `Purchase` required. This step will fail if there are existing NULL values in that column.
  - Made the column `email` on table `Purchase` required. This step will fail if there are existing NULL values in that column.
  - Made the column `houseType` on table `Purchase` required. This step will fail if there are existing NULL values in that column.
  - Made the column `image` on table `Purchase` required. This step will fail if there are existing NULL values in that column.
  - Made the column `insurancePrice` on table `Purchase` required. This step will fail if there are existing NULL values in that column.
  - Made the column `lastName` on table `Purchase` required. This step will fail if there are existing NULL values in that column.
  - Made the column `name` on table `Purchase` required. This step will fail if there are existing NULL values in that column.
  - Made the column `phone` on table `Purchase` required. This step will fail if there are existing NULL values in that column.
  - Made the column `state` on table `Purchase` required. This step will fail if there are existing NULL values in that column.
  - Made the column `total` on table `Purchase` required. This step will fail if there are existing NULL values in that column.
  - Made the column `vin` on table `Purchase` required. This step will fail if there are existing NULL values in that column.
  - Made the column `zip` on table `Purchase` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "ShoppingCart_userId_key";

-- DropIndex
DROP INDEX "_PurchasevisitorToShoppingCart_B_index";

-- DropIndex
DROP INDEX "_PurchasevisitorToShoppingCart_AB_unique";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Product";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Purchasevisitor";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ShoppingCart";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_PurchasevisitorToShoppingCart";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Purchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseType" TEXT NOT NULL DEFAULT 'PLATE',
    "vin" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "houseType" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "driverLicense" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "paypalPaymentId" TEXT,
    "hasFee" BOOLEAN NOT NULL DEFAULT false,
    "isInsurance" BOOLEAN NOT NULL DEFAULT false,
    "total" REAL NOT NULL,
    "optionSelectedPlate" TEXT NOT NULL,
    "optionSelectedInsurance" TEXT NOT NULL DEFAULT 'NONE',
    "insurancePrice" REAL NOT NULL,
    "insuranceProvider" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Purchase" ("address", "city", "color", "createdAt", "details", "driverLicense", "email", "houseType", "id", "image", "insurancePrice", "isInsurance", "lastName", "name", "paypalPaymentId", "phone", "state", "total", "vin", "zip") SELECT "address", "city", "color", "createdAt", "details", "driverLicense", "email", "houseType", "id", "image", "insurancePrice", coalesce("isInsurance", false) AS "isInsurance", "lastName", "name", "paypalPaymentId", "phone", "state", "total", "vin", "zip" FROM "Purchase";
DROP TABLE "Purchase";
ALTER TABLE "new_Purchase" RENAME TO "Purchase";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
