-- AlterTable
ALTER TABLE `clients` ADD COLUMN `reference_name` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `policies` ADD COLUMN `reference_name` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `is_outsourced_enabled` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `policy_documents` (
    `id` VARCHAR(191) NOT NULL,
    `policy_id` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `file_name` VARCHAR(191) NOT NULL,
    `file_data` MEDIUMTEXT NOT NULL,
    `file_size` INTEGER NULL,
    `mime_type` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `policy_documents` ADD CONSTRAINT `policy_documents_policy_id_fkey` FOREIGN KEY (`policy_id`) REFERENCES `policies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
