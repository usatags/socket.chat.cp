-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PlateDetailsCodes" (
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
    "State" TEXT
);
INSERT INTO "new_PlateDetailsCodes" ("State", "createdAt", "customerType", "dealerAddress", "dealerLicenseNumber", "dealerName", "dealerPhone", "dealerType", "hasBarcode", "hasQRCode", "id", "purchasedOrLeased", "status", "tagExpirationDate", "tagIssueDate", "tagName", "transferPlate", "vehicleBodyStyle", "vehicleColor", "vehicleGVW", "vehicleMake", "vehicleModel", "vehicleYear", "vin") SELECT "State", "createdAt", "customerType", "dealerAddress", "dealerLicenseNumber", "dealerName", "dealerPhone", "dealerType", "hasBarcode", "hasQRCode", "id", "purchasedOrLeased", "status", "tagExpirationDate", "tagIssueDate", "tagName", "transferPlate", "vehicleBodyStyle", "vehicleColor", "vehicleGVW", "vehicleMake", "vehicleModel", "vehicleYear", "vin" FROM "PlateDetailsCodes";
DROP TABLE "PlateDetailsCodes";
ALTER TABLE "new_PlateDetailsCodes" RENAME TO "PlateDetailsCodes";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
