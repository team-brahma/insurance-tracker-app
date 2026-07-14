-- AlterTable
ALTER TABLE `policies` ADD COLUMN `claim_amount` DECIMAL(65, 30) NULL,
    ADD COLUMN `claim_date` DATETIME(3) NULL,
    ADD COLUMN `is_claimed` BOOLEAN NOT NULL DEFAULT false;
