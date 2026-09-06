CREATE TABLE IF NOT EXISTS schema_migrations (
  migration_key VARCHAR(100) NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (migration_key)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL,
  display_name VARCHAR(160) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('super_admin', 'admin') NOT NULL DEFAULT 'admin',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  session_version INT UNSIGNED NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_by_admin_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY admin_users_username (username),
  KEY admin_users_active_role (is_active, role),
  CONSTRAINT admin_users_created_by_fk
    FOREIGN KEY (created_by_admin_id) REFERENCES admin_users (id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS content_imports (
  import_key VARCHAR(100) NOT NULL,
  status ENUM('running', 'completed', 'failed') NOT NULL,
  attempt_count INT UNSIGNED NOT NULL DEFAULT 1,
  triggered_by_admin_id BIGINT UNSIGNED NULL,
  imported_counts JSON NULL,
  last_error VARCHAR(1000) NULL,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (import_key),
  CONSTRAINT content_imports_admin_fk
    FOREIGN KEY (triggered_by_admin_id) REFERENCES admin_users (id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS players (
  cms_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  record_key VARCHAR(128) NOT NULL,
  player_id BIGINT UNSIGNED NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  short_name VARCHAR(255) NOT NULL,
  shirt_number VARCHAR(16) NULL,
  position VARCHAR(32) NOT NULL,
  age SMALLINT UNSIGNED NULL,
  height_cm SMALLINT UNSIGNED NULL,
  preferred_foot VARCHAR(32) NULL,
  nationality VARCHAR(100) NOT NULL,
  country_code VARCHAR(8) NULL,
  image_url TEXT NOT NULL,
  appearances SMALLINT UNSIGNED NULL,
  goals SMALLINT UNSIGNED NULL,
  assists SMALLINT UNSIGNED NULL,
  rating DECIMAL(4, 2) NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  source_name VARCHAR(32) NOT NULL DEFAULT 'dashboard',
  sync_with_source BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by_admin_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (cms_id),
  UNIQUE KEY players_record_key (record_key),
  UNIQUE KEY players_player_id (player_id),
  KEY players_listing (is_published, sort_order),
  CONSTRAINT players_updated_by_fk
    FOREIGN KEY (updated_by_admin_id) REFERENCES admin_users (id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staff_members (
  cms_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  record_key VARCHAR(128) NOT NULL,
  staff_id BIGINT UNSIGNED NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role_title VARCHAR(255) NOT NULL,
  department VARCHAR(32) NOT NULL,
  image_url TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  source_name VARCHAR(32) NOT NULL DEFAULT 'dashboard',
  sync_with_source BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by_admin_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (cms_id),
  UNIQUE KEY staff_members_record_key (record_key),
  UNIQUE KEY staff_members_staff_id (staff_id),
  KEY staff_members_listing (is_published, sort_order),
  KEY staff_members_department (department),
  CONSTRAINT staff_members_updated_by_fk
    FOREIGN KEY (updated_by_admin_id) REFERENCES admin_users (id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS news_articles (
  cms_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  record_key VARCHAR(128) NOT NULL,
  article_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(500) NOT NULL,
  summary_text TEXT NOT NULL,
  article_url TEXT NOT NULL,
  image_url TEXT NULL,
  image_alt VARCHAR(500) NOT NULL DEFAULT '',
  published_at DATETIME NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  source_name VARCHAR(32) NOT NULL DEFAULT 'dashboard',
  sync_with_source BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by_admin_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (cms_id),
  UNIQUE KEY news_articles_record_key (record_key),
  UNIQUE KEY news_articles_article_id (article_id),
  KEY news_articles_listing (is_published, sort_order),
  KEY news_articles_published_at (published_at),
  CONSTRAINT news_articles_updated_by_fk
    FOREIGN KEY (updated_by_admin_id) REFERENCES admin_users (id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS media_items (
  cms_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  record_key VARCHAR(128) NOT NULL,
  media_id VARCHAR(128) NOT NULL,
  title VARCHAR(500) NOT NULL,
  media_url TEXT NOT NULL,
  thumbnail_url TEXT NULL,
  published_at DATETIME NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  source_name VARCHAR(32) NOT NULL DEFAULT 'dashboard',
  sync_with_source BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by_admin_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (cms_id),
  UNIQUE KEY media_items_record_key (record_key),
  UNIQUE KEY media_items_media_id (media_id),
  KEY media_items_listing (is_published, sort_order),
  KEY media_items_published_at (published_at),
  CONSTRAINT media_items_updated_by_fk
    FOREIGN KEY (updated_by_admin_id) REFERENCES admin_users (id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS site_content (
  content_id TINYINT UNSIGNED NOT NULL,
  strip_primary VARCHAR(255) NOT NULL,
  strip_secondary VARCHAR(255) NOT NULL,
  hero_kicker VARCHAR(255) NOT NULL,
  hero_title_top VARCHAR(255) NOT NULL,
  hero_title_bottom VARCHAR(255) NOT NULL,
  hero_lead_strong VARCHAR(500) NOT NULL,
  hero_lead TEXT NOT NULL,
  manifesto_title VARCHAR(500) NOT NULL,
  manifesto_copy TEXT NOT NULL,
  club_intro_title VARCHAR(500) NOT NULL,
  club_intro_paragraph_one TEXT NOT NULL,
  club_intro_paragraph_two TEXT NOT NULL,
  club_venue_title VARCHAR(500) NOT NULL,
  club_venue_copy TEXT NOT NULL,
  footer_statement VARCHAR(500) NOT NULL,
  instagram_url TEXT NOT NULL,
  youtube_url TEXT NOT NULL,
  crest_color_url TEXT NOT NULL,
  crest_white_url TEXT NOT NULL,
  admin_login_image_url TEXT NOT NULL,
  home_hero_image_url TEXT NOT NULL,
  home_hero_image_alt VARCHAR(500) NOT NULL DEFAULT '',
  home_manifesto_image_url TEXT NOT NULL,
  home_manifesto_image_alt VARCHAR(500) NOT NULL DEFAULT '',
  team_header_image_url TEXT NOT NULL,
  team_header_image_alt VARCHAR(500) NOT NULL DEFAULT '',
  matches_header_image_url TEXT NOT NULL,
  matches_header_image_alt VARCHAR(500) NOT NULL DEFAULT '',
  standings_header_image_url TEXT NOT NULL,
  standings_header_image_alt VARCHAR(500) NOT NULL DEFAULT '',
  club_header_image_url TEXT NOT NULL,
  club_header_image_alt VARCHAR(500) NOT NULL DEFAULT '',
  media_header_image_url TEXT NOT NULL,
  media_header_image_alt VARCHAR(500) NOT NULL DEFAULT '',
  media_social_image_url TEXT NOT NULL,
  media_social_image_alt VARCHAR(500) NOT NULL DEFAULT '',
  media_fallback_image_url TEXT NOT NULL,
  updated_by_admin_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (content_id),
  CONSTRAINT site_content_updated_by_fk
    FOREIGN KEY (updated_by_admin_id) REFERENCES admin_users (id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS club_milestones (
  milestone_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  content_id TINYINT UNSIGNED NOT NULL DEFAULT 1,
  year_label VARCHAR(100) NOT NULL,
  title VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (milestone_id),
  KEY club_milestones_listing (content_id, sort_order),
  CONSTRAINT club_milestones_content_fk
    FOREIGN KEY (content_id) REFERENCES site_content (content_id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_admin_user_id BIGINT UNSIGNED NULL,
  target_admin_user_id BIGINT UNSIGNED NULL,
  action_name VARCHAR(100) NOT NULL,
  details JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY admin_audit_log_created_at (created_at),
  KEY admin_audit_log_actor (actor_admin_user_id),
  CONSTRAINT admin_audit_log_actor_fk
    FOREIGN KEY (actor_admin_user_id) REFERENCES admin_users (id) ON DELETE SET NULL,
  CONSTRAINT admin_audit_log_target_fk
    FOREIGN KEY (target_admin_user_id) REFERENCES admin_users (id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;