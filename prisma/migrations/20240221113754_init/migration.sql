/*
  Warnings:

  - You are about to drop the `PurchaseWithoutConversation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PurchaseWithoutConversation";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Purchasewithoutconversation" (
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
    "insuranceType" TEXT,
    CONSTRAINT "Purchasewithoutconversation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
