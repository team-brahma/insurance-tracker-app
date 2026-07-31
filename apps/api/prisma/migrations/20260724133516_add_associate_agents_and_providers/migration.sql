-- AlterTable
ALTER TABLE `clients` ADD COLUMN `associate_agent_id` VARCHAR(191) NULL,
    ADD COLUMN `is_outsourced` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `policies` ADD COLUMN `associate_agent_id` VARCHAR(191) NULL,
    ADD COLUMN `insurance_provider_id` VARCHAR(191) NULL,
    ADD COLUMN `is_outsourced` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `renewal_status` ENUM('PENDING', 'REMINDED', 'RENEWED', 'NOT_RENEWED', 'LAPSED', 'INACTIVE') NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `policy_status_histories` MODIFY `previous_status` ENUM('PENDING', 'REMINDED', 'RENEWED', 'NOT_RENEWED', 'LAPSED', 'INACTIVE') NULL,
    MODIFY `new_status` ENUM('PENDING', 'REMINDED', 'RENEWED', 'NOT_RENEWED', 'LAPSED', 'INACTIVE') NOT NULL;

-- CreateTable
CREATE TABLE `insurance_providers` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `insurance_providers_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `associate_agents` (
    `id` VARCHAR(191) NOT NULL,
    `agent_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `mobile_number` VARCHAR(191) NOT NULL,
    `agency_name` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `associate_agents_agent_id_mobile_number_key`(`agent_id`, `mobile_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `associate_agents` ADD CONSTRAINT `associate_agents_agent_id_fkey` FOREIGN KEY (`agent_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clients` ADD CONSTRAINT `clients_associate_agent_id_fkey` FOREIGN KEY (`associate_agent_id`) REFERENCES `associate_agents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `policies` ADD CONSTRAINT `policies_insurance_provider_id_fkey` FOREIGN KEY (`insurance_provider_id`) REFERENCES `insurance_providers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `policies` ADD CONSTRAINT `policies_associate_agent_id_fkey` FOREIGN KEY (`associate_agent_id`) REFERENCES `associate_agents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
