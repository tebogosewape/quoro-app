-- Add file_reference column to clients table
-- This column will store unique file reference numbers in the format QFN######
-- Database: quora-app (MySQL)

-- Step 1: Add the column if it doesn't exist (MySQL doesn't support IF NOT EXISTS for columns, so we'll handle it differently)
-- Check if column exists and add it
SET @dbname = 'quora-app';
SET @tablename = 'clients';
SET @columnname = 'file_reference';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname, '` VARCHAR(20) NULL AFTER `id`')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Step 2: Drop existing index if it exists
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND INDEX_NAME = 'IDX_file_reference'
  ) > 0,
  CONCAT('ALTER TABLE `', @tablename, '` DROP INDEX `IDX_file_reference`'),
  'SELECT 1'
));
PREPARE dropIndexIfExists FROM @preparedStatement;
EXECUTE dropIndexIfExists;
DEALLOCATE PREPARE dropIndexIfExists;

-- Step 3: Update existing clients with file references (starting from QFN000001)
SET @row_number = 0;
UPDATE `clients`
SET `file_reference` = CONCAT('QFN', LPAD((@row_number := @row_number + 1), 6, '0'))
WHERE `file_reference` IS NULL OR `file_reference` = ''
ORDER BY `created_at` ASC;

-- Step 4: Add unique index on file_reference
ALTER TABLE `clients`
ADD UNIQUE INDEX `IDX_file_reference` (`file_reference`);
