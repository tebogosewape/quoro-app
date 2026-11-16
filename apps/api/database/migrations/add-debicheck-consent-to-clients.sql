-- DebiCheck Strike Date Analysis consent flag
-- Each call to NuPay strike_date_analysis has a nominal cost and requires
-- documented consumer consent. This flag must be true before the API
-- will forward the request to NuPay.
ALTER TABLE `clients`
  ADD COLUMN `debi_check_consent_given`
    TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'Customer has given explicit consent for DebiCheck Strike Date Analysis (nominal per-call NuPay cost)';
