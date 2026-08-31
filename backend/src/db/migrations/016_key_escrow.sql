ALTER TABLE users
  ADD COLUMN wrapped_private_key LONGTEXT NULL AFTER public_key;
