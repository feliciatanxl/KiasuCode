CREATE TABLE IF NOT EXISTS study_sessions (
  id CHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  module_id CHAR(36) NOT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_study_sessions_user_created (user_id, created_at),
  KEY idx_study_sessions_module (module_id),
  CONSTRAINT chk_study_sessions_duration
    CHECK (duration_minutes BETWEEN 1 AND 480),
  CONSTRAINT fk_study_sessions_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_study_sessions_module
    FOREIGN KEY (module_id) REFERENCES modules (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS user_wallets (
  user_id VARCHAR(36) NOT NULL,
  coins_balance BIGINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_user_wallets_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS pets (
  id CHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  name VARCHAR(80) NOT NULL,
  hunger_level TINYINT UNSIGNED NOT NULL DEFAULT 100,
  happiness_level TINYINT UNSIGNED NOT NULL DEFAULT 100,
  last_interacted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pets_user (user_id),
  CONSTRAINT chk_pets_hunger CHECK (hunger_level BETWEEN 0 AND 100),
  CONSTRAINT chk_pets_happiness CHECK (happiness_level BETWEEN 0 AND 100),
  CONSTRAINT fk_pets_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
