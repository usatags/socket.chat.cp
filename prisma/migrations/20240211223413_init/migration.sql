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
    "hasVehicleInSurance" BOOLEAN NOT NULL DEFAULT false,
    "wantToGetVehicleInsurance" BOOLEAN NOT NULL DEFAULT false,
    "vehicleInsurance" TEXT,
    "details" TEXT NOT NULL,
    "continuePurchase" BOOLEAN NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "user_id" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "failedTries" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Purchase_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "Conversation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Purchase_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Purchase" ("address", "cancelled", "city", "color", "completed", "continuePurchase", "conversation_id", "details", "driverLicense", "email", "failedTries", "hasVehicleInSurance", "houseType", "id", "lastName", "name", "options", "phone", "state", "user_id", "vehicleInsurance", "vin", "zip") SELECT "address", "cancelled", "city", "color", "completed", "continuePurchase", "conversation_id", "details", "driverLicense", "email", "failedTries", "hasVehicleInSurance", "houseType", "id", "lastName", "name", "options", "phone", "state", "user_id", "vehicleInsurance", "vin", "zip" FROM "Purchase";
DROP TABLE "Purchase";
ALTER TABLE "new_Purchase" RENAME TO "Purchase";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
