-- Add clientId column to leads table to track lead-to-client conversions
-- This allows us to filter out converted leads from agent dashboards

-- Check if column exists before adding it
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'leads'
    AND COLUMN_NAME = 'client_id'
);

-- Add column if it doesn't exist
SET @query = IF(
    @column_exists = 0,
    'ALTER TABLE `leads` ADD COLUMN `client_id` VARCHAR(36) NULL COMMENT ''Reference to client if lead was converted'';',
    'SELECT ''Column client_id already exists'' AS message;'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index on client_id for faster lookups
SET @index_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'leads'
    AND INDEX_NAME = 'IDX_lead_client'
);

SET @query = IF(
    @index_exists = 0,
    'ALTER TABLE `leads` ADD INDEX `IDX_lead_client` (`client_id`);',
    'SELECT ''Index IDX_lead_client already exists'' AS message;'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index on leadOutcome for filtering
SET @index_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'leads'
    AND INDEX_NAME = 'IDX_lead_outcome'
);

SET @query = IF(
    @index_exists = 0,
    'ALTER TABLE `leads` ADD INDEX `IDX_lead_outcome` (`leadOutcome`);',
    'SELECT ''Index IDX_lead_outcome already exists'' AS message;'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
