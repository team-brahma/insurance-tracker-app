-- Deduplicate: delete duplicate enquiries, keeping the newest per (agent_id, mobile_number)
DELETE e1
FROM enquiries e1
INNER JOIN enquiries e2
  ON e1.agent_id = e2.agent_id
  AND e1.mobile_number = e2.mobile_number
  AND (
    e1.created_at < e2.created_at
    OR (e1.created_at = e2.created_at AND e1.id < e2.id)
  );

-- Add unique constraint on (agent_id, mobile_number)
CREATE UNIQUE INDEX enquiries_agent_id_mobile_number_key ON enquiries(agent_id, mobile_number);
