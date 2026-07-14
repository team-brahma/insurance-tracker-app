-- 1. Create policy_types table
CREATE TABLE `policy_types` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `policy_types_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Seed all existing policy types
INSERT INTO `policy_types` (`id`, `name`, `is_active`, `sort_order`, `updated_at`) VALUES
('f8a55cf9-7601-4475-b89e-2dc3d7e5d87a', 'Motor', true, 10, NOW(3)),
('e22851cf-41c3-4d64-be57-e6f79e830d9a', 'Workmen\'s Comp', true, 20, NOW(3)),
('cb8e5c82-841a-4ea8-b80c-03cd58529241', 'Health', true, 30, NOW(3)),
('a37eb5f0-6a97-4c4f-a2e6-fa986d5e1b12', 'Group Health', true, 40, NOW(3)),
('d46cb7d9-c052-4467-bc1a-5b128c7c945a', 'Fire', true, 50, NOW(3)),
('b87cddf0-cf1a-446c-bd42-f81628dcd98b', 'Burglary', true, 60, NOW(3)),
('cf7e6da8-2a1d-44a8-a664-df82cd739f88', 'All Risk', true, 70, NOW(3)),
('e91244ab-6c3e-4d57-b08e-c90a8a614210', 'Doctor Policy', true, 80, NOW(3)),
('a57e3f89-8d7b-4029-9e8a-72efb6dc9a2b', 'New', true, 90, NOW(3)),
('f52e50ab-6b71-482a-a53d-27b686d11fca', 'Other', true, 100, NOW(3));

-- 3. Add the foreign key column to Policy and Enquiry as NULLABLE first
ALTER TABLE `policies` ADD COLUMN `policy_type_id` VARCHAR(191) NULL;
ALTER TABLE `enquiries` ADD COLUMN `policy_type_id` VARCHAR(191) NULL;

-- 4. Migrate existing enum values into the new foreign key
UPDATE `policies` SET `policy_type_id` = 'f8a55cf9-7601-4475-b89e-2dc3d7e5d87a' WHERE `policy_type` = 'MOTOR';
UPDATE `policies` SET `policy_type_id` = 'e22851cf-41c3-4d64-be57-e6f79e830d9a' WHERE `policy_type` = 'WC';
UPDATE `policies` SET `policy_type_id` = 'cb8e5c82-841a-4ea8-b80c-03cd58529241' WHERE `policy_type` = 'HEALTH';
UPDATE `policies` SET `policy_type_id` = 'a37eb5f0-6a97-4c4f-a2e6-fa986d5e1b12' WHERE `policy_type` = 'GROUP_HEALTH';
UPDATE `policies` SET `policy_type_id` = 'd46cb7d9-c052-4467-bc1a-5b128c7c945a' WHERE `policy_type` = 'FIRE';
UPDATE `policies` SET `policy_type_id` = 'b87cddf0-cf1a-446c-bd42-f81628dcd98b' WHERE `policy_type` = 'BURGLARY';
UPDATE `policies` SET `policy_type_id` = 'cf7e6da8-2a1d-44a8-a664-df82cd739f88' WHERE `policy_type` = 'ALL_RISK';
UPDATE `policies` SET `policy_type_id` = 'e91244ab-6c3e-4d57-b08e-c90a8a614210' WHERE `policy_type` = 'DOCTOR_POLICY';
UPDATE `policies` SET `policy_type_id` = 'a57e3f89-8d7b-4029-9e8a-72efb6dc9a2b' WHERE `policy_type` = 'NEW';
UPDATE `policies` SET `policy_type_id` = 'f52e50ab-6b71-482a-a53d-27b686d11fca' WHERE `policy_type` = 'OTHER';

UPDATE `enquiries` SET `policy_type_id` = 'f8a55cf9-7601-4475-b89e-2dc3d7e5d87a' WHERE `policy_type` = 'MOTOR';
UPDATE `enquiries` SET `policy_type_id` = 'e22851cf-41c3-4d64-be57-e6f79e830d9a' WHERE `policy_type` = 'WC';
UPDATE `enquiries` SET `policy_type_id` = 'cb8e5c82-841a-4ea8-b80c-03cd58529241' WHERE `policy_type` = 'HEALTH';
UPDATE `enquiries` SET `policy_type_id` = 'a37eb5f0-6a97-4c4f-a2e6-fa986d5e1b12' WHERE `policy_type` = 'GROUP_HEALTH';
UPDATE `enquiries` SET `policy_type_id` = 'd46cb7d9-c052-4467-bc1a-5b128c7c945a' WHERE `policy_type` = 'FIRE';
UPDATE `enquiries` SET `policy_type_id` = 'b87cddf0-cf1a-446c-bd42-f81628dcd98b' WHERE `policy_type` = 'BURGLARY';
UPDATE `enquiries` SET `policy_type_id` = 'cf7e6da8-2a1d-44a8-a664-df82cd739f88' WHERE `policy_type` = 'ALL_RISK';
UPDATE `enquiries` SET `policy_type_id` = 'e91244ab-6c3e-4d57-b08e-c90a8a614210' WHERE `policy_type` = 'DOCTOR_POLICY';
UPDATE `enquiries` SET `policy_type_id` = 'a57e3f89-8d7b-4029-9e8a-72efb6dc9a2b' WHERE `policy_type` = 'NEW';
UPDATE `enquiries` SET `policy_type_id` = 'f52e50ab-6b71-482a-a53d-27b686d11fca' WHERE `policy_type` = 'OTHER';

-- Fallback for any unmapped records to prevent migration errors
UPDATE `policies` SET `policy_type_id` = 'f52e50ab-6b71-482a-a53d-27b686d11fca' WHERE `policy_type_id` IS NULL;
UPDATE `enquiries` SET `policy_type_id` = 'f52e50ab-6b71-482a-a53d-27b686d11fca' WHERE `policy_type_id` IS NULL;

-- 5. Make the foreign key mandatory (NOT NULL)
ALTER TABLE `policies` MODIFY COLUMN `policy_type_id` VARCHAR(191) NOT NULL;
ALTER TABLE `enquiries` MODIFY COLUMN `policy_type_id` VARCHAR(191) NOT NULL;

-- 6. Remove the old enum column
ALTER TABLE `policies` DROP COLUMN `policy_type`;
ALTER TABLE `enquiries` DROP COLUMN `policy_type`;

-- 7. Add foreign key constraints & indexes
ALTER TABLE `policies` ADD CONSTRAINT `policies_policy_type_id_fkey` FOREIGN KEY (`policy_type_id`) REFERENCES `policy_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `enquiries` ADD CONSTRAINT `enquiries_policy_type_id_fkey` FOREIGN KEY (`policy_type_id`) REFERENCES `policy_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create status history tables
CREATE TABLE `policy_status_histories` (
    `id` VARCHAR(191) NOT NULL,
    `policy_id` VARCHAR(191) NOT NULL,
    `previous_status` ENUM('PENDING', 'REMINDED', 'RENEWED', 'NOT_RENEWED', 'LAPSED') NULL,
    `new_status` ENUM('PENDING', 'REMINDED', 'RENEWED', 'NOT_RENEWED', 'LAPSED') NOT NULL,
    `changed_by_id` VARCHAR(191) NOT NULL,
    `changed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `enquiry_status_histories` (
    `id` VARCHAR(191) NOT NULL,
    `enquiry_id` VARCHAR(191) NOT NULL,
    `previous_status` ENUM('OPEN', 'CONVERTED', 'DROPPED') NULL,
    `new_status` ENUM('OPEN', 'CONVERTED', 'DROPPED') NOT NULL,
    `changed_by_id` VARCHAR(191) NOT NULL,
    `changed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add status history constraints
ALTER TABLE `policy_status_histories` ADD CONSTRAINT `policy_status_histories_policy_id_fkey` FOREIGN KEY (`policy_id`) REFERENCES `policies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `policy_status_histories` ADD CONSTRAINT `policy_status_histories_changed_by_id_fkey` FOREIGN KEY (`changed_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `enquiry_status_histories` ADD CONSTRAINT `enquiry_status_histories_enquiry_id_fkey` FOREIGN KEY (`enquiry_id`) REFERENCES `enquiries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `enquiry_status_histories` ADD CONSTRAINT `enquiry_status_histories_changed_by_id_fkey` FOREIGN KEY (`changed_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
