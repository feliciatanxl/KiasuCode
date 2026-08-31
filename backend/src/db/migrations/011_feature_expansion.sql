CREATE TABLE IF NOT EXISTS password_history (
  id CHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_password_history_user_created (user_id, created_at),
  CONSTRAINT fk_password_history_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

INSERT INTO password_history (id, user_id, password_hash, created_at)
SELECT UUID(), users.id, users.password_hash, users.updated_at
  FROM users
 WHERE users.password_hash IS NOT NULL
   AND NOT EXISTS (
     SELECT 1
       FROM password_history
      WHERE password_history.user_id = users.id
   );

ALTER TABLE study_sessions
  MODIFY COLUMN module_id CHAR(36) NULL,
  ADD COLUMN custom_category VARCHAR(255) NULL AFTER module_id;
