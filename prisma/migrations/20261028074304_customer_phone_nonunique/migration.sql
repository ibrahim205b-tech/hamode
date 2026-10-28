-- DropIndex
DROP INDEX "Customer_phone_key";

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");
