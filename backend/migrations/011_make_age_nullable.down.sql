-- Revert age column to NOT NULL (this might fail if there are NULL values)
ALTER TABLE students ALTER COLUMN age SET NOT NULL;

