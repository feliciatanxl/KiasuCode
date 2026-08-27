CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) NOT NULL,
  provider ENUM('google', 'telegram', 'local') NOT NULL,
  provider_id VARCHAR(255) NOT NULL,
  email VARCHAR(255) NULL,
  password_hash VARCHAR(255) NULL,
  name VARCHAR(160) NOT NULL,
  photo_url LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_provider_id (provider_id),
  UNIQUE KEY uq_users_email (email)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS institutions (
  id CHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  name VARCHAR(160) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_institutions_user_name (user_id, name),
  CONSTRAINT fk_institutions_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS semesters (
  id CHAR(36) NOT NULL,
  institution_id CHAR(36) NOT NULL,
  academic_year VARCHAR(9) NOT NULL,
  term VARCHAR(40) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_semesters_institution_period (
    institution_id,
    academic_year,
    term
  ),
  CONSTRAINT chk_semesters_academic_year
    CHECK (academic_year REGEXP '^AY[0-9]{2}/[0-9]{2}$'),
  CONSTRAINT fk_semesters_institution
    FOREIGN KEY (institution_id) REFERENCES institutions (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS modules (
  id CHAR(36) NOT NULL,
  semester_id CHAR(36) NOT NULL,
  module_code VARCHAR(24) NOT NULL,
  module_name VARCHAR(180) NOT NULL,
  credits DECIMAL(4, 1) UNSIGNED NOT NULL,
  target_grade VARCHAR(10) NOT NULL,
  actual_grade VARCHAR(10) NULL,
  status ENUM('Backlog', 'In Progress', 'Merged') NOT NULL DEFAULT 'Backlog',
  PRIMARY KEY (id),
  UNIQUE KEY uq_modules_semester_code (semester_id, module_code),
  CONSTRAINT chk_modules_credits CHECK (credits > 0),
  CONSTRAINT fk_modules_semester
    FOREIGN KEY (semester_id) REFERENCES semesters (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
