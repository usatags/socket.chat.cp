/*
  Warnings:

  - Added the required column `vehicleInsurance` to the `Purchase` table without a default value. This is not possible if the table is not empty.

*/
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
    "vehicleInsurance" TEXT NOT NULL,
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
INSERT INTO "new_Purchase" ("address", "city", "color", "createdAt", "details", "driverLicense", "email", "hasFee", "houseType", "id", "image", "insurancePrice", "insuranceProvider", "isInsurance", "lastName", "name", "optionSelectedInsurance", "optionSelectedPlate", "paypalPaymentId", "phone", "purchaseType", "state", "total", "vin", "zip") SELECT "address", "city", "color", "createdAt", "details", "driverLicense", "email", "hasFee", "houseType", "id", "image", "insurancePrice", "insuranceProvider", "isInsurance", "lastName", "name", "optionSelectedInsurance", "optionSelectedPlate", "paypalPaymentId", "phone", "purchaseType", "state", "total", "vin", "zip" FROM "Purchase";
DROP TABLE "Purchase";
ALTER TABLE "new_Purchase" RENAME TO "Purchase";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
