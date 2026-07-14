-- Delete enquiries where the same mobile number already belongs to a client (per agent)
DELETE e
FROM enquiries e
INNER JOIN clients c ON e.agent_id = c.agent_id AND e.mobile_number = c.mobile_number
WHERE e.mobile_number IS NOT NULL AND e.mobile_number != '';
