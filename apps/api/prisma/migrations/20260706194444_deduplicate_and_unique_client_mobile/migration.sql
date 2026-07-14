-- Deduplicate: nullify mobile_number on duplicate records, keeping the earliest
UPDATE clients c
INNER JOIN (
  SELECT agent_id, mobile_number, MIN(id) AS keep_id
  FROM clients
  WHERE mobile_number IS NOT NULL AND mobile_number != ''
  GROUP BY agent_id, mobile_number
  HAVING COUNT(*) > 1
) dup ON c.agent_id = dup.agent_id
      AND c.mobile_number = dup.mobile_number
      AND c.id != dup.keep_id
SET c.mobile_number = NULL,
    c.missing_contact = TRUE;

-- Add unique constraint on (agent_id, mobile_number)
CREATE UNIQUE INDEX clients_agent_id_mobile_number_key ON clients(agent_id, mobile_number);
