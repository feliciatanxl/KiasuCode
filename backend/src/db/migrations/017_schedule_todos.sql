-- Migration 017: To-Do List and Class Schedules
CREATE TABLE IF NOT EXISTS todos (
  id CHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  label VARCHAR(100) NULL,
  description TEXT NULL,
  deadline DATETIME NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_todos_user (user_id),
  KEY idx_todos_user_completed (user_id, is_completed),
  CONSTRAINT fk_todos_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS class_schedules (
  id CHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  color VARCHAR(30) NOT NULL DEFAULT '#3b82f6',
  title VARCHAR(255) NOT NULL,
  instructor VARCHAR(255) NULL,
  room_location VARCHAR(255) NULL,
  day_of_week ENUM('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun') NOT NULL,
  start_time VARCHAR(20) NOT NULL,
  end_time VARCHAR(20) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_class_schedules_user_day (user_id, day_of_week),
  CONSTRAINT fk_class_schedules_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
