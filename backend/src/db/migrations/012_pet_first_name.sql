ALTER TABLE pets
  ADD COLUMN first_name VARCHAR(80) NULL AFTER name,
  ADD COLUMN pet_type VARCHAR(50) NOT NULL DEFAULT 'hatchling' AFTER first_name;

UPDATE pets SET first_name = name WHERE first_name IS NULL;
