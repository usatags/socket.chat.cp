-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "Conversation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Purchase" (
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
    "vehicleType" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "driverLicense" TEXT NOT NULL,
    "vehicleInsurance" TEXT,
    "details" TEXT NOT NULL,
    "paypalPaymentId" TEXT,
    "hasFee" BOOLEAN NOT NULL DEFAULT false,
    "isInsurance" BOOLEAN NOT NULL DEFAULT false,
    "total" REAL NOT NULL,
    "optionSelectedPlate" TEXT NOT NULL,
    "optionSelectedInsurance" TEXT NOT NULL DEFAULT 'NONE',
    "insurancePrice" REAL,
    "insuranceProvider" TEXT,
    "image" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PlateDetailsCodes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tagName" TEXT,
    "status" TEXT,
    "tagIssueDate" TEXT,
    "tagExpirationDate" TEXT,
    "purchasedOrLeased" TEXT,
    "customerType" TEXT,
    "transferPlate" TEXT,
    "vin" TEXT,
    "vehicleYear" TEXT,
    "vehicleMake" TEXT,
    "vehicleModel" TEXT,
    "vehicleBodyStyle" TEXT,
    "vehicleColor" TEXT,
    "vehicleGVW" TEXT,
    "dealerLicenseNumber" TEXT,
    "dealerName" TEXT,
    "dealerAddress" TEXT,
    "dealerPhone" TEXT,
    "dealerType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hasBarcode" BOOLEAN,
    "hasQRCode" BOOLEAN,
    "State" TEXT,
    "tagType" TEXT,
    "isInsurance" BOOLEAN,
    "insuranceProvider" TEXT,
    "agentName" TEXT,
    "policyNumber" TEXT
);

-- CreateTable
CREATE TABLE "_ConversationToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ConversationToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ConversationToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_ConversationToUser_AB_unique" ON "_ConversationToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_ConversationToUser_B_index" ON "_ConversationToUser"("B");
