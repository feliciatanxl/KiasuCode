CREATE TABLE IF NOT EXISTS friendships (
  id CHAR(36) NOT NULL,
  requester_id VARCHAR(36) NOT NULL,
  addressee_id VARCHAR(36) NOT NULL,
  status ENUM('Pending', 'Accepted') NOT NULL DEFAULT 'Pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_friendships_pair (requester_id, addressee_id),
  KEY idx_friendships_addressee (addressee_id),
  CONSTRAINT fk_friendships_requester
    FOREIGN KEY (requester_id) REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_friendships_addressee
    FOREIGN KEY (addressee_id) REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
