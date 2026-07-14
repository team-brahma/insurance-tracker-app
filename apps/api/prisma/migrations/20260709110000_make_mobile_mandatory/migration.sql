-- Replace existing NULL mobile numbers with a placeholder
UPDATE `clients` SET `mobile_number` = '+910000000000' WHERE `mobile_number` IS NULL;

-- Make mobile_number NOT NULL
ALTER TABLE `clients` MODIFY COLUMN `mobile_number` VARCHAR(191) NOT NULL;

-- Drop missing_contact column
ALTER TABLE `clients` DROP COLUMN `missing_contact`;
