ALTER TABLE users
  ADD COLUMN IF NOT EXISTS name VARCHAR(120);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS security_approved BOOLEAN DEFAULT FALSE;

UPDATE users
SET name = COALESCE(name, SPLIT_PART(email, '@', 1))
WHERE name IS NULL;

ALTER TABLE users
  ALTER COLUMN name SET NOT NULL;

UPDATE users
SET security_approved = TRUE
WHERE role <> 'security'
  AND security_approved IS DISTINCT FROM TRUE;

ALTER TABLE users
  ALTER COLUMN security_approved SET NOT NULL;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check CHECK (role IN ('student', 'security', 'admin'));

CREATE INDEX IF NOT EXISTS idx_users_security_approved ON users(security_approved);
