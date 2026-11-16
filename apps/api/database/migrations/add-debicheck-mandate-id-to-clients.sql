-- Migration: add debi_check_mandate_id to clients table
-- Date: 2026-03-13
-- Stores the active NuPay DebiCheck mandate ID returned after successful mandate initiation.

ALTER TABLE clients
    ADD COLUMN debi_check_mandate_id VARCHAR(50) NULL DEFAULT NULL
        COMMENT 'Active NuPay DebiCheck mandate ID (set automatically after successful initiation)';
