/*
  Warnings:

  - Added the required column `id_contrato` to the `solicitud_wifi` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "solicitud_wifi" ADD COLUMN     "id_contrato" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "solicitud_wifi" ADD CONSTRAINT "fk_solicitud_wifi_id_contrato" FOREIGN KEY ("id_contrato") REFERENCES "contrato"("id_contrato") ON DELETE NO ACTION ON UPDATE NO ACTION;
