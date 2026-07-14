-- CreateTable
CREATE TABLE `clients` (
    `id` VARCHAR(191) NOT NULL,
    `insured_name` VARCHAR(191) NOT NULL,
    `mobile_number` VARCHAR(191) NULL,
    `missing_contact` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `policies` (
    `id` VARCHAR(191) NOT NULL,
    `client_id` VARCHAR(191) NOT NULL,
    `policy_type` ENUM('MOTOR', 'WC', 'HEALTH', 'GROUP_HEALTH', 'FIRE', 'BURGLARY', 'ALL_RISK', 'DOCTOR_POLICY', 'NEW', 'OTHER') NOT NULL,
    `vehicle_number` VARCHAR(191) NULL,
    `policy_number` VARCHAR(191) NULL,
    `reference_note` VARCHAR(191) NULL,
    `type_note` VARCHAR(191) NULL,
    `end_date` DATETIME(3) NOT NULL,
    `renewal_status` ENUM('PENDING', 'REMINDED', 'RENEWED', 'NOT_RENEWED', 'LAPSED') NOT NULL DEFAULT 'PENDING',
    `premium_price` DECIMAL(65, 30) NULL,
    `payment_link` VARCHAR(191) NULL,
    `renewal_notice` VARCHAR(191) NULL,
    `last_reminded_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `settings` (
    `id` VARCHAR(191) NOT NULL,
    `reminder_offsets` JSON NOT NULL,
    `app_lock_enabled` BOOLEAN NOT NULL DEFAULT false,
    `default_country_code` VARCHAR(191) NOT NULL DEFAULT '+91',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `policies` ADD CONSTRAINT `policies_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
