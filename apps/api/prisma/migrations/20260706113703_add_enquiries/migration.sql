-- CreateTable
CREATE TABLE `enquiries` (
    `id` VARCHAR(191) NOT NULL,
    `agent_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `mobile_number` VARCHAR(191) NOT NULL,
    `policy_type` ENUM('MOTOR', 'WC', 'HEALTH', 'GROUP_HEALTH', 'FIRE', 'BURGLARY', 'ALL_RISK', 'DOCTOR_POLICY', 'NEW', 'OTHER') NOT NULL,
    `referred_by` VARCHAR(191) NULL,
    `remind_on` DATETIME(3) NULL,
    `status` ENUM('OPEN', 'CONVERTED', 'DROPPED') NOT NULL DEFAULT 'OPEN',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `enquiries` ADD CONSTRAINT `enquiries_agent_id_fkey` FOREIGN KEY (`agent_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
