-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "Conversation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("content", "content_type", "conversation_id", "id", "sender_id") SELECT "content", "content_type", "conversation_id", "id", "sender_id" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
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
INSERT INTO "new_Purchase" ("address", "buyingType", "cancelled", "city", "color", "completed", "continuePurchase", "conversation_id", "details", "driverLicense", "email", "failedTries", "hasVehicleInSurance", "houseType", "id", "image", "insuranceDescription", "insurancePrice", "insuranceType", "isInsurance", "isTruck", "lastName", "name", "options", "paypalPaymentId", "phone", "state", "total", "user_id", "vehicleInsurance", "vehicleTitle", "vehicleType", "vin", "wantToGetVehicleInsurance", "zip") SELECT "address", "buyingType", "cancelled", "city", "color", "completed", "continuePurchase", "conversation_id", "details", "driverLicense", "email", "failedTries", "hasVehicleInSurance", "houseType", "id", "image", "insuranceDescription", "insurancePrice", "insuranceType", "isInsurance", "isTruck", "lastName", "name", "options", "paypalPaymentId", "phone", "state", "total", "user_id", "vehicleInsurance", "vehicleTitle", "vehicleType", "vin", "wantToGetVehicleInsurance", "zip" FROM "Purchase";
DROP TABLE "Purchase";
ALTER TABLE "new_Purchase" RENAME TO "Purchase";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT,
    "email" TEXT,
    "password" TEXT,
    "image" TEXT,
    "phone_number" TEXT,
    "socketId" TEXT,
    "active" BOOLEAN DEFAULT false,
    "admin" BOOLEAN DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("active", "admin", "email", "id", "image", "password", "phone_number", "socketId", "username") SELECT "active", "admin", "email", "id", "image", "password", "phone_number", "socketId", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE TABLE "new_Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Conversation" ("id") SELECT "id" FROM "Conversation";
DROP TABLE "Conversation";
ALTER TABLE "new_Conversation" RENAME TO "Conversation";
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
    "insurancePrice" INTEGER,
    "isInsurance" BOOLEAN,
    "vehicleTitle" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Purchasevisitor" ("address", "buyingType", "cancelled", "city", "color", "completed", "continuePurchase", "details", "driverLicense", "email", "failedTries", "hasVehicleInSurance", "houseType", "id", "image", "insuranceDescription", "insurancePrice", "insuranceType", "isInsurance", "isTruck", "lastName", "name", "options", "paypalPaymentId", "phone", "state", "total", "vehicleInsurance", "vehicleTitle", "vehicleType", "vin", "wantToGetVehicleInsurance", "zip") SELECT "address", "buyingType", "cancelled", "city", "color", "completed", "continuePurchase", "details", "driverLicense", "email", "failedTries", "hasVehicleInSurance", "houseType", "id", "image", "insuranceDescription", "insurancePrice", "insuranceType", "isInsurance", "isTruck", "lastName", "name", "options", "paypalPaymentId", "phone", "state", "total", "vehicleInsurance", "vehicleTitle", "vehicleType", "vin", "wantToGetVehicleInsurance", "zip" FROM "Purchasevisitor";
DROP TABLE "Purchasevisitor";
ALTER TABLE "new_Purchasevisitor" RENAME TO "Purchasevisitor";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
