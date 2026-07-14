-- AlterTable
ALTER TABLE `policies` ADD COLUMN `additional_notice` VARCHAR(191) NULL,
    MODIFY `renewal_notice` MEDIUMTEXT NULL;
