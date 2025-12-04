-- Migration: Add credit_reports table for storing Experian credit checks
-- Date: 2025-12-04
-- Description: Stores credit report requests, responses, and compliance data

CREATE TABLE IF NOT EXISTS `credit_reports` (
    `id` VARCHAR(36) PRIMARY KEY,
    `clientId` VARCHAR(36) NOT NULL,
    `requestedBy` VARCHAR(36) NULL,
    `referenceNumber` VARCHAR(100) NOT NULL UNIQUE,
    `requestedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Enquiry details
    `enquiryReason` VARCHAR(100) NOT NULL,
    `enquiryPurpose` VARCHAR(100) NULL COMMENT 'For POPIA compliance',
    `enquiryAmount` DECIMAL(15,2) NULL,
    `productType` VARCHAR(100) NULL,
    
    -- Key metrics (denormalized for performance)
    `creditScore` INT NULL,
    `scoreClass` VARCHAR(50) NULL COMMENT 'Excellent, Good, Fair, Poor',
    `totalDebt` DECIMAL(15,2) DEFAULT 0,
    `totalAccounts` INT DEFAULT 0,
    `overdueAccounts` INT DEFAULT 0,
    `totalCreditLimit` DECIMAL(15,2) DEFAULT 0,
    `utilizationRate` DECIMAL(5,2) DEFAULT 0 COMMENT 'Percentage 0-100',
    
    -- Negative information counts
    `judgmentCount` INT DEFAULT 0,
    `defaultCount` INT DEFAULT 0,
    `hasAdministration` BOOLEAN DEFAULT FALSE,
    
    -- Raw response data
    `rawResponse` JSON NOT NULL COMMENT 'Full Experian API response',
    
    -- Status
    `status` ENUM('success', 'error', 'pending') DEFAULT 'pending',
    `errorMessage` TEXT NULL,
    `errorCode` VARCHAR(50) NULL,
    
    -- Compliance (POPIA/GDPR)
    `consentGiven` BOOLEAN DEFAULT FALSE,
    `consentDate` TIMESTAMP NULL,
    `consentMethod` VARCHAR(255) NULL COMMENT 'verbal, electronic, written',
    `purpose` TEXT NULL COMMENT 'Business purpose for credit check',
    
    -- Data retention
    `expiresAt` TIMESTAMP NULL COMMENT 'When to delete report data',
    `isArchived` BOOLEAN DEFAULT FALSE,
    
    -- PDF generation tracking
    `pdfGenerated` BOOLEAN DEFAULT FALSE,
    `pdfGeneratedAt` TIMESTAMP NULL,
    `pdfPath` VARCHAR(255) NULL COMMENT 'Path to stored PDF file',
    
    -- Audit trail
    `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `viewedAt` TIMESTAMP NULL,
    `viewedBy` VARCHAR(36) NULL,
    `viewCount` INT DEFAULT 0,
    
    -- Foreign keys
    FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`requestedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`viewedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    
    -- Indexes for performance
    INDEX `idx_client_id` (`clientId`),
    INDEX `idx_reference_number` (`referenceNumber`),
    INDEX `idx_requested_at` (`requestedAt`),
    INDEX `idx_status` (`status`),
    INDEX `idx_expires_at` (`expiresAt`),
    INDEX `idx_credit_score` (`creditScore`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comment to table
ALTER TABLE `credit_reports` COMMENT = 'Stores Experian credit bureau reports and compliance data';

-- Add index for compliance queries
CREATE INDEX `idx_consent_given` ON `credit_reports` (`consentGiven`, `consentDate`);

-- Add index for data retention cleanup
CREATE INDEX `idx_archived_expires` ON `credit_reports` (`isArchived`, `expiresAt`);
