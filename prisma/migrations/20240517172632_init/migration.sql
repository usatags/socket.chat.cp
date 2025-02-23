/*
  Warnings:

  - You are about to drop the column `insruancePrice` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `insruancePrice` on the `Purchasevisitor` table. All the data in the column will be lost.

*/
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
    CONSTRAINT "Purchase_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "Conversation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Purchase_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Purchase" ("address", "buyingType", "cancelled", "city", "color", "completed", "continuePurchase", "conversation_id", "details", "driverLicense", "email", "failedTries", "hasVehicleInSurance", "houseType", "id", "image", "insuranceDescription", "insuranceType", "isTruck", "lastName", "name", "options", "paypalPaymentId", "phone", "state", "total", "user_id", "vehicleInsurance", "vehicleType", "vin", "wantToGetVehicleInsurance", "zip") SELECT "address", "buyingType", "cancelled", "city", "color", "completed", "continuePurchase", "conversation_id", "details", "driverLicense", "email", "failedTries", "hasVehicleInSurance", "houseType", "id", "image", "insuranceDescription", "insuranceType", "isTruck", "lastName", "name", "options", "paypalPaymentId", "phone", "state", "total", "user_id", "vehicleInsurance", "vehicleType", "vin", "wantToGetVehicleInsurance", "zip" FROM "Purchase";
DROP TABLE "Purchase";
ALTER TABLE "new_Purchase" RENAME TO "Purchase";
CREATE TABLE "new_Purchasevisitor" (
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
    "insurancePrice" INTEGER
);
INSERT INTO "new_Purchasevisitor" ("address", "buyingType", "cancelled", "city", "color", "completed", "continuePurchase", "details", "driverLicense", "email", "failedTries", "hasVehicleInSurance", "houseType", "id", "image", "insuranceDescription", "insuranceType", "isTruck", "lastName", "name", "options", "paypalPaymentId", "phone", "state", "total", "vehicleInsurance", "vehicleType", "vin", "wantToGetVehicleInsurance", "zip") SELECT "address", "buyingType", "cancelled", "city", "color", "completed", "continuePurchase", "details", "driverLicense", "email", "failedTries", "hasVehicleInSurance", "houseType", "id", "image", "insuranceDescription", "insuranceType", "isTruck", "lastName", "name", "options", "paypalPaymentId", "phone", "state", "total", "vehicleInsurance", "vehicleType", "vin", "wantToGetVehicleInsurance", "zip" FROM "Purchasevisitor";
DROP TABLE "Purchasevisitor";
ALTER TABLE "new_Purchasevisitor" RENAME TO "Purchasevisitor";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
