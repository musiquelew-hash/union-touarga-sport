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

-- Crée ou restaure une seule fois le compte initial; les passages suivants préservent toute modification.
INSERT INTO admin_users (username, display_name, password_hash, role, is_active)
SELECT
  'admin',
  'Super administrateur',
  '$2b$12$HRc3yeocxwI.vdKrYx87cuIByhyGkpu0Ag/kf0Sr9zRn7edVpd3lK',
  'super_admin',
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM schema_migrations WHERE migration_key = '005_sql_super_admin'
)
ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  password_hash = VALUES(password_hash),
  role = 'super_admin',
  is_active = TRUE,
  session_version = session_version + 1;

INSERT IGNORE INTO schema_migrations (migration_key) VALUES ('005_sql_super_admin');

CREATE TABLE IF NOT EXISTS media_assets (
  asset_id CHAR(36) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  byte_size INT UNSIGNED NOT NULL,
  image_data MEDIUMBLOB NOT NULL,
  created_by_admin_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (asset_id),
  KEY media_assets_created_at (created_at),
  CONSTRAINT media_assets_created_by_fk
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

CREATE TABLE IF NOT EXISTS sports_teams (
  team_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(80) NOT NULL,
  name VARCHAR(180) NOT NULL,
  short_name VARCHAR(100) NOT NULL,
  category_label VARCHAR(100) NOT NULL,
  team_type ENUM('men', 'women', 'youth') NOT NULL,
  description_text TEXT NOT NULL,
  hero_image_url TEXT NOT NULL,
  api_provider ENUM('manual', 'sofascore', 'thesportsdb') NOT NULL DEFAULT 'manual',
  api_team_id VARCHAR(100) NULL,
  api_tournament_id VARCHAR(100) NULL,
  api_league_id VARCHAR(100) NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  updated_by_admin_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (team_id),
  UNIQUE KEY sports_teams_slug (slug),
  KEY sports_teams_listing (is_published, sort_order),
  CONSTRAINT sports_teams_admin_fk
    FOREIGN KEY (updated_by_admin_id) REFERENCES admin_users (id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO sports_teams (
  team_id, slug, name, short_name, category_label, team_type, description_text,
  hero_image_url, api_provider, api_team_id, api_tournament_id, api_league_id,
  is_primary, is_published, sort_order
) VALUES
  (1, 'masculine', 'Équipe masculine', 'Masculins', 'Équipe première', 'men',
   'L’équipe première de l’Union Touarga Sport engagée dans l’élite du football marocain.',
   '/uts/hero-candidate.jpg', 'sofascore', '118834', '937', '4520', TRUE, TRUE, 10),
  (2, 'feminine', 'Équipe féminine', 'Féminines', 'Équipe féminine', 'women',
   'Le projet féminin de l’Union Touarga Sport, porté par la même ambition et les mêmes couleurs.',
   '/uts/team.jpg', 'manual', NULL, NULL, NULL, FALSE, TRUE, 20),
  (3, 'u21', 'Équipe U21', 'U21', 'Formation U21', 'youth',
   'La dernière étape de formation avant l’intégration au groupe professionnel.',
   '/uts/story.jpg', 'manual', NULL, NULL, NULL, FALSE, TRUE, 30),
  (4, 'u19', 'Équipe U19', 'U19', 'Formation U19', 'youth',
   'Une génération formée pour progresser, représenter Touarga et préparer l’avenir.',
   '/uts/story.jpg', 'manual', NULL, NULL, NULL, FALSE, TRUE, 40),
  (5, 'u17', 'Équipe U17', 'U17', 'Formation U17', 'youth',
   'Le développement des jeunes talents dans le respect de l’identité sportive du club.',
   '/uts/story.jpg', 'manual', NULL, NULL, NULL, FALSE, TRUE, 50);

CREATE TABLE IF NOT EXISTS sports_competitions (
  competition_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  team_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(180) NOT NULL,
  short_name VARCHAR(80) NOT NULL,
  season_label VARCHAR(20) NOT NULL,
  competition_type ENUM('league', 'cup', 'friendly') NOT NULL DEFAULT 'league',
  api_competition_id VARCHAR(100) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  updated_by_admin_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (competition_id),
  UNIQUE KEY sports_competitions_team_name_season (team_id, name, season_label),
  KEY sports_competitions_listing (team_id, is_active, sort_order),
  CONSTRAINT sports_competitions_team_fk
    FOREIGN KEY (team_id) REFERENCES sports_teams (team_id) ON DELETE CASCADE,
  CONSTRAINT sports_competitions_admin_fk
    FOREIGN KEY (updated_by_admin_id) REFERENCES admin_users (id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO sports_competitions (
  team_id, name, short_name, season_label, competition_type, api_competition_id, is_active, sort_order
) VALUES (1, 'Botola Pro', 'Botola Pro',
  CONCAT(IF(MONTH(UTC_DATE()) >= 7, YEAR(UTC_DATE()), YEAR(UTC_DATE()) - 1), '/', IF(MONTH(UTC_DATE()) >= 7, YEAR(UTC_DATE()) + 1, YEAR(UTC_DATE()))),
  'league', '937', TRUE, 10);

CREATE TABLE IF NOT EXISTS sports_matches (
  match_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  record_key VARCHAR(160) NOT NULL,
  team_id BIGINT UNSIGNED NOT NULL,
  competition_id BIGINT UNSIGNED NULL,
  external_id VARCHAR(120) NULL,
  source_name ENUM('dashboard', 'sofascore', 'thesportsdb') NOT NULL DEFAULT 'dashboard',
  starts_at DATETIME NOT NULL,
  status ENUM('scheduled', 'live', 'finished', 'postponed', 'cancelled') NOT NULL DEFAULT 'scheduled',
  competition_name VARCHAR(180) NOT NULL,
  season_label VARCHAR(20) NOT NULL,
  round_label VARCHAR(80) NULL,
  home_name VARCHAR(180) NOT NULL,
  home_short_name VARCHAR(100) NOT NULL,
  home_code VARCHAR(12) NOT NULL,
  home_badge_url TEXT NULL,
  away_name VARCHAR(180) NOT NULL,
  away_short_name VARCHAR(100) NOT NULL,
  away_code VARCHAR(12) NOT NULL,
  away_badge_url TEXT NULL,
  home_score SMALLINT UNSIGNED NULL,
  away_score SMALLINT UNSIGNED NULL,
  venue VARCHAR(255) NULL,
  match_report_url TEXT NULL,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  manual_lock BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  updated_by_admin_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (match_id),
  UNIQUE KEY sports_matches_record_key (record_key),
  KEY sports_matches_timeline (team_id, is_published, starts_at),
  KEY sports_matches_external (source_name, external_id),
  CONSTRAINT sports_matches_team_fk
    FOREIGN KEY (team_id) REFERENCES sports_teams (team_id) ON DELETE CASCADE,
  CONSTRAINT sports_matches_competition_fk
    FOREIGN KEY (competition_id) REFERENCES sports_competitions (competition_id) ON DELETE SET NULL,
  CONSTRAINT sports_matches_admin_fk
    FOREIGN KEY (updated_by_admin_id) REFERENCES admin_users (id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sports_standings (
  standing_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  record_key VARCHAR(180) NOT NULL,
  team_id BIGINT UNSIGNED NOT NULL,
  competition_id BIGINT UNSIGNED NULL,
  season_label VARCHAR(20) NOT NULL,
  source_name ENUM('dashboard', 'sofascore', 'thesportsdb') NOT NULL DEFAULT 'dashboard',
  external_team_id VARCHAR(120) NULL,
  position_number SMALLINT UNSIGNED NOT NULL,
  club_name VARCHAR(180) NOT NULL,
  club_short_name VARCHAR(100) NOT NULL,
  club_badge_url TEXT NULL,
  played SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  won SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  drawn SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  lost SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  goals_for SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  goals_against SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  points SMALLINT NOT NULL DEFAULT 0,
  zone_label VARCHAR(160) NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  manual_lock BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by_admin_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (standing_id),
  UNIQUE KEY sports_standings_record_key (record_key),
  KEY sports_standings_table (team_id, season_label, is_published, position_number),
  CONSTRAINT sports_standings_team_fk
    FOREIGN KEY (team_id) REFERENCES sports_teams (team_id) ON DELETE CASCADE,
  CONSTRAINT sports_standings_competition_fk
    FOREIGN KEY (competition_id) REFERENCES sports_competitions (competition_id) ON DELETE SET NULL,
  CONSTRAINT sports_standings_admin_fk
    FOREIGN KEY (updated_by_admin_id) REFERENCES admin_users (id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sports_sync_log (
  sync_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  team_id BIGINT UNSIGNED NOT NULL,
  provider_name VARCHAR(40) NOT NULL,
  status ENUM('running', 'completed', 'failed') NOT NULL,
  imported_matches INT UNSIGNED NOT NULL DEFAULT 0,
  imported_standings INT UNSIGNED NOT NULL DEFAULT 0,
  error_message VARCHAR(1000) NULL,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  PRIMARY KEY (sync_id),
  KEY sports_sync_log_team_date (team_id, started_at),
  CONSTRAINT sports_sync_log_team_fk
    FOREIGN KEY (team_id) REFERENCES sports_teams (team_id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS players (
  cms_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  record_key VARCHAR(128) NOT NULL,
  team_id BIGINT UNSIGNED NOT NULL DEFAULT 1,
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
  KEY players_team_listing (team_id, is_published, sort_order),
  CONSTRAINT players_team_fk
    FOREIGN KEY (team_id) REFERENCES sports_teams (team_id) ON DELETE RESTRICT,
  CONSTRAINT players_updated_by_fk
    FOREIGN KEY (updated_by_admin_id) REFERENCES admin_users (id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staff_members (
  cms_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  record_key VARCHAR(128) NOT NULL,
  team_id BIGINT UNSIGNED NOT NULL DEFAULT 1,
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
  KEY staff_members_team_listing (team_id, is_published, sort_order),
  CONSTRAINT staff_members_team_fk
    FOREIGN KEY (team_id) REFERENCES sports_teams (team_id) ON DELETE RESTRICT,
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

CREATE TABLE IF NOT EXISTS academy_accounts (
  account_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(100) NULL,
  email VARCHAR(255) NOT NULL,
  display_name VARCHAR(160) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('coach', 'guardian', 'player') NOT NULL,
  phone VARCHAR(32) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  session_version INT UNSIGNED NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_by_admin_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (account_id),
  UNIQUE KEY academy_accounts_username (username),
  UNIQUE KEY academy_accounts_email (email),
  KEY academy_accounts_role_active (role, is_active),
  CONSTRAINT academy_accounts_created_by_fk
    FOREIGN KEY (created_by_admin_id) REFERENCES admin_users (id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS academy_settings (
  settings_id TINYINT UNSIGNED NOT NULL DEFAULT 1,
  season_label VARCHAR(20) NOT NULL,
  page_title VARCHAR(180) NOT NULL,
  intro_text VARCHAR(1000) NOT NULL,
  registration_question VARCHAR(255) NOT NULL,
  guardian_mode_label VARCHAR(120) NOT NULL,
  adult_mode_label VARCHAR(120) NOT NULL,
  guardian_policy_text VARCHAR(1000) NOT NULL,
  adult_policy_text VARCHAR(1000) NOT NULL,
  account_help_text VARCHAR(500) NOT NULL,
  eligibility_text VARCHAR(1000) NOT NULL,
  consent_text VARCHAR(1000) NOT NULL,
  trust_data_text VARCHAR(160) NOT NULL,
  trust_family_text VARCHAR(160) NOT NULL,
  updated_by_admin_id BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (settings_id),
  CONSTRAINT academy_settings_singleton CHECK (settings_id = 1),
  CONSTRAINT academy_settings_admin_fk
    FOREIGN KEY (updated_by_admin_id) REFERENCES admin_users (id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO academy_settings (
  settings_id, season_label, page_title, intro_text, registration_question,
  guardian_mode_label, adult_mode_label, guardian_policy_text, adult_policy_text,
  account_help_text, eligibility_text, consent_text, trust_data_text, trust_family_text
) VALUES (
  1,
  CONCAT(IF(MONTH(UTC_DATE()) >= 7, YEAR(UTC_DATE()), YEAR(UTC_DATE()) - 1), '/', IF(MONTH(UTC_DATE()) >= 7, YEAR(UTC_DATE()) + 1, YEAR(UTC_DATE()))),
  'Inscription Académie U10–U21',
  'Un dossier famille pour les mineurs, ou un compte personnel avec CIN pour les joueurs de 18 à 21 ans.',
  'Qui dépose la candidature ?',
  'Parent ou tuteur',
  'Joueur de 18 à 21 ans',
  'Pour tout joueur mineur, le compte et la candidature sont créés par son responsable légal.',
  'Le joueur majeur crée son propre compte. Une copie de sa CIN est obligatoire.',
  'La connexion sera possible avec le nom d’utilisateur ou l’e-mail.',
  'Les filles et les garçons peuvent candidater dans toutes les catégories U10 à U21.',
  'En transmettant ce dossier, vous certifiez l’exactitude des informations et acceptez leur traitement pour la candidature à l’Académie UTS.',
  'Données protégées',
  'Un compte pour toute la famille'
);

CREATE TABLE IF NOT EXISTS academy_guardians (
  guardian_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  account_id BIGINT UNSIGNED NOT NULL,
  address_text VARCHAR(500) NOT NULL,
  city VARCHAR(120) NOT NULL DEFAULT 'Rabat',
  emergency_phone VARCHAR(32) NOT NULL,
  PRIMARY KEY (guardian_id),
  UNIQUE KEY academy_guardians_account (account_id),
  CONSTRAINT academy_guardians_account_fk
    FOREIGN KEY (account_id) REFERENCES academy_accounts (account_id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS academy_coaches (
  coach_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  account_id BIGINT UNSIGNED NOT NULL,
  license_level VARCHAR(100) NULL,
  specialty VARCHAR(160) NULL,
  biography TEXT NULL,
  PRIMARY KEY (coach_id),
  UNIQUE KEY academy_coaches_account (account_id),
  CONSTRAINT academy_coaches_account_fk
    FOREIGN KEY (account_id) REFERENCES academy_accounts (account_id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS academy_groups (
  group_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  age_category ENUM('U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U20', 'U21') NOT NULL,
  group_name VARCHAR(160) NOT NULL,
  season_label VARCHAR(20) NOT NULL,
  coach_id BIGINT UNSIGNED NULL,
  capacity SMALLINT UNSIGNED NOT NULL DEFAULT 24,
  default_venue VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_admin_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id),
  UNIQUE KEY academy_groups_category_season (age_category, season_label),
  KEY academy_groups_coach (coach_id, is_active),
  CONSTRAINT academy_groups_coach_fk
    FOREIGN KEY (coach_id) REFERENCES academy_coaches (coach_id) ON DELETE SET NULL,
  CONSTRAINT academy_groups_created_by_fk
    FOREIGN KEY (created_by_admin_id) REFERENCES admin_users (id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS academy_players (
  player_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  account_id BIGINT UNSIGNED NULL,
  registration_number VARCHAR(32) NOT NULL,
  first_name VARCHAR(120) NOT NULL,
  last_name VARCHAR(120) NOT NULL,
  birth_date DATE NOT NULL,
  gender ENUM('male', 'female') NOT NULL,
  nationality VARCHAR(100) NOT NULL DEFAULT 'Maroc',
  birth_place VARCHAR(160) NULL,
  school_name VARCHAR(255) NULL,
  school_level VARCHAR(120) NULL,
  preferred_foot ENUM('right', 'left', 'both', 'unknown') NOT NULL DEFAULT 'unknown',
  medical_notes TEXT NULL,
  video_url VARCHAR(500) NULL,
  identity_document_name VARCHAR(255) NULL,
  identity_document_mime VARCHAR(100) NULL,
  identity_document_data MEDIUMBLOB NULL,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (player_id),
  UNIQUE KEY academy_players_account (account_id),
  UNIQUE KEY academy_players_registration_number (registration_number),
  KEY academy_players_name (last_name, first_name),
  KEY academy_players_birth_date (birth_date),
  CONSTRAINT academy_players_account_fk
    FOREIGN KEY (account_id) REFERENCES academy_accounts (account_id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS academy_player_guardians (
  player_id BIGINT UNSIGNED NOT NULL,
  guardian_id BIGINT UNSIGNED NOT NULL,
  relationship_label VARCHAR(80) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  can_pick_up BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (player_id, guardian_id),
  KEY academy_player_guardians_guardian (guardian_id),
  CONSTRAINT academy_player_guardians_player_fk
    FOREIGN KEY (player_id) REFERENCES academy_players (player_id) ON DELETE CASCADE,
  CONSTRAINT academy_player_guardians_guardian_fk
    FOREIGN KEY (guardian_id) REFERENCES academy_guardians (guardian_id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS academy_enrollments (
  enrollment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  player_id BIGINT UNSIGNED NOT NULL,
  group_id BIGINT UNSIGNED NULL,
  season_label VARCHAR(20) NOT NULL,
  requested_category ENUM('U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U20', 'U21') NOT NULL,
  status ENUM('submitted', 'review', 'trial', 'accepted', 'active', 'suspended', 'rejected', 'left') NOT NULL DEFAULT 'submitted',
  consent_medical BOOLEAN NOT NULL DEFAULT FALSE,
  consent_image BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  trial_at DATETIME NULL,
  decision_at DATETIME NULL,
  updated_by_admin_id BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (enrollment_id),
  UNIQUE KEY academy_enrollments_player_season (player_id, season_label),
  KEY academy_enrollments_status (status, requested_category),
  KEY academy_enrollments_group (group_id, status),
  CONSTRAINT academy_enrollments_player_fk
    FOREIGN KEY (player_id) REFERENCES academy_players (player_id) ON DELETE CASCADE,
  CONSTRAINT academy_enrollments_group_fk
    FOREIGN KEY (group_id) REFERENCES academy_groups (group_id) ON DELETE SET NULL,
  CONSTRAINT academy_enrollments_admin_fk
    FOREIGN KEY (updated_by_admin_id) REFERENCES admin_users (id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS academy_training_sessions (
  session_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id BIGINT UNSIGNED NOT NULL,
  coach_id BIGINT UNSIGNED NOT NULL,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  venue VARCHAR(255) NOT NULL,
  focus_text VARCHAR(500) NOT NULL,
  status ENUM('planned', 'completed', 'cancelled') NOT NULL DEFAULT 'planned',
  coach_notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (session_id),
  KEY academy_training_sessions_group_date (group_id, starts_at),
  KEY academy_training_sessions_coach_date (coach_id, starts_at),
  CONSTRAINT academy_training_sessions_group_fk
    FOREIGN KEY (group_id) REFERENCES academy_groups (group_id) ON DELETE CASCADE,
  CONSTRAINT academy_training_sessions_coach_fk
    FOREIGN KEY (coach_id) REFERENCES academy_coaches (coach_id) ON DELETE RESTRICT,
  CONSTRAINT academy_training_sessions_dates CHECK (ends_at > starts_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS academy_attendance (
  session_id BIGINT UNSIGNED NOT NULL,
  player_id BIGINT UNSIGNED NOT NULL,
  status ENUM('present', 'late', 'absent', 'excused') NOT NULL,
  note_text VARCHAR(500) NULL,
  recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (session_id, player_id),
  CONSTRAINT academy_attendance_session_fk
    FOREIGN KEY (session_id) REFERENCES academy_training_sessions (session_id) ON DELETE CASCADE,
  CONSTRAINT academy_attendance_player_fk
    FOREIGN KEY (player_id) REFERENCES academy_players (player_id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS academy_player_notes (
  note_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  player_id BIGINT UNSIGNED NOT NULL,
  author_account_id BIGINT UNSIGNED NULL,
  author_admin_id BIGINT UNSIGNED NULL,
  category ENUM('sport', 'medical', 'administrative', 'behavior') NOT NULL DEFAULT 'sport',
  visibility ENUM('staff_only', 'guardian') NOT NULL DEFAULT 'staff_only',
  note_text TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (note_id),
  KEY academy_player_notes_player_date (player_id, created_at),
  CONSTRAINT academy_player_notes_player_fk
    FOREIGN KEY (player_id) REFERENCES academy_players (player_id) ON DELETE CASCADE,
  CONSTRAINT academy_player_notes_account_fk
    FOREIGN KEY (author_account_id) REFERENCES academy_accounts (account_id) ON DELETE SET NULL,
  CONSTRAINT academy_player_notes_admin_fk
    FOREIGN KEY (author_admin_id) REFERENCES admin_users (id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO schema_migrations (migration_key) VALUES ('006_academy_lifecycle');

-- Migration idempotente des installations ayant déjà le module Académie.
SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'academy_accounts' AND column_name = 'username'),
  'SELECT 1',
  'ALTER TABLE academy_accounts ADD COLUMN username VARCHAR(100) NULL AFTER account_id'
);
PREPARE academy_migration FROM @sql; EXECUTE academy_migration; DEALLOCATE PREPARE academy_migration;

ALTER TABLE academy_accounts MODIFY role ENUM('coach', 'guardian', 'player') NOT NULL;
UPDATE academy_accounts SET username = CONCAT('academy', account_id) WHERE username IS NULL OR username = '';

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'academy_accounts' AND index_name = 'academy_accounts_username'),
  'SELECT 1',
  'ALTER TABLE academy_accounts ADD UNIQUE KEY academy_accounts_username (username)'
);
PREPARE academy_migration FROM @sql; EXECUTE academy_migration; DEALLOCATE PREPARE academy_migration;
ALTER TABLE academy_accounts MODIFY username VARCHAR(100) NOT NULL;

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'academy_players' AND column_name = 'account_id'),
  'SELECT 1',
  'ALTER TABLE academy_players ADD COLUMN account_id BIGINT UNSIGNED NULL AFTER player_id, ADD UNIQUE KEY academy_players_account (account_id), ADD CONSTRAINT academy_players_account_fk FOREIGN KEY (account_id) REFERENCES academy_accounts (account_id) ON DELETE SET NULL'
);
PREPARE academy_migration FROM @sql; EXECUTE academy_migration; DEALLOCATE PREPARE academy_migration;

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'academy_players' AND column_name = 'video_url'),
  'SELECT 1',
  'ALTER TABLE academy_players ADD COLUMN video_url VARCHAR(500) NULL AFTER medical_notes'
);
PREPARE academy_migration FROM @sql; EXECUTE academy_migration; DEALLOCATE PREPARE academy_migration;

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'academy_players' AND column_name = 'identity_document_name'),
  'SELECT 1',
  'ALTER TABLE academy_players ADD COLUMN identity_document_name VARCHAR(255) NULL AFTER video_url, ADD COLUMN identity_document_mime VARCHAR(100) NULL AFTER identity_document_name, ADD COLUMN identity_document_data MEDIUMBLOB NULL AFTER identity_document_mime'
);
PREPARE academy_migration FROM @sql; EXECUTE academy_migration; DEALLOCATE PREPARE academy_migration;

INSERT IGNORE INTO schema_migrations (migration_key) VALUES ('007_academy_independent_players');

-- Migration idempotente des contenus historiques vers la structure multi-équipes.
SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'players' AND column_name = 'team_id'),
  'SELECT 1',
  'ALTER TABLE players ADD COLUMN team_id BIGINT UNSIGNED NOT NULL DEFAULT 1 AFTER record_key, ADD KEY players_team_listing (team_id, is_published, sort_order), ADD CONSTRAINT players_team_fk FOREIGN KEY (team_id) REFERENCES sports_teams (team_id) ON DELETE RESTRICT'
);
PREPARE sports_migration FROM @sql; EXECUTE sports_migration; DEALLOCATE PREPARE sports_migration;

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'staff_members' AND column_name = 'team_id'),
  'SELECT 1',
  'ALTER TABLE staff_members ADD COLUMN team_id BIGINT UNSIGNED NOT NULL DEFAULT 1 AFTER record_key, ADD KEY staff_members_team_listing (team_id, is_published, sort_order), ADD CONSTRAINT staff_members_team_fk FOREIGN KEY (team_id) REFERENCES sports_teams (team_id) ON DELETE RESTRICT'
);
PREPARE sports_migration FROM @sql; EXECUTE sports_migration; DEALLOCATE PREPARE sports_migration;

INSERT IGNORE INTO schema_migrations (migration_key) VALUES ('008_multi_team_sports_hub');