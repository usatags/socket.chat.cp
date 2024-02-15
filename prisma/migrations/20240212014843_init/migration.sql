/*
  Warnings:

  - Added the required column `isTruck` to the `Purchase` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Purchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversation_id" TEXT NOT NULL,
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
    "hasVehicleInSurance" TEXT NOT NULL,
    "wantToGetVehicleInsurance" TEXT NOT NULL,
    "vehicleInsurance" TEXT,
    "details" TEXT NOT NULL,
    "isTruck" TEXT NOT NULL,
    "continuePurchase" BOOLEAN NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "user_id" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "failedTries" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Purchase_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "Conversation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Purchase_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Purchase" ("address", "cancelled", "city", "color", "completed", "continuePurchase", "conversation_id", "details", "driverLicense", "email", "failedTries", "hasVehicleInSurance", "houseType", "id", "lastName", "name", "options", "phone", "state", "user_id", "vehicleInsurance", "vin", "wantToGetVehicleInsurance", "zip") SELECT "address", "cancelled", "city", "color", "completed", "continuePurchase", "conversation_id", "details", "driverLicense", "email", "failedTries", "hasVehicleInSurance", "houseType", "id", "lastName", "name", "options", "phone", "state", "user_id", "vehicleInsurance", "vin", "wantToGetVehicleInsurance", "zip" FROM "Purchase";
DROP TABLE "Purchase";
ALTER TABLE "new_Purchase" RENAME TO "Purchase";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
