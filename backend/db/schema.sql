-- ==========================================================================
-- CareerBot AI - Aiven MySQL 8.4 Schema
-- Run once manually: mysql -h HOST -P PORT -u USER -pPASS --ssl-mode=REQUIRED DB < schema.sql
-- ==========================================================================

-- Anonymous browser sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id             INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  session_id     VARCHAR(128)  NOT NULL,
  session_secret VARCHAR(255)  NOT NULL,   -- SHA-256 hash of client secret
  created_at     DATETIME      DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Conversations belong to a session
CREATE TABLE IF NOT EXISTS conversations (
  id         INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  conv_id    VARCHAR(128)  NOT NULL,        -- UUID v4, client-generated
  session_id VARCHAR(128)  NOT NULL,
  title      VARCHAR(255)  NOT NULL DEFAULT 'New Conversation',
  topic      VARCHAR(64)   NOT NULL DEFAULT 'general',
  created_at DATETIME      DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_conv     (conv_id),
  INDEX      idx_session  (session_id),
  INDEX      idx_updated  (session_id, updated_at DESC),
  CONSTRAINT fk_conv_session
    FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Individual messages within a conversation
CREATE TABLE IF NOT EXISTS messages (
  id         INT UNSIGNED             AUTO_INCREMENT PRIMARY KEY,
  conv_id    VARCHAR(128)             NOT NULL,
  role       ENUM('user','assistant') NOT NULL,
  content    MEDIUMTEXT               NOT NULL,   -- up to 16 MB
  created_at DATETIME                 DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_conv_time (conv_id, created_at ASC),
  CONSTRAINT fk_msg_conv
    FOREIGN KEY (conv_id) REFERENCES conversations(conv_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
