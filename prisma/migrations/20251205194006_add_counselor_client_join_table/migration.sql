-- CreateTable
CREATE TABLE "counselor_clients" (
    "id" TEXT NOT NULL,
    "counselor_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "counselor_clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "counselor_clients_counselor_id_idx" ON "counselor_clients"("counselor_id");

-- CreateIndex
CREATE INDEX "counselor_clients_client_id_idx" ON "counselor_clients"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "counselor_clients_counselor_id_client_id_key" ON "counselor_clients"("counselor_id", "client_id");

-- AddForeignKey
ALTER TABLE "counselor_clients" ADD CONSTRAINT "counselor_clients_counselor_id_fkey" FOREIGN KEY ("counselor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counselor_clients" ADD CONSTRAINT "counselor_clients_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
