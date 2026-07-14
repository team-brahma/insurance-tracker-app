-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'AGENT') NOT NULL DEFAULT 'AGENT',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `refresh_tokens_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable: add agent_id to existing tables
ALTER TABLE `clients` ADD COLUMN `agent_id` VARCHAR(191) NOT NULL;
ALTER TABLE `policies` ADD COLUMN `agent_id` VARCHAR(191) NOT NULL;
ALTER TABLE `settings` ADD COLUMN `agent_id` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clients` ADD CONSTRAINT `clients_agent_id_fkey` FOREIGN KEY (`agent_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `policies` ADD CONSTRAINT `policies_agent_id_fkey` FOREIGN KEY (`agent_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `settings` ADD CONSTRAINT `settings_agent_id_fkey` FOREIGN KEY (`agent_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX `clients_agent_id_idx` ON `clients`(`agent_id`);
CREATE INDEX `policies_agent_id_idx` ON `policies`(`agent_id`);
CREATE UNIQUE INDEX `settings_agent_id_key` ON `settings`(`agent_id`);
