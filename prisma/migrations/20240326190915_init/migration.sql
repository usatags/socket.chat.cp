-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT,
    "email" TEXT,
    "password" TEXT,
    "image" TEXT,
    "phone_number" TEXT,
    "socketId" TEXT,
    "active" BOOLEAN DEFAULT false,
    "admin" BOOLEAN DEFAULT false
);
INSERT INTO "new_User" ("active", "admin", "email", "id", "image", "password", "phone_number", "socketId", "username") SELECT "active", "admin", "email", "id", "image", "password", "phone_number", "socketId", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
