ALTER TABLE users
  ADD COLUMN has_consented BOOLEAN NOT NULL DEFAULT FALSE AFTER public_key,
  ADD COLUMN telegram_chat_id VARCHAR(255) NULL AFTER has_consented,
  ADD COLUMN google_id VARCHAR(255) NULL AFTER telegram_chat_id,
  ADD UNIQUE KEY uq_users_telegram_chat_id (telegram_chat_id),
  ADD UNIQUE KEY uq_users_google_id (google_id);
