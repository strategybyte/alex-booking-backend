-- AlterTable
ALTER TABLE "appointments" ADD COLUMN "payment_token" TEXT,
ADD COLUMN "payment_token_expiry" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "appointments_payment_token_key" ON "appointments"("payment_token");

-- CreateIndex
CREATE INDEX "appointments_payment_token_idx" ON "appointments"("payment_token");
