-- CreateTable
CREATE TABLE "counselor_settings" (
    "id" TEXT NOT NULL,
    "counselor_id" TEXT NOT NULL,
    "minimum_slots_per_day" INTEGER NOT NULL DEFAULT 6,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "counselor_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "counselor_settings_counselor_id_key" ON "counselor_settings"("counselor_id");

-- CreateIndex
CREATE INDEX "counselor_settings_counselor_id_idx" ON "counselor_settings"("counselor_id");

-- AddForeignKey
ALTER TABLE "counselor_settings" ADD CONSTRAINT "counselor_settings_counselor_id_fkey" FOREIGN KEY ("counselor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
