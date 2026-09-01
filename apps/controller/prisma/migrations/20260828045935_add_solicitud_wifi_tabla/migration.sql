/*
  Warnings:

  - You are about to drop the column `wifi_password_hash` on the `cliente` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "cliente" DROP COLUMN "wifi_password_hash";

-- CreateTable
CREATE TABLE "solicitud_wifi" (
    "id_solicitud" SERIAL NOT NULL,
    "id_cliente" INTEGER NOT NULL,
    "password_nueva" VARCHAR(72) NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    "fecha_solicitud" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_ejecucion" TIMESTAMP(6),

    CONSTRAINT "solicitud_wifi_pkey" PRIMARY KEY ("id_solicitud")
);

-- AddForeignKey
ALTER TABLE "solicitud_wifi" ADD CONSTRAINT "fk_solicitud_wifi_id_cliente" FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente") ON DELETE NO ACTION ON UPDATE NO ACTION;
