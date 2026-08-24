-- AlterTable
ALTER TABLE "canal_whatsapp" ALTER COLUMN "numero_telefono" SET DATA TYPE VARCHAR(21);

-- AlterTable
ALTER TABLE "cliente" ALTER COLUMN "telefono" SET DATA TYPE VARCHAR(21);

-- AlterTable
ALTER TABLE "prospecto" ALTER COLUMN "telefono" SET DATA TYPE VARCHAR(21);

-- AlterTable
ALTER TABLE "proveedor" ALTER COLUMN "telefono" SET DATA TYPE VARCHAR(21);

-- AlterTable
ALTER TABLE "sesion_portal" ALTER COLUMN "token" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "tecnico_externo" ALTER COLUMN "telefono" SET DATA TYPE VARCHAR(21);
