ALTER TABLE users
  ADD COLUMN public_key LONGTEXT NULL AFTER photo_url;

CREATE TABLE IF NOT EXISTS private_messages (
  id CHAR(36) NOT NULL,
  sender_id VARCHAR(36) NOT NULL,
  receiver_id VARCHAR(36) NOT NULL,
  encrypted_content LONGTEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_private_messages_sender (sender_id, created_at),
  KEY idx_private_messages_receiver (receiver_id, created_at),
  KEY idx_private_messages_conversation (sender_id, receiver_id, created_at),
  CONSTRAINT fk_private_messages_sender
    FOREIGN KEY (sender_id) REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_private_messages_receiver
    FOREIGN KEY (receiver_id) REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
