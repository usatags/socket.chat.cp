/*
  Warnings:

  - Made the column `insuranceType` on table `PurchaseWithoutConversation` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PurchaseWithoutConversation" (
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
    "user_id" TEXT NOT NULL,
    "options" TEXT,
    "cancelled" BOOLEAN DEFAULT false,
    "failedTries" INTEGER DEFAULT 0,
    "image" TEXT,
    "vehicleType" TEXT,
    "buyingType" TEXT,
    "paypalPaymentId" TEXT,
    "insuranceType" TEXT NOT NULL,
    CONSTRAINT "PurchaseWithoutConversation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PurchaseWithoutConversation" ("address", "buyingType", "cancelled", "city", "color", "completed", "continuePurchase", "details", "driverLicense", "email", "failedTries", "hasVehicleInSurance", "houseType", "id", "image", "insuranceType", "isTruck", "lastName", "name", "options", "paypalPaymentId", "phone", "state", "total", "user_id", "vehicleInsurance", "vehicleType", "vin", "wantToGetVehicleInsurance", "zip") SELECT "address", "buyingType", "cancelled", "city", "color", "completed", "continuePurchase", "details", "driverLicense", "email", "failedTries", "hasVehicleInSurance", "houseType", "id", "image", "insuranceType", "isTruck", "lastName", "name", "options", "paypalPaymentId", "phone", "state", "total", "user_id", "vehicleInsurance", "vehicleType", "vin", "wantToGetVehicleInsurance", "zip" FROM "PurchaseWithoutConversation";
DROP TABLE "PurchaseWithoutConversation";
ALTER TABLE "new_PurchaseWithoutConversation" RENAME TO "PurchaseWithoutConversation";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
