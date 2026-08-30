CREATE TABLE IF NOT EXISTS academic_countdowns (
  id CHAR(36) NOT NULL,
  -- VARCHAR matches the existing users.id definition and keeps the FK valid.
  user_id VARCHAR(36) NOT NULL,
  module_id CHAR(36) NULL,
  title VARCHAR(255) NOT NULL,
  target_date DATETIME NOT NULL,
  category ENUM('Exam', 'Assignment', 'Project', 'Personal') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_academic_countdowns_user_target (user_id, target_date),
  KEY idx_academic_countdowns_module (module_id),
  CONSTRAINT fk_academic_countdowns_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_academic_countdowns_module
    FOREIGN KEY (module_id) REFERENCES modules (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
