-- 1. Add a plain index on agent_id so the FK constraint is satisfied when we drop the unique index
CREATE INDEX enquiries_agent_id_idx ON enquiries(agent_id);

-- 2. Drop the existing unique index to allow temporary duplicates during normalization
DROP INDEX enquiries_agent_id_mobile_number_key ON enquiries;

-- 3. Normalize enquiry mobile numbers: prepend agent's default country code to bare 10-digit numbers
UPDATE enquiries e
INNER JOIN settings s ON e.agent_id = s.agent_id
SET e.mobile_number = CONCAT(s.default_country_code, e.mobile_number)
WHERE e.mobile_number NOT LIKE '+%'
  AND e.mobile_number REGEXP '^[0-9]{10}$';

-- 4. Delete duplicate enquiries that result from normalization, keeping the newest per (agent_id, mobile_number)
DELETE e1
FROM enquiries e1
INNER JOIN enquiries e2
  ON e1.agent_id = e2.agent_id
  AND e1.mobile_number = e2.mobile_number
  AND (
    e1.created_at < e2.created_at
    OR (e1.created_at = e2.created_at AND e1.id < e2.id)
  );

-- 5. Re-add the unique constraint (the FK can use the plain index from step 1)
CREATE UNIQUE INDEX enquiries_agent_id_mobile_number_key ON enquiries(agent_id, mobile_number);
