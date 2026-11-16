-- Repairs legacy client-directory rows created before file references and
-- role-aware automatic agent assignment were consistently applied.
-- Existing file references and assignments are deliberately left untouched.

START TRANSACTION;

-- Normalise references produced by older scripts that formatted the numeric
-- portion as a decimal (for example QFN22.000).
UPDATE clients
SET file_reference = CONCAT(
    'QFN',
    LPAD(
        CAST(SUBSTRING_INDEX(SUBSTRING(file_reference, 4), '.', 1) AS UNSIGNED),
        6,
        '0'
    )
)
WHERE file_reference REGEXP '^QFN[0-9]+\\.[0-9]+$';

SET @last_file_number := (
    SELECT COALESCE(MAX(CAST(SUBSTRING(file_reference, 4) AS UNSIGNED)), 0)
    FROM clients
    WHERE file_reference REGEXP '^QFN[0-9]+$'
);

UPDATE clients AS client
INNER JOIN (
    SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS sequence_number
    FROM clients
    WHERE file_reference IS NULL OR file_reference = ''
) AS pending_reference ON pending_reference.id = client.id
SET client.file_reference = CONCAT(
    'QFN',
    LPAD(
        CAST(@last_file_number + pending_reference.sequence_number AS UNSIGNED),
        6,
        '0'
    )
);

UPDATE clients AS client
INNER JOIN users AS creator ON creator.id = client.created_by
SET client.assigned_agent_id = client.created_by
WHERE client.assigned_agent_id IS NULL
  AND creator.role IN ('agent', 'sales_agent', 'debt_review_specialist');

COMMIT;
