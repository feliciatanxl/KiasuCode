CREATE TABLE IF NOT EXISTS module_files (
  id CHAR(36) NOT NULL,
  module_id CHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(512) NOT NULL,
  file_size_kb INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_module_files_module (module_id),
  KEY idx_module_files_user (user_id),
  CONSTRAINT fk_module_files_module
    FOREIGN KEY (module_id) REFERENCES modules (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_module_files_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
