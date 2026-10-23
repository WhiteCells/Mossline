CREATE TABLE site_appearance (
    id TINYINT UNSIGNED NOT NULL DEFAULT 1,
    desktop_background_url VARCHAR(1000) NOT NULL DEFAULT '',
    mobile_background_url VARCHAR(1000) NOT NULL DEFAULT '',
    overlay_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id),
    CONSTRAINT chk_site_appearance_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO site_appearance (id) VALUES (1);

ALTER TABLE attachment_refs MODIFY owner_type ENUM('post', 'moment', 'about', 'user', 'friend', 'site') NOT NULL;
